import { isWriterProfileRole } from "../../../../features/profile-pc/profilePolicy";
import { hasActiveFilmIndustryProfessionalAccess } from "../../../../utils/industryAccess";

const clean = (value) => (["string", "number"].includes(typeof value) ? String(value).trim() : "");
const cleanList = (value, limit = 20) => (Array.isArray(value)
  ? [...new Set(value.map(clean).filter(Boolean))].slice(0, limit)
  : []);
const safeCount = (value) => {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
};
const titleCase = (value) => clean(value).toLowerCase().replace(/[\s_-]+/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const safePublicUrl = (value) => {
  try {
    const url = new URL(clean(value));
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
};

export const formatMemberSince = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(date)
    : "";
};

export function buildPublicProfileView(profile = {}, scripts = []) {
  const writer = isWriterProfileRole(profile.role);
  const writerProfile = profile.writerProfile || {};
  const industry = profile.industryProfile || {};
  const linkLabels = {
    portfolio: "Portfolio", linkedin: "LinkedIn", imdb: "IMDb",
    instagram: "Instagram", twitter: "Twitter", facebook: "Facebook",
  };
  const rawLinks = writerProfile.links && typeof writerProfile.links === "object" && !Array.isArray(writerProfile.links)
    ? writerProfile.links
    : {};
  const links = Object.entries(rawLinks).map(([key, value]) => ({
    key,
    label: linkLabels[key] || titleCase(key),
    url: safePublicUrl(value),
  })).filter(({ url }) => url);

  const facts = writer ? [
    ["Representation", titleCase(writerProfile.representationStatus) || "Unrepresented"],
    ["Agency", clean(writerProfile.agencyName)],
    ["WGA", writerProfile.wgaMember ? "Member" : ""],
    ["SWA", writerProfile.sgaMember ? "Member" : ""],
  ] : [
    ["Company", clean(industry.company)],
    ["Job title", clean(industry.jobTitle)],
    ["Specialty", industry.subRole === "other" ? clean(industry.subRoleOther) : titleCase(industry.subRole)],
  ];

  return {
    name: clean(profile.name) || "Ckript member",
    role: titleCase(profile.role) || "Member",
    bio: clean(profile.bio) || "No biography shared yet.",
    image: clean(profile.profileImage),
    cover: clean(profile.coverImage),
    memberSince: formatMemberSince(profile.createdAt),
    professional: hasActiveFilmIndustryProfessionalAccess(profile),
    writer,
    followers: safeCount(profile.followerCount),
    following: safeCount(profile.followingCount),
    skills: cleanList(profile.skills, 12),
    genres: writer ? cleanList(writerProfile.genres) : [],
    tags: writer ? cleanList(writerProfile.specializedTags) : [],
    mandates: !writer ? {
      genres: cleanList(industry.mandates?.genres),
      formats: cleanList(industry.mandates?.formats),
    } : null,
    facts: facts.filter(([, value]) => value),
    links,
    projects: (Array.isArray(scripts) ? scripts : []).map((script) => ({
      id: clean(script?._id),
      title: clean(script?.title) || "Untitled project",
      genre: clean(script?.primaryGenre || script?.genre) || "Project",
      summary: clean(script?.logline || script?.synopsis) || "Open this project to learn more.",
    })).filter(({ id }) => id),
  };
}
