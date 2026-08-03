// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/AuthContext";
import Profile from "./Profile";

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("../services/api", () => ({ default: apiMocks }));

const viewedWriter = {
  _id: "writer-2",
  name: "Other Writer",
  role: "writer",
  bio: "A writer profile viewed by another member.",
  skills: ["Dialogue"],
  followers: [],
  following: [],
  blockedUsers: [],
  favoriteScripts: [],
  writerProfile: {
    username: "other_writer",
    representationStatus: "unrepresented",
    genres: ["Drama"],
    specializedTags: [],
    links: {},
  },
  canonicalPath: "/other_writer",
  shareMeta: { url: "https://ckript.com/share/profile/other_writer" },
};

describe("Profile visitor rendering", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    apiMocks.get.mockResolvedValue({
      data: {
        user: viewedWriter,
        scripts: [],
        deletedScripts: [],
        purchasedScripts: [],
        bookmarkedScripts: [],
      },
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it("uses the writer PC page for another member's profile and keeps visitor actions", async () => {
    const viewer = {
      _id: "producer-1",
      name: "Visiting Producer",
      role: "producer",
      favoriteScripts: [],
    };

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: viewer, setUser: vi.fn(), logout: vi.fn() }}>
          <MemoryRouter initialEntries={["/other_writer"]}>
            <Routes>
              <Route path="/:id" element={<Profile />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(apiMocks.get).toHaveBeenCalledWith(
      "/users/other_writer",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(container.querySelector(".profile-pc-page")).not.toBeNull();
    expect(container.querySelector(".profile-pc-page__status-column")).toBeNull();
    expect(container.textContent).toContain("Other Writer");
    expect(container.textContent).toContain("Follow");
    expect(container.textContent).toContain("Message");
    expect(container.textContent).not.toContain("Edit profile");
    expect(container.textContent).not.toContain("Settings");
  });

  it("renders owner-only work and operations groups without the status rail", async () => {
    const owner = { ...viewedWriter, email: "writer@example.com", profileCompletion: { percentage: 75, completedFields: 6, totalFields: 8, isComplete: false } };
    apiMocks.get.mockImplementation((url) => {
      if (url === "/meetings") return Promise.resolve({ data: [] });
      return Promise.resolve({ data: { user: owner, scripts: [], deletedScripts: [], purchasedScripts: [], bookmarkedScripts: [] } });
    });

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: owner, setUser: vi.fn(), logout: vi.fn() }}>
          <MemoryRouter initialEntries={["/other_writer"]}>
            <Routes><Route path="/:id" element={<Profile />} /></Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );
    });

    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    const groups = [...container.querySelectorAll(".profile-workspace-tabgroup__label")].map((node) => node.textContent);
    expect(groups).toEqual(["Profile", "Work", "Operations"]);
    expect(container.textContent).not.toContain("Needs you");
    expect(container.textContent).not.toContain("75%");
    expect(container.querySelector(".profile-pc-page__status-column")).toBeNull();
    expect(container.textContent).toContain("Settings");
  });

  it("uses the professional workspace for an investor owner profile", async () => {
    const investor = {
      ...viewedWriter,
      _id: "investor-1",
      name: "Investor Owner",
      role: "investor",
      email: "investor@example.com",
      writerProfile: undefined,
      industryProfile: { jobTitle: "Investor", company: "Northlight Capital" },
      profileCompletion: { percentage: 33, completedFields: 4, totalFields: 12, isComplete: false },
    };
    apiMocks.get.mockImplementation((url) => {
      if (url === "/meetings") return Promise.resolve({ data: [] });
      return Promise.resolve({ data: { user: investor, scripts: [], deletedScripts: [], purchasedScripts: [], bookmarkedScripts: [] } });
    });

    await act(async () => {
      root.render(
        <AuthContext.Provider value={{ user: investor, setUser: vi.fn(), logout: vi.fn() }}>
          <MemoryRouter initialEntries={["/investor-1"]}>
            <Routes><Route path="/:id" element={<Profile />} /></Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );
    });

    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(container.querySelector(".profile-pc-page")).not.toBeNull();
    expect(container.querySelector(".profile-pc-page__identity-column")).not.toBeNull();
    expect(container.textContent).toContain("Investor Owner");
    expect(container.textContent).toContain("Northlight Capital");
    expect(container.textContent).not.toContain("33%");
    const groups = [...container.querySelectorAll(".profile-workspace-tabgroup__label")].map((node) => node.textContent);
    expect(groups).toEqual(["Profile", "Work", "Operations"]);
    expect(container.textContent).not.toContain("Your profile is incomplete. Add missing details from Edit Profile.");
  });
});
