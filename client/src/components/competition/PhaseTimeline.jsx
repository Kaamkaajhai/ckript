import { CheckCircle2, Circle } from "lucide-react";
import CountdownTimer from "./CountdownTimer";

// Renders the timeline exactly as the server described it. There is no client-side phase logic here
// on purpose: the same `steps` payload drives the landing page, the dashboard, the submit modal and
// My Competitions, so all four can never disagree about where the competition stands.

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
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />
              ) : isCurrent ? (
                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                  <span className="absolute h-3 w-3 animate-ping rounded-full bg-[#D14D37] opacity-60" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-[#D14D37]" />
                </span>
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true" />
              )}
              {index < steps.length - 1 ? (
                <span
                  className={`mt-1 w-px flex-1 ${isDone ? "bg-emerald-200 dark:bg-emerald-800" : "bg-gray-200 dark:bg-gray-700"}`}
                />
              ) : null}
            </div>

            <div className={compact ? "pb-1" : "pb-3"}>
              <p
                className={`text-sm font-medium ${
                  isCurrent
                    ? "text-[#D14D37]"
                    : isDone
                      ? "text-gray-800 dark:text-gray-100"
                      : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {step.label}
              </p>
              {step.date ? (
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{formatDate(step.date)}</p>
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
