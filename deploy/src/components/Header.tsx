import { Link } from "wouter";
import { LogOut } from "lucide-react";
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

  return (
    <header
      className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10"
      style={accentStyle}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
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
