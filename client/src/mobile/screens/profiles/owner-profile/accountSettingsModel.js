import { isFilmIndustryProfessionalRole } from "../../../../utils/industryAccess";
import { isWriterProfileRole } from "../../../../features/profile-pc/profilePolicy";

const text = (value) => String(value ?? "").trim();

export function buildAccountSettingsView({ profile = {}, sessions = [], deletedScripts = [] } = {}) {
  return {
    email: text(profile.email),
    pendingEmail: text(profile.pendingEmail),
    emailVerified: Boolean(profile.emailVerified && !profile.pendingEmail),
    writer: isWriterProfileRole(profile.role),
    industry: isFilmIndustryProfessionalRole(profile),
    canDelete: text(profile.role).toLowerCase() !== "admin",
    sessions: (Array.isArray(sessions) ? sessions : [])
      .filter((session) => text(session?.sessionId))
      .map((session) => ({
        ...session,
        sessionId: text(session.sessionId),
        title: text(session.browser) && text(session.browser) !== "Unknown"
          ? `${text(session.browser)} on ${text(session.os) || "Unknown OS"}`
          : text(session.device) || "Unknown device",
        meta: [text(session.location), text(session.ip) ? `IP: ${text(session.ip)}` : ""].filter(Boolean).join(" · "),
        isCurrent: Boolean(session.isCurrent),
      }))
      .sort((left, right) => Number(right.isCurrent) - Number(left.isCurrent)),
    blockedUsers: (Array.isArray(profile.blockedUsers) ? profile.blockedUsers : [])
      .filter((member) => text(member?._id))
      .map((member) => ({
        id: text(member._id),
        name: text(member.name) || "Ckript member",
        role: text(member.role) || "member",
      })),
    deletedProjects: (Array.isArray(deletedScripts) ? deletedScripts : []).map((script) => ({
      id: text(script?._id),
      title: text(script?.title) || "Untitled project",
      detail: [text(script?.genre), text(script?.format).replace(/_/g, " ")].filter(Boolean).join(" · "),
      deletedAt: script?.deletedAt || script?.updatedAt || script?.createdAt || null,
    })).filter(({ id }) => id),
  };
}
