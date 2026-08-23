import api from "../../services/api";

const text = (value) => String(value ?? "").trim();

export const normalizeOfferHolds = (payload) => {
  const rows = Array.isArray(payload) ? payload : payload?.holds;
  return Array.isArray(rows) ? rows.filter(Boolean) : [];
};

const failure = (cause, fallback) => ({
  ok: false,
  status: Number(cause?.response?.status || 0),
  message: text(cause?.response?.data?.message) || fallback,
  conflict: Number(cause?.response?.status || 0) === 409,
});

/** One bounded holder-owned read shared by the standalone list and future ledger callers. */
export async function loadOfferHolds({ signal, limit = 100 } = {}) {
  try {
    const { data } = await api.get("/scripts/holds", {
      signal,
      params: { limit: Math.min(100, Math.max(1, Number(limit) || 100)) },
    });
    return { ok: true, data: normalizeOfferHolds(data) };
  } catch (cause) {
    if (signal?.aborted) return { ok: false, cancelled: true };
    return failure(cause, "Could not load your holds.");
  }
}
/**
 * Release one live option. `holdId` is authoritative; `scriptId` remains only as a compatibility
 * fallback for old deal rows while both desktop and native move to the option identity.
 */
export async function releaseOfferHold({ holdId, scriptId } = {}) {
  if (!text(holdId) && !text(scriptId)) {
    return { ok: false, status: 0, message: "This option is no longer available.", conflict: false };
  }
  try {
    const { data } = await api.post("/scripts/release-hold", {
      ...(text(holdId) ? { optionId: text(holdId).replace(/^option:/, "") } : {}),
      ...(text(scriptId) ? { scriptId: text(scriptId) } : {}),
    });
    return { ok: true, data };
  } catch (cause) {
    return failure(cause, "Could not release this option.");
  }
}
