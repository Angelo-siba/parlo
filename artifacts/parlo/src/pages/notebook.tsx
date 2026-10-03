import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { BookOpen, FilePlus2, Plus, Save, Search, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type NotebookNote = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

const NOTE_COLUMNS = "id, user_id, title, content, created_at, updated_at";

function isMissingNotebookTable(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (message.includes("notebook_notes") &&
      (message.includes("schema cache") ||
        message.includes("does not exist") ||
        message.includes("not found")))
  );
}

function formatSavedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Saved recently" : format(date, "MMM d, h:mm a");
}

export default function NotebookPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<NotebookNote | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  );
  const isDirty = Boolean(
    selectedNote &&
      (draftTitle !== selectedNote.title || draftContent !== selectedNote.content),
  );
  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query),
    );
  }, [notes, search]);

  useEffect(() => {
    setDraftTitle(selectedNote?.title ?? "");
    setDraftContent(selectedNote?.content ?? "");
  }, [selectedNoteId]);

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isDirty]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setSetupRequired(false);
    setLoadError(null);

    async function loadNotes() {
      const { data, error } = await supabase
        .from("notebook_notes")
        .select(NOTE_COLUMNS)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (!active) return;

      if (error) {
        if (isMissingNotebookTable(error)) {
          setSetupRequired(true);
        } else {
          setLoadError(error.message);
        }
      } else {
        const loadedNotes = (data ?? []) as NotebookNote[];
        setNotes(loadedNotes);
        setSelectedNoteId(loadedNotes[0]?.id ?? null);
      }
      setLoading(false);
    }

    void loadNotes();
    return () => {
      active = false;
    };
  }, [user?.id]);

  async function saveCurrentNote() {
    if (saving) return false;
    if (!user || !selectedNote || !isDirty) return true;

    setSaving(true);
    const { data, error } = await supabase
      .from("notebook_notes")
      .update({
        title: draftTitle.trim() || "Untitled note",
        content: draftContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedNote.id)
      .eq("user_id", user.id)
      .select(NOTE_COLUMNS)
      .single();
    setSaving(false);

    if (error) {
      toast({
        title: "Couldn't save note",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    const savedNote = data as NotebookNote;
    setNotes((current) => [
      savedNote,
      ...current.filter((note) => note.id !== savedNote.id),
    ]);
    setDraftTitle(savedNote.title);
    setDraftContent(savedNote.content);
    return true;
  }

  async function handleCreateNote() {
    if (!user || setupRequired || loadError || creating || saving) return;
    if (isDirty && !(await saveCurrentNote())) return;

    setCreating(true);
    const { data, error } = await supabase
      .from("notebook_notes")
      .insert({
        user_id: user.id,
        title: "Untitled note",
        content: "",
      })
      .select(NOTE_COLUMNS)
      .single();
    setCreating(false);

    if (error) {
      toast({
        title: "Couldn't create note",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const createdNote = data as NotebookNote;
    setNotes((current) => [createdNote, ...current]);
    setSelectedNoteId(createdNote.id);
    setSearch("");
  }

  async function handleSelectNote(noteId: string) {
    if (saving) return;
    if (noteId === selectedNoteId) return;
    if (isDirty && !(await saveCurrentNote())) return;
    setSelectedNoteId(noteId);
  }

  async function handleDeleteNote() {
    if (!user || !noteToDelete) return;

    setDeleting(true);
    const { error } = await supabase
      .from("notebook_notes")
      .delete()
      .eq("id", noteToDelete.id)
      .eq("user_id", user.id);
    setDeleting(false);

    if (error) {
      toast({
        title: "Couldn't delete note",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const remainingNotes = notes.filter((note) => note.id !== noteToDelete.id);
    setNotes(remainingNotes);
    if (selectedNoteId === noteToDelete.id) {
      setSelectedNoteId(remainingNotes[0]?.id ?? null);
    }
    setNoteToDelete(null);
    toast({ title: "Note deleted" });
  }

  const notebookUnavailable = setupRequired || Boolean(loadError);

  return (
    <div className="min-h-screen bg-background">
      <Header subtitle="Private notebook" onLogout={signOut} userEmail={user?.email} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                Just for you
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Notebook
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep private ideas and reminders in one place, separate from client projects.
            </p>
          </div>
          <Button
            onClick={handleCreateNote}
            disabled={loading || notebookUnavailable || creating || saving}
            data-testid="button-new-note"
          >
            <Plus className="mr-2 h-4 w-4" />
            {creating ? "Creating..." : "New note"}
          </Button>
        </div>

        {setupRequired ? (
          <Alert>
            <BookOpen className="h-4 w-4" />
            <AlertTitle>Notebook storage needs setup</AlertTitle>
            <AlertDescription>
              Run the SQL in <code>SUPABASE_NOTEBOOK.sql</code> in your Supabase SQL
              Editor, then reload this page. The table is protected so each freelancer
              can access only their own notes.
            </AlertDescription>
          </Alert>
        ) : loadError ? (
          <Alert variant="destructive">
            <AlertTitle>Couldn't load your notebook</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : loading ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Loading your private notes…
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Your notes</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {notes.length}
                  </span>
                </div>
                {notes.length > 0 && (
                  <div className="relative pt-1">
                    <Search className="pointer-events-none absolute left-3 top-[calc(50%+2px)] h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search notes..."
                      aria-label="Search notes"
                      className="pl-9"
                      data-testid="input-note-search"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-1">
                {filteredNotes.length > 0 ? (
                  filteredNotes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => void handleSelectNote(note.id)}
                      disabled={saving}
                      aria-current={selectedNoteId === note.id ? "page" : undefined}
                      className={`w-full rounded-lg px-3 py-3 text-left transition-colors ${
                        selectedNoteId === note.id
                          ? "bg-primary/10 text-foreground"
                          : "hover:bg-muted"
                      }`}
                      data-testid={`button-select-note-${note.id}`}
                    >
                      <span className="block truncate text-sm font-medium">
                        {note.title || "Untitled note"}
                      </span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground">
                        {note.content.trim() || "No content yet"}
                      </span>
                      <span className="mt-2 block text-[11px] text-muted-foreground/80">
                        {formatSavedAt(note.updated_at)}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
                    <p className="text-sm font-medium">
                      {notes.length ? "No matching notes" : "No notes yet"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {notes.length
                        ? "Try a different search."
                        : "Create a note to start your notebook."}
                    </p>
                    {!notes.length && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={handleCreateNote}
                        disabled={creating}
                      >
                        <FilePlus2 className="mr-2 h-4 w-4" />
                        Create a note
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="min-h-[480px]">
              {selectedNote ? (
                <>
                  <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b">
                    <div className="min-w-0">
                      <CardTitle className="text-base">Edit note</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {isDirty
                          ? "Unsaved changes"
                          : `Saved ${formatSavedAt(selectedNote.updated_at)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void saveCurrentNote()}
                        disabled={!isDirty || saving}
                        data-testid="button-save-note"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete note"
                        onClick={() => setNoteToDelete(selectedNote)}
                        disabled={deleting || saving}
                        data-testid="button-delete-note"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 sm:p-6">
                    <div className="space-y-2">
                      <Label htmlFor="notebook-note-title">Title</Label>
                      <Input
                        id="notebook-note-title"
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        disabled={saving}
                        maxLength={120}
                        placeholder="Untitled note"
                        data-testid="input-note-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notebook-note-content">Note</Label>
                      <Textarea
                        id="notebook-note-content"
                        value={draftContent}
                        onChange={(event) => setDraftContent(event.target.value)}
                        disabled={saving}
                        maxLength={50000}
                        placeholder="Write something worth remembering..."
                        className="min-h-[340px] resize-y leading-7"
                        data-testid="textarea-note-content"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Private to your account. Client portals cannot access these notes.
                    </p>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex min-h-[480px] flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <BookOpen className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h2 className="mt-4 text-lg font-semibold">Your notebook is ready</h2>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Add a private note for ideas, reminders, and plans you want to keep
                    close.
                  </p>
                  <Button className="mt-5" onClick={handleCreateNote} disabled={creating}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first note
                  </Button>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </main>

      <AlertDialog
        open={Boolean(noteToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setNoteToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes “{noteToDelete?.title || "Untitled note"}”.
              Unsaved changes to this note will also be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep note</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteNote();
              }}
            >
              {deleting ? "Deleting..." : "Delete note"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}