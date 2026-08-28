// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTHENTICATED_PROFILE_STATUS } from "./authenticatedProfile";
import { useAuthenticatedProfile } from "./useAuthenticatedProfile";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  follow: vi.fn(),
  block: vi.fn(),
  message: vi.fn(),
  contact: vi.fn(),
  pitches: vi.fn(),
  pitch: vi.fn(),
}));

vi.mock("./authenticatedProfile", async (importOriginal) => ({
  ...(await importOriginal()),
  getAuthenticatedProfile: mocks.get,
  updateProfileFollow: mocks.follow,
  toggleProfileBlock: mocks.block,
  sendProfileMessage: mocks.message,
  revealProfileContact: mocks.contact,
  getPitchableScripts: mocks.pitches,
  sendProfilePitch: mocks.pitch,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const viewer = { _id: "viewer-1", role: "producer" };

function Probe({ profileKey, onCanonicalPath }) {
  const state = useAuthenticatedProfile({ profileKey, viewer, onCanonicalPath });
  return (
    <div data-status={state.status}>
      <span>{state.profile?.name || state.failure?.message || ""}</span>
      <span data-testid="follow-state">{state.relationship.followRequestPending ? "pending" : "idle"}</span>
      <span data-testid="purchased-count">{state.purchasedScripts.length}</span>
      <button type="button" onClick={state.follow}>Follow</button>
      <button type="button" onClick={() => state.applyProfileUpdate({ name: "Updated", writerProfile: { genres: ["Comedy"] } })}>Apply update</button>
    </div>
  );
}

let container;
let root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

describe("useAuthenticatedProfile", () => {
  it("loads the latest visitor profile, applies canonicalization and updates relationship state", async () => {
    const onCanonicalPath = vi.fn();
    mocks.get.mockResolvedValueOnce({
      ok: true,
      data: {
        profile: { _id: "writer-1", name: "Mira" },
        scripts: [],
        relationship: { followRequestPending: false },
        canonicalPath: "/mira",
      },
    });
    mocks.follow.mockResolvedValueOnce({ ok: true, data: { followRequestPending: true, isFollowing: false } });

    await act(async () => root.render(<Probe profileKey="writer-1" onCanonicalPath={onCanonicalPath} />));
    expect(container.firstElementChild.dataset.status).toBe(AUTHENTICATED_PROFILE_STATUS.READY);
    expect(container.textContent).toContain("Mira");
    expect(onCanonicalPath).toHaveBeenCalledWith("/mira");

    await act(async () => container.querySelector("button").click());
    expect(mocks.follow).toHaveBeenCalledWith({
      profileId: "writer-1",
      relationship: { followRequestPending: false },
    });
    expect(container.querySelector('[data-testid="follow-state"]').textContent).toBe("pending");
  });

  it("uses a private denial's resolved id for its follow request", async () => {
    mocks.get.mockResolvedValueOnce({
      ok: false,
      access: {
        status: AUTHENTICATED_PROFILE_STATUS.PRIVATE,
        profileId: "writer-1",
        message: "This account is private.",
        relationship: { followRequestPending: false },
      },
    });
    mocks.follow.mockResolvedValueOnce({ ok: true, data: { followRequestPending: true } });

    await act(async () => root.render(<Probe profileKey="mira" />));
    expect(container.firstElementChild.dataset.status).toBe(AUTHENTICATED_PROFILE_STATUS.PRIVATE);
    await act(async () => container.querySelector("button").click());
    expect(mocks.follow).toHaveBeenCalledWith({
      profileId: "writer-1",
      relationship: { followRequestPending: false },
    });
  });

  it("retains own-profile collections and applies nested update responses", async () => {
    mocks.get.mockResolvedValueOnce({
      ok: true,
      data: {
        profile: { _id: "writer-1", name: "Mira", writerProfile: { username: "mira", genres: ["Drama"] } },
        scripts: [],
        deletedScripts: [{ _id: "deleted-1" }],
        purchasedScripts: [{ _id: "purchase-1" }],
        bookmarkedScripts: [{ _id: "saved-1" }],
        relationship: {},
        canonicalPath: "/mira",
      },
    });

    await act(async () => root.render(<Probe profileKey="writer-1" />));
    expect(container.querySelector('[data-testid="purchased-count"]').textContent).toBe("1");
    const apply = [...container.querySelectorAll("button")].find((button) => button.textContent === "Apply update");
    await act(async () => apply.click());
    expect(container.textContent).toContain("Updated");
  });
});
