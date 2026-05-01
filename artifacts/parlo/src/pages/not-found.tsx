import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-semibold tracking-tight">404</h1>
        <p className="text-muted-foreground">
          We couldn't find what you were looking for.
        </p>
        <Link href="/">
          <Button data-testid="button-home">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
