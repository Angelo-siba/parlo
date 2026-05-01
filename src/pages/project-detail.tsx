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
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  supabase,
  STORAGE_BUCKET,
  Project,
  ProjectFile,
  ActivityLog,
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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function loadAll() {
    if (!projectId) return;
    setLoading(true);
    const [
      { data: p, error: pErr },
      { data: f, error: fErr },
      { data: a },
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
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !project) return;
    setUploading(true);

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
      } else {
        await logActivity(
          project.id,
          "file_uploaded",
          `File uploaded: ${file.name}`,
        );
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast({ title: "Upload complete" });
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
            <h1 className="text-3xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {project.client_name} · {project.client_email}
            </p>
          </div>
          <div className="flex gap-2">
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
