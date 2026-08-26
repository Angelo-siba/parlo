import { ArrowRight, ArrowUpRight, Check, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const CHECKOUT_URL =
  "https://parlo-app.lemonsqueezy.com/checkout/buy/786e5bea-0f95-4612-921a-e33fbd58cde1";

const FREE_FEATURES = [
  "2 active projects",
  "File approvals and client portal",
  "Client feedback",
];

const PRO_FEATURES = [
  "Unlimited projects",
  "Invoicing",
  "Brand settings",
  "Priority support",
];

function FeatureList({ features }: { features: string[] }) {
  return (
    <ul className="space-y-4">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-3 text-sm">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Check className="h-3.5 w-3.5" />
          </span>
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">
              P
            </div>
            <div className="leading-tight">
              <div className="text-lg font-semibold tracking-tight">Parlo</div>
              <div className="text-xs text-muted-foreground">Simple pricing for client work</div>
            </div>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-primary" data-testid="link-pricing">
              Pricing
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
        <section className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-5 border-primary/30 bg-primary/5 text-primary">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Built for independent creatives
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Look professional.
            <span className="block text-primary">Stay wonderfully simple.</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Start free with the essentials, then upgrade when your client list grows.
          </p>
        </section>

        <section className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
          <Card className="flex flex-col border-border/80">
            <CardHeader className="pb-6">
              <p className="text-sm font-medium text-muted-foreground">For getting started</p>
              <CardTitle className="mt-2 text-2xl">Free</CardTitle>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-semibold">$0</span>
                <span className="text-sm text-muted-foreground">forever</span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <FeatureList features={FREE_FEATURES} />
              <Button asChild variant="outline" className="mt-10 w-full">
                <Link href="/?mode=signup" data-testid="button-get-started-free">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="relative flex flex-col overflow-hidden border-primary/50 bg-primary/[0.04] shadow-md">
            <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
            <CardHeader className="pb-6">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-primary">For growing client work</p>
                <Badge className="bg-primary text-primary-foreground">Less than a coffee a month</Badge>
              </div>
              <CardTitle className="mt-2 text-2xl">Pro</CardTitle>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-semibold">$9</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <FeatureList features={PRO_FEATURES} />
              <Button asChild className="mt-10 w-full">
                <a
                  href={CHECKOUT_URL}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="button-upgrade-pro"
                >
                  Upgrade to Pro
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>

        <p className="mx-auto mt-10 max-w-xl text-center text-sm text-muted-foreground">
          Payments are handled securely by Lemon Squeezy. You can keep using Parlo’s free plan for as long as you need.
        </p>
      </main>
    </div>
  );
}
