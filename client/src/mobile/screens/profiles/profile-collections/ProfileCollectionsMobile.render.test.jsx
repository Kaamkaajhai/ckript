// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROFILE_COLLECTION_STATUS } from "../../../../pages/profile/profileCollections";
import ProfileCollectionsMobile from "./ProfileCollectionsMobile";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const readyState = (overrides = {}) => ({
  status: PROFILE_COLLECTION_STATUS.READY,
  data: {
    items: [{
      _id: "project-1",
      title: "The Archive",
      status: "published",
      canonicalPath: "/the-archive/mira",
      logline: "An archivist races a flood.",
    }],
    counts: { activity: 4, bookmarks: 13 },
    pagination: { page: 2, total: 13, totalPages: 2, hasPrevious: true, hasNext: false },
  },
  failure: null,
  removingId: "",
  actionError: "",
  reload: vi.fn(),
  ...overrides,
});

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

const render = async (props = {}) => {
  await act(async () => root.render(
    <MemoryRouter>
      <div className="ckm">
        <ProfileCollectionsMobile
          state={readyState()}
          section="bookmarks"
          page={2}
          own
          onLocationChange={vi.fn()}
          onRemoveSaved={vi.fn()}
          {...props}
        />
      </div>
    </MemoryRouter>,
  ));
};

describe("ProfileCollectionsMobile", () => {
  it("renders the owner selector, bounded saved page, named removal, and paging", async () => {
    const onLocationChange = vi.fn();
    const onRemoveSaved = vi.fn();
    await render({ onLocationChange, onRemoveSaved });

    expect(container.querySelectorAll('input[name="profile-collection"]')).toHaveLength(2);
    expect(container.querySelector('a[href="/the-archive/mira"]')).toBeTruthy();
    expect(container.textContent).toContain("Page 2 of 2");
    const remove = [...container.querySelectorAll("button")].find((button) => button.textContent.includes("Remove from saved"));
    await act(async () => remove.click());
    expect(onRemoveSaved).toHaveBeenCalledWith("project-1");
    const previous = [...container.querySelectorAll("button")].find((button) => button.textContent === "Previous");
    await act(async () => previous.click());
    expect(onLocationChange).toHaveBeenCalledWith("bookmarks", 1);
  });

  it("keeps visitor activity public without rendering the owner-only Saved selector", async () => {
    await render({
      own: false,
      section: "activity",
      page: 1,
      state: readyState({ data: {
        items: [{ _id: "post-1", content: "Public update", counts: { likes: 2, comments: 1, saves: 0 } }],
        counts: { activity: 1, bookmarks: null },
        pagination: { page: 1, total: 1, totalPages: 1, hasPrevious: false, hasNext: false },
      } }),
    });
    expect(container.textContent).toContain("Public update");
    expect(container.querySelector('[role="radiogroup"]')).toBeNull();
    expect(container.textContent).not.toContain("Saved");
  });

  it.each([
    [PROFILE_COLLECTION_STATUS.LOADING, "Loading activity"],
    [PROFILE_COLLECTION_STATUS.FAILED, "Could not load activity"],
    [PROFILE_COLLECTION_STATUS.READY, "No activity yet"],
  ])("renders the %s activity state", async (status, expected) => {
    await render({
      own: false,
      section: "activity",
      page: 1,
      state: readyState({
        status,
        data: status === PROFILE_COLLECTION_STATUS.LOADING ? null : {
          items: [], counts: { activity: 0, bookmarks: null }, pagination: { page: 1, total: 0, totalPages: 1 },
        },
        failure: status === PROFILE_COLLECTION_STATUS.FAILED ? { message: "Network unavailable" } : null,
      }),
    });
    expect(container.textContent).toContain(expected);
  });
});
