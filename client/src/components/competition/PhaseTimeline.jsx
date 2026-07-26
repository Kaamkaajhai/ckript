import { CheckCircle2, Circle } from "lucide-react";
import CountdownTimer from "./CountdownTimer";

// Renders the timeline exactly as the server described it. There is no client-side phase logic here
// on purpose: the same `steps` payload drives the landing page, the dashboard, the submit modal and
// My Competitions, so all four can never disagree about where the competition stands.
//
// Reading order is carried by weight, not by hue: the CURRENT step is the only one that earns the
// accent, what is done reads in ink, and what has not happened yet stays muted.

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const PhaseTimeline = ({ steps = [], serverNow, compact = false }) => {
  if (!steps.length) return null;

  // "Is this still ahead of us?" is judged against the SERVER's clock, the same one the countdown
  // and the submission deadline use — never the device's.
  const nowMs = serverNow ? new Date(serverNow).getTime() : 0;

  return (
    <ol className={compact ? "space-y-2" : "space-y-3"}>
      {steps.map((step, index) => {
        const isDone = step.status === "done";
        const isCurrent = step.status === "current";
        const isFuture = Boolean(step.date) && new Date(step.date).getTime() > nowMs;

        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              {isDone ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "var(--ckc-ink)" }} aria-hidden="true" />
              ) : isCurrent ? (
                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                  <span
                    className="absolute h-3 w-3 animate-ping rounded-full opacity-60"
                    style={{ background: "var(--ckc-accent)" }}
                  />
                  <span className="relative h-2.5 w-2.5 rounded-full" style={{ background: "var(--ckc-accent)" }} />
                </span>
              ) : (
                // Decorative, never read — so this is the one place the faint tone belongs.
                <Circle className="h-5 w-5 shrink-0" style={{ color: "var(--ckc-faint)" }} aria-hidden="true" />
              )}
              {index < steps.length - 1 ? (
                <span
                  className="mt-1 w-px flex-1"
                  style={{ background: isDone ? "var(--ckc-faint)" : "var(--ckc-rule)" }}
                />
              ) : null}
            </div>

            <div className={compact ? "pb-1" : "pb-3"}>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: isCurrent ? 500 : 400,
                  color: isCurrent
                    ? "var(--ckc-accent-text)"
                    : isDone
                      ? "var(--ckc-ink)"
                      : "var(--ckc-muted)",
                }}
              >
                {step.label}
              </p>
              {step.date ? (
                // A full date-time is long for the slug-line voice, so the tracking is eased the way
                // the competition cards ease theirs.
                <p className="ckc-meta mt-1" style={{ letterSpacing: "0.06em" }}>{formatDate(step.date)}</p>
              ) : null}
              {isCurrent && isFuture ? (
                <div className="mt-1">
                  <CountdownTimer target={step.date} serverNow={serverNow} size="sm" />
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default PhaseTimeline;
