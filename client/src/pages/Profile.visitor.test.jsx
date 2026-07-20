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
    expect(container.textContent).toContain("Other Writer");
    expect(container.textContent).toContain("Follow");
    expect(container.textContent).toContain("Message");
    expect(container.textContent).not.toContain("Edit profile");
    expect(container.textContent).not.toContain("Settings");
  });
});
