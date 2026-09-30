import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileUp,
  FolderKanban,
  Palette,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type Step = {
  id: "project" | "brand" | "file" | "share";
  title: string;
  description: string;
  complete: boolean;
  optional?: boolean;
  actionLabel: string;
  onAction: () => void;
};

export type OnboardingChecklistProps = {
  steps: Step[];
  onDismiss: () => void;
};

const stepIcons = {
  project: FolderKanban,
  brand: Palette,
  file: FileUp,
  share: Send,
} as const;

export default function OnboardingChecklist({
  steps,
  onDismiss,
}: OnboardingChecklistProps) {
  const requiredSteps = steps.filter((step) => !step.optional);
  const completedCount = requiredSteps.filter((step) => step.complete).length;
  const progress = requiredSteps.length
    ? (completedCount / requiredSteps.length) * 100
    : 0;
  const allComplete =
    requiredSteps.length > 0 && completedCount === requiredSteps.length;

  return (
    <section
      aria-labelledby="onboarding-title"
      className="relative overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm"
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-primary" />
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Your first few minutes
            </p>
            <h2
              id="onboarding-title"
              className="text-xl font-semibold tracking-tight sm:text-2xl"
            >
              {allComplete
                ? "You’re ready to get to work."
                : "A good start, in a few steps."}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {allComplete
                ? "Your client workspace is set up. Create something great."
                : "Set up a project, add a deliverable, then share your portal. Branding is optional."}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            aria-label="Dismiss getting started checklist"
            className="-mr-2 -mt-2 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Setup progress"
            aria-valuemin={0}
            aria-valuemax={requiredSteps.length}
            aria-valuenow={completedCount}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            {completedCount} <span className="text-foreground">/</span>{" "}
            {requiredSteps.length} done
          </span>
        </div>

        {steps.length > 0 ? (
          <ol className="mt-5 divide-y divide-border">
            {steps.map((step, index) => {
              const Icon = stepIcons[step.id];

              return (
                <li
                  key={step.id}
                  className="group flex items-center gap-3 py-4 first:pt-0 last:pb-0 sm:gap-4"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      step.complete
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                    aria-hidden="true"
                  >
                    {step.complete ? (
                      <Check className="h-5 w-5" strokeWidth={2.5} />
                    ) : (
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3
                        className={`text-sm font-semibold ${
                          step.complete
                            ? "text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        <span className="mr-1.5 text-xs font-medium tabular-nums text-muted-foreground/70">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {step.title}
                      </h3>
                      {step.optional && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Optional
                        </span>
                      )}
                      {step.complete && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          <CheckCircle2
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Done
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>

                  {!step.complete && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={step.onAction}
                      className="min-h-9 shrink-0 gap-1.5 border-primary/25 px-3 text-primary hover:bg-primary/5 hover:text-primary"
                    >
                      <span>{step.actionLabel}</span>
                      <ArrowRight
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </Button>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-5 text-sm text-muted-foreground">
            Your setup steps will appear here when they’re ready.
          </div>
        )}

        {!allComplete && steps.length > 0 && (
          <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
            No rush. You can come back to this whenever you’re ready.
          </p>
        )}
      </div>
    </section>
  );
}