import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signupDone, setSignupDone] = useState(false);
  const { signIn, signUp } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    if (mode === "login") {
      const { error: err } = await signIn(email, password);
      if (err) setError(err);
    } else {
      const { error: err } = await signUp(email, password);
      if (err) {
        setError(err);
      } else {
        setSignupDone(true);
      }
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
            <CardTitle className="text-2xl">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Sign in to access your client projects."
                : "Start managing client deliverables with Parlo."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {signupDone ? (
              <div className="text-center space-y-3">
                <div className="text-emerald-600 font-medium">Check your email</div>
                <p className="text-sm text-muted-foreground">
                  We sent a confirmation link to <strong>{email}</strong>. Click
                  it to activate your account, then come back to sign in.
                </p>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => {
                    setSignupDone(false);
                    setMode("login");
                    setPassword("");
                  }}
                >
                  Back to sign in
                </Button>
              </div>
            ) : (
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
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting
                    ? mode === "login"
                      ? "Signing in…"
                      : "Creating account…"
                    : mode === "login"
                    ? "Sign in"
                    : "Create account"}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  {mode === "login" ? (
                    <>
                      Don't have an account?{" "}
                      <button
                        type="button"
                        className="underline text-foreground hover:text-primary"
                        onClick={() => {
                          setMode("signup");
                          setError(null);
                        }}
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="underline text-foreground hover:text-primary"
                        onClick={() => {
                          setMode("login");
                          setError(null);
                        }}
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
