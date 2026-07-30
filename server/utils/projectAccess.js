// Who is allowed to author a project.
//
// One definition, shared. This rule used to live only inside scriptController, which meant any new
// surface that creates a Script had to remember to re-check it — the competition API didn't, so a
// reader or investor could register for a challenge, have an entry script created for them, and then
// be refused by saveDraft on their first keystroke with no way out.

export const PROJECT_CREATOR_ROLES = new Set(["writer", "creator"]);

export const hasProjectCreatorAccess = (user) => {
  const role = String(user?.role || "").trim().toLowerCase();
  return PROJECT_CREATOR_ROLES.has(role);
};

export default hasProjectCreatorAccess;
