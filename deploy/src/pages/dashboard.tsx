import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  Plus,
  FolderOpen,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Settings,
  DollarSign,
  TrendingUp,
  Hourglass,
  Upload,
  ArrowUpRight,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  supabase,
  Project,
  ProjectFile,
  ProjectStatus,
  PROJECT_STATUSES,
  Invoice,
  FreelancerSettings,
  STORAGE_BUCKET,
  loadAllProjectFiles,
} from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  BillingSubscription,
  FREE_PROJECT_LIMIT,
  LEMON_SQUEEZY_CHECKOUT_URL,
  isActiveSubscription,
  isProUser,
} from "@/lib/billing";

type ProjectWithStats = Project & {
  fileCount: number;
  pendingCount: number;
  approvedCount: number;
};

function generateShareToken() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

const DEFAULT_ACCENT = "#d4521a";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [isPro, setIsPro] = useState(() => isProUser(user));
  const [billingLoading, setBillingLoading] = useState(Boolean(user));
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const activeProjectCount = projects.filter((project) => project.status === "active").length;
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const { toast } = useToast();

  // Revenue
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [outstanding, setOutstanding] = useState(0);
  const [thisMonthRevenue, setThisMonthRevenue] = useState(0);

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState<FreelancerSettings | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  async function loadProjects() {
    if (!user) return;
    setLoading(true);
    const { data: projectsData, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Couldn't load projects",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: filesData } = await loadAllProjectFiles();

    const stats = new Map<
      string,
      { fileCount: number; pendingCount: number; approvedCount: number }
    >();
    const latestByGroup = new Map<string, ProjectFile>();
    (filesData ?? []).forEach((f: ProjectFile) => {
      const groupKey = `${f.project_id}:${f.version_group_id ?? f.id}`;
      const existing = latestByGroup.get(groupKey);
      if (
        !existing ||
        (f.version_number ?? 1) > (existing.version_number ?? 1)
      ) {
        latestByGroup.set(groupKey, f);
      }
    });
    latestByGroup.forEach((f) => {
      const cur = stats.get(f.project_id) ?? {
        fileCount: 0,
        pendingCount: 0,
        approvedCount: 0,
      };
      cur.fileCount++;
      if (
        (f.review_status ?? (f.approved ? "approved" : "pending")) ===
        "approved"
      ) {
        cur.approvedCount++;
      }
      else cur.pendingCount++;
      stats.set(f.project_id, cur);
    });

    const projectList = (projectsData ?? []).map((p: Project) => ({
      ...p,
      ...(stats.get(p.id) ?? {
        fileCount: 0,
        pendingCount: 0,
        approvedCount: 0,
      }),
    }));
    setProjects(projectList);
    setLoading(false);

    // Fetch invoices for revenue stats
    if (projectList.length > 0) {
      const ids = projectList.map((p: Project) => p.id);
      const { data: invoices } = await supabase
        .from("invoices")
        .select("total_amount, status, created_at")
        .in("project_id", ids);

      if (invoices) {
        const now = new Date();
        const monthStart = startOfMonth(now).toISOString();
        const monthEnd = endOfMonth(now).toISOString();
        let rev = 0;
        let out = 0;
        let monthRev = 0;
        (invoices as Pick<Invoice, "total_amount" | "status" | "created_at">[]).forEach((inv) => {
          if (inv.status === "paid") {
            rev += inv.total_amount;
            if (inv.created_at >= monthStart && inv.created_at <= monthEnd) {
              monthRev += inv.total_amount;
            }
          } else if (inv.status === "sent") {
            out += inv.total_amount;
          }
        });
        setTotalRevenue(rev);
        setOutstanding(out);
        setThisMonthRevenue(monthRev);
      }
    }
  }

  async function loadSubscription() {
    if (!user) {
      setIsPro(false);
      setBillingLoading(false);
      return;
    }

    setBillingLoading(true);
    const { data, error } = await supabase
      .from("subscriptions")
      .select("status, ends_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      setIsPro(isActiveSubscription(data as BillingSubscription));
    } else {
      // Keep legacy metadata support while a workspace is applying the migration.
      setIsPro(isProUser(user));
    }
    setBillingLoading(false);
  }

  async function loadSettings() {
    if (!user) return;
    const { data } = await supabase
      .from("freelancer_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setSettings(data as FreelancerSettings);
      setDisplayName(data.display_name ?? "");
      setAccentColor(data.accent_color ?? DEFAULT_ACCENT);
      setLogoPreview(data.logo_url ?? null);
    }
  }

  useEffect(() => {
    loadProjects();
    loadSubscription();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const refreshSubscription = () => {
      if (document.visibilityState === "visible") {
        loadSubscription();
      }
    };

    window.addEventListener("focus", refreshSubscription);
    document.addEventListener("visibilitychange", refreshSubscription);
    return () => {
      window.removeEventListener("focus", refreshSubscription);
      document.removeEventListener("visibilitychange", refreshSubscription);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !clientName.trim() || !clientEmail.trim()) return;

    if (!isPro && activeProjectCount >= FREE_PROJECT_LIMIT) {
      setOpen(false);
      setLimitDialogOpen(true);
      return;
    }

    setSubmitting(true);

    const { count, error: countError } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .eq("status", "active");

    if (countError) {
      setSubmitting(false);
      toast({
        title: "Couldn't check project limit",
        description: countError.message,
        variant: "destructive",
      });
      return;
    }

    if (!isPro && (count ?? 0) >= FREE_PROJECT_LIMIT) {
      setSubmitting(false);
      setOpen(false);
      setLimitDialogOpen(true);
      return;
    }

    const share_token = generateShareToken();
    const { error } = await supabase.from("projects").insert({
      name: name.trim(),
      client_name: clientName.trim(),
      client_email: clientEmail.trim(),
      status: "active",
      share_token,
      user_id: user!.id,
    });
    setSubmitting(false);
    if (error) {
      if (error.message.includes("FREE_PROJECT_LIMIT_REACHED")) {
        setOpen(false);
        setLimitDialogOpen(true);
        return;
      }
      toast({
        title: "Couldn't create project",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Project created" });
    setName("");
    setClientName("");
    setClientEmail("");
    setOpen(false);
    loadProjects();
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Logo must be under 2 MB", variant: "destructive" });
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);

    // Explicitly get a fresh session so the Supabase client has a valid JWT
    // before making any authenticated DB calls. This also handles token
    // expiry — getSession() refreshes automatically when needed.
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    const {
      data: { user: authenticatedUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (
      sessionError ||
      userError ||
      !session?.access_token ||
      !authenticatedUser ||
      authenticatedUser.id !== session.user.id
    ) {
      toast({
        title: "Session expired",
        description: "Please sign in again and retry.",
        variant: "destructive",
      });
      setSavingSettings(false);
      return;
    }

    // Use the UUID straight from the live session — never from React state.
    const userId = authenticatedUser.id;
    console.info("[Parlo] branding save authenticated", {
      userId,
      hasAccessToken: Boolean(session.access_token),
    });
    let logoUrl = settings?.logo_url ?? null;

    if (logoFile) {
      const ext = logoFile.name.split(".").pop() ?? "png";
      // Use a new object for each upload. This avoids Supabase treating the
      // request as an overwrite, which requires a separate UPDATE RLS policy.
      const path = `settings/${userId}/logo-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, logoFile, {
          upsert: false,
          contentType: logoFile.type,
          cacheControl: "3600",
        });
      if (uploadError) {
        console.error("[Parlo] logo storage upload failed", {
          bucket: STORAGE_BUCKET,
          path,
          error: uploadError,
        });
        toast({
          title: "Couldn't upload logo (storage)",
          description: uploadError.message,
          variant: "destructive",
        });
        setSavingSettings(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);
      logoUrl = urlData.publicUrl;
    }

    const payload = {
      user_id: userId,
      display_name: displayName.trim() || null,
      logo_url: logoUrl,
      accent_color: accentColor,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("freelancer_settings")
      .upsert(payload, { onConflict: "user_id" });

    setSavingSettings(false);

    if (error) {
      console.error("[Parlo] freelancer_settings upsert failed", {
        userId,
        error,
      });
      toast({
        title: "Couldn't save settings (database)",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Settings saved" });
    setLogoFile(null);
    setSettingsOpen(false);
    loadSettings();
  }

  const totalPending = projects.reduce((s, p) => s + p.pendingCount, 0);
  const totalApproved = projects.reduce((s, p) => s + p.approvedCount, 0);
  const hasRevenue = totalRevenue > 0 || outstanding > 0 || thisMonthRevenue > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header
        subtitle="Freelancer dashboard"
        onLogout={signOut}
        userEmail={user?.email}
        userId={user?.id}
        isPro={isPro}
        showUpgrade={!isPro && !billingLoading}
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage client work and review approvals.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4 mr-2" />
              Brand settings
            </Button>
            <Dialog
              open={open}
              onOpenChange={(nextOpen) => {
                if (nextOpen && !isPro && activeProjectCount >= FREE_PROJECT_LIMIT) {
                  setLimitDialogOpen(true);
                  return;
                }
                setOpen(nextOpen);
              }}
            >
              <DialogTrigger asChild>
                <Button data-testid="button-new-project">
                  <Plus className="mr-2 h-4 w-4" />
                  New project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a new project</DialogTitle>
                  <DialogDescription>
                    You'll get a unique link to share with your client.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Website redesign"
                      required
                      data-testid="input-project-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client name</Label>
                    <Input
                      id="clientName"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                      data-testid="input-client-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientEmail">Client email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="jane@acme.com"
                      required
                      data-testid="input-client-email"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={submitting}
                      data-testid="button-create-project"
                    >
                      {submitting ? "Creating..." : "Create project"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Free plan project limit dialog */}
        <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Project limit reached</DialogTitle>
              <DialogDescription>
                You've reached the free limit. Upgrade to Pro for unlimited projects
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm text-muted-foreground">
              Pro also includes invoicing, brand settings, and priority support for $9/month.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLimitDialogOpen(false)}>
                Maybe later
              </Button>
              <Button asChild>
                <a
                  href={LEMON_SQUEEZY_CHECKOUT_URL}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="button-limit-upgrade"
                >
                  Upgrade to Pro
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Brand settings dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Brand settings</DialogTitle>
              <DialogDescription>
                Your logo and accent color appear on client portals.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* Logo */}
              <div className="space-y-2">
                <Label>Your logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-14 w-14 rounded-lg object-contain border border-border bg-muted"
                    />
                  ) : (
                    <div
                      className="h-14 w-14 rounded-lg border border-dashed border-border bg-muted flex items-center justify-center text-muted-foreground text-xl font-bold"
                    >
                      P
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {logoPreview ? "Change logo" : "Upload logo"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, SVG · Max 2 MB
                    </p>
                  </div>
                </div>
              </div>

              {/* Display name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Your business name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Acme Studio"
                />
                <p className="text-xs text-muted-foreground">
                  Shown in the client portal header instead of "Parlo".
                </p>
              </div>

              {/* Accent color */}
              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent color</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="accentColor"
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="h-10 w-14 rounded border border-border cursor-pointer p-0.5"
                  />
                  <span className="text-sm text-muted-foreground font-mono">
                    {accentColor}
                  </span>
                  <div
                    className="flex-1 h-10 rounded-md border border-border"
                    style={{ backgroundColor: accentColor, opacity: 0.15 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for the portal header accent and buttons.
                </p>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={savingSettings}>
                  {savingSettings ? "Saving..." : "Save settings"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Revenue stats */}
        {hasRevenue && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Revenue
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <RevenueCard
                icon={<DollarSign className="h-5 w-5" />}
                label="Total revenue"
                value={totalRevenue}
              />
              <RevenueCard
                icon={<Hourglass className="h-5 w-5" />}
                label="Outstanding"
                value={outstanding}
                highlight={outstanding > 0}
              />
              <RevenueCard
                icon={<TrendingUp className="h-5 w-5" />}
                label={`This month (${format(new Date(), "MMM")})`}
                value={thisMonthRevenue}
              />
            </div>
          </div>
        )}

        {/* Project stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <StatCard
            icon={<FolderOpen className="h-5 w-5" />}
            label="Active projects"
            value={projects.length}
          />
          <StatCard
            icon={<Clock className="h-5 w-5" />}
            label="Pending approvals"
            value={totalPending}
            highlight={totalPending > 0}
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Approved files"
            value={totalApproved}
          />
        </div>

        {totalPending > 0 && (
          <ReminderBar
            projects={projects.filter((p) => p.pendingCount > 0)}
          />
        )}

        {loading ? (
          <div className="text-muted-foreground py-12 text-center">
            Loading projects…
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first project to start sharing files with clients.
              </p>
              <Button
                onClick={() => setOpen(true)}
                data-testid="button-create-first-project"
              >
                <Plus className="mr-2 h-4 w-4" />
                New project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                data-testid={`link-project-${p.id}`}
              >
                <Card className="hover-elevate cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <CardTitle className="text-lg">{p.name}</CardTitle>
                        <StatusBadge status={p.status} />
                      </div>
                      {p.pendingCount > 0 ? (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20 shrink-0"
                        >
                          {p.pendingCount} pending
                        </Badge>
                      ) : p.fileCount > 0 ? (
                        <Badge variant="outline" className="shrink-0">All approved</Badge>
                      ) : (
                        <Badge variant="outline" className="shrink-0">No files</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {p.client_name} · {p.client_email}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Created{" "}
                      {format(new Date(p.created_at), "MMM d, yyyy")}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  draft:     "bg-gray-100 text-gray-600 border-gray-200",
  active:    "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived:  "bg-muted text-muted-foreground border-border",
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  const label = PROJECT_STATUSES.find((s) => s.value === status)?.label ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.active}`}
    >
      {label}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="py-4 flex items-center gap-3">
        <div
          className={`h-9 w-9 rounded-lg flex items-center justify-center ${
            highlight
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <div>
          <div className="text-xl font-semibold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function RevenueCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="py-5 flex items-center gap-4">
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center ${
            highlight
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <div>
          <div className="text-2xl font-semibold leading-none">
            ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReminderBar({ projects }: { projects: ProjectWithStats[] }) {
  function buildReminderMailto(p: ProjectWithStats) {
    const link = `${window.location.origin}${import.meta.env.BASE_URL}client/${p.share_token}`;
    const subject = encodeURIComponent(`Reminder: pending approval for ${p.name}`);
    const body = encodeURIComponent(
      `Hi ${p.client_name},\n\nJust a friendly reminder that there ${p.pendingCount === 1 ? "is 1 file" : `are ${p.pendingCount} files`} waiting for your review on the ${p.name} project.\n\nReview here: ${link}\n\nThanks!`,
    );
    return `mailto:${p.client_email}?subject=${subject}&body=${body}`;
  }

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">Pending approval reminders</div>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              Send a quick nudge to clients with files awaiting review.
            </p>
            <div className="flex flex-wrap gap-2">
              {projects.map((p) => (
                <a
                  key={p.id}
                  href={buildReminderMailto(p)}
                  data-testid={`link-remind-${p.id}`}
                >
                  <Button size="sm" variant="outline" className="h-8">
                    <Mail className="h-3 w-3 mr-1.5" />
                    Remind {p.client_name} ({p.pendingCount})
                  </Button>
                </a>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
