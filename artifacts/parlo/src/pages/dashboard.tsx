import { useEffect, useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  Plus,
  FolderOpen,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
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
import { supabase, Project, ProjectFile } from "@/lib/supabase";

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

export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const { toast } = useToast();

  async function loadProjects() {
    setLoading(true);
    const { data: projectsData, error } = await supabase
      .from("projects")
      .select("*")
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

    const { data: filesData } = await supabase
      .from("files")
      .select("project_id, approved");

    const stats = new Map<
      string,
      { fileCount: number; pendingCount: number; approvedCount: number }
    >();
    (filesData ?? []).forEach((f: Pick<ProjectFile, "project_id" | "approved">) => {
      const cur = stats.get(f.project_id) ?? {
        fileCount: 0,
        pendingCount: 0,
        approvedCount: 0,
      };
      cur.fileCount++;
      if (f.approved) cur.approvedCount++;
      else cur.pendingCount++;
      stats.set(f.project_id, cur);
    });

    setProjects(
      (projectsData ?? []).map((p: Project) => ({
        ...p,
        ...(stats.get(p.id) ?? {
          fileCount: 0,
          pendingCount: 0,
          approvedCount: 0,
        }),
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    loadProjects();
  }, []);

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

  const totalPending = projects.reduce((s, p) => s + p.pendingCount, 0);
  const totalApproved = projects.reduce((s, p) => s + p.approvedCount, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header subtitle="Freelancer dashboard" />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">
              Manage client work and review approvals.
            </p>
          </div>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
            <CardContent className="py-16 text-center">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                data-testid={`link-project-${p.id}`}
              >
                <Card className="hover-elevate cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{p.name}</CardTitle>
                      {p.pendingCount > 0 ? (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary border-primary/20"
                        >
                          {p.pendingCount} pending
                        </Badge>
                      ) : p.fileCount > 0 ? (
                        <Badge variant="outline">All approved</Badge>
                      ) : (
                        <Badge variant="outline">No files</Badge>
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
          <div className="text-2xl font-semibold leading-none">{value}</div>
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
    <Card className="mb-8 border-primary/30 bg-primary/5">
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
