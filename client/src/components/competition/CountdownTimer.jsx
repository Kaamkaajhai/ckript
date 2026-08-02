import { useEffect, useRef, useState } from "react";

// Counts down to a server-supplied deadline.
//
// The offset between the server clock and this device's clock is measured ONCE on mount and applied
// to every tick. Without it, a laptop whose clock is ten minutes fast would show a writer ten
// minutes less time than they actually have — and the server, which is authoritative, would keep
// accepting their submission long after their screen read 00:00.

const pad = (value) => String(value).padStart(2, "0");

const breakdown = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    expired: ms <= 0,
  };
};

const CountdownTimer = ({ target, serverNow, onExpire, size = "lg", label = "" }) => {
  const targetMs = target ? new Date(target).getTime() : null;

  // Measured once: later re-renders must not re-measure, or the countdown would drift.
  const offsetRef = useRef(null);
  if (offsetRef.current === null) {
    offsetRef.current = serverNow ? new Date(serverNow).getTime() - Date.now() : 0;
  }

  const remaining = () => (targetMs === null ? 0 : targetMs - (Date.now() + offsetRef.current));
  const [left, setLeft] = useState(remaining);
  const firedRef = useRef(false);

  useEffect(() => {
    if (targetMs === null) return undefined;
    // A new target is a new countdown: re-arm onExpire. Without this the component fires once per
    // MOUNT, so a landing page that lives through several phase boundaries (registration closes →
    // competition starts → deadline) would auto-advance once and then go stale until a manual
    // reload, because the same instance simply re-points at the next date.
    firedRef.current = false;
    setLeft(remaining());
    const id = setInterval(() => setLeft(remaining()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetMs]);

  useEffect(() => {
    if (targetMs === null || left > 0 || firedRef.current) return;
    firedRef.current = true;   // once per target, even though the interval keeps ticking
    onExpire?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, targetMs]);

  if (targetMs === null) return null;
  const { days, hours, minutes, seconds } = breakdown(left);

  // Inline: a running clock for bars, rows and cards. Monospace so the width never shifts.
  if (size === "sm") {
    return (
      <span className="ckc-clock-inline">
        {days > 0 ? `${days}d ` : ""}{pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    );
  }

  // Named units, minute resolution: "06d 14h 22m". For editorial notice bars,
  // where a ticking seconds column pulls the eye away from the sentence around
  // it. Still padded and monospace, so the width holds steady.
  if (size === "units") {
    return (
      <span className="ckc-clock-inline">
        {pad(days)}d {pad(hours)}h {pad(minutes)}m
      </span>
    );
  }

  // Full: the masthead numeral display. A 48-hour challenge IS its clock, so this is set like a
  // title page — large tabular serif figures, the unit named beneath in the slug-line voice. Four
  // bordered boxes made the most characteristic thing on the page look like a cookie banner.
  const cells = [
    { value: days, unit: "Days" },
    { value: hours, unit: "Hours" },
    { value: minutes, unit: "Minutes" },
    { value: seconds, unit: "Seconds" },
  ];

  return (
    <div>
      {label ? <p className="ckc-meta" style={{ marginBottom: 10 }}>{label}</p> : null}
      <div className="ckc-clock">
        {cells.map((cell) => (
          <div key={cell.unit} className="ckc-clock-cell">
            <span className="ckc-clock-num">{pad(cell.value)}</span>
            <span className="ckc-clock-unit">{cell.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CountdownTimer;
