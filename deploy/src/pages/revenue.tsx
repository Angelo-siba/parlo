import { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, isBefore, isWithinInterval, parseISO, startOfDay, startOfMonth } from "date-fns";
import {
  AlertCircle,
  ArrowUpRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Search,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Invoice, Project } from "@/lib/supabase";

type ProjectSummary = Pick<Project, "id" | "name" | "client_name">;
type InvoiceFilter = "all" | "sent" | "overdue" | "paid" | "draft";

const FILTERS: { value: InvoiceFilter; label: string }[] = [
  { value: "all", label: "All invoices" },
  { value: "sent", label: "Sent" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "draft", label: "Drafts" },
];

function money(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function safeDate(value: string) {
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatInvoiceDate(value: string) {
  const date = safeDate(value);
  return date ? format(date, "MMM d, yyyy") : "—";
}

function invoiceIsOverdue(invoice: Invoice, today: Date) {
  const dueDate = safeDate(invoice.due_date);
  return invoice.status === "sent" && dueDate !== null && isBefore(dueDate, today);
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "warm" | "danger";
}) {
  const iconStyle = tone === "danger"
    ? "bg-destructive/10 text-destructive"
    : tone === "warm"
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";

  return (
    <Card className="rounded-2xl border-border/70 shadow-sm">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function RevenuePage() {
  const { user, signOut } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InvoiceFilter>("all");

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    let active = true;
    async function loadRevenue() {
      setLoading(true);
      setLoadError("");
      try {
        const projectResult = await supabase
          .from("projects")
          .select("id, name, client_name")
          .eq("user_id", userId);

        if (projectResult.error) throw projectResult.error;
        const projectRows = (projectResult.data ?? []) as ProjectSummary[];
        if (!active) return;
        setProjects(projectRows);

        if (projectRows.length === 0) {
          setInvoices([]);
          return;
        }

        const invoiceResult = await supabase
          .from("invoices")
          .select("*")
          .in("project_id", projectRows.map((project) => project.id))
          .order("created_at", { ascending: false });

        if (invoiceResult.error) throw invoiceResult.error;
        if (!active) return;
        setInvoices((invoiceResult.data ?? []) as Invoice[]);
      } catch (error) {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Could not load invoices.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadRevenue();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );

  const now = new Date();
  const today = startOfDay(now);
  const metrics = useMemo(() => {
    const paid = invoices.filter((invoice) => invoice.status === "paid");
    const sent = invoices.filter((invoice) => invoice.status === "sent");
    const overdue = sent.filter((invoice) => invoiceIsOverdue(invoice, today));
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const paidThisMonth = paid.filter((invoice) => {
      const createdAt = safeDate(invoice.created_at);
      return createdAt !== null && isWithinInterval(createdAt, { start: monthStart, end: monthEnd });
    });

    return {
      collected: paid.reduce((sum, invoice) => sum + (Number(invoice.total_amount) || 0), 0),
      outstanding: sent.reduce((sum, invoice) => sum + (Number(invoice.total_amount) || 0), 0),
      overdue: overdue.reduce((sum, invoice) => sum + (Number(invoice.total_amount) || 0), 0),
      overdueCount: overdue.length,
      sentCount: sent.length,
      paidThisMonth: paidThisMonth.reduce((sum, invoice) => sum + (Number(invoice.total_amount) || 0), 0),
      paidCount: paid.length,
      draftCount: invoices.filter((invoice) => invoice.status === "draft").length,
    };
  }, [invoices, today, now]);

  const visibleInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const isOverdue = invoiceIsOverdue(invoice, today);
      const matchesFilter =
        filter === "all" ||
        (filter === "overdue" ? isOverdue : invoice.status === filter);
      const project = projectById.get(invoice.project_id);
      const searchable = `${invoice.invoice_number} ${project?.name ?? ""} ${project?.client_name ?? ""}`
        .toLowerCase();
      return matchesFilter && (!query || searchable.includes(query));
    });
  }, [filter, invoices, projectById, search, today]);

  const filterCounts: Record<InvoiceFilter, number> = {
    all: invoices.length,
    sent: invoices.filter((invoice) => invoice.status === "sent").length,
    overdue: invoices.filter((invoice) => invoiceIsOverdue(invoice, today)).length,
    paid: metrics.paidCount,
    draft: metrics.draftCount,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header subtitle="Revenue tracker" onLogout={signOut} userEmail={user?.email} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Workspace finances
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Revenue tracker</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">
              See what’s been paid, what’s still open, and which invoices need a follow-up.
            </p>
          </div>
          <Badge variant="secondary" className="rounded-full px-3 py-1">
            {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={CircleDollarSign}
            label="Collected"
            value={money(metrics.collected)}
            detail={`${metrics.paidCount} paid ${metrics.paidCount === 1 ? "invoice" : "invoices"}`}
            tone="warm"
          />
          <MetricCard
            icon={Clock3}
            label="Outstanding"
            value={money(metrics.outstanding)}
            detail={`${metrics.sentCount} sent ${metrics.sentCount === 1 ? "invoice" : "invoices"}`}
          />
          <MetricCard
            icon={AlertCircle}
            label="Overdue"
            value={money(metrics.overdue)}
            detail={`${metrics.overdueCount} past-due ${metrics.overdueCount === 1 ? "invoice" : "invoices"}`}
            tone={metrics.overdueCount > 0 ? "danger" : "neutral"}
          />
          <MetricCard
            icon={TrendingUp}
            label={`Paid · ${format(now, "MMMM")}`}
            value={money(metrics.paidThisMonth)}
            detail="Paid invoices created this month"
            tone="warm"
          />
        </div>

        <Card className="mt-7 overflow-hidden rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Invoices
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open a project to review or update an invoice.
                </p>
              </div>
              <Badge variant="outline">{visibleInvoices.length} shown</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search invoice, project, or client..."
                  aria-label="Search invoices"
                  className="h-10 pl-9 pr-10"
                  data-testid="input-invoice-search"
                />
                {search && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                    onClick={() => setSearch("")}
                    aria-label="Clear invoice search"
                    data-testid="button-clear-invoice-search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1 rounded-xl bg-muted/60 p-1" aria-label="Filter invoices">
                {FILTERS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={filter === option.value ? "secondary" : "ghost"}
                    className="h-8 rounded-lg px-3"
                    onClick={() => setFilter(option.value)}
                    aria-pressed={filter === option.value}
                    data-testid={`button-invoice-filter-${option.value}`}
                  >
                    {option.label}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {filterCounts[option.value]}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {loadError ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
                <p className="font-medium">Couldn’t load revenue data.</p>
                <p className="mt-1 break-words">{loadError}</p>
              </div>
            ) : loading ? (
              <div className="space-y-3 py-6">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="h-14 animate-pulse rounded-xl bg-muted/70" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
                <h2 className="mt-3 font-medium">No invoices yet</h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Invoices created inside your projects will appear here, with payment status and due dates.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/">Go to projects</Link>
                </Button>
              </div>
            ) : visibleInvoices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground" />
                <h2 className="mt-3 font-medium">No matching invoices</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try another search or clear the current filter.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                  data-testid="button-clear-invoice-filters"
                >
                  Clear search and filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm" aria-label="Invoices">
                  <thead>
                    <tr className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-3 pr-4 font-medium">Invoice</th>
                      <th className="py-3 pr-4 font-medium">Project / client</th>
                      <th className="py-3 pr-4 font-medium">Due date</th>
                      <th className="py-3 pr-4 font-medium">Status</th>
                      <th className="py-3 pr-4 text-right font-medium">Amount</th>
                      <th className="py-3 pl-4 text-right font-medium">Project</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {visibleInvoices.map((invoice) => {
                      const project = projectById.get(invoice.project_id);
                      const overdue = invoiceIsOverdue(invoice, today);
                      const statusText = overdue ? "Overdue" : invoice.status;
                      const statusClass = overdue
                        ? "border-destructive/20 bg-destructive/10 text-destructive"
                        : invoice.status === "paid"
                          ? "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300"
                          : invoice.status === "sent"
                            ? "border-amber-600/20 bg-amber-600/10 text-amber-800 dark:text-amber-300"
                            : "border-border bg-muted/60 text-muted-foreground";

                      return (
                        <tr key={invoice.id} className="transition-colors hover:bg-muted/30" data-testid={`row-invoice-${invoice.id}`}>
                          <td className="py-4 pr-4">
                            <p className="font-medium">{invoice.invoice_number || "Invoice"}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Created {formatInvoiceDate(invoice.created_at)}
                            </p>
                          </td>
                          <td className="py-4 pr-4">
                            <p className="font-medium">{project?.name ?? "Project"}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {project?.client_name ?? "Client"}
                            </p>
                          </td>
                          <td className={`py-4 pr-4 ${overdue ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                            {formatInvoiceDate(invoice.due_date)}
                          </td>
                          <td className="py-4 pr-4">
                            <Badge variant="outline" className={`capitalize ${statusClass}`}>
                              {statusText}
                            </Badge>
                          </td>
                          <td className="py-4 pr-4 text-right font-semibold tabular-nums">
                            {money(Number(invoice.total_amount) || 0)}
                          </td>
                          <td className="py-4 pl-4 text-right">
                            <Button asChild size="sm" variant="ghost" className="gap-1">
                              <Link href={`/projects/${invoice.project_id}`} aria-label={`Open ${project?.name ?? "project"}`}>
                                Open <ArrowUpRight className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
