/**
 * Badges and status pills.
 *
 * `StatusPill` maps the DOMAIN's own words onto the four status tones, so screens never pick
 * colours: a screen that decides "pending is orange" today decides "flagged is purple" next month,
 * and the language falls apart. Unknown statuses render neutral rather than throwing — an admin
 * table must not crash because the backend grew a new state.
 */

export function Badge({ tone = "neutral", children, className = "" }) {
  return <span className={`adg adg--${tone} ${className}`.trim()}>{children}</span>;
}

/** Domain status → tone. Extend HERE, never at a call site. */
const STATUS_TONE = {
  // generic lifecycle
  active: "success",
  approved: "success",
  published: "success",
  paid: "success",
  live: "success",
  completed: "success",
  judged: "success",

  pending: "warn",
  in_review: "warn",
  submitted: "warn",
  draft: "warn",
  judging: "warn",
  registration_open: "warn",

  rejected: "danger",
  failed: "danger",
  frozen: "danger",
  reversed: "danger",
  archived: "danger",

  granted: "info",
  hidden: "info",
  private: "info",
  test: "info",
};

export function StatusPill({ status, children, className = "" }) {
  const key = String(status || "").toLowerCase();
  const tone = STATUS_TONE[key] || "neutral";
  return (
    <span className={`adg adg--pill adg--${tone} ${className}`.trim()}>
      <span className="adg-dot" aria-hidden="true" />
      {children ?? key.replace(/_/g, " ")}
    </span>
  );
}
