import { DateTime } from "luxon";

export const MEETING_DURATIONS = Object.freeze([15, 30, 45, 60]);

const clean = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Normalize the calendar-facing request before any account lookup or Google side effect.
 * The browser constrains these fields too, but this is the trust boundary: callers can bypass it.
 */
export const normalizeMeetingRequest = (body = {}, now = new Date()) => {
  const value = {
    writerId: clean(body.writerId),
    scriptId: clean(body.scriptId),
    title: clean(body.title),
    scheduledDate: clean(body.scheduledDate),
    scheduledTime: clean(body.scheduledTime),
    duration: Number(body.duration),
    message: clean(body.message),
    timeZone: clean(body.timeZone),
  };

  if (!value.writerId || !value.scriptId || !value.title || !value.scheduledDate
    || !value.scheduledTime || !value.duration || !value.timeZone) {
    return { ok: false, message: "All fields except message are required." };
  }
  if (value.title.length > 120) return { ok: false, message: "Meeting title must be 120 characters or fewer." };
  if (value.message.length > 500) return { ok: false, message: "Meeting note must be 500 characters or fewer." };
  if (!MEETING_DURATIONS.includes(value.duration)) {
    return { ok: false, message: "Meeting duration must be 15, 30, 45, or 60 minutes." };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.scheduledDate) || !/^\d{2}:\d{2}$/.test(value.scheduledTime)) {
    return { ok: false, message: "Invalid date, time, or timezone." };
  }
  const datePart = value.scheduledDate;
  const start = DateTime.fromISO(`${datePart}T${value.scheduledTime}`, { zone: value.timeZone });
  if (!start.isValid) return { ok: false, message: "Invalid date, time, or timezone." };
  if (start.toMillis() <= DateTime.fromJSDate(now).toMillis()) {
    return { ok: false, message: "Meeting must be scheduled in the future." };
  }

  const end = start.plus({ minutes: value.duration });
  return {
    ok: true,
    value: {
      ...value,
      scheduledDate: datePart,
      startAt: start.toUTC().toJSDate(),
      startISO: start.toISO({ includeOffset: false }),
      endISO: end.toISO({ includeOffset: false }),
    },
  };
};
