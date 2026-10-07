import { Link, useLocation } from "wouter";
import { BookOpen, CalendarDays, DollarSign, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header({
  subtitle,
  onLogout,
  userEmail,
  brandLogoUrl,
  brandName,
  brandColor,
}: {
  subtitle?: string;
  onLogout?: () => void;
  userEmail?: string;
  brandLogoUrl?: string | null;
  brandName?: string | null;
  brandColor?: string | null;
}) {
  const accentStyle = brandColor ? { borderBottomColor: brandColor } : {};
  const [location] = useLocation();
  const navClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
    }`;

  return (
    <header
      className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10"
      style={accentStyle}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2 group"
          data-testid="link-home"
        >
          {brandLogoUrl ? (
            <img
              src={brandLogoUrl}
              alt={brandName ?? "Logo"}
              className="h-8 w-8 rounded-lg object-contain bg-muted"
            />
          ) : (
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-primary-foreground font-semibold"
              style={{ backgroundColor: brandColor ?? undefined, background: brandColor ? undefined : undefined }}
            >
              {brandColor ? (
                <span style={{ color: "#fff" }}>{(brandName ?? "P")[0].toUpperCase()}</span>
              ) : (
                <span className="bg-primary w-full h-full rounded-lg flex items-center justify-center">P</span>
              )}
            </div>
          )}
          <div className="leading-tight">
            <div className="text-lg font-semibold tracking-tight">
              {brandName ?? "Parlo"}
            </div>
            {subtitle && (
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            )}
          </div>
        </Link>

        {onLogout && (
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <nav aria-label="Workspace navigation" className="flex items-center gap-0.5 rounded-xl border border-border/60 bg-card/60 p-1">
              <Link
                href="/calendar"
                className={navClass(location === "/calendar")}
                data-testid="link-calendar"
                aria-label="Calendar"
                aria-current={location === "/calendar" ? "page" : undefined}
                title="Calendar"
              >
                <CalendarDays className="h-4 w-4" />
                <span className="hidden lg:inline">Calendar</span>
              </Link>
              <Link
                href="/notebook"
                className={navClass(location === "/notebook")}
                data-testid="link-notebook"
                aria-label="Notebook"
                aria-current={location === "/notebook" ? "page" : undefined}
                title="Notebook"
              >
                <BookOpen className="h-4 w-4" />
                <span className="hidden lg:inline">Notebook</span>
              </Link>
              <Link
                href="/revenue"
                className={navClass(location === "/revenue")}
                data-testid="link-revenue"
                aria-label="Revenue"
                aria-current={location === "/revenue" ? "page" : undefined}
                title="Revenue"
              >
                <DollarSign className="h-4 w-4" />
                <span className="hidden lg:inline">Revenue</span>
              </Link>
            </nav>
            {userEmail && (
              <span className="text-sm text-muted-foreground hidden sm:block truncate max-w-[200px]">
                {userEmail}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              data-testid="button-logout"
              className="gap-2"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
