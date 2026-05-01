import { Link } from "wouter";

export function Header({ subtitle }: { subtitle?: string }) {
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
      </div>
    </header>
  );
}
