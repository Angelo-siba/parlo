import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { format } from "date-fns";
import {
  CheckCircle2,
  Clock,
  FileIcon,
  MessageSquare,
  Download,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase, Project, ProjectFile, logActivity } from "@/lib/supabase";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function ClientPortal() {
  const [, params] = useRoute("/client/:token");
  const token = params?.token;
  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>(
    {},
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const { toast } = useToast();

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
    setProject(p as Project);
    const { data: f } = await supabase
      .from("files")
      .select("*")
      .eq("project_id", (p as Project).id)
      .order("created_at", { ascending: false });
    setFiles((f ?? []) as ProjectFile[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function approve(file: ProjectFile) {
    setSavingId(file.id);
    const { error } = await supabase
      .from("files")
      .update({
        approved: true,
        approved_at: new Date().toISOString(),
      })
      .eq("id", file.id);
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
    const { error } = await supabase
      .from("files")
      .update({ feedback: text })
      .eq("id", file.id);
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
    toast({ title: "Feedback sent" });
    setFeedbackDrafts((d) => ({ ...d, [file.id]: "" }));
    load();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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

  const pendingCount = files.filter((f) => !f.approved).length;

  return (
    <div className="min-h-screen bg-background">
      <Header subtitle="Client review" />
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

        {files.length === 0 ? (
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
            {files.map((f) => {
              const draft = feedbackDrafts[f.id] ?? "";
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

        <div className="mt-10 text-center text-xs text-muted-foreground">
          Powered by Parlo
        </div>
      </main>
    </div>
  );
}
