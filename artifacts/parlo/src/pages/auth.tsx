import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, FileCheck, Receipt, Palette } from "lucide-react";

type Mode = "login" | "signup" | "forgot";

const FEATURES = [
  {
    icon: FileCheck,
    title: "Client portals in seconds",
    desc: "Share files and collect approvals via a simple link — no login needed for your client.",
  },
  {
    icon: Receipt,
    title: "Invoicing & payments",
    desc: "Create itemised invoices and get paid via PayPal, right inside the portal.",
  },
  {
    icon: Palette,
    title: "Your brand, not ours",
    desc: "Add your logo and accent color so portals look like they came from you.",
  },
];

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
    <div className="min-h-screen flex">
      {/* Left panel — brand + features */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] bg-[#1c1410] text-white px-14 py-12">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center font-bold text-white text-lg">
              P
            </div>
            <span className="text-xl font-semibold tracking-tight">Parlo</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-semibold leading-tight tracking-tight mb-4">
            Client work,<br />
            <span className="text-primary">done cleaner.</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed mb-14 max-w-sm">
            Everything a freelancer needs to deliver work professionally — without the enterprise price tag.
          </p>

          {/* Feature list */}
          <div className="space-y-8">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-white">{title}</div>
                  <div className="text-sm text-white/50 mt-0.5 leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <div className="border-t border-white/10 pt-8 mt-8">
          <p className="text-white/40 text-sm italic leading-relaxed">
            "Finally a tool that makes me look like a studio, not a solo freelancer scrambling with Google Drive links."
          </p>
          <p className="text-white/30 text-xs mt-2">— Early Parlo user</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden border-b border-border/60 px-6 py-4 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-semibold text-sm">
            P
          </div>
          <span className="text-lg font-semibold tracking-tight">Parlo</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-sm">
            {/* Form header */}
            <div className="mb-8">
              {mode === "login" && (
                <>
                  <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
                  <p className="text-muted-foreground mt-1 text-sm">Sign in to your Parlo account.</p>
                </>
              )}
              {mode === "signup" && (
                <>
                  <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
                  <p className="text-muted-foreground mt-1 text-sm">Free to start — no credit card needed.</p>
                </>
              )}
              {mode === "forgot" && (
                <>
                  <h2 className="text-2xl font-semibold tracking-tight">Reset your password</h2>
                  <p className="text-muted-foreground mt-1 text-sm">We'll email you a reset link.</p>
                </>
              )}
            </div>

            {/* Success states */}
            {done === "signup" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <div className="font-medium text-emerald-800">Check your email</div>
                <p className="text-sm text-emerald-700">
                  We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
                </p>
                <Button variant="outline" className="w-full mt-3" onClick={() => switchMode("login")}>
                  Back to sign in
                </Button>
              </div>
            )}

            {done === "forgot" && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <div className="font-medium text-emerald-800">Reset link sent</div>
                <p className="text-sm text-emerald-700">
                  If <strong>{email}</strong> has an account, you'll receive a reset link shortly. Check your inbox and spam folder.
                </p>
                <Button variant="outline" className="w-full mt-3" onClick={() => switchMode("login")}>
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
                    className="h-11"
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
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11"
                    />
                  </div>
                )}

                {error && (
                  <div className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={submitting}>
                  {submitting
                    ? mode === "login" ? "Signing in…" : mode === "signup" ? "Creating account…" : "Sending link…"
                    : mode === "login" ? "Sign in"
                    : mode === "signup" ? "Create free account"
                    : "Send reset link"}
                </Button>

                <p className="text-center text-sm text-muted-foreground pt-1">
                  {mode === "login" && (
                    <>
                      Don't have an account?{" "}
                      <button type="button" className="underline text-foreground hover:text-primary font-medium" onClick={() => switchMode("signup")}>
                        Sign up free
                      </button>
                    </>
                  )}
                  {mode === "signup" && (
                    <>
                      Already have an account?{" "}
                      <button type="button" className="underline text-foreground hover:text-primary font-medium" onClick={() => switchMode("login")}>
                        Sign in
                      </button>
                    </>
                  )}
                  {mode === "forgot" && (
                    <>
                      Remember it?{" "}
                      <button type="button" className="underline text-foreground hover:text-primary font-medium" onClick={() => switchMode("login")}>
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
