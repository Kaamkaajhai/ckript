import { isWriterProfileRole } from "../../../../features/profile-pc/profilePolicy";
import {
  getContactsLimit,
  getRemainingContacts,
  getRevealedContactCount,
  hasAnyFipAccess,
  hasReachedContactLimit,
  hasRevealedContact,
  isFilmIndustryProfessionalRole,
} from "../../../../utils/industryAccess";
import { buildPublicProfileView, safePublicUrl } from "../public-profile/publicProfileModel";

const text = (value) => (["string", "number"].includes(typeof value) ? String(value).trim() : "");
const safeLinks = (links = {}) => (links && typeof links === "object" && !Array.isArray(links)
  ? Object.entries(links).map(([key, value]) => ({
    key,
    label: ({ portfolio: "Portfolio", linkedin: "LinkedIn", imdb: "IMDb", instagram: "Instagram", twitter: "X / Twitter", facebook: "Facebook" })[key] || key,
    url: safePublicUrl(value),
  })).filter(({ url }) => url)
  : []);

export function buildVisitorProfileView({ profile = {}, scripts = [], viewer = {}, relationship = {}, contact = null, contactStats = null } = {}) {
  const followers = Array.isArray(profile.followers) ? profile.followers : [];
  const following = Array.isArray(profile.following) ? profile.following : [];
  const base = buildPublicProfileView({
    ...profile,
    followerCount: followers.length,
    followingCount: following.length,
  }, scripts);
  const writer = isWriterProfileRole(profile.role);
  const viewerRole = text(viewer.role).toLowerCase();
  const alreadyRevealed = Boolean(contact) || (writer && hasRevealedContact(viewer, profile._id));
  const canReveal = writer
    && profile.allowIndustryContact !== false
    && hasAnyFipAccess(viewer);
  const limitReached = contactStats
    ? Number(contactStats.remainingContacts) <= 0
    : hasReachedContactLimit(viewer);
  const canMessage = writer && (isFilmIndustryProfessionalRole(viewer) || viewerRole === "admin");
  const canPitch = text(profile.role).toLowerCase() === "investor" && isWriterProfileRole(viewer.role);

  let followLabel = relationship.followsMe ? "Follow back" : "Follow";
  if (relationship.followRequestPending) followLabel = "Requested";
  if (relationship.isFollowing) followLabel = "Following";
  if (relationship.blockedByCurrent) followLabel = "Blocked";
  if (relationship.blockedByProfile) followLabel = "Blocked you";

  return {
    ...base,
    followLabel,
    canFollow: !relationship.blockedByCurrent && !relationship.blockedByProfile,
    canMessage: canMessage && !relationship.blockedByCurrent && !relationship.blockedByProfile,
    canPitch: canPitch && !relationship.blockedByCurrent && !relationship.blockedByProfile,
    canReveal: canReveal && !relationship.blockedByCurrent && !relationship.blockedByProfile,
    contactAlreadyRevealed: alreadyRevealed,
    contactLimitReached: canReveal && !alreadyRevealed && limitReached,
    contactUsed: Number(contactStats?.contactsUsed ?? getRevealedContactCount(viewer)) || 0,
    contactLimit: Number(contactStats?.contactsLimit ?? getContactsLimit(viewer)) || 0,
    contactRemaining: Number(contactStats?.remainingContacts ?? getRemainingContacts(viewer)) || 0,
    contact: contact ? {
      email: text(contact.email),
      phone: text(contact.phone),
      links: safeLinks(contact.links),
    } : null,
    location: [profile.address?.city, profile.address?.state, profile.address?.country]
      .map(text).filter(Boolean).join(", "),
    credentials: writer ? [
      ["WGA", profile.writerProfile?.membershipVerification?.wga?.status],
      ["SWA", profile.writerProfile?.membershipVerification?.swa?.status],
    ].filter(([, status]) => status === "approved").map(([label]) => `${label} verified`) : [],
    blockedByCurrent: Boolean(relationship.blockedByCurrent),
    blockedByProfile: Boolean(relationship.blockedByProfile),
  };
}
