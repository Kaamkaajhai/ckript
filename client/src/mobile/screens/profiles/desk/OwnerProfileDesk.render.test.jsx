// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../../context/AuthContext";
import { AUTHENTICATED_PROFILE_STATUS } from "../../../../pages/profile/authenticatedProfile";
import { ToastContext } from "../../../components/feedback/toastContext";
import OwnerProfileDesk from "./OwnerProfileDesk";

const mocks = vi.hoisted(() => ({
  state: null,
  collection: null,
  save: vi.fn(),
  upload: vi.fn(),
  settings: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("../../../../pages/profile/useAuthenticatedProfile", () => ({
  useAuthenticatedProfile: () => mocks.state,
}));

vi.mock("../../../../pages/profile/useProfileCollections", () => ({
  useProfileCollections: () => mocks.collection,
}));

vi.mock("../../../../pages/profile/profileEditor", async (importOriginal) => ({
  ...(await importOriginal()),
  saveOwnProfile: mocks.save,
  uploadOwnProfileImage: mocks.upload,
}));

vi.mock("../../../../pages/profile/accountSecurity", async (importOriginal) => ({
  ...(await importOriginal()),
  updateAccountSettings: mocks.settings,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const viewer = { _id: "writer-1", role: "writer", name: "Mira Sen", writerProfile: { username: "mira" } };
const readyState = () => ({
  status: AUTHENTICATED_PROFILE_STATUS.READY,
  profile: {
    ...viewer,
    email: "mira@example.com",
    phone: "+91 12345",
    bio: "Writes stories about memory and place.",
    followers: [],
    following: [],
    isPrivate: false,
    allowIndustryContact: true,
    pendingFollowRequestCount: 2,
    profileCompletion: { percentage: 73, completedFields: 8, totalFields: 11, isComplete: false },
    writerProfile: { username: "mira", genres: ["Drama"], specializedTags: ["Raw"] },
  },
  scripts: [{ _id: "project-1", title: "The Archive", genre: "Drama", logline: "An archivist races a flood." }],
  purchasedScripts: [],
  bookmarkedScripts: [],
  relationship: {},
  reload: vi.fn(),
  applyProfileUpdate: vi.fn(),
});

let container;
let root;

const labelOf = (element) => [...element.childNodes]
  .filter((node) => !(node.nodeType === 1 && node.classList?.contains("material-symbols-outlined")))
  .map((node) => node.textContent)
  .join("")
  .trim();
const buttonWith = (text) => [...container.querySelectorAll("button")]
  .find((button) => labelOf(button) === text);
const tabWith = (text) => [...container.querySelectorAll('[role="tab"]')]
  .find((tab) => tab.textContent.trim() === text);

beforeEach(() => {
  mocks.state = readyState();
  mocks.collection = {
    status: "ready",
    data: {
      items: [{ _id: "post-1", content: "Production update", counts: { likes: 2, comments: 1, saves: 0 } }],
      counts: { activity: 1, bookmarks: 3 },
      pagination: { page: 1, total: 1, totalPages: 1, hasPrevious: false, hasNext: false },
    },
    failure: null,
    removingId: "",
    actionError: "",
    reload: vi.fn(),
    removeSaved: vi.fn(),
  };
  mocks.save.mockResolvedValue({ ok: true, data: { name: "Mira Sen", profileCompletion: { percentage: 73 } } });
  mocks.settings.mockResolvedValue({ ok: true, data: { user: { isPrivate: true } } });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  vi.clearAllMocks();
  localStorage.clear();
});

async function render({ user = viewer } = {}) {
  await act(async () => {
    root.render(
      <AuthContext.Provider value={{ user, setUser: vi.fn() }}>
        <ToastContext.Provider value={mocks.toast}>
          <MemoryRouter initialEntries={["/profile"]}>
            <div className="ckm">
              <Routes><Route path="/profile" element={<OwnerProfileDesk user={user} />} /></Routes>
            </div>
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>,
    );
  });
}

describe("OwnerProfileDesk", () => {
  it("opens on your own shelf, with completion and the pending queue surfaced above it", async () => {
    await render();

    const headings = container.querySelectorAll("h1");
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe("Mira Sen");
    expect(container.textContent).toContain("Profile 73% complete");
    expect(container.textContent).toContain("2 follow requests waiting");
    expect(container.querySelector('a[href="/follow-requests"]')).toBeTruthy();
    expect(container.querySelector('a[href="/script/project-1"]')).toBeTruthy();
    expect(container.querySelector('a[href="/create-project"]')).toBeTruthy();
  });

  it("keeps every workspace destination the old screen offered", async () => {
    await render();
    await act(async () => tabWith("About").click());

    expect(container.textContent).toContain("mira@example.com");
    expect(container.querySelector('a[href="/profile?tab=settings"]')).toBeTruthy();
    expect(container.querySelector('a[href="/collaborations"]')).toBeTruthy();
  });

  it("does not offer the writer-only collaboration queue on an industry profile", async () => {
    const producer = { _id: "producer-1", role: "producer", name: "Dev Rao" };
    mocks.state = {
      ...readyState(),
      profile: { ...readyState().profile, ...producer, writerProfile: undefined, industryProfile: { company: "North Star" } },
      scripts: [],
    };

    await render({ user: producer });
    await act(async () => tabWith("About").click());

    expect(container.querySelector('a[href="/collaborations"]')).toBeNull();
    expect(container.querySelector('a[href="/profile?tab=settings"]')).toBeTruthy();
    expect(tabWith("Mandate")).toBeTruthy();
  });

  it("opens the editor and saves through the shared mutation", async () => {
    await render();
    await act(async () => buttonWith("Edit").click());
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    expect(container.textContent).toContain("Managed separately");

    await act(async () => buttonWith("Save profile").click());
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      profile: expect.objectContaining({ _id: "writer-1" }),
      draft: expect.objectContaining({ username: "mira" }),
    }));
    expect(mocks.state.applyProfileUpdate).toHaveBeenCalled();
    expect(mocks.toast.success).toHaveBeenCalled();
  });

  it("writes visibility through the same settings mutation the security tab uses", async () => {
    await render();
    const discoverable = container.querySelector('[role="switch"][aria-label="Discoverable in search"]');
    expect(discoverable.getAttribute("aria-checked")).toBe("true");

    await act(async () => discoverable.click());
    expect(mocks.settings).toHaveBeenCalledWith({ isPrivate: true });
    expect(mocks.state.applyProfileUpdate).toHaveBeenCalledWith({ isPrivate: true });
  });

  it("says so, and offers the way back, when the profile is hidden", async () => {
    mocks.state = { ...readyState(), profile: { ...readyState().profile, isPrivate: true } };
    await render();

    expect(container.textContent).toContain("Your profile is hidden");
    await act(async () => buttonWith("Unhide").click());
    expect(mocks.settings).toHaveBeenCalledWith({ isPrivate: false });
  });

  it("keeps the saved-projects collection behind its own tab", async () => {
    await render();
    expect(container.textContent).not.toContain("Production update");

    await act(async () => tabWith("Collections").click());
    expect(container.textContent).toContain("Production update");
    expect(container.querySelectorAll('input[name="profile-collection"]')).toHaveLength(2);
    expect(container.textContent).toContain("Saved");
  });
});
