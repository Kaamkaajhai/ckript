import Script from "../models/Script.js";

export const PERMISSIONS = {
  read: ["full_admin", "editor", "merger", "viewer"],
  write: ["full_admin", "editor"],
  comment: ["full_admin", "editor", "merger", "viewer"],
  approve: ["full_admin", "merger"],
  publish: ["full_admin"],
  manage: ["full_admin"],
  merge: ["full_admin", "merger"],
};

export const COLLAB_ACCESS_LEVELS = {
  FULL_ACCESS: "full_access",
  CONTENT_ONLY: "content_only",
};

const normalizeId = (value) =>
  String(
    value?._id
    || value?.id
    || value
    || ""
  );

export const getScriptOwnerId = (script) =>
  normalizeId(script?.creator);

export const getAcceptedCollaborator = (script, userId) =>
  script?.collaborators?.find(
    (collab) =>
      normalizeId(collab?.userId) === normalizeId(userId) &&
      collab?.status === "accepted" &&
      collab?.isActive === true
  ) || null;

export const resolveScriptRole = (script, userId) => {
  if (!script || !userId) return null;

  if (getScriptOwnerId(script) === normalizeId(userId)) {
    return "full_admin";
  }

  const collaborator = getAcceptedCollaborator(script, userId);
  return collaborator?.role || null;
};

export const resolveCollaboratorAccessLevel = (script, userId) => {
  if (!script || !userId) return null;

  if (getScriptOwnerId(script) === normalizeId(userId)) {
    return COLLAB_ACCESS_LEVELS.FULL_ACCESS;
  }

  const collaborator = getAcceptedCollaborator(script, userId);
  return collaborator?.accessLevel || COLLAB_ACCESS_LEVELS.FULL_ACCESS;
};

export const canEditScriptContent = (script, userId) => {
  const role = resolveScriptRole(script, userId);
  return role === "full_admin" || role === "editor";
};

export const canEditScriptMetadata = (script, userId) => {
  const role = resolveScriptRole(script, userId);
  return role === "full_admin";
};

export const hasScriptPermission = (script, userId, action) => {
  const role = resolveScriptRole(script, userId);
  if (!role || PERMISSIONS[action]?.includes(role) !== true) {
    return false;
  }

  if (action === "write") {
    return canEditScriptContent(script, userId);
  }

  return true;
};

export const checkPermission = (action) => async (req, res, next) => {
  try {
    const script = await Script.findById(req.params.scriptId);
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    const userRole = resolveScriptRole(script, req.user?._id || req.user?.id);
    if (!userRole) {
      return res.status(403).json({ error: "Access denied. Not a collaborator." });
    }

    if (!hasScriptPermission(script, req.user?._id || req.user?.id, action)) {
      return res.status(403).json({
        error: `Access denied. Your role (${userRole}) cannot perform this action.`,
      });
    }

    req.script = script;
    req.userRole = userRole;
    return next();
  } catch (error) {
    return res.status(500).json({ error: "Permission check failed" });
  }
};
