import { useEffect, useRef, useState } from "react";
import { Link, useRoute } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Upload,
  Copy,
  Check,
  FileIcon,
  Trash2,
  CheckCircle2,
  Clock,
  Mail,
  ExternalLink,
  MessageSquare,
  Activity,
  Receipt,
  Plus,
  X,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  supabase,
  STORAGE_BUCKET,
  Project,
  ProjectFile,
  ProjectStatus,
  PROJECT_STATUSES,
  ActivityLog,
  Invoice,
  InvoiceLineItem,
  logActivity,
} from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const EVENT_META: Record<
  ActivityLog["event_type"],
  { icon: React.ReactNode; color: string }
> = {
  file_uploaded: {
    icon: <Upload className="h-3.5 w-3.5" />,
    color: "bg-blue-100 text-blue-700",
  },
  file_deleted: {
    icon: <Trash2 className="h-3.5 w-3.5" />,
    color: "bg-red-100 text-red-700",
  },
  file_approved: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "bg-emerald-100 text-emerald-700",
  },
  feedback_submitted: {
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    color: "bg-primary/10 text-primary",
  },
};

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id;
  const { user, signOut } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: "", amount: 0 },
  ]);
  const [dueDate, setDueDate] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");

  async function loadAll() {
    if (!projectId) return;
    setLoading(true);
    const [
      { data: p, error: pErr },
      { data: f, error: fErr },
      { data: a },
      { data: inv },
    ] = await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).single(),
      supabase
        .from("files")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("activity_log")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("invoices")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
    ]);
    if (pErr) {
      toast({
        title: "Couldn't load project",
        description: pErr.message,
        variant: "destructive",
      });
    } else {
      setProject(p as Project);
    }
    if (fErr) {
      toast({
        title: "Couldn't load files",
        description: fErr.message,
        variant: "destructive",
      });
    } else {
      setFiles((f ?? []) as ProjectFile[]);
    }
    setActivity((a ?? []) as ActivityLog[]);
    setInvoices((inv ?? []) as Invoice[]);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function openInvoiceDialog() {
    const next = invoices.length + 1;
    setInvoiceNumber(`INV-${String(next).padStart(4, "0")}`);
    setLineItems([{ description: "", amount: 0 }]);
    setDueDate("");
    setPaypalEmail("");
    setInvoiceOpen(true);
  }

  function updateLineItem(
    index: number,
    field: keyof InvoiceLineItem,
    value: string,
  ) {
    setLineItems((items) =>
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "amount" ? Number(value) || 0 : value,
            }
          : item,
      ),
    );
  }

  function addLineItem() {
    setLineItems((items) => [...items, { description: "", amount: 0 }]);
  }

  function removeLineItem(index: number) {
    setLineItems((items) => items.filter((_, i) => i !== index));
  }

  const invoiceTotal = lineItems.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    const validItems = lineItems.filter((i) => i.description.trim());
    if (validItems.length === 0 || !dueDate || !paypalEmail.trim()) return;
    setInvoiceSubmitting(true);
    const { error } = await supabase.from("invoices").insert({
      project_id: project.id,
      invoice_number: invoiceNumber,
      line_items: validItems,
      total_amount: invoiceTotal,
      due_date: dueDate,
      paypal_email: paypalEmail.trim(),
      status: "sent",
    });
    setInvoiceSubmitting(false);
    if (error) {
      toast({
        title: "Couldn't create invoice",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Invoice created and shared with client" });
    setInvoiceOpen(false);
    loadAll();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !project) return;
    setUploading(true);

    let succeeded = 0;
    let failed = 0;

    for (const file of Array.from(fileList)) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${project.id}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: false });
      if (upErr) {
        toast({
          title: `Upload failed: ${file.name}`,
          description: upErr.message,
          variant: "destructive",
        });
        failed++;
        continue;
      }
      const { data: pub } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);
      const { error: insErr } = await supabase.from("files").insert({
        project_id: project.id,
        file_name: file.name,
        file_url: pub.publicUrl,
        file_size: file.size,
        approved: false,
      });
      if (insErr) {
        toast({
          title: `Couldn't save ${file.name}`,
          description: insErr.message,
          variant: "destructive",
        });
        failed++;
      } else {
        await logActivity(
          project.id,
          "file_uploaded",
          `File uploaded: ${file.name}`,
        );
        succeeded++;
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (succeeded > 0 && failed === 0) {
      toast({
        title: `${succeeded === 1 ? "File" : `${succeeded} files`} uploaded successfully`,
      });
    } else if (succeeded > 0 && failed > 0) {
      toast({
        title: `${succeeded} uploaded, ${failed} failed`,
        variant: "destructive",
      });
    }
    // If all failed, individual error toasts already shown — no extra toast needed

    loadAll();
  }

  async function handleDelete(file: ProjectFile) {
    if (!confirm(`Delete ${file.file_name}?`)) return;
    try {
      const url = new URL(file.file_url);
      const marker = `/${STORAGE_BUCKET}/`;
      const idx = url.pathname.indexOf(marker);
      if (idx >= 0) {
        const path = decodeURIComponent(
          url.pathname.substring(idx + marker.length),
        );
        await supabase.storage.from(STORAGE_BUCKET).remove([path]);
      }
    } catch {
      // ignore parse errors, still try to delete db row
    }
    const { error } = await supabase.from("files").delete().eq("id", file.id);
    if (error) {
      toast({
        title: "Couldn't delete file",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    if (project) {
      await logActivity(
        project.id,
        "file_deleted",
        `File deleted: ${file.file_name}`,
      );
    }
    toast({ title: "File deleted" });
    loadAll();
  }

  async function handleStatusChange(newStatus: ProjectStatus) {
    if (!project || updatingStatus) return;
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("projects")
      .update({ status: newStatus })
      .eq("id", project.id);
    setUpdatingStatus(false);
    if (error) {
      toast({ title: "Couldn't update status", description: error.message, variant: "destructive" });
    } else {
      setProject({ ...project, status: newStatus });
      toast({ title: `Status set to ${PROJECT_STATUSES.find((s) => s.value === newStatus)?.label}` });
    }
  }

  function shareUrl() {
    if (!project) return "";
    return `${window.location.origin}${import.meta.env.BASE_URL}client/${project.share_token}`;
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl());
    setCopied(true);
    toast({ title: "Link copied" });
    setTimeout(() => setCopied(false), 1800);
  }

  function emailClientLink() {
    if (!project) return "";
    const subject = encodeURIComponent(
      `Files ready for your review: ${project.name}`,
    );
    const body = encodeURIComponent(
      `Hi ${project.client_name},\n\nThe files for ${project.name} are ready for your review.\n\nReview here: ${shareUrl()}\n\nThanks!`,
    );
    return `mailto:${project.client_email}?subject=${subject}&body=${body}`;
  }

  function invoiceReminderLink(inv: Invoice) {
    if (!project) return "";
    const subject = encodeURIComponent(
      `Reminder: invoice ${inv.invoice_number} for ${project.name}`,
    );
    const body = encodeURIComponent(
      `Hi ${project.client_name},\n\nJust a friendly reminder that invoice ${inv.invoice_number} ($${inv.total_amount.toFixed(2)}) for ${project.name} is due ${format(new Date(inv.due_date), "MMM d, yyyy")}.\n\nYou can view and pay it here: ${shareUrl()}\n\nThanks!`,
    );
    return `mailto:${project.client_email}?subject=${subject}&body=${body}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onLogout={signOut} userEmail={user?.email} />
        <div className="max-w-5xl mx-auto px-6 py-12 text-muted-foreground">
          Loading project…
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Header onLogout={signOut} userEmail={user?.email} />
        <div className="max-w-5xl mx-auto px-6 py-12">
          <p className="text-muted-foreground">Project not found.</p>
          <Link href="/">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const pendingCount = files.filter((f) => !f.approved).length;
  const approvedCount = files.length - pendingCount;

  return (
    <div className="min-h-screen bg-background">
      <Header subtitle="Project" onLogout={signOut} userEmail={user?.email} />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Link href="/" data-testid="link-back">
          <Button variant="ghost" size="sm" className="mb-4 -ml-3">
            <ArrowLeft className="h-4 w-4 mr-2" />
            All projects
          </Button>
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-semibold tracking-tight">
                {project.name}
              </h1>
              <select
                value={project.status}
                disabled={updatingStatus}
                onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                className={`text-xs font-medium rounded-full border px-3 py-1 cursor-pointer outline-none transition-opacity ${updatingStatus ? "opacity-50" : ""} ${
                  project.status === "draft"
                    ? "bg-gray-100 text-gray-600 border-gray-200"
                    : project.status === "active"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : project.status === "completed"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {project.client_name} · {project.client_email}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  onClick={openInvoiceDialog}
                  data-testid="button-create-invoice"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create invoice</DialogTitle>
                  <DialogDescription>
                    Shared with {project.client_name} on the client portal.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateInvoice} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice number</Label>
                    <Input
                      id="invoiceNumber"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      data-testid="input-invoice-number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Line items</Label>
                    <div className="space-y-2">
                      {lineItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(i, "description", e.target.value)
                            }
                            className="flex-1"
                            data-testid={`input-line-item-desc-${i}`}
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.amount || ""}
                            onChange={(e) =>
                              updateLineItem(i, "amount", e.target.value)
                            }
                            className="w-28"
                            data-testid={`input-line-item-amount-${i}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(i)}
                            disabled={lineItems.length === 1}
                            data-testid={`button-remove-line-item-${i}`}
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLineItem}
                      data-testid="button-add-line-item"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add line item
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-sm font-medium pt-2 border-t border-border/60">
                    <span>Total</span>
                    <span data-testid="text-invoice-total">
                      ${invoiceTotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        required
                        data-testid="input-due-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paypalEmail">PayPal email</Label>
                      <Input
                        id="paypalEmail"
                        type="email"
                        placeholder="you@paypal.com"
                        value={paypalEmail}
                        onChange={(e) => setPaypalEmail(e.target.value)}
                        required
                        data-testid="input-paypal-email"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={invoiceSubmitting || invoiceTotal <= 0}
                      data-testid="button-submit-invoice"
                    >
                      {invoiceSubmitting ? "Creating…" : "Create invoice"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <a href={emailClientLink()}>
              <Button variant="outline" data-testid="button-email-client">
                <Mail className="h-4 w-4 mr-2" />
                Email client
              </Button>
            </a>
          </div>
        </div>

        <Card className="my-6 bg-primary/5 border-primary/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium mb-1">
                  Client portal link
                </div>
                <div
                  className="text-xs text-muted-foreground truncate font-mono"
                  data-testid="text-share-url"
                >
                  {shareUrl()}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyLink}
                  data-testid="button-copy-link"
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <a
                  href={shareUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-open-portal"
                >
                  <Button size="sm" variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">Files</h2>
            <span className="text-sm text-muted-foreground">
              {approvedCount} approved · {pendingCount} pending
            </span>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={handleUpload}
              data-testid="input-file-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              data-testid="button-upload"
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading…" : "Upload files"}
            </Button>
          </div>
        </div>

        {files.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium">No files yet</h3>
              <p className="text-muted-foreground">
                Upload files to share with your client for review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {files.map((f) => (
              <Card key={f.id} data-testid={`card-file-${f.id}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <a
                          href={f.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline truncate block"
                          data-testid={`link-file-${f.id}`}
                        >
                          {f.file_name}
                        </a>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatBytes(f.file_size)} · uploaded{" "}
                          {format(new Date(f.created_at), "MMM d, yyyy")}
                        </div>
                        {f.approved && f.approved_at && (
                          <div className="text-xs text-emerald-700 mt-1.5 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Approved{" "}
                            {format(
                              new Date(f.approved_at),
                              "MMM d, yyyy 'at' h:mm a",
                            )}
                          </div>
                        )}
                        {f.feedback && (
                          <div className="mt-2 text-sm bg-muted/50 rounded-md p-3 border border-border/60">
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              Client feedback
                            </div>
                            {f.feedback}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {f.approved ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(f)}
                        data-testid={`button-delete-${f.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Invoices */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Invoices</h2>
            {invoices.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {invoices.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">
                  No invoices yet. Create one to get paid via PayPal.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <Card key={inv.id} data-testid={`card-invoice-${inv.id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <div className="font-medium">{inv.invoice_number}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Due {format(new Date(inv.due_date), "MMM d, yyyy")} ·{" "}
                          {inv.line_items.length} line item
                          {inv.line_items.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">
                          ${inv.total_amount.toFixed(2)}
                        </span>
                        {inv.status === "paid" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Paid
                          </Badge>
                        ) : (
                          <>
                            <Badge
                              variant="secondary"
                              className="bg-primary/10 text-primary border-primary/20"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Awaiting payment
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              data-testid={`button-remind-invoice-${inv.id}`}
                            >
                              <a href={invoiceReminderLink(inv)}>
                                <Mail className="h-4 w-4 mr-1.5" />
                                Remind
                              </a>
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Activity</h2>
            {activity.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {activity.length} event{activity.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No activity yet. Events will appear here as you upload files and
              your client reviews them.
            </p>
          ) : (
            <div className="relative">
              <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {activity.map((ev) => {
                  const meta = EVENT_META[ev.event_type];
                  return (
                    <div key={ev.id} className="flex gap-4 items-start">
                      <div
                        className={`relative z-10 h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${meta.color}`}
                      >
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm leading-snug">{ev.description}</p>
                        <p
                          className="text-xs text-muted-foreground mt-0.5"
                          title={format(
                            new Date(ev.created_at),
                            "MMM d, yyyy 'at' h:mm a",
                          )}
                        >
                          {formatDistanceToNow(new Date(ev.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
