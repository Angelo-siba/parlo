import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
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
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import OnboardingChecklist, {
  Step as OnboardingStep,
} from "@/components/OnboardingChecklist";

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
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [portalLinkCopied, setPortalLinkCopied] = useState(false);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !clientName.trim() || !clientEmail.trim()) return;
    setSubmitting(true);
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

  const totalPending = projects.reduce((s, p) => s + p.pendingCount, 0);
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
  const projectGroups = [
    {
      status: "active" as const,
      label: "Active",
      projects: visibleProjects.filter((project) => project.status === "active"),
    },
    {
      status: "draft" as const,
      label: "Draft",
      projects: visibleProjects.filter((project) => project.status === "draft"),
    },
    {
      status: "completed" as const,
      label: "Completed",
      projects: visibleProjects.filter(
        (project) =>
          project.status === "completed" || project.status === "archived",
      ),
    },
  ].filter((group) => group.projects.length > 0);
  const activeProjectCount = projects.filter(
    (project) => project.status === "active",
  ).length;
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

  return (
    <div className="min-h-screen bg-background">
      <Header
        subtitle={preferredName ? `${preferredName}'s workspace` : "Freelancer dashboard"}
        onLogout={signOut}
        userEmail={user?.email}
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {dashboardGreeting}
            </h1>
            <p className="text-muted-foreground mt-1">
              {workspaceMessage}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
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
            <Dialog open={open} onOpenChange={setOpen}>
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

        {!loading && !onboardingDismissed && (
          <div className="mb-6">
            <OnboardingChecklist
              steps={onboardingSteps}
              onDismiss={handleDismissOnboarding}
            />
          </div>
        )}

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

        {/* Project stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <StatCard
            icon={<FolderOpen className="h-5 w-5" />}
            label="Active projects"
            value={projects.filter((project) => project.status === "active").length}
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
        ) : visibleProjects.length === 0 ? (
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
          <div className="space-y-8">
            {projectGroups.map((group) => (
              <section key={group.status}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-semibold">{group.label}</h2>
                  <Badge variant="secondary">{group.projects.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.projects.map((p) => (
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
              </section>
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
