import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  addMonths,
  format,
  isSameDay,
  parseISO,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarEvent,
  CalendarEventType,
  Invoice,
  Project,
  supabase,
} from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

type CalendarItem = {
  id: string;
  kind: "event" | "invoice";
  title: string;
  date: string;
  projectId: string | null;
  projectName: string | null;
  description: string | null;
  eventType: CalendarEventType | "invoice";
  status?: string;
  amount?: number;
};

type EventDraft = {
  title: string;
  eventDate: string;
  eventType: CalendarEventType;
  projectId: string;
  description: string;
};

const EVENT_TYPES: { value: CalendarEventType; label: string }[] = [
  { value: "deadline", label: "Deadline" },
  { value: "meeting", label: "Meeting" },
  { value: "task", label: "Task" },
  { value: "reminder", label: "Reminder" },
];

const EVENT_STYLES: Record<
  CalendarItem["eventType"],
  { label: string; icon: typeof Clock3; className: string }
> = {
  deadline: {
    label: "Deadline",
    icon: CheckCircle2,
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  meeting: {
    label: "Meeting",
    icon: Clock3,
    className: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  task: {
    label: "Task",
    icon: FileText,
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  reminder: {
    label: "Reminder",
    icon: CalendarDays,
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  invoice: {
    label: "Invoice due",
    icon: CircleDollarSign,
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
};

function todayValue() {
  return format(new Date(), "yyyy-MM-dd");
}

function emptyDraft(date: Date): EventDraft {
  return {
    title: "",
    eventDate: format(date, "yyyy-MM-dd"),
    eventType: "task",
    projectId: "",
    description: "",
  };
}

export default function CalendarPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<"month" | "agenda">("month");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<
    Pick<Invoice, "id" | "project_id" | "invoice_number" | "due_date" | "total_amount" | "status">[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [eventsTableError, setEventsTableError] = useState<string | null>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<EventDraft>(() => emptyDraft(new Date()));

  async function loadCalendar() {
    if (!user) return;
    setLoading(true);

    const [{ data: projectData, error: projectError }, { data: eventData, error: eventError }] =
      await Promise.all([
        supabase
          .from("projects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("calendar_events")
          .select("*")
          .eq("user_id", user.id)
          .order("event_date", { ascending: true }),
      ]);

    if (projectError) {
      toast({
        title: "Couldn't load projects",
        description: projectError.message,
        variant: "destructive",
      });
    } else {
      setProjects((projectData ?? []) as Project[]);
    }

    if (eventError) {
      setEventsTableError(eventError.message);
      setEvents([]);
    } else {
      setEventsTableError(null);
      setEvents((eventData ?? []) as CalendarEvent[]);
    }

    const projectIds = (projectData ?? []).map((project) => project.id);
    if (projectIds.length > 0) {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("id, project_id, invoice_number, due_date, total_amount, status")
        .in("project_id", projectIds)
        .order("due_date", { ascending: true });

      if (invoiceError) {
        toast({
          title: "Couldn't load invoice dates",
          description: invoiceError.message,
          variant: "destructive",
        });
      } else {
        setInvoices(invoiceData ?? []);
      }
    } else {
      setInvoices([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const projectNameById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const items = useMemo<CalendarItem[]>(
    () => [
      ...events.map((event) => ({
        id: event.id,
        kind: "event" as const,
        title: event.title,
        date: event.event_date,
        projectId: event.project_id,
        projectName: event.project_id
          ? projectNameById.get(event.project_id) ?? null
          : null,
        description: event.description,
        eventType: event.event_type,
      })),
      ...invoices.map((invoice) => ({
        id: `invoice-${invoice.id}`,
        kind: "invoice" as const,
        title: `${invoice.invoice_number} due`,
        date: invoice.due_date,
        projectId: invoice.project_id,
        projectName: projectNameById.get(invoice.project_id) ?? null,
        description: null,
        eventType: "invoice" as const,
        status: invoice.status,
        amount: invoice.total_amount,
      })),
    ],
    [events, invoices, projectNameById],
  );

  const selectedItems = items.filter((item) =>
    isSameDay(parseISO(item.date), selectedDate),
  );
  const upcomingItems = [...items]
    .filter((item) => item.date >= todayValue())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 20);
  const markedDates = items.map((item) => parseISO(item.date));

  function openNewEvent(date = selectedDate) {
    setDraft(emptyDraft(date));
    setEventDialogOpen(true);
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !draft.title.trim() || !draft.eventDate) return;

    setSaving(true);
    const { error } = await supabase.from("calendar_events").insert({
      user_id: user.id,
      project_id: draft.projectId || null,
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      event_type: draft.eventType,
      event_date: draft.eventDate,
    });
    setSaving(false);

    if (error) {
      toast({
        title: "Couldn't create calendar event",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Event added to your calendar" });
    setEventDialogOpen(false);
    setSelectedDate(parseISO(draft.eventDate));
    setCurrentMonth(parseISO(draft.eventDate));
    loadCalendar();
  }

  async function handleDeleteEvent(eventId: string) {
    if (!window.confirm("Delete this calendar event?")) return;
    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", eventId)
      .eq("user_id", user!.id);

    if (error) {
      toast({
        title: "Couldn't delete event",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setEvents((current) => current.filter((event) => event.id !== eventId));
    toast({ title: "Event deleted" });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        subtitle="Calendar"
        onLogout={signOut}
        userEmail={user?.email}
      />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Plan your week</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Calendar
            </h1>
            <p className="mt-1 text-muted-foreground">
              Keep deadlines, meetings, tasks, and invoice dates in one place.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border/70 p-1">
              <Button
                size="sm"
                variant={view === "month" ? "secondary" : "ghost"}
                onClick={() => setView("month")}
              >
                Month
              </Button>
              <Button
                size="sm"
                variant={view === "agenda" ? "secondary" : "ghost"}
                onClick={() => setView("agenda")}
              >
                Agenda
              </Button>
            </div>
            <Button
              onClick={() => openNewEvent()}
              disabled={Boolean(eventsTableError)}
              data-testid="button-new-calendar-event"
            >
              <Plus className="mr-2 h-4 w-4" />
              New event
            </Button>
          </div>
        </div>

        {eventsTableError && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-start gap-3 p-4">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium">Calendar events need one-time setup</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Run the included SUPABASE_CALENDAR.sql file in your Supabase
                  SQL editor to enable saved events. Invoice due dates are still
                  shown below.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {view === "month" ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Select a day to see what is planned.
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      setCurrentMonth(now);
                      setSelectedDate(now);
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Calendar
                  mode="single"
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  modifiers={{ hasItems: markedDates }}
                  modifiersClassNames={{
                    hasItems: "bg-primary/10 font-semibold text-primary",
                  }}
                  className="w-full"
                />
                <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Has planned items
                  </span>
                  <span>Invoices are added automatically</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>{format(selectedDate, "EEEE, MMM d")}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedItems.length
                      ? `${selectedItems.length} planned item${selectedItems.length === 1 ? "" : "s"}`
                      : "Nothing planned yet"}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => openNewEvent()}
                  disabled={Boolean(eventsTableError)}
                  aria-label="Add event for selected day"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 p-5 text-center">
                    <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/60" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Add a deadline, meeting, or task for this day.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => openNewEvent()}
                      disabled={Boolean(eventsTableError)}
                    >
                      Add event
                    </Button>
                  </div>
                ) : (
                  selectedItems.map((item) => (
                    <CalendarItemRow
                      key={item.id}
                      item={item}
                      onDelete={item.kind === "event" ? handleDeleteEvent : undefined}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Upcoming</CardTitle>
              <p className="text-sm text-muted-foreground">
                Your next planned items and invoice dates.
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Loading your calendar…
                </p>
              ) : upcomingItems.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 p-8 text-center">
                  <CalendarDays className="mx-auto h-9 w-9 text-muted-foreground/60" />
                  <p className="mt-3 font-medium">Your calendar is clear</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add your next deadline or meeting to start planning.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => openNewEvent()}
                    disabled={Boolean(eventsTableError)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add your first event
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {upcomingItems.map((item) => (
                    <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                      <CalendarItemRow
                        item={item}
                        onDelete={
                          item.kind === "event" ? handleDeleteEvent : undefined
                        }
                        compact
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add calendar event</DialogTitle>
            <DialogDescription>
              Add a private planning item to your Parlo workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="calendar-event-title">Title</Label>
              <Input
                id="calendar-event-title"
                value={draft.title}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, title: e.target.value }))
                }
                placeholder="Send first draft to client"
                required
                maxLength={120}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="calendar-event-date">Date</Label>
                <Input
                  id="calendar-event-date"
                  type="date"
                  value={draft.eventDate}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      eventDate: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calendar-event-type">Type</Label>
                <select
                  id="calendar-event-type"
                  value={draft.eventType}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      eventType: e.target.value as CalendarEventType,
                    }))
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendar-event-project">Project</Label>
              <select
                id="calendar-event-project"
                value={draft.projectId}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    projectId: e.target.value,
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="calendar-event-description">Notes</Label>
              <Textarea
                id="calendar-event-description"
                value={draft.description}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    description: e.target.value,
                  }))
                }
                placeholder="Add a little context..."
                maxLength={500}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEventDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Add event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CalendarItemRow({
  item,
  onDelete,
  compact = false,
}: {
  item: CalendarItem;
  onDelete?: (eventId: string) => void;
  compact?: boolean;
}) {
  const meta = EVENT_STYLES[item.eventType];
  const Icon = meta.icon;

  return (
    <div className={`flex items-start gap-3 ${compact ? "" : "min-w-0"}`}>
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.className}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{item.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {format(parseISO(item.date), "EEE, MMM d")}
              {item.projectName ? ` · ${item.projectName}` : ""}
            </p>
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(item.id)}
              aria-label={`Delete ${item.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {meta.label}
          </Badge>
          {item.kind === "invoice" && item.amount !== undefined && (
            <span className="text-xs text-muted-foreground">
              ${item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          )}
          {item.projectId && (
            <Link
              href={`/projects/${item.projectId}`}
              className="text-xs font-medium text-primary hover:underline"
            >
              Open project
            </Link>
          )}
        </div>
        {item.description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}