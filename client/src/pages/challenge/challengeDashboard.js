import api from "../../services/api";
import { getProfileCanonicalPath } from "../../utils/profilePath";
import { updateProfileFollow } from "../profile/authenticatedProfile";
import { downloadChallengeCertificate } from "./challengeHub";
import { loadChallengeDetail } from "./challengeDetail";

export const CHALLENGE_DASHBOARD_STATUS = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  NOT_REGISTERED: "not-registered",
  NOT_FOUND: "not-found",
  FAILED: "failed",
});

export const CHALLENGE_DASHBOARD_TABS = Object.freeze([
  { id: "home", label: "Home" },
  { id: "event", label: "Event" },
  { id: "prizes", label: "Prizes" },
  { id: "community", label: "Community" },
  { id: "resources", label: "Resources" },
  { id: "studio", label: "Studio" },
]);

const text = (value) => String(value ?? "").trim();
const ids = new Set(CHALLENGE_DASHBOARD_TABS.map((tab) => tab.id));
const failure = (cause, fallback) => ({
  ok: false,
  cancelled: cause?.code === "ERR_CANCELED",
  statusCode: Number(cause?.response?.status || 0),
  message: cause?.response?.data?.message || fallback,
  cause,
});

export const challengeDashboardTab = (value) => (ids.has(text(value).toLowerCase()) ? text(value).toLowerCase() : "home");

export const challengeDashboardPath = ({ slug = "", tab = "home" } = {}) => {
  const query = new URLSearchParams();
  if (text(slug)) query.set("c", text(slug));
  const normalizedTab = challengeDashboardTab(tab);
  if (normalizedTab !== "home") query.set("tab", normalizedTab);
  const suffix = query.toString();
  return `/challenge/dashboard${suffix ? `?${suffix}` : ""}`;
};

export const normalizeChallengeDashboard = (payload = {}) => ({
  competition: payload.competition || null,
  entry: payload.entry || null,
  phase: text(payload.phase) || null,
  timeline: Array.isArray(payload.timeline) ? payload.timeline.filter(Boolean) : [],
  results: payload.results || null,
  referrals: payload.referrals || null,
  referralCode: text(payload.referralCode),
  serverNow: payload.serverNow || null,
});

export async function loadChallengeDashboard({ slug, signal } = {}) {
  const detail = await loadChallengeDetail({ slug, signal });
  if (!detail.ok) return detail;
  const competition = detail.data?.competition;
  if (!competition?._id) return { ok: true, standing: CHALLENGE_DASHBOARD_STATUS.NOT_FOUND, data: null };
  try {
    const { data } = await api.get(`/competitions/${encodeURIComponent(competition._id)}/me`, {
      params: { view: "dashboard" },
      signal,
    });
    return { ok: true, standing: CHALLENGE_DASHBOARD_STATUS.READY, data: normalizeChallengeDashboard(data) };
  } catch (cause) {
    if (signal?.aborted || cause?.code === "ERR_CANCELED") return { ok: false, cancelled: true };
    if (Number(cause?.response?.status) === 404) {
      return { ok: true, standing: CHALLENGE_DASHBOARD_STATUS.NOT_REGISTERED, data: { competition } };
    }
    return failure(cause, "Could not load your challenge dashboard. Please try again.");
  }
}

const normalizePage = (payload = {}, key) => ({
  items: Array.isArray(payload[key]) ? payload[key] : [],
  page: Number(payload.page || payload.pageInfo?.page || 1),
  limit: Number(payload.limit || payload.pageInfo?.limit || 12),
  total: Number(payload.total ?? payload.pageInfo?.total ?? 0),
  hasMore: Boolean(payload.hasMore ?? payload.pageInfo?.hasMore),
  progress: payload.progress || null,
  referralCode: text(payload.referralCode),
});

export async function loadChallengeParticipants({ competitionId, page = 1, limit = 12, signal } = {}) {
  try {
    const { data } = await api.get(`/competitions/${encodeURIComponent(text(competitionId))}/participants`, { params: { page, limit }, signal });
    const normalized = normalizePage(data, "participants");
    return {
      ok: true,
      data: {
        ...normalized,
        items: normalized.items.map((participant) => ({
          ...participant,
          canonicalPath: getProfileCanonicalPath(participant),
        })),
      },
    };
  } catch (cause) {
    if (signal?.aborted || cause?.code === "ERR_CANCELED") return { ok: false, cancelled: true };
    return failure(cause, "Could not load the participant room.");
  }
}

export async function loadChallengeReferrals({ competitionId, page = 1, limit = 12, signal } = {}) {
  try {
    const { data } = await api.get(`/competitions/${encodeURIComponent(text(competitionId))}/referrals`, { params: { page, limit }, signal });
    return { ok: true, data: normalizePage(data, "referrals") };
  } catch (cause) {
    if (signal?.aborted || cause?.code === "ERR_CANCELED") return { ok: false, cancelled: true };
    return failure(cause, "Could not load your referral history.");
  }
}

export async function openChallengeEditor({ competitionId } = {}) {
  try {
    const { data } = await api.post(`/competitions/${encodeURIComponent(text(competitionId))}/open-editor`);
    if (!data?.scriptId) return failure(null, "The editor did not return a script. Please try again.");
    return { ok: true, data: { scriptId: text(data.scriptId) } };
  } catch (cause) {
    return failure(cause, "Could not open the editor. Please try again.");
  }
}

export async function updateChallengeParticipantFollow(participant = {}) {
  const result = await updateProfileFollow({
    profileId: participant._id,
    relationship: {
      isFollowing: Boolean(participant.isFollowing),
      followRequestPending: Boolean(participant.followRequestPending),
    },
  });
  return result.ok ? { ok: true, data: { ...participant, ...result.data } } : result;
}

export const downloadDashboardCertificate = downloadChallengeCertificate;
