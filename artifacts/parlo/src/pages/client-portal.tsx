import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { format } from "date-fns";
import {
  CheckCircle2,
  Clock,
  FileIcon,
  MessageSquare,
  Download,
  Receipt,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  supabase,
  Project,
  ProjectFile,
  Invoice,
  FreelancerSettings,
  logActivity,
  loadProjectFiles,
  isReviewWorkflowSchemaError,
} from "@/lib/supabase";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** Convert a hex color to HSL string for CSS variable override */
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h /= 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function ClientPortal() {
  const [, params] = useRoute("/client/:token");
  const token = params?.token;
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [branding, setBranding] = useState<FreelancerSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>(
    {},
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fileGroups = useMemo(() => {
    const groups = new Map<string, ProjectFile[]>();
    for (const file of files) {
      const groupId = file.version_group_id ?? file.id;
      const group = groups.get(groupId) ?? [];
      group.push(file);
      groups.set(groupId, group);
    }
    return Array.from(groups.values())
      .map((group) =>
        group.sort(
          (a, b) =>
            (b.version_number ?? 1) - (a.version_number ?? 1) ||
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      )
      .sort(
        (a, b) =>
          new Date(b[0].created_at).getTime() -
          new Date(a[0].created_at).getTime(),
      );
  }, [files]);
  const visibleFiles = fileGroups.map((group) => group[0]);

  async function load() {
    if (!token) return;
    setLoading(true);
    const { data: p, error: pErr } = await supabase
      .from("projects")
      .select("*")
      .eq("share_token", token)
      .maybeSingle();
    if (pErr || !p) {
      setProject(null);
      setLoading(false);
      return;
    }
    const proj = p as Project;
    setProject(proj);

    const [{ data: f }, { data: inv }, { data: brand }] = await Promise.all([
      loadProjectFiles(proj.id),
      supabase
        .from("invoices")
        .select("*")
        .eq("project_id", proj.id)
        .neq("status", "draft")
        .order("created_at", { ascending: false }),
      supabase
        .from("freelancer_settings")
        .select("*")
        .eq("user_id", proj.user_id)
        .maybeSingle(),
    ]);

    setFiles((f ?? []) as ProjectFile[]);
    setInvoices((inv ?? []) as Invoice[]);
    setBranding(brand as FreelancerSettings | null);
    setLoading(false);
  }

  function payPalLink(inv: Invoice) {
    if (!project) return "#";
    const params = new URLSearchParams({
      cmd: "_xclick",
      business: inv.paypal_email,
      item_name: `${inv.invoice_number} — ${project.name}`,
      amount: inv.total_amount.toFixed(2),
      currency_code: "USD",
      no_shipping: "1",
    });
    return `https://www.paypal.com/cgi-bin/webscr?${params.toString()}`;
  }

  async function payNow(inv: Invoice) {
    setPayingId(inv.id);
    window.open(payPalLink(inv), "_blank", "noopener,noreferrer");
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid" })
      .eq("id", inv.id);
    setPayingId(null);
    if (error) {
      toast({
        title: "Couldn't update invoice status",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Opening PayPal — thanks!" });
    load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function approve(file: ProjectFile) {
    setSavingId(file.id);
    let { error } = await supabase
      .from("files")
      .update({
        approved: true,
        approved_at: new Date().toISOString(),
        review_status: "approved",
      })
      .eq("id", file.id);
    if (error && isReviewWorkflowSchemaError(error)) {
      const legacyUpdate = await supabase
        .from("files")
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
        })
        .eq("id", file.id);
      error = legacyUpdate.error;
    }
    setSavingId(null);
    if (error) {
      toast({
        title: "Couldn't approve",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    await logActivity(
      file.project_id,
      "file_approved",
      `Client approved: ${file.file_name}`,
    );
    toast({ title: "Approved — thanks!" });
    load();
  }

  async function sendFeedback(file: ProjectFile) {
    const text = feedbackDrafts[file.id]?.trim();
    if (!text) return;
    setSavingId(file.id);
    let { error } = await supabase
      .from("files")
      .update({ feedback: text, review_status: "changes_requested" })
      .eq("id", file.id);
    if (error && isReviewWorkflowSchemaError(error)) {
      const legacyUpdate = await supabase
        .from("files")
        .update({ feedback: text })
        .eq("id", file.id);
      error = legacyUpdate.error;
    }
    setSavingId(null);
    if (error) {
      toast({
        title: "Couldn't send feedback",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    await logActivity(
      file.project_id,
      "feedback_submitted",
      `Client left feedback on: ${file.file_name}`,
    );
    await logActivity(
      file.project_id,
      "changes_requested",
      `Client requested changes on: ${file.file_name}`,
    );
    toast({ title: "Feedback sent" });
    setFeedbackDrafts((d) => ({ ...d, [file.id]: "" }));
    load();
  }

  async function requestChanges(file: ProjectFile) {
    setSavingId(file.id);
    const { error } = await supabase
      .from("files")
      .update({ review_status: "changes_requested" })
      .eq("id", file.id);
    setSavingId(null);
    if (error) {
      toast({
        title: isReviewWorkflowSchemaError(error)
          ? "Add feedback to request changes"
          : "Couldn't request changes",
        description: isReviewWorkflowSchemaError(error)
          ? "The review setup is not finished yet. Add a note for your freelancer instead."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    await logActivity(
      file.project_id,
      "changes_requested",
      `Client requested changes on: ${file.file_name}`,
    );
    toast({ title: "Changes requested" });
    load();
  }

  const accentColor = branding?.accent_color ?? null;
  const hslOverride =
    accentColor && accentColor.startsWith("#") && accentColor.length === 7
      ? hexToHsl(accentColor)
      : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {hslOverride && (
          <style>{`:root { --primary: ${hslOverride}; }`}</style>
        )}
        <Header subtitle="Client review" />
        <div className="max-w-4xl mx-auto px-6 py-12 text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Header subtitle="Client review" />
        <div className="max-w-4xl mx-auto px-6 py-12">
          <Card>
            <CardContent className="py-12 text-center">
              <h1 className="text-2xl font-semibold mb-2">Link not found</h1>
              <p className="text-muted-foreground">
                This review link is invalid or has been removed. Please ask your
                freelancer for a new one.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const pendingCount = visibleFiles.filter(
    (f) => (f.review_status ?? (f.approved ? "approved" : "pending")) !== "approved",
  ).length;

  return (
    <div className="min-h-screen bg-background">
      {hslOverride && (
        <style>{`:root { --primary: ${hslOverride}; }`}</style>
      )}
      <Header
        subtitle="Client review"
        brandLogoUrl={branding?.logo_url}
        brandName={branding?.display_name}
        brandColor={accentColor}
      />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <Badge variant="outline" className="mb-3">
            Review portal
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome, {project.client_name}. Review the files below, leave
            feedback, and approve when you're ready.
          </p>
          {files.length > 0 && (
            <div className="mt-3 text-sm text-muted-foreground">
              {pendingCount > 0
                ? `${pendingCount} file${pendingCount === 1 ? "" : "s"} awaiting your review`
                : "All files have been approved — thanks!"}
            </div>
          )}
        </div>

        {visibleFiles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <FileIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium">No files yet</h3>
              <p className="text-muted-foreground">
                Your freelancer hasn't uploaded anything yet. Check back soon.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleFiles.map((f) => {
              const draft = feedbackDrafts[f.id] ?? "";
              const reviewStatus =
                f.review_status ?? (f.approved ? "approved" : "pending");
              return (
                <Card key={f.id} data-testid={`card-client-file-${f.id}`}>
                  <CardContent className="py-5 space-y-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="h-11 w-11 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                          <FileIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">
                            {f.file_name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Version {f.version_number ?? 1} ·{" "}
                            {formatBytes(f.file_size)} · shared{" "}
                            {format(new Date(f.created_at), "MMM d, yyyy")}
                          </div>
                          {f.approved && f.approved_at && (
                            <div className="text-xs text-emerald-700 mt-1.5 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              You approved this on{" "}
                              {format(
                                new Date(f.approved_at),
                                "MMM d, yyyy 'at' h:mm a",
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                            {reviewStatus === "approved" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                            ) : reviewStatus === "changes_requested" ? (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Needs changes
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
                        <a
                          href={f.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`link-download-${f.id}`}
                        >
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </a>
                      </div>
                    </div>

                    {f.feedback && (
                      <div className="text-sm bg-muted/50 rounded-md p-3 border border-border/60">
                        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                          <MessageSquare className="h-3 w-3" />
                          Your feedback
                        </div>
                        {f.feedback}
                      </div>
                    )}

                    {!f.approved && (
                      <div className="space-y-3 pt-1 border-t border-border/60">
                        <div className="space-y-2">
                          <Textarea
                            placeholder={
                              f.feedback
                                ? "Update your feedback…"
                                : "Leave feedback for your freelancer…"
                            }
                            value={draft}
                            onChange={(e) =>
                              setFeedbackDrafts((d) => ({
                                ...d,
                                [f.id]: e.target.value,
                              }))
                            }
                            rows={2}
                            data-testid={`input-feedback-${f.id}`}
                          />
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendFeedback(f)}
                              disabled={!draft.trim() || savingId === f.id}
                              data-testid={`button-feedback-${f.id}`}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Send feedback
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => requestChanges(f)}
                              disabled={savingId === f.id}
                              data-testid={`button-request-changes-${f.id}`}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Request changes
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => approve(f)}
                              disabled={savingId === f.id}
                              data-testid={`button-approve-${f.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {invoices.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Invoices</h2>
            </div>
            <div className="space-y-4">
              {invoices.map((inv) => (
                <Card key={inv.id} data-testid={`card-client-invoice-${inv.id}`}>
                  <CardContent className="py-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-medium">{inv.invoice_number}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Due {format(new Date(inv.due_date), "MMM d, yyyy")}
                        </div>
                        <div className="mt-3 space-y-1">
                          {inv.line_items.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between gap-4 text-sm text-muted-foreground"
                            >
                              <span className="truncate">{item.description}</span>
                              <span className="font-mono">
                                ${item.amount.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between gap-4 text-sm font-semibold pt-2 mt-2 border-t border-border/60">
                          <span>Total</span>
                          <span>${inv.total_amount.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {inv.status === "paid" ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Paid
                          </Badge>
                        ) : (
                          <Button
                            onClick={() => payNow(inv)}
                            disabled={payingId === inv.id}
                            data-testid={`button-pay-now-${inv.id}`}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 text-center text-xs text-muted-foreground">
          {branding?.display_name
            ? `Powered by ${branding.display_name}`
            : "Powered by Parlo"}
        </div>
      </main>
    </div>
  );
}
