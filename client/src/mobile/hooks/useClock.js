import { useEffect, useState } from "react";

/*
 * useClock — a live "9:41"-style time for the faux status bar. Updates each
 * minute (aligned to the minute boundary) so the app reads as a real device
 * rather than a frozen mockup.
 */
function format(d) {
  let h = d.getHours() % 12;
  if (h === 0) h = 12;
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function useClock() {
  const [time, setTime] = useState(() => format(new Date()));

  useEffect(() => {
    let timeout;
    const tick = () => {
      setTime(format(new Date()));
      // Re-sync to the next minute boundary.
      timeout = setTimeout(tick, 60000 - (Date.now() % 60000));
    };
    timeout = setTimeout(tick, 60000 - (Date.now() % 60000));
    return () => clearTimeout(timeout);
  }, []);

  return time;
}
