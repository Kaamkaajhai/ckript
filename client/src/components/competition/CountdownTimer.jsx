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

  if (size === "sm") {
    return (
      <span className="font-mono text-sm tabular-nums text-gray-700 dark:text-gray-200">
        {days > 0 ? `${days}d ` : ""}{pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    );
  }

  const cells = [
    { value: days, unit: "Days" },
    { value: hours, unit: "Hours" },
    { value: minutes, unit: "Minutes" },
    { value: seconds, unit: "Seconds" },
  ];

  return (
    <div>
      {label ? (
        <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">{label}</p>
      ) : null}
      <div className="grid max-w-md grid-cols-4 gap-2 sm:gap-3">
        {cells.map((cell) => (
          <div
            key={cell.unit}
            className="rounded-xl border border-gray-200 bg-white px-2 py-3 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="font-mono text-2xl font-bold tabular-nums text-[#D14D37] sm:text-3xl">
              {pad(cell.value)}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {cell.unit}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CountdownTimer;
