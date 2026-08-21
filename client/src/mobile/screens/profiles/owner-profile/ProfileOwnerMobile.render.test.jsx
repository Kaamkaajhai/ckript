// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../../context/AuthContext";
import { AUTHENTICATED_PROFILE_STATUS } from "../../../../pages/profile/authenticatedProfile";
import { ToastContext } from "../../../components/feedback/toastContext";
import ProfileOwnerMobile from "./ProfileOwnerMobile";

const mocks = vi.hoisted(() => ({
  state: null,
  save: vi.fn(),
  upload: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("../../../../pages/profile/useAuthenticatedProfile", () => ({
  useAuthenticatedProfile: () => mocks.state,
}));

vi.mock("../../../../pages/profile/profileEditor", async (importOriginal) => ({
  ...(await importOriginal()),
  saveOwnProfile: mocks.save,
  uploadOwnProfileImage: mocks.upload,
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

beforeEach(() => {
  mocks.state = readyState();
  mocks.save.mockResolvedValue({ ok: true, data: { name: "Mira Sen", profileCompletion: { percentage: 73 } } });
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

async function render() {
  await act(async () => {
    root.render(
      <AuthContext.Provider value={{ user: viewer, setUser: vi.fn() }}>
        <ToastContext.Provider value={mocks.toast}>
          <MemoryRouter initialEntries={["/profile"]}>
            <div className="ckm">
              <Routes><Route path="/profile" element={<ProfileOwnerMobile user={viewer} />} /></Routes>
            </div>
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>,
    );
  });
}

describe("ProfileOwnerMobile", () => {
  it("renders the own identity, completion, workspace actions, and project links", async () => {
    await render();
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.textContent).toContain("73% complete");
    expect(container.textContent).toContain("mira@example.com");
    expect(container.querySelector('a[href="/profile?tab=settings"]')).toBeTruthy();
    expect(container.querySelector('a[href="/script/project-1"]')).toBeTruthy();
  });

  it("opens the native editor and saves through the shared mutation", async () => {
    await render();
    const edit = [...container.querySelectorAll("button")].find((button) => button.textContent === "Edit profile");
    await act(async () => edit.click());
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    expect(container.textContent).toContain("Managed separately");

    const save = [...container.querySelectorAll("button")].find((button) => button.textContent === "Save profile");
    await act(async () => save.click());
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      profile: expect.objectContaining({ _id: "writer-1" }),
      draft: expect.objectContaining({ username: "mira" }),
    }));
    expect(mocks.state.applyProfileUpdate).toHaveBeenCalled();
    expect(mocks.toast.success).toHaveBeenCalled();
  });
});
