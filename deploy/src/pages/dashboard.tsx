import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { differenceInCalendarDays, format, parseISO, startOfDay, startOfMonth, endOfMonth } from "date-fns";
import {
  ArrowRight,
  CalendarDays,
  MessageSquare,
  Receipt,
  Plus,
  FolderOpen,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Settings,
  Moon,
  Sun,
  Search,
  DollarSign,
  TrendingUp,
  Hourglass,
  Upload,
  ArrowUpRight,
  ListTodo,
  Check,
} from "lucide-react";
import { Header } from "@/components/Header";
import { ProjectAvatar } from "@/components/ProjectAvatar";
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
  CalendarEvent,
} from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  BillingSubscription,
  FREE_PROJECT_LIMIT,
  LEMON_SQUEEZY_CHECKOUT_URL,
  isActiveSubscription,
  isProUser,
} from "@/lib/billing";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import OnboardingChecklist, {
  Step as OnboardingStep,
} from "@/components/OnboardingChecklist";

type ProjectWithStats = Project & {
  fileCount: number;
  pendingCount: number;
  approvedCount: number;
  changesRequestedCount: number;
};

function generateShareToken() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

const DEFAULT_ACCENT = "#d4521a";

function localDateKey(date = new Date()) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function getDashboardGreeting(name: string) {
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return name ? `${timeGreeting}, ${name}` : "Welcome to Parlo";
}

function getWorkspaceMessage(
  loading: boolean,
  projectCount: number,
  activeProjectCount: number,
  pendingCount: number,
) {
  if (loading) return "Loading your workspace...";
  if (pendingCount > 0) {
    return `You have ${pendingCount} file${pendingCount === 1 ? "" : "s"} waiting for client approval.`;
  }
  if (activeProjectCount > 0) {
    return `${activeProjectCount} active project${activeProjectCount === 1 ? "" : "s"} ${
      activeProjectCount === 1 ? "is" : "are"
    } moving forward.`;
  }
  if (projectCount > 0) {
    return "Your workspace is clear. Start a new project when you’re ready.";
  }
  return "Let’s set up your first project.";
}

export default function Dashboard() {
  const { user, signOut, updatePreferredName } = useAuth();
  const [, setLocation] = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const [isPro, setIsPro] = useState(() => isProUser(user));
  const [billingLoading, setBillingLoading] = useState(Boolean(user));
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [calendarTasks, setCalendarTasks] = useState<CalendarEvent[]>([]);
  const activeProjectCount = projects.filter((project) => project.status === "active").length;
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectView, setProjectView] = useState<"all" | ProjectStatus>("all");
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [portalLinkCopied, setPortalLinkCopied] = useState(false);
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
  const [preferredName, setPreferredName] = useState("");
  const [namePromptValue, setNamePromptValue] = useState("");
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [savingPreferredName, setSavingPreferredName] = useState(false);
  const hasPromptedForName = useRef(false);
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
      setInvoices([]);
      setLoading(false);
      return;
    }

    const { data: filesData } = await loadAllProjectFiles();

    const stats = new Map<
      string,
      { fileCount: number; pendingCount: number; approvedCount: number; changesRequestedCount: number }
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
        changesRequestedCount: 0,
      };
      cur.fileCount++;
      const reviewStatus = f.review_status ?? (f.approved ? "approved" : "pending");
      if (reviewStatus === "approved") {
        cur.approvedCount++;
      } else {
        cur.pendingCount++;
        if (reviewStatus === "changes_requested") cur.changesRequestedCount++;
      }
      stats.set(f.project_id, cur);
    });

    const projectList = (projectsData ?? []).map((p: Project) => ({
      ...p,
      ...(stats.get(p.id) ?? {
        fileCount: 0,
        pendingCount: 0,
        approvedCount: 0,
        changesRequestedCount: 0,
      }),
    }));
    setProjects(projectList);

    const { data: openTasks } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .eq("event_type", "task")
      .is("completed_at", null)
      .lte("event_date", localDateKey())
      .order("event_date", { ascending: true });
    setCalendarTasks((openTasks ?? []) as CalendarEvent[]);

    // Fetch invoices for revenue stats
    if (projectList.length > 0) {
      const ids = projectList.map((p: Project) => p.id);
      const { data: invoices } = await supabase
        .from("invoices")
        .select("*")
        .in("project_id", ids);

      setInvoices((invoices ?? []) as Invoice[]);
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
    } else {
      setInvoices([]);
      setTotalRevenue(0);
      setOutstanding(0);
      setThisMonthRevenue(0);
    }
    setLoading(false);
  }

  async function completeTodayTask(taskId: string) {
    const { error } = await supabase
      .from("calendar_events")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", taskId)
      .eq("user_id", user?.id ?? "");
    if (error) {
      toast({ title: "Couldn't complete task", description: error.message, variant: "destructive" });
      return;
    }
    setCalendarTasks((tasks) => tasks.filter((task) => task.id !== taskId));
    toast({ title: "Task completed" });
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
    const nameFromMetadata =
      typeof user?.user_metadata?.preferred_name === "string"
        ? user.user_metadata.preferred_name.trim()
        : "";

    setPreferredName(nameFromMetadata);
    setNamePromptValue(nameFromMetadata);
    const onboardingMetadata = user?.user_metadata ?? {};
    setOnboardingDismissed(
      onboardingMetadata.parlo_onboarding_dismissed === true ||
        readOnboardingFlag(user?.id, "dismissed"),
    );
    setPortalLinkCopied(
      onboardingMetadata.parlo_onboarding_portal_link_copied === true ||
        readOnboardingFlag(user?.id, "portal_link_copied"),
    );
    if (user && !nameFromMetadata && !hasPromptedForName.current) {
      hasPromptedForName.current = true;
      setNamePromptOpen(true);
    }

    loadProjects();
    loadSubscription();
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleSavePreferredName(e: React.FormEvent) {
    e.preventDefault();
    const nextName = namePromptValue.trim();
    if (!nextName) return;

    setSavingPreferredName(true);
    const { error } = await updatePreferredName(nextName);
    setSavingPreferredName(false);

    if (error) {
      toast({
        title: "Couldn't save your name",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setPreferredName(nextName);
    setNamePromptOpen(false);
  }

  function readOnboardingFlag(userId: string | undefined, flag: string) {
    if (!userId) return false;
    try {
      return (
        window.localStorage.getItem(`parlo:onboarding:${userId}:${flag}`) ===
        "true"
      );
    } catch {
      return false;
    }
  }

  async function saveOnboardingFlag(metadataKey: string, localFlag: string) {
    if (!user) return false;
    try {
      window.localStorage.setItem(
        `parlo:onboarding:${user.id}:${localFlag}`,
        "true",
      );
    } catch {
      // Auth metadata remains the cross-device source of truth.
    }

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          [metadataKey]: true,
        },
      });
      return !error;
    } catch {
      return false;
    }
  }

  async function handleDismissOnboarding() {
    setOnboardingDismissed(true);
    const saved = await saveOnboardingFlag(
      "parlo_onboarding_dismissed",
      "dismissed",
    );
    if (!saved) {
      toast({
        title: "Checklist hidden",
        description: "Its dismissal is saved on this device.",
      });
    }
  }

  const starterProject =
    projects.find((project) => project.status === "active") ?? projects[0];

  async function handleCopyStarterPortal() {
    if (!starterProject) {
      setOpen(true);
      return;
    }

    const portalUrl = new URL(
      `${import.meta.env.BASE_URL}client/${starterProject.share_token}`,
      window.location.origin,
    ).toString();

    try {
      await navigator.clipboard.writeText(portalUrl);
      setPortalLinkCopied(true);
      const saved = await saveOnboardingFlag(
        "parlo_onboarding_portal_link_copied",
        "portal_link_copied",
      );
      toast({
        title: "Client portal link copied",
        description: saved
          ? "It’s ready to share with your client."
          : "The link is copied; progress is saved on this device.",
      });
    } catch {
      toast({
        title: "Couldn't copy portal link",
        description: "Open the project to copy its link manually.",
        variant: "destructive",
      });
    }
  }

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

    const nextPreferredName = preferredName.trim();
    const currentPreferredName =
      typeof authenticatedUser.user_metadata?.preferred_name === "string"
        ? authenticatedUser.user_metadata.preferred_name.trim()
        : "";
    if (nextPreferredName !== currentPreferredName) {
      const { error: preferredNameError } =
        await updatePreferredName(nextPreferredName);
      if (preferredNameError) {
        toast({
          title: "Couldn't save your name",
          description: preferredNameError,
          variant: "destructive",
        });
        setSavingSettings(false);
        return;
      }
    }

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

  const totalPending = projects.reduce((s, p) => s + Math.max(0, p.pendingCount - p.changesRequestedCount), 0);
  const totalApproved = projects.reduce((s, p) => s + p.approvedCount, 0);
  const hasRevenue = totalRevenue > 0 || outstanding > 0 || thisMonthRevenue > 0;
  const normalizedProjectSearch = projectSearch.trim().toLowerCase();
  const visibleProjects = normalizedProjectSearch
    ? projects.filter(
        (project) =>
          project.name.toLowerCase().includes(normalizedProjectSearch) ||
          project.client_name.toLowerCase().includes(normalizedProjectSearch),
      )
    : projects;
  const projectsInView = projectView === "all"
    ? visibleProjects
    : visibleProjects.filter((project) => project.status === projectView);
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);
  const dashboardGreeting = getDashboardGreeting(preferredName);
  const workspaceMessage = getWorkspaceMessage(
    loading,
    projects.length,
    activeProjectCount,
    totalPending,
  );
  const hasCustomBranding = Boolean(
    settings?.display_name?.trim() ||
      settings?.logo_url ||
      (settings?.accent_color &&
        settings.accent_color.toLowerCase() !== DEFAULT_ACCENT.toLowerCase()),
  );
  const onboardingSteps: OnboardingStep[] = [
    {
      id: "project",
      title: "Create your first project",
      description: projects.length
        ? "Your project workspace is ready."
        : "Add a project and your client’s details.",
      complete: projects.length > 0,
      actionLabel: "Create project",
      onAction: () => setOpen(true),
    },
    {
      id: "brand",
      title: "Make the portal yours",
      description: hasCustomBranding
        ? "Your client portal reflects your business."
        : "Add your business name, logo, or brand color when you’re ready.",
      complete: hasCustomBranding,
      optional: true,
      actionLabel: "Customize",
      onAction: () => setSettingsOpen(true),
    },
    {
      id: "file",
      title: "Add your first deliverable",
      description: projects.some((project) => project.fileCount > 0)
        ? "A deliverable is ready for client review."
        : "Upload a file so your client can review your work.",
      complete: projects.some((project) => project.fileCount > 0),
      actionLabel: starterProject ? "Add a file" : "Create project",
      onAction: () =>
        starterProject
          ? setLocation(`/projects/${starterProject.id}`)
          : setOpen(true),
    },
    {
      id: "share",
      title: "Share your client portal",
      description: portalLinkCopied
        ? "Your portal link is copied and ready to send."
        : "Copy your secure portal link to share it with a client.",
      complete: portalLinkCopied,
      actionLabel: starterProject ? "Copy portal link" : "Create project",
      onAction: handleCopyStarterPortal,
    },
  ];

  const todayActions = buildTodayActions(projects, invoices, calendarTasks);

  return (
    <div className="min-h-screen bg-background">
      <Header
        subtitle={preferredName ? `${preferredName}'s workspace` : "Freelancer dashboard"}
        onLogout={signOut}
        userEmail={user?.email}
        userId={user?.id}
        isPro={isPro}
        showUpgrade={!isPro && !billingLoading}
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 overflow-hidden rounded-2xl border border-primary/15 bg-primary/5 shadow-sm">
          <div className="flex items-start justify-between gap-6 flex-wrap p-5 sm:p-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Workspace
                </span>
                {isPro ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                    Pro workspace
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-background/60">
                    {activeProjectCount} of {FREE_PROJECT_LIMIT} active
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                {dashboardGreeting}
              </h1>
              <p className="text-muted-foreground mt-1.5 max-w-xl">
                {workspaceMessage}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                  placeholder="Search projects..."
                  aria-label="Search projects"
                  className="h-9 pl-9"
                  data-testid="input-project-search"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                data-testid="button-settings"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
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
        </div>

        {!loading && !onboardingDismissed && (
          <div className="mb-6">
            <OnboardingChecklist
              steps={onboardingSteps}
              onDismiss={handleDismissOnboarding}
            />
          </div>
        )}

        {projects.length > 0 && <TodayQueue actions={todayActions} loading={loading} onCompleteTask={completeTodayTask} />}

        <Dialog open={namePromptOpen} onOpenChange={setNamePromptOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>What should we call you?</DialogTitle>
              <DialogDescription>
                This private name personalizes your dashboard and can be changed
                later in Settings.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSavePreferredName} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="preferredName">Your name</Label>
                <Input
                  id="preferredName"
                  value={namePromptValue}
                  onChange={(e) => setNamePromptValue(e.target.value)}
                  placeholder="e.g. Alex"
                  autoFocus
                  required
                  maxLength={80}
                  data-testid="input-preferred-name"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setNamePromptOpen(false)}
                >
                  Not now
                </Button>
                <Button
                  type="submit"
                  disabled={savingPreferredName || !namePromptValue.trim()}
                  data-testid="button-save-preferred-name"
                >
                  {savingPreferredName ? "Saving..." : "Save name"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
              <DialogTitle>Settings</DialogTitle>
              <DialogDescription>
                Your logo and accent color appear on client portals.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-3.5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-background p-2 text-muted-foreground">
                    {resolvedTheme === "dark" ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="theme-toggle" className="text-sm font-medium">
                      Dark mode
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Use a darker color scheme across Parlo.
                    </p>
                  </div>
                </div>
                <Switch
                  id="theme-toggle"
                  checked={resolvedTheme === "dark"}
                  onCheckedChange={(checked) =>
                    setTheme(checked ? "dark" : "light")
                  }
                  aria-label="Toggle dark mode"
                />
              </div>

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
                <Label htmlFor="preferredName-settings">Your name</Label>
                <Input
                  id="preferredName-settings"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="e.g. Alex"
                  maxLength={80}
                />
                <p className="text-xs text-muted-foreground">
                  Used for your private dashboard greeting. Clients won’t see it.
                </p>
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

        {projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <StatCard
              icon={<FolderOpen className="h-5 w-5" />}
              label="Active projects"
              value={activeProjectCount}
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
        )}


        {loading ? (
          <div className="text-muted-foreground py-12 text-center">
            Loading projects…
          </div>
        ) : projects.length === 0 ? (
          <Card className="overflow-hidden border-primary/20 bg-primary/5">
            <CardContent className="p-0">
              <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                <div className="p-6 sm:p-8">
                  <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                    Your first project
                  </Badge>
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight max-w-md">
                    A smoother way to send work to clients.
                  </h2>
                  <p className="text-muted-foreground mt-3 max-w-md">
                    Create a project, upload your deliverables, and give your client one simple place to review everything.
                  </p>
                  <Button
                    className="mt-6"
                    onClick={() => setOpen(true)}
                    data-testid="button-create-first-project"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first project
                  </Button>
                </div>

                <div className="border-t lg:border-t-0 lg:border-l border-primary/10 bg-background/65 p-6 sm:p-8">
                  <p className="text-sm font-semibold text-foreground mb-5">
                    How Parlo works
                  </p>
                  <div className="space-y-5">
                    <div className="flex gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <FolderOpen className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">1. Create a project</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Add the project name and your client’s details.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Upload className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">2. Upload your work</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Share files through a private client portal.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">3. Get clear approvals</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          See feedback, approvals, and outstanding work in one place.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : projectsInView.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Search className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium">No matching projects</h3>
              <p className="text-muted-foreground mb-4">
                Try a different project or client name.
              </p>
              <Button
                variant="outline"
                onClick={() => setProjectSearch("")}
                data-testid="button-clear-project-search"
              >
                Clear search
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-7">
            <aside className="rounded-xl border border-border bg-card p-3.5 lg:sticky lg:top-24">
              <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Project views</div>
              <nav className="flex flex-wrap gap-1 lg:flex-col" aria-label="Project views">
                {(["all", ...PROJECT_STATUSES.map((status) => status.value)] as ("all" | ProjectStatus)[]).map((view) => {
                  const label = view === "all" ? "All projects" : PROJECT_STATUSES.find((status) => status.value === view)?.label ?? view;
                  const count = view === "all" ? projects.length : projects.filter((project) => project.status === view).length;
                  return (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setProjectView(view)}
                      aria-current={projectView === view ? "page" : undefined}
                      className={`flex min-h-9 flex-1 items-center justify-between gap-3 rounded-lg px-2.5 text-left text-sm transition-colors lg:flex-none ${projectView === view ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                    >
                      <span className="flex items-center gap-2"><FolderOpen className="h-4 w-4" />{label}</span>
                      <span className="text-xs tabular-nums">{count}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-4 hidden border-t border-border/70 pt-4 lg:block">
                <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Recent projects</div>
                {recentProjects.length > 0 ? (
                  <div className="space-y-0.5">
                    {recentProjects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        title={project.name}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <ProjectAvatar projectId={project.id} name={project.name} size="sm" />
                        <span className="min-w-0 truncate">{project.name}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="px-2 py-2 text-xs text-muted-foreground">Your recent projects will appear here.</p>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 hidden w-full lg:flex"
                onClick={() => {
                  if (!isPro && activeProjectCount >= FREE_PROJECT_LIMIT) setLimitDialogOpen(true);
                  else setOpen(true);
                }}
                data-testid="button-sidebar-new-project"
              >
                <Plus className="mr-2 h-4 w-4" />New project
              </Button>
            </aside>

            <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/70 px-4 py-4 sm:px-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{projectView === "all" ? "Your workspace" : labelForProjectView(projectView)}</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">{projectView === "all" ? "Projects" : labelForProjectView(projectView)}</h2>
                </div>
                <span className="text-xs text-muted-foreground">{projectsInView.length} {projectsInView.length === 1 ? "project" : "projects"}</span>
              </div>

              <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(130px,1fr)_110px_minmax(150px,1fr)] gap-4 border-b border-border/70 bg-muted/30 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground md:grid md:px-5">
                <span>Project name</span><span>Client</span><span>Status</span><span>Review</span>
              </div>

              <div className="divide-y divide-border/70">
                {projectsInView.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    data-testid={`link-project-${p.id}`}
                    aria-label={`Open ${p.name}, project for ${p.client_name}`}
                    className="block px-4 py-3 transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 md:grid-cols-[minmax(0,1.5fr)_minmax(130px,1fr)_110px_minmax(150px,1fr)] md:gap-4">
                      <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
                        <ProjectAvatar projectId={p.id} name={p.name} size="md" />
                        <span className="min-w-0 truncate text-sm font-medium text-foreground">{p.name}</span>
                        <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground md:hidden" />
                      </div>
                      <div className="min-w-0 pl-12 md:pl-0">
                        <p className="truncate text-sm text-foreground">{p.client_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.client_email}</p>
                      </div>
                      <div className="justify-self-end md:justify-self-start"><StatusBadge status={p.status} /></div>
                      <div className="col-span-2 min-w-0 pl-12 text-xs text-muted-foreground md:col-span-1 md:pl-0">
                        {p.pendingCount > 0 ? (
                          <span className="font-medium text-primary">{p.pendingCount} awaiting review</span>
                        ) : p.fileCount > 0 ? (
                          <span className="text-emerald-700 dark:text-emerald-400">All files approved</span>
                        ) : (
                          <span>No files yet</span>
                        )}
                        {p.changesRequestedCount > 0 && <span className="ml-2 text-amber-700 dark:text-amber-400">· {p.changesRequestedCount} changes requested</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
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

function labelForProjectView(view: "all" | ProjectStatus) {
  if (view === "all") return "All projects";
  return PROJECT_STATUSES.find((status) => status.value === view)?.label ?? view;
}

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

type TodayActionKind = "invoice-overdue" | "feedback" | "client-review" | "invoice-due" | "first-deliverable" | "task";

type TodayAction = {
  id: string;
  kind: TodayActionKind;
  priority: number;
  sortAt?: number;
  title: string;
  detail: string;
  tag: string;
  actionLabel: string;
  href: string;
  external?: boolean;
  taskId?: string;
};

function buildTodayActions(projects: ProjectWithStats[], invoices: Invoice[], calendarTasks: CalendarEvent[]): TodayAction[] {
  const actions: TodayAction[] = [];
  const today = startOfDay(new Date());
  const projectById = new Map(projects.map((project) => [project.id, project]));

  function clientPortalUrl(project: ProjectWithStats) {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
    return window.location.origin + basePath + "/client/" + project.share_token;
  }

  function reminderLink(project: ProjectWithStats, invoice?: Invoice, reviewCount = project.pendingCount) {
    const portalUrl = clientPortalUrl(project);
    const subject = invoice
      ? "Reminder: invoice " + invoice.invoice_number + " for " + project.name
      : "Reminder: files ready for review — " + project.name;
    const message = invoice
      ? "Hi " + project.client_name + ",\n\nJust a friendly reminder that invoice " + invoice.invoice_number + " (" + invoice.total_amount.toLocaleString("en-US", { style: "currency", currency: "USD" }) + ") for " + project.name + " was due " + format(parseISO(invoice.due_date), "MMM d, yyyy") + ".\n\nYou can view and pay it here: " + portalUrl + "\n\nThanks!"
      : "Hi " + project.client_name + ",\n\nJust a friendly reminder that " + reviewCount + " file" + (reviewCount === 1 ? " is" : "s are") + " waiting for your review on " + project.name + ".\n\nReview here: " + portalUrl + "\n\nThanks!";
    return "mailto:" + project.client_email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(message);
  }

  for (const invoice of invoices) {
    if (invoice.status !== "sent" || !invoice.due_date) continue;
    const project = projectById.get(invoice.project_id);
    if (!project) continue;
    const dueDate = parseISO(invoice.due_date);
    if (Number.isNaN(dueDate.getTime())) continue;
    const daysUntilDue = differenceInCalendarDays(dueDate, today);
    const amount = invoice.total_amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
    if (daysUntilDue < 0) {
      actions.push({
        id: "invoice-overdue-" + invoice.id,
        kind: "invoice-overdue",
        priority: 0,
        sortAt: dueDate.getTime(),
        title: "Follow up on an overdue invoice",
        detail: invoice.invoice_number + " for " + project.name + " · " + amount + " · due " + format(dueDate, "MMM d"),
        tag: "Overdue",
        actionLabel: "Draft reminder",
        href: reminderLink(project, invoice),
        external: true,
      });
    } else if (daysUntilDue <= 7) {
      actions.push({
        id: "invoice-due-" + invoice.id,
        kind: "invoice-due",
        priority: daysUntilDue === 0 ? 2 : 4,
        sortAt: dueDate.getTime(),
        title: daysUntilDue === 0 ? "Invoice is due today" : "Invoice due soon",
        detail: invoice.invoice_number + " for " + project.name + " · " + amount + " · " + (daysUntilDue === 0 ? "due today" : "due in " + daysUntilDue + " day" + (daysUntilDue === 1 ? "" : "s")),
        tag: daysUntilDue === 0 ? "Due today" : "Due in " + daysUntilDue + "d",
        actionLabel: "Open project",
        href: "/projects/" + project.id,
      });
    }
  }

  for (const task of calendarTasks) {
    if (task.event_date > localDateKey()) continue;
    const project = task.project_id ? projectById.get(task.project_id) : undefined;
    if (task.project_id && !project) continue;
    const description = task.description?.trim();
    actions.push({
      id: "task-" + task.id,
      kind: "task",
      priority: 2,
      sortAt: parseISO(task.event_date).getTime(),
      title: task.title,
      detail: (project ? project.name + " · " : "") + (description || "Task due today"),
      tag: task.title.startsWith("Review feedback:") ? "Client feedback" : "Task",
      actionLabel: project ? "Open project" : "View workspace",
      href: project ? "/projects/" + project.id : "/",
      taskId: task.id,
    });
  }

  for (const project of projects) {
    const hasFeedbackTask = calendarTasks.some((task) => task.project_id === project.id && task.title.startsWith("Review feedback:"));
    if (project.changesRequestedCount > 0 && !hasFeedbackTask) {
      actions.push({
        id: "feedback-" + project.id,
        kind: "feedback",
        priority: 1,
        title: "Review client feedback",
        detail: project.client_name + " requested changes on " + project.changesRequestedCount + " file" + (project.changesRequestedCount === 1 ? "" : "s") + " in " + project.name + ".",
        tag: "Needs you",
        actionLabel: "Review feedback",
        href: "/projects/" + project.id,
      });
    }

    const awaitingClient = Math.max(0, project.pendingCount - project.changesRequestedCount);
    if (awaitingClient > 0) {
      actions.push({
        id: "review-" + project.id,
        kind: "client-review",
        priority: 3,
        title: "Follow up on client review",
        detail: awaitingClient + " deliverable" + (awaitingClient === 1 ? " is" : "s are") + " waiting for " + project.client_name + " on " + project.name + ".",
        tag: "Waiting on client",
        actionLabel: "Draft reminder",
        href: reminderLink(project, undefined, awaitingClient),
        external: true,
      });
    }

    if (project.status === "active" && project.fileCount === 0) {
      actions.push({
        id: "first-deliverable-" + project.id,
        kind: "first-deliverable",
        priority: 5,
        title: "Share the first deliverable",
        detail: project.name + " is active, but there are no files in the client portal yet.",
        tag: "Project setup",
        actionLabel: "Open project",
        href: "/projects/" + project.id,
      });
    }
  }

  return actions.sort((a, b) => a.priority - b.priority || (a.sortAt ?? 0) - (b.sortAt ?? 0));
}

function TodayQueue({ actions, loading, onCompleteTask }: { actions: TodayAction[]; loading: boolean; onCompleteTask: (taskId: string) => void }) {
  const iconByKind = {
    "invoice-overdue": Receipt,
    feedback: MessageSquare,
    "client-review": Mail,
    "invoice-due": Clock,
    "first-deliverable": Upload,
    task: ListTodo,
  };
  const tagStyles: Record<TodayActionKind, string> = {
    "invoice-overdue": "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300",
    feedback: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
    "client-review": "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300",
    "invoice-due": "border-border bg-muted text-muted-foreground",
    "first-deliverable": "border-border bg-muted text-muted-foreground",
    task: "border-primary/20 bg-primary/5 text-primary",
  };

  return (
    <Card className="mb-6 overflow-hidden border-primary/20">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-primary" />Today’s next steps</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">A prioritized view of what can move your client work forward.</p>
        </div>
        {!loading && <Badge variant={actions.length > 0 ? "secondary" : "outline"}>{actions.length > 0 ? actions.length + " action" + (actions.length === 1 ? "" : "s") : "All clear"}</Badge>}
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-0 sm:px-6">
        {loading ? (
          <p className="py-4 text-sm text-muted-foreground">Checking projects, feedback, and invoices…</p>
        ) : actions.length === 0 ? (
          <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
            <div><p className="text-sm font-medium">You’re clear for now.</p><p className="mt-1 text-sm text-muted-foreground">No client reviews, feedback, or upcoming payments need attention.</p></div>
          </div>
        ) : (
          <div className="divide-y divide-border/70">
            {actions.map((action) => {
              const Icon = iconByKind[action.kind];
              const ActionTag = <Badge variant="outline" className={"shrink-0 " + tagStyles[action.kind]}>{action.tag}</Badge>;
              const ActionButton = <><span>{action.actionLabel}</span><ArrowRight className="h-3.5 w-3.5" /></>;
              return (
                <div key={action.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{action.title}</p>{ActionTag}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{action.detail}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 self-start sm:self-center">
                    <Button asChild size="sm" variant={action.kind === "invoice-overdue" || action.kind === "feedback" ? "default" : "outline"}>
                      {action.external ? <a href={action.href} data-testid={"today-action-" + action.id}>{ActionButton}</a> : <Link href={action.href} data-testid={"today-action-" + action.id}>{ActionButton}</Link>}
                    </Button>
                    {action.taskId && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => onCompleteTask(action.taskId!)} data-testid={"today-complete-task-" + action.taskId}>
                        <Check className="mr-1.5 h-4 w-4" />Done
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
