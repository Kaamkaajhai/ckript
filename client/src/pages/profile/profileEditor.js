import api from "../../services/api";
import { isFilmIndustryProfessionalRole } from "../../utils/industryAccess";
import { isWriterProfileRole } from "../../features/profile-pc/profilePolicy";

export const PROFILE_USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
export const PROFILE_IMAGE_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const PROFILE_GENRE_OPTIONS = Object.freeze([
  "Action", "Comedy", "Drama", "Horror", "Thriller", "Romance", "Sci-Fi", "Fantasy",
  "Mystery", "Adventure", "Crime", "Western", "Animation", "Documentary", "Historical",
  "War", "Musical", "Biographical", "Sports", "Political", "Legal", "Medical",
  "Supernatural", "Psychological", "Noir", "Family", "Teen", "Satire", "Dark Comedy",
  "Mockumentary",
]);

export const PROFILE_TAG_OPTIONS = Object.freeze([
  "Revenge", "Redemption", "Coming of Age", "Love Triangle", "Betrayal", "Family Drama",
  "Social Justice", "Identity Crisis", "Survival", "Power Struggle", "Forbidden Love",
  "Loss & Grief", "Ambition", "Good vs Evil", "Man vs Nature", "Isolation", "Corruption",
  "Second Chance", "Underdog Story", "Fish Out of Water", "Chosen One", "Quest",
  "Transformation", "Sacrifice", "Justice", "Freedom", "Urban", "Rural", "Suburban",
  "Space", "Historical", "Contemporary", "Post-Apocalyptic", "Dystopian", "Small Town",
  "Big City", "Wilderness", "Ocean/Sea", "Desert", "Jungle", "Medieval", "Future",
  "Alternate Reality", "Virtual Reality", "Underground", "Prison", "Hospital",
  "School/College", "Military Base", "Dark", "Satirical", "Gritty", "Lighthearted", "Noir",
  "Uplifting", "Tragic", "Suspenseful", "Whimsical", "Intense", "Edgy", "Heartwarming",
  "Cynical", "Hopeful", "Melancholic", "Surreal", "Cerebral", "Raw", "Poetic", "Epic",
]);

export const INDUSTRY_GENRE_OPTIONS = Object.freeze([
  "Action", "Comedy", "Drama", "Horror", "Thriller", "Romance", "Sci-Fi", "Fantasy",
  "Mystery", "Documentary", "Crime", "Animation", "Historical", "Biographical", "Sports",
  "Family", "Musical", "War", "Western", "Adventure",
]);

export const PROFILE_FORMAT_OPTIONS = Object.freeze([
  { value: "feature", label: "Feature Film" },
  { value: "movie", label: "Movie" },
  { value: "tv_1hour", label: "TV Pilot (1-Hour)" },
  { value: "tv_halfhour", label: "TV Pilot (Half-Hour)" },
  { value: "limited_series", label: "Limited Series" },
  { value: "tv_serial", label: "TV Serial" },
  { value: "short", label: "Short Film" },
  { value: "web_series", label: "Web Series" },
  { value: "documentary", label: "Documentary" },
  { value: "anime", label: "Anime" },
  { value: "cartoon", label: "Cartoon" },
  { value: "drama_school", label: "Drama School" },
  { value: "micro_drama", label: "Micro Drama" },
  { value: "songs", label: "Songs" },
  { value: "standup_comedy", label: "Standup Comedy" },
  { value: "dialogues", label: "Dialogues" },
  { value: "poet", label: "Poet" },
  { value: "other", label: "Other" },
]);

export const INDUSTRY_ROLE_OPTIONS = Object.freeze([
  { value: "producer", label: "Producer" },
  { value: "director", label: "Director" },
  { value: "executive_producer", label: "Executive Producer" },
  { value: "line_producer", label: "Line Producer" },
  { value: "showrunner", label: "Showrunner" },
  { value: "development_executive", label: "Development Executive" },
  { value: "studio_executive", label: "Studio Executive" },
  { value: "agent", label: "Agent" },
  { value: "actor", label: "Actor" },
  { value: "other", label: "Other" },
]);

const text = (value) => String(value ?? "").trim();
const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const failure = (cause, fallback) => ({
  ok: false,
  message: cause?.response?.data?.message || fallback,
  status: Number(cause?.response?.status || 0),
  cause,
});

export const normalizePreferredProfileFormat = (value = "") => {
  const raw = text(value).toLowerCase();
  if (!raw) return "";
  const aliases = {
    feature_film: "feature",
    "feature film": "feature",
    "tv pilot": "tv_1hour",
    "tv series": "tv_serial",
    "short film": "short",
    "web series": "web_series",
    "limited series": "limited_series",
    "drama school": "drama_school",
    "micro drama": "micro_drama",
    "standup comedy": "standup_comedy",
  };
  if (aliases[raw]) return aliases[raw];
  if (raw.includes("tv pilot") && (raw.includes("30") || raw.includes("half"))) return "tv_halfhour";
  if (raw.includes("tv pilot") || raw.includes("tv 1-hour")) return "tv_1hour";
  if (raw.includes("standup") || raw.includes("stand-up")) return "standup_comedy";
  if (raw.includes("dialogue")) return "dialogues";
  if (raw.includes("poet") || raw.includes("poetry")) return "poet";
  return raw.replace(/[\s-]+/g, "_");
};

const dateInputValue = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

export function createOwnProfileDraft(profile = {}) {
  const writer = profile.writerProfile || {};
  const industry = profile.industryProfile || {};
  const mandates = industry.mandates || {};
  return {
    name: text(profile.name),
    username: text(writer.username).toLowerCase(),
    phone: text(profile.phone),
    dateOfBirth: dateInputValue(profile.dateOfBirth),
    addressStreet: text(profile.address?.street),
    addressCity: text(profile.address?.city),
    addressState: text(profile.address?.state),
    addressZipCode: text(profile.address?.zipCode),
    addressCountry: text(profile.address?.country) || "India",
    bio: text(profile.bio),
    skills: list(profile.skills).join(", "),
    profileImage: text(profile.profileImage),
    representationStatus: text(writer.representationStatus) || "unrepresented",
    agencyName: text(writer.agencyName),
    genres: list(writer.genres),
    specializedTags: list(writer.specializedTags).slice(0, 5),
    diversityGender: text(writer.diversity?.gender),
    diversityEthnicity: text(writer.diversity?.ethnicity),
    subRole: text(industry.subRole) || "producer",
    subRoleOther: text(industry.subRoleOther),
    company: text(industry.company),
    jobTitle: text(industry.jobTitle),
    imdbUrl: text(industry.imdbUrl),
    linkedInUrl: text(industry.linkedInUrl),
    otherUrl: text(industry.otherUrl),
    previousCredits: text(industry.previousCredits),
    investmentRange: text(industry.investmentRange),
    preferredGenres: list(mandates.genres || profile.preferences?.genres),
    preferredFormats: [...new Set(list(mandates.formats).map(normalizePreferredProfileFormat).filter(Boolean))],
  };
}

export function buildOwnProfilePayload(draft = {}, profile = {}) {
  const writer = isWriterProfileRole(profile.role);
  const industry = isFilmIndustryProfessionalRole(profile);
  const normalizedUsername = text(draft.username).toLowerCase();
  const fieldErrors = {};

  if (!text(draft.name)) fieldErrors.name = "Enter your name.";
  if ((writer || industry) && !normalizedUsername) fieldErrors.username = "Choose a username.";
  if (normalizedUsername && !PROFILE_USERNAME_PATTERN.test(normalizedUsername)) {
    fieldErrors.username = "Use 3-30 lowercase letters, numbers, or underscores.";
  }
  if (industry && !text(draft.bio)) fieldErrors.bio = "Add a professional bio.";
  if (industry && text(draft.subRole) === "other" && !text(draft.subRoleOther)) {
    fieldErrors.subRoleOther = "Describe your role focus.";
  }
  if (writer && list(draft.specializedTags).length > 5) fieldErrors.specializedTags = "Choose up to 5 tags.";
  if (Object.keys(fieldErrors).length) {
    return { ok: false, message: "Review the highlighted profile fields.", fieldErrors };
  }

  const addressParts = [draft.addressStreet, draft.addressCity, draft.addressState, draft.addressZipCode]
    .map(text).filter(Boolean);
  if (text(draft.addressCountry).toLowerCase() !== "india") addressParts.push(text(draft.addressCountry));

  const payload = {
    name: text(draft.name),
    username: normalizedUsername || undefined,
    phone: text(draft.phone),
    dateOfBirth: text(draft.dateOfBirth) || undefined,
    address: {
      street: text(draft.addressStreet),
      city: text(draft.addressCity),
      state: text(draft.addressState),
      zipCode: text(draft.addressZipCode),
      country: text(draft.addressCountry) || "India",
      formatted: addressParts.join(", "),
    },
    bio: text(draft.bio),
    skills: text(draft.skills).split(",").map(text).filter(Boolean).slice(0, 25),
    profileImage: text(draft.profileImage),
  };

  if (writer) {
    payload.writerProfile = {
      representationStatus: text(draft.representationStatus) || "unrepresented",
      agencyName: text(draft.representationStatus) === "unrepresented" ? "" : text(draft.agencyName),
      genres: list(draft.genres),
      specializedTags: list(draft.specializedTags).slice(0, 5),
      diversity: {
        gender: text(draft.diversityGender),
        ethnicity: text(draft.diversityEthnicity),
      },
    };
  }

  if (industry) {
    Object.assign(payload, {
      subRole: text(draft.subRole) || "producer",
      subRoleOther: text(draft.subRole) === "other" ? text(draft.subRoleOther) : "",
      company: text(draft.company),
      jobTitle: text(draft.jobTitle),
      imdbUrl: text(draft.imdbUrl),
      linkedInUrl: text(draft.linkedInUrl),
      otherUrl: text(draft.otherUrl),
      previousCredits: text(draft.previousCredits),
      investmentRange: text(draft.investmentRange),
      preferredGenres: list(draft.preferredGenres),
      preferredFormats: list(draft.preferredFormats).map(normalizePreferredProfileFormat).filter(Boolean),
    });
  }

  return { ok: true, data: payload };
}

export function validateProfileImage(file) {
  if (!file) return { ok: false, message: "Choose an image first." };
  if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
    return { ok: false, message: "Choose a JPEG, PNG, WebP, or GIF image." };
  }
  if (Number(file.size || 0) > PROFILE_IMAGE_MAX_BYTES) {
    return { ok: false, message: "Keep the image under 5 MB." };
  }
  return { ok: true, data: file };
}

export async function uploadOwnProfileImage(file) {
  const validation = validateProfileImage(file);
  if (!validation.ok) return validation;
  try {
    const form = new FormData();
    form.append("profileImage", file);
    const { data } = await api.post("/users/upload-image", form);
    return { ok: true, data };
  } catch (cause) {
    return failure(cause, "Could not upload this profile image.");
  }
}

export async function checkProfileUsername(username, { signal } = {}) {
  const normalized = text(username).toLowerCase();
  if (!PROFILE_USERNAME_PATTERN.test(normalized)) {
    return { ok: false, message: "Use 3-30 lowercase letters, numbers, or underscores." };
  }
  try {
    const { data } = await api.get("/onboarding/check-username", { params: { username: normalized }, signal });
    return { ok: true, data: { username: normalized, available: Boolean(data?.available) } };
  } catch (cause) {
    if (signal?.aborted || cause?.code === "ERR_CANCELED") return { ok: false, cancelled: true, message: "" };
    return failure(cause, "Could not verify this username right now.");
  }
}

export async function saveOwnProfilePayload(payload) {
  try {
    const { data } = await api.put("/users/update", payload);
    return { ok: true, data };
  } catch (cause) {
    return failure(cause, "Could not update your profile.");
  }
}

export async function saveOwnProfile({ draft, profile } = {}) {
  const payload = buildOwnProfilePayload(draft, profile);
  if (!payload.ok) return payload;
  return saveOwnProfilePayload(payload.data);
}

export function mergeOwnProfileUpdate(current = {}, update = {}) {
  return {
    ...current,
    ...update,
    address: update.address ? { ...(current.address || {}), ...update.address } : current.address,
    writerProfile: update.writerProfile
      ? { ...(current.writerProfile || {}), ...update.writerProfile }
      : current.writerProfile,
    industryProfile: update.industryProfile
      ? { ...(current.industryProfile || {}), ...update.industryProfile }
      : current.industryProfile,
    preferences: update.preferences
      ? { ...(current.preferences || {}), ...update.preferences }
      : current.preferences,
  };
}
