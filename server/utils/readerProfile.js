import { buildVisitorProfile } from "./profileProjection.js";

export const READER_PROFILE_SECTIONS = Object.freeze(["read", "favorites", "reviews"]);
export const READER_PROFILE_PAGE_SIZE = 12;

const text = (value) => String(value ?? "").trim();
const idOf = (value) => text(value?._id || value?.id || value);

export function normalizeReaderProfileQuery(query = {}) {
  const requestedSection = text(query.section).toLowerCase();
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(20, Math.max(1, Number.parseInt(query.limit, 10) || READER_PROFILE_PAGE_SIZE));
  return {
    section: READER_PROFILE_SECTIONS.includes(requestedSection) ? requestedSection : "read",
    page,
    limit,
  };
}

export function getReaderProfileRelationship(profile = {}, viewerId = "") {
  const normalizedViewerId = idOf(viewerId);
  const followers = Array.isArray(profile.followers) ? profile.followers : [];
  const following = Array.isArray(profile.following) ? profile.following : [];
  return {
    isFollowing: followers.some((entry) => idOf(entry) === normalizedViewerId),
    followsMe: following.some((entry) => idOf(entry) === normalizedViewerId),
    followRequestPending: (Array.isArray(profile.followRequests) ? profile.followRequests : [])
      .some((entry) => idOf(entry?.from || entry) === normalizedViewerId),
    blockedByCurrent: false,
    blockedByProfile: false,
  };
}

export function projectReaderProfile(profile = {}, { own = false } = {}) {
  if (!own) return buildVisitorProfile(profile);
  return {
    _id: profile._id,
    name: text(profile.name),
    role: text(profile.role),
    bio: text(profile.bio),
    skills: Array.isArray(profile.skills) ? profile.skills.filter(Boolean).slice(0, 25) : [],
    profileImage: text(profile.profileImage),
    coverImage: text(profile.coverImage),
    phone: text(profile.phone),
    dateOfBirth: profile.dateOfBirth,
    address: profile.address ? {
      street: text(profile.address.street),
      city: text(profile.address.city),
      state: text(profile.address.state),
      zipCode: text(profile.address.zipCode),
      country: text(profile.address.country),
    } : undefined,
    createdAt: profile.createdAt,
    isPrivate: Boolean(profile.isPrivate),
    followers: Array.isArray(profile.followers) ? profile.followers : [],
    following: Array.isArray(profile.following) ? profile.following : [],
  };
}

export function readerCollectionMeta({ section, page, limit, total, collectionsVisible }) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const totalPages = Math.max(1, Math.ceil(safeTotal / limit));
  return {
    section,
    page,
    limit,
    total: safeTotal,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
    privateCollection: !collectionsVisible && section !== "reviews",
  };
}
