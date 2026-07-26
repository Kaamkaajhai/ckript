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
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="ckc-title ckc-h3">Your journey</h2>
        <span className="ckc-meta">{doneCount} of {steps.length} complete</span>
      </div>

      {/* Mobile: a vertical list, which is the only readable shape for eight steps on a phone. */}
      <ol className="space-y-2 sm:hidden">
        {steps.map((step) => (
          <li key={step.key} className="flex items-center gap-2.5">
            <Marker status={step.status} />
            <span style={labelStyle(step.status)}>{step.label}</span>
          </li>
        ))}
      </ol>

      {/* Desktop: a single strip. The connector sits behind the markers via a -z-10 rule so it does
          not cut through them. */}
      <div className="hidden sm:block">
        <div className="relative">
          <div className="absolute left-0 right-0 top-3 -z-10 h-0.5" style={{ background: "var(--ckc-rule)" }} />
          {/* What is done reads in ink, here as well as in the labels. */}
          <div
            className="absolute left-0 top-3 -z-10 h-0.5 transition-all duration-500"
            style={{ width: `${pct}%`, background: "var(--ckc-ink)" }}
          />
          <ol className="flex justify-between gap-1">
            {steps.map((step) => (
              <li key={step.key} className="flex flex-1 flex-col items-center gap-2 text-center">
                <Marker status={step.status} />
                <span style={{ ...labelStyle(step.status), fontSize: 11, lineHeight: 1.25 }}>{step.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
};

// The step you are ON is the only one that earns the accent. Done steps read in ink and what has
// not happened yet stays muted — a strip where every label was coral said nothing about progress.
const labelStyle = (status) => {
  if (status === "current") return { fontSize: 14, fontWeight: 500, color: "var(--ckc-accent-text)" };
  if (status === "done") return { fontSize: 14, color: "var(--ckc-ink)" };
  return { fontSize: 14, color: "var(--ckc-muted)" };
};

// The 4px ring is the card's own colour punched through the connector, so a marker sits ON the rule
// instead of being sliced by it.
const RING = { boxShadow: "0 0 0 4px var(--ckc-card)" };

const Marker = ({ status }) => {
  if (status === "done") {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ ...RING, background: "var(--ckc-ink)" }}
      >
        <Check className="h-3.5 w-3.5" style={{ color: "var(--ckc-card)" }} aria-hidden="true" />
      </span>
    );
  }
  if (status === "current") {
    return (
      <span
        className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ ...RING, background: "var(--ckc-accent)" }}
      >
        <span className="absolute h-6 w-6 animate-ping rounded-full opacity-40" style={{ background: "var(--ckc-accent)" }} />
        <span className="relative h-2 w-2 rounded-full" style={{ background: "var(--ckc-card)" }} />
      </span>
    );
  }
  return (
    <span
      className="h-6 w-6 shrink-0 rounded-full"
      style={{ ...RING, background: "var(--ckc-card)", border: "2px solid var(--ckc-faint)" }}
    />
  );
};

export default CompetitionJourney;
