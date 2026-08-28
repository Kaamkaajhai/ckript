// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../../../context/AuthContext";
import { AUTHENTICATED_PROFILE_STATUS } from "../../../../pages/profile/authenticatedProfile";
import { ToastContext } from "../../../components/feedback/toastContext";
import ProfileVisitorMobile from "./ProfileVisitorMobile";

const mocks = vi.hoisted(() => ({
  state: null,
  collection: null,
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("../../../../pages/profile/useAuthenticatedProfile", () => ({
  useAuthenticatedProfile: () => mocks.state,
}));

vi.mock("../../../../pages/profile/useProfileCollections", () => ({
  useProfileCollections: () => mocks.collection,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const viewer = {
  _id: "producer-1",
  role: "producer",
  email: "producer@studio.example",
  subscription: { contactsLimit: 10, revealedContacts: [] },
};

const readyState = () => ({
  status: AUTHENTICATED_PROFILE_STATUS.READY,
  profile: {
    _id: "writer-1",
    name: "Mira Sen",
    role: "writer",
    bio: "Writes stories about memory and place.",
    email: "must-not-render@example.com",
    phone: "+91 00000 00000",
    followers: [],
    following: [],
    allowIndustryContact: true,
    writerProfile: { username: "mira", genres: ["Drama"] },
  },
  scripts: [{ _id: "project/1", title: "The Archive", primaryGenre: "Drama", logline: "An archivist races a flood." }],
  relationship: {},
  contact: null,
  contactStats: null,
  pending: { follow: false, block: false, message: false, contact: false, pitch: false },
  actionError: "",
  reload: vi.fn(),
  follow: vi.fn().mockResolvedValue(true),
  toggleBlock: vi.fn().mockResolvedValue(true),
  sendMessage: vi.fn().mockResolvedValue(true),
  revealContact: vi.fn().mockResolvedValue(true),
  loadPitchScripts: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  sendPitch: vi.fn().mockResolvedValue(true),
});

let container;
let root;

beforeEach(() => {
  mocks.state = readyState();
  mocks.collection = {
    status: "ready",
    data: {
      items: [{ _id: "post-1", content: "Public update", counts: { likes: 1, comments: 0, saves: 0 } }],
      counts: { activity: 1, bookmarks: null },
      pagination: { page: 1, total: 1, totalPages: 1, hasPrevious: false, hasNext: false },
    },
    failure: null,
    reload: vi.fn(),
  };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  vi.clearAllMocks();
});

async function render() {
  await act(async () => {
    root.render(
      <AuthContext.Provider value={{ user: viewer, setUser: vi.fn() }}>
        <ToastContext.Provider value={mocks.toast}>
          <MemoryRouter initialEntries={["/share/profile/mira"]}>
            <div className="ckm">
              <Routes>
                <Route path="/share/profile/:id" element={<ProfileVisitorMobile user={viewer} />} />
              </Routes>
            </div>
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>,
    );
  });
}

describe("ProfileVisitorMobile", () => {
  it("renders identity, visitor actions and projected projects without raw contact", async () => {
    await render();

    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.textContent).toContain("Mira Sen");
    expect(container.textContent).toContain("Follow");
    expect(container.textContent).toContain("Message");
    expect(container.textContent).toContain("Reveal contact · uses 1");
    expect(container.querySelector('a[href="/share/project/project%2F1"]')).toBeTruthy();
    expect(container.textContent).not.toContain("must-not-render@example.com");
    expect(container.textContent).not.toContain("+91 00000 00000");
    expect(container.textContent).toContain("Public update");
    expect(container.querySelector('input[value="bookmarks"]')).toBeNull();

    const follow = [...container.querySelectorAll("button")].find((button) => button.textContent === "Follow");
    await act(async () => follow.click());
    expect(mocks.state.follow).toHaveBeenCalledTimes(1);
  });

  it("keeps a private profile useful through the server-resolved follow target", async () => {
    mocks.state = {
      ...readyState(),
      status: AUTHENTICATED_PROFILE_STATUS.PRIVATE,
      profile: null,
      scripts: [],
      failure: { profileId: "writer-1", message: "This account is private." },
      relationship: { followRequestPending: true },
    };
    await render();

    expect(container.textContent).toContain("This profile is private");
    const action = [...container.querySelectorAll("button")]
      .find((button) => button.textContent === "Cancel follow request");
    await act(async () => action.click());
    expect(mocks.state.follow).toHaveBeenCalledTimes(1);
  });
});
