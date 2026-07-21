import { describe, it, expect } from "vitest";
import { getViewerCapabilities } from "./scriptDetailModel";
import { ROLES_WITH_WRITE } from "../../constants/collabRoles";

// Which controls the script page shows is driven entirely by these capabilities:
//   canEdit       -> "Edit project" / "Co-write" button (hero + tools panel)
//   canCollaborate-> "Collaborate" button (opens the Collaboration Hub)
//   canBookmark   -> "Save" button
//   canPurchase   -> purchase flow
// A regression here silently hands a Reader an edit button, so the matrix is pinned.

const OWNER = "u-owner";
const ME = "u-me";

const viewerFor = (role) => {
  const isOwner = role === "owner";
  return {
    script: {
      _id: "s1",
      creator: { _id: OWNER },
      isCreator: isOwner,
      collaborators: isOwner ? [] : [{ userId: { _id: ME }, role, status: "accepted", isActive: true }],
      isCollaborator: !isOwner,
      collaboratorRole: isOwner ? null : role,
      // Mirrors the server: canEditScript = isCreator || hasScriptPermission(write).
      canEditScript: isOwner || ROLES_WITH_WRITE.includes(role),
    },
    user: { _id: isOwner ? OWNER : ME, role: "creator" },
  };
};

const capsFor = (role) => getViewerCapabilities(viewerFor(role));

describe("script page controls by role", () => {
  it("shows the edit button to everyone who can write", () => {
    expect(capsFor("owner").canEdit).toBe(true);
    expect(capsFor("full_admin").canEdit).toBe(true); // Co-owner also has write
    expect(capsFor("editor").canEdit).toBe(true);
  });

  it("HIDES the edit button from Commenter and Reader", () => {
    expect(capsFor("commenter").canEdit).toBe(false);
    expect(capsFor("viewer").canEdit).toBe(false);
  });

  it("does not fall back to a bare editor check — Co-owner still edits without the server flag", () => {
    // If the server omits canEditScript, the local role fallback must still cover full_admin.
    const vm = viewerFor("full_admin");
    delete vm.script.canEditScript;
    expect(getViewerCapabilities(vm).canEdit).toBe(true);
  });

  it("never shows the edit button to a non-collaborator, even a signed-in one", () => {
    const caps = getViewerCapabilities({
      script: { _id: "s1", creator: { _id: OWNER }, collaborators: [] },
      user: { _id: "u-stranger", role: "producer" },
    });
    expect(caps.canEdit).toBe(false);
    expect(caps.canCollaborate).toBe(false);
  });

  it("offers the Collaborate hub to the owner and any accepted collaborator", () => {
    for (const role of ["owner", "full_admin", "editor", "commenter", "viewer"]) {
      expect(capsFor(role).canCollaborate).toBe(true);
    }
  });

  it("keeps buyer-facing actions away from people already on the script", () => {
    for (const role of ["owner", "full_admin", "editor", "commenter", "viewer"]) {
      const caps = capsFor(role);
      expect(caps.canBookmark).toBe(false); // you don't bookmark your own project
      expect(caps.canPurchase).toBe(false); // nor buy it
      expect(caps.fullScript).toBe(true);   // but you can always read it
    }
  });
});
