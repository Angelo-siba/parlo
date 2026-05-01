import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type Mode = "login" | "signup" | "forgot";

const titles: Record<Mode, string> = {
  login: "Welcome back",
  signup: "Create your account",
  forgot: "Reset your password",
};

const descriptions: Record<Mode, string> = {
  login: "Sign in to access your client projects.",
  signup: "Start managing client deliverables with Parlo.",
  forgot: "Enter your email and we'll send you a reset link.",
};

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"signup" | "forgot" | null>(null);
  const { signIn, signUp, resetPassword } = useAuth();

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setDone(null);
    setPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (mode === "login") {
      const { error: err } = await signIn(email, password);
      if (err) setError(err);
    } else if (mode === "signup") {
      const { error: err } = await signUp(email, password);
      if (err) setError(err);
      else setDone("signup");
    } else {
      const { error: err } = await resetPassword(email);
      if (err) setError(err);
      else setDone("forgot");
    }

    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-semibold">
            P
          </div>
          <span className="text-lg font-semibold tracking-tight">Parlo</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{titles[mode]}</CardTitle>
            <CardDescription>{descriptions[mode]}</CardDescription>
          </CardHeader>

          <CardContent>
            {done === "signup" && (
              <div className="text-center space-y-3">
                <div className="text-emerald-600 font-medium">Check your email</div>
                <p className="text-sm text-muted-foreground">
                  We sent a confirmation link to <strong>{email}</strong>. Click
                  it to activate your account, then come back to sign in.
                </p>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => switchMode("login")}
                >
                  Back to sign in
                </Button>
              </div>
            )}

            {done === "forgot" && (
              <div className="text-center space-y-3">
                <div className="text-emerald-600 font-medium">Reset link sent</div>
                <p className="text-sm text-muted-foreground">
                  If <strong>{email}</strong> has an account, you'll receive a
                  password reset link shortly. Check your inbox (and spam folder).
                </p>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => switchMode("login")}
                >
                  Back to sign in
                </Button>
              </div>
            )}

            {!done && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                {mode !== "forgot" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "login" && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-primary underline"
                          onClick={() => switchMode("forgot")}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting
                    ? mode === "login"
                      ? "Signing in…"
                      : mode === "signup"
                      ? "Creating account…"
                      : "Sending link…"
                    : mode === "login"
                    ? "Sign in"
                    : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {mode === "login" && (
                    <>
                      Don't have an account?{" "}
                      <button
                        type="button"
                        className="underline text-foreground hover:text-primary"
                        onClick={() => switchMode("signup")}
                      >
                        Sign up
                      </button>
                    </>
                  )}
                  {mode === "signup" && (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="underline text-foreground hover:text-primary"
                        onClick={() => switchMode("login")}
                      >
                        Sign in
                      </button>
                    </>
                  )}
                  {mode === "forgot" && (
                    <>
                      Remember it?{" "}
                      <button
                        type="button"
                        className="underline text-foreground hover:text-primary"
                        onClick={() => switchMode("login")}
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
