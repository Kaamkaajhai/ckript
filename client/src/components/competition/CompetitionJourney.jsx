import { Check } from "lucide-react";

/**
 * The participant's progress through the competition, as a compact strip.
 *
 * A progress indicator, not a feed. It stores nothing and fetches nothing: it renders the SAME
 * `timeline` array the server already sends, which is derived from the competition dates and the
 * entry's own status. Adding state here would mean two sources of truth for "where am I".
 *
 * PhaseTimeline renders the same data as a detailed vertical list and still serves the Event tab and
 * the public landing page; this is the at-a-glance view for the dashboard Home tab.
 *
 * Horizontal on desktop, vertical on mobile — eight steps cannot be read side by side on a phone.
 */

const CompetitionJourney = ({ steps = [] }) => {
  if (!steps.length) return null;

  const doneCount = steps.filter((s) => s.status === "done").length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your journey</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">{doneCount} of {steps.length} complete</span>
      </div>

      {/* Mobile: a vertical list, which is the only readable shape for eight steps on a phone. */}
      <ol className="space-y-2 sm:hidden">
        {steps.map((step) => (
          <li key={step.key} className="flex items-center gap-2.5">
            <Marker status={step.status} />
            <span className={labelClass(step.status)}>{step.label}</span>
          </li>
        ))}
      </ol>

      {/* Desktop: a single strip. The connector sits behind the markers via a -z-10 rule so it does
          not cut through them. */}
      <div className="hidden sm:block">
        <div className="relative">
          <div className="absolute left-0 right-0 top-3 -z-10 h-0.5 bg-gray-200 dark:bg-gray-700" />
          <div
            className="absolute left-0 top-3 -z-10 h-0.5 bg-emerald-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
          <ol className="flex justify-between gap-1">
            {steps.map((step) => (
              <li key={step.key} className="flex flex-1 flex-col items-center gap-2 text-center">
                <Marker status={step.status} />
                <span className={`${labelClass(step.status)} text-[11px] leading-tight`}>{step.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

const labelClass = (status) => {
  if (status === "current") return "font-semibold text-[#D14D37]";
  if (status === "done") return "text-gray-700 dark:text-gray-200";
  return "text-gray-400 dark:text-gray-500";
};

const Marker = ({ status }) => {
  if (status === "done") {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-white dark:ring-gray-800">
        <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
      </span>
    );
  }
  if (status === "current") {
    return (
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D14D37] ring-4 ring-white dark:ring-gray-800">
        <span className="absolute h-6 w-6 animate-ping rounded-full bg-[#D14D37] opacity-40" />
        <span className="relative h-2 w-2 rounded-full bg-white" />
      </span>
    );
  }
  return (
    <span className="h-6 w-6 shrink-0 rounded-full border-2 border-gray-300 bg-white ring-4 ring-white dark:border-gray-600 dark:bg-gray-800 dark:ring-gray-800" />
  );
};

export default CompetitionJourney;
