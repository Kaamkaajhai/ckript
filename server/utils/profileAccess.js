import {
  hasActiveFilmIndustryProfessionalAccess,
  hasBusinessEmail,
  isIndustryProfessionalWithPersonalEmail,
  isWriterRole,
} from "./industryAccess.js";
import { buildBusinessEmailProfileDenial, buildPrivateProfileDenial } from "./profileProjection.js";

const idOf = (value) => String(value?._id || value?.id || value || "");
const includesUser = (values, userId) => (Array.isArray(values) ? values : [])
  .some((entry) => idOf(entry) === idOf(userId));

export function evaluateAuthenticatedProfileAccess({ profile = {}, viewer = {}, viewerId, own = false } = {}) {
  if (own) {
    return {
      allowed: true,
      blockedByCurrent: false,
      blockedByProfile: false,
      isFollower: true,
      isAdminViewer: String(viewer?.role || profile?.role || "").toLowerCase() === "admin",
    };
  }

  const targetId = idOf(profile);
  const normalizedViewerId = idOf(viewerId || viewer);
  const blockedByCurrent = includesUser(viewer?.blockedUsers, targetId);
  const blockedByProfile = includesUser(profile?.blockedUsers, normalizedViewerId);
  const isFollower = includesUser(profile?.followers, normalizedViewerId);
  const isAdminViewer = String(viewer?.role || "").toLowerCase() === "admin";
  const relationship = { blockedByCurrent, blockedByProfile, isFollower, isAdminViewer };

  if (blockedByProfile) {
    return {
      ...relationship,
      allowed: false,
      status: 403,
      body: {
        message: "This user has blocked you.",
        blocked: true,
        blockedByCurrent,
        blockedByProfile,
      },
    };
  }
  if (profile?.isDeactivated && !isAdminViewer) {
    return { ...relationship, allowed: false, status: 404, body: { message: "User not found" } };
  }

  if (isWriterRole(profile) && hasActiveFilmIndustryProfessionalAccess(viewer)) {
    const plan = viewer?.subscription?.plan || "free";
    if (plan === "free" && !hasBusinessEmail(viewer?.email)) {
      return {
        ...relationship,
        allowed: false,
        status: 403,
        body: buildBusinessEmailProfileDenial(
          "Viewing writer profiles requires a company email. Upgrade your plan or update your email.",
        ),
      };
    }
  }

  if (profile?.isPrivate && !isFollower && !isAdminViewer) {
    const followRequestPending = (Array.isArray(profile?.followRequests) ? profile.followRequests : [])
      .some((entry) => idOf(entry?.from || entry) === normalizedViewerId);
    return {
      ...relationship,
      allowed: false,
      status: 403,
      body: buildPrivateProfileDenial({
        userId: targetId,
        followRequestPending,
        blockedByCurrent,
        blockedByProfile,
      }),
    };
  }

  if (
    isWriterRole(profile) &&
    isIndustryProfessionalWithPersonalEmail(viewer) &&
    !hasActiveFilmIndustryProfessionalAccess(viewer)
  ) {
    return {
      ...relationship,
      allowed: false,
      status: 403,
      body: {
        message: "To view scripts and writer profiles, sign up with a business email. To access writer contact details, purchase a Film Industry Professional plan.",
        requiresBusinessEmail: true,
      },
    };
  }

  return { ...relationship, allowed: true };
}
