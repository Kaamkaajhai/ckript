import api from "../../services/api";
import { isFilmIndustryProfessionalRole } from "../../utils/industryAccess";
import { buildRequestParams } from "./writerRoster";

export const WRITER_ROSTER_STATUS = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  FAILED: "failed",
});

export async function loadWriterRoster({ sort, query, user, signal, client = api } = {}) {
  const rosterRequest = client.get(
    `/users/writers?${buildRequestParams({ sort, query })}`,
    { signal },
  );
  const mandateRequest = isFilmIndustryProfessionalRole(user)
    ? client.get("/users/me", { signal })
    : Promise.resolve({ data: null });

  const [rosterResult, mandateResult] = await Promise.allSettled([rosterRequest, mandateRequest]);
  if (rosterResult.status === "rejected") throw rosterResult.reason;

  return {
    writers: Array.isArray(rosterResult.value?.data) ? rosterResult.value.data : [],
    mandateSource: mandateResult.status === "fulfilled" ? mandateResult.value?.data || null : null,
    mandateUnavailable: mandateResult.status === "rejected",
  };
}
