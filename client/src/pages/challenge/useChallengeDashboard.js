import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CHALLENGE_DASHBOARD_STATUS,
  downloadDashboardCertificate,
  loadChallengeDashboard,
  loadChallengeParticipants,
  loadChallengeReferrals,
  openChallengeEditor,
  updateChallengeParticipantFollow,
} from "./challengeDashboard";

const emptyMain = { status: CHALLENGE_DASHBOARD_STATUS.IDLE, data: null, failure: null };
const emptyPage = { scope: "", status: CHALLENGE_DASHBOARD_STATUS.IDLE, items: [], page: 0, requestedPage: 0, limit: 12, total: 0, hasMore: false, failure: null };
const userKeyOf = (user) => String(user?._id || user?.id || user?.sid || "");

export default function useChallengeDashboard({ slug = "", user = null, enabled = true, communityEnabled = false, poll = true } = {}) {
  const scope = enabled ? `${userKeyOf(user)}:${slug}` : "";
  const [revision, setRevision] = useState(0);
  const [main, setMain] = useState(emptyMain);
  const [participants, setParticipants] = useState(emptyPage);
  const [referrals, setReferrals] = useState({ ...emptyPage, progress: null, referralCode: "" });
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState("");
  const [followPending, setFollowPending] = useState("");
  const [followError, setFollowError] = useState("");
  const [certificatePending, setCertificatePending] = useState(false);
  const [certificateError, setCertificateError] = useState("");
  const participantAbort = useRef(null);
  const referralAbort = useRef(null);

  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!scope) return undefined;
    const controller = new AbortController();
    loadChallengeDashboard({ slug, signal: controller.signal }).then((result) => {
      if (controller.signal.aborted || result.cancelled) return;
      setMain(result.ok
        ? { status: result.standing, data: result.data, failure: null, scope }
        : { status: CHALLENGE_DASHBOARD_STATUS.FAILED, data: null, failure: result, scope });
    });
    return () => controller.abort();
  }, [revision, scope, slug]);

  useEffect(() => {
    if (!poll || !scope) return undefined;
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, [poll, refresh, scope]);

  const competitionId = main.data?.competition?._id || "";

  const fetchParticipants = useCallback(async ({ page = 1, append = false } = {}) => {
    if (!competitionId) return false;
    participantAbort.current?.abort();
    const controller = new AbortController();
    participantAbort.current = controller;
    setParticipants((current) => ({ ...current, scope: competitionId, requestedPage: page, status: CHALLENGE_DASHBOARD_STATUS.LOADING, failure: null }));
    const result = await loadChallengeParticipants({ competitionId, page, signal: controller.signal });
    if (controller.signal.aborted || result.cancelled) return false;
    if (!result.ok) {
      setParticipants((current) => ({ ...current, scope: competitionId, requestedPage: page, status: CHALLENGE_DASHBOARD_STATUS.FAILED, failure: result }));
      return false;
    }
    setParticipants((current) => ({
      ...result.data,
      scope: competitionId,
      requestedPage: page,
      items: append ? [...current.items, ...result.data.items] : result.data.items,
      status: CHALLENGE_DASHBOARD_STATUS.READY,
      failure: null,
    }));
    return true;
  }, [competitionId]);

  const fetchReferrals = useCallback(async ({ page = 1, append = false } = {}) => {
    if (!competitionId) return false;
    referralAbort.current?.abort();
    const controller = new AbortController();
    referralAbort.current = controller;
    setReferrals((current) => ({ ...current, scope: competitionId, requestedPage: page, status: CHALLENGE_DASHBOARD_STATUS.LOADING, failure: null }));
    const result = await loadChallengeReferrals({ competitionId, page, signal: controller.signal });
    if (controller.signal.aborted || result.cancelled) return false;
    if (!result.ok) {
      setReferrals((current) => ({ ...current, scope: competitionId, requestedPage: page, status: CHALLENGE_DASHBOARD_STATUS.FAILED, failure: result }));
      return false;
    }
    setReferrals((current) => ({
      ...result.data,
      scope: competitionId,
      requestedPage: page,
      progress: result.data.progress || current.progress,
      referralCode: result.data.referralCode || current.referralCode,
      items: append ? [...current.items, ...result.data.items] : result.data.items,
      status: CHALLENGE_DASHBOARD_STATUS.READY,
      failure: null,
    }));
    return true;
  }, [competitionId]);

  useEffect(() => {
    if (!communityEnabled || !competitionId) return undefined;
    const timer = setTimeout(() => {
      fetchParticipants();
      fetchReferrals();
    }, 0);
    return () => {
      clearTimeout(timer);
      participantAbort.current?.abort();
      referralAbort.current?.abort();
    };
  }, [communityEnabled, competitionId, fetchParticipants, fetchReferrals]);

  const openEditor = useCallback(async () => {
    if (!competitionId || opening) return null;
    setOpening(true);
    setOpenError("");
    const result = await openChallengeEditor({ competitionId });
    setOpening(false);
    if (!result.ok) {
      setOpenError(result.message);
      refresh();
      return null;
    }
    return result.data.scriptId;
  }, [competitionId, opening, refresh]);

  const toggleFollow = useCallback(async (participant) => {
    const id = String(participant?._id || "");
    if (!id || followPending) return false;
    setFollowPending(id);
    setFollowError("");
    const result = await updateChallengeParticipantFollow(participant);
    setFollowPending("");
    if (!result.ok) {
      setFollowError(result.message);
      return false;
    }
    setParticipants((current) => ({ ...current, items: current.items.map((item) => String(item._id) === id ? result.data : item), failure: null }));
    return true;
  }, [followPending]);

  const downloadCertificate = useCallback(async () => {
    if (!competitionId || certificatePending) return false;
    setCertificatePending(true);
    setCertificateError("");
    const result = await downloadDashboardCertificate({ competitionId, competitionName: main.data?.competition?.name });
    setCertificatePending(false);
    if (!result.ok) setCertificateError(result.message);
    return result.ok;
  }, [certificatePending, competitionId, main.data?.competition?.name]);

  return useMemo(() => {
    // Community data is entrant-only and competition-specific. Never let the previous challenge's
    // page flash while a new slug is resolving or its first bounded page is in flight.
    const visibleParticipants = participants.scope === competitionId
      ? participants
      : { ...emptyPage, status: communityEnabled && competitionId ? CHALLENGE_DASHBOARD_STATUS.LOADING : CHALLENGE_DASHBOARD_STATUS.IDLE };
    const visibleReferrals = referrals.scope === competitionId
      ? referrals
      : { ...emptyPage, progress: null, referralCode: "", status: communityEnabled && competitionId ? CHALLENGE_DASHBOARD_STATUS.LOADING : CHALLENGE_DASHBOARD_STATUS.IDLE };
    return {
      ...(main.scope === scope
        ? main
        : { ...emptyMain, status: scope ? CHALLENGE_DASHBOARD_STATUS.LOADING : CHALLENGE_DASHBOARD_STATUS.IDLE }),
      refresh,
      opening,
      openError,
      openEditor,
      participants: visibleParticipants,
      referrals: visibleReferrals,
      loadMoreParticipants: () => fetchParticipants({ page: visibleParticipants.page + 1, append: true }),
      retryParticipants: () => fetchParticipants({ page: Math.max(1, visibleParticipants.requestedPage || 1), append: visibleParticipants.requestedPage > 1 }),
      loadMoreReferrals: () => fetchReferrals({ page: visibleReferrals.page + 1, append: true }),
      retryReferrals: () => fetchReferrals({ page: Math.max(1, visibleReferrals.requestedPage || 1), append: visibleReferrals.requestedPage > 1 }),
      followPending,
      followError,
      toggleFollow,
      certificatePending,
      certificateError,
      downloadCertificate,
    };
  }, [certificateError, certificatePending, communityEnabled, competitionId, downloadCertificate, fetchParticipants, fetchReferrals, followError, followPending, main, openEditor, openError, opening, participants, referrals, refresh, scope, toggleFollow]);
}
