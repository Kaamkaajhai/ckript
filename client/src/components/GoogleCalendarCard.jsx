import { useContext, useEffect, useState } from "react";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";

// Settings card to connect/disconnect Google Calendar (producer meeting scheduling). Self-contained:
// fetches its own status, and reads the ?calendar=connected|error flag the OAuth callback redirects to.
const GoogleCalendarCard = ({ dark = false }) => {
  const { user, setUser } = useContext(AuthContext);
  const [status, setStatus] = useState({ connected: false, calendarEmail: "", configured: true });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null); // { type: "ok"|"err", text }

  const load = async () => {
    try {
      const { data } = await api.get("/google-calendar/status");
      setStatus(data || {});
      // Keep AuthContext in sync so the schedule gate reflects reality without a full reload.
      if (user && Boolean(user?.googleCalendar?.connected) !== Boolean(data?.connected)) {
        setUser({ ...user, googleCalendar: { connected: Boolean(data?.connected), calendarEmail: data?.calendarEmail || "" } });
      }
    } catch {
      /* leave defaults */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Toast from the OAuth callback redirect, then strip the query param.
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("calendar");
    if (flag === "connected") setNotice({ type: "ok", text: "Google Calendar connected." });
    else if (flag === "error") setNotice({ type: "err", text: "Couldn't connect Google Calendar. Please try again." });
    if (flag) {
      params.delete("calendar");
      const qs = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      const { data } = await api.post("/google-calendar/auth-url", { returnTo });
      if (data?.url) window.location.href = data.url;
      else {
        setNotice({ type: "err", text: "Google Calendar is not available right now." });
        setBusy(false);
      }
    } catch (err) {
      setNotice({ type: "err", text: err.response?.data?.message || "Couldn't start connection." });
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await api.delete("/google-calendar");
      setStatus((s) => ({ ...s, connected: false, calendarEmail: "" }));
      if (user) setUser({ ...user, googleCalendar: { connected: false, calendarEmail: "" } });
      setNotice({ type: "ok", text: "Google Calendar disconnected." });
    } catch (err) {
      setNotice({ type: "err", text: err.response?.data?.message || "Couldn't disconnect." });
    } finally {
      setBusy(false);
    }
  };

  const box = dark ? "border-white/[0.06] bg-white/[0.02]" : "border-gray-100 bg-gray-50/60";

  return (
    <div className={`flex flex-col gap-3 py-3 px-4 rounded-xl border ${box}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <svg className="w-5 h-5 shrink-0 text-[#D14D37]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z" />
          </svg>
          <div className="min-w-0">
            <p className={`text-[13px] font-semibold ${dark ? "text-white/70" : "text-gray-700"}`}>Google Calendar</p>
            <p className={`text-[11px] truncate ${dark ? "text-white/25" : "text-gray-400"}`}>
              {loading
                ? "Checking…"
                : status.connected
                ? `Connected${status.calendarEmail ? ` · ${status.calendarEmail}` : ""}`
                : "Connect to schedule meetings as Google Meet events"}
            </p>
          </div>
        </div>
        {!loading && (
          status.connected ? (
            <button
              onClick={disconnect}
              disabled={busy}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition disabled:opacity-60 ${dark ? "border-white/10 text-white/70 hover:bg-white/[0.06]" : "border-gray-200 text-gray-600 hover:bg-gray-100"}`}
            >
              {busy ? "…" : "Disconnect"}
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={busy || status.configured === false}
              title={status.configured === false ? "Google Calendar is not configured on the server" : undefined}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#D14D37] hover:bg-[#b53c29] !text-white transition disabled:opacity-60"
            >
              {busy ? "…" : "Connect"}
            </button>
          )
        )}
      </div>
      {notice && (
        <div className={`text-[12px] font-medium ${notice.type === "ok" ? "text-emerald-500" : "text-red-500"}`}>
          {notice.text}
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarCard;
