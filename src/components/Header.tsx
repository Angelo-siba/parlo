import { Link } from "wouter";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header({
  subtitle,
  onLogout,
  userEmail,
}: {
  subtitle?: string;
  onLogout?: () => void;
  userEmail?: string;
}) {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 group"
          data-testid="link-home"
        >
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold">
            P
          </div>
          <div className="leading-tight">
            <div className="text-lg font-semibold tracking-tight">Parlo</div>
            {subtitle && (
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            )}
          </div>
        </Link>

        {onLogout && (
          <div className="flex items-center gap-3">
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
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
