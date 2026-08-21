const text = (value) => (typeof value === "string" ? value.trim() : "");
const list = (value, limit = 40) => (Array.isArray(value)
  ? value.filter((item) => typeof item === "string" && item.trim()).slice(0, limit)
  : []);

export const VISITOR_PROFILE_SCRIPT_FIELDS = Object.freeze([
  "_id", "title", "sid", "logline", "description", "synopsis", "genre", "primaryGenre",
  "classification.genres", "contentType", "format", "formatOther", "coverImage", "trailerUrl",
  "uploadedTrailerUrl", "trailerSource", "price", "views", "scriptScore", "platformScore", "status",
  "premium", "creator", "createdAt", "updatedAt", "publishedAt",
]);

const publicConnection = (user) => {
  if (!user) return null;
  if (typeof user === "string") return { _id: user };
  return {
    _id: user._id,
    name: text(user.name),
    role: text(user.role),
    profileImage: text(user.profileImage),
    writerProfile: user.writerProfile?.username
      ? { username: text(user.writerProfile.username) }
      : undefined,
  };
};

const membershipStatus = (entry) => (entry ? {
  requested: Boolean(entry.requested),
  status: text(entry.status) || "not_submitted",
  submittedAt: entry.submittedAt,
  reviewedAt: entry.reviewedAt,
} : undefined);

const publicWriterProfile = (writer = {}) => {
  const diversity = writer.demographicPrivacy === "searchable" ? {
    gender: text(writer.diversity?.gender),
    nationality: text(writer.diversity?.nationality),
    ethnicity: text(writer.diversity?.ethnicity),
    lgbtqStatus: text(writer.diversity?.lgbtqStatus),
    disabilityStatus: text(writer.diversity?.disabilityStatus),
  } : undefined;

  return {
    username: text(writer.username),
    representationStatus: text(writer.representationStatus),
    agencyName: text(writer.agencyName),
    wgaMember: Boolean(writer.wgaMember),
    sgaMember: Boolean(writer.sgaMember),
    membershipVerification: {
      wga: membershipStatus(writer.membershipVerification?.wga),
      swa: membershipStatus(writer.membershipVerification?.swa),
    },
    genres: list(writer.genres),
    specializedTags: list(writer.specializedTags),
    plan: text(writer.plan),
    accomplishments: list(writer.accomplishments),
    demographicPrivacy: text(writer.demographicPrivacy),
    diversity,
    // Contact links intentionally do not appear here. The reveal endpoint is
    // the only authenticated contract that may return them to another user.
  };
};

const publicIndustryProfile = (industry = {}) => ({
  subRole: text(industry.subRole),
  subRoleOther: text(industry.subRoleOther),
  company: text(industry.company),
  jobTitle: text(industry.jobTitle),
  imdbUrl: text(industry.imdbUrl),
  linkedInUrl: text(industry.linkedInUrl),
  otherUrl: text(industry.otherUrl),
  previousCredits: text(industry.previousCredits),
  investmentRange: text(industry.investmentRange),
  isVerified: Boolean(industry.isVerified),
  socialLinks: {
    instagram: text(industry.socialLinks?.instagram),
    twitter: text(industry.socialLinks?.twitter),
    website: text(industry.socialLinks?.website),
    youtube: text(industry.socialLinks?.youtube),
    facebook: text(industry.socialLinks?.facebook),
  },
  mandates: {
    formats: list(industry.mandates?.formats),
    genres: list(industry.mandates?.genres),
    excludeGenres: list(industry.mandates?.excludeGenres),
    specificHooks: list(industry.mandates?.specificHooks),
  },
});

/**
 * The authenticated visitor profile is an allowlist, not a full User document
 * with a growing blacklist. User contains password-reset, payment, session,
 * OAuth, moderation and deletion fields that no profile viewer should receive.
 */
export function buildVisitorProfile(user = {}) {
  return {
    _id: user._id,
    name: text(user.name),
    role: text(user.role),
    bio: text(user.bio),
    skills: list(user.skills, 25),
    profileImage: text(user.profileImage),
    coverImage: text(user.coverImage),
    createdAt: user.createdAt,
    allowIndustryContact: user.allowIndustryContact !== false,
    address: {
      city: text(user.address?.city),
      state: text(user.address?.state),
      country: text(user.address?.country),
    },
    writerProfile: user.writerProfile ? publicWriterProfile(user.writerProfile) : undefined,
    industryProfile: user.industryProfile ? publicIndustryProfile(user.industryProfile) : undefined,
    actorProfile: user.actorProfile ? {
      headshot: text(user.actorProfile.headshot),
      reelUrl: text(user.actorProfile.reelUrl),
      actingStyles: list(user.actorProfile.actingStyles),
      typeCast: text(user.actorProfile.typeCast),
      availableForAuditions: Boolean(user.actorProfile.availableForAuditions),
    } : undefined,
    followers: (Array.isArray(user.followers) ? user.followers : []).map(publicConnection).filter(Boolean),
    following: (Array.isArray(user.following) ? user.following : []).map(publicConnection).filter(Boolean),
    badges: Array.isArray(user.badges) ? user.badges.map((badge) => ({
      id: text(badge?.id),
      label: text(badge?.label),
      competitionId: badge?.competitionId,
      awardedAt: badge?.awardedAt,
    })) : [],
    subscription: user.subscription ? {
      plan: text(user.subscription.plan),
      accessTier: text(user.subscription.accessTier),
      accessStatus: text(user.subscription.accessStatus),
      accessExpiresAt: user.subscription.accessExpiresAt || user.subscription.expiresAt || null,
    } : undefined,
  };
}

export function buildPrivateProfileDenial({ userId, followRequestPending, blockedByCurrent, blockedByProfile } = {}) {
  return {
    message: "This account is private.",
    privateAccount: true,
    profileId: String(userId || ""),
    blockedByCurrent: Boolean(blockedByCurrent),
    blockedByProfile: Boolean(blockedByProfile),
    followRequestPending: Boolean(followRequestPending),
  };
}

export function buildBusinessEmailProfileDenial(message) {
  return {
    message,
    personalEmailFipRestricted: true,
    requiresBusinessEmail: true,
  };
}
