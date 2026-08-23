// @vitest-environment happy-dom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROFILE_COLLECTION_STATUS } from "./profileCollections";
import { useProfileCollections } from "./useProfileCollections";

const mocks = vi.hoisted(() => ({ load: vi.fn(), remove: vi.fn() }));

vi.mock("./profileCollections", async (importOriginal) => ({
  ...(await importOriginal()),
  loadProfileCollection: mocks.load,
  removeSavedProfileProject: mocks.remove,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

function Probe({ profileId, page = 1 }) {
  const state = useProfileCollections({ profileId, section: "bookmarks", page });
  const [pageBecameEmpty, setPageBecameEmpty] = useState(false);
  return (
    <div data-status={state.status} data-empty-page={pageBecameEmpty ? "true" : "false"}>
      <span>{state.data?.items?.map((item) => item.title).join(",") || state.failure?.message || ""}</span>
      <button type="button" onClick={async () => setPageBecameEmpty(Boolean((await state.removeSaved("saved-1")).pageBecameEmpty))}>Remove</button>
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

describe("useProfileCollections", () => {
  it("ignores an aborted stale response when the profile changes", async () => {
    const first = deferred();
    const second = deferred();
    mocks.load.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    await act(async () => root.render(<Probe profileId="writer-1" />));
    const firstSignal = mocks.load.mock.calls[0][0].signal;
    await act(async () => root.render(<Probe profileId="writer-2" />));
    expect(firstSignal.aborted).toBe(true);

    await act(async () => second.resolve({ ok: true, data: {
      items: [{ _id: "saved-2", title: "Latest profile" }],
      counts: { activity: 0, bookmarks: 1 },
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    } }));
    await act(async () => first.resolve({ ok: true, data: {
      items: [{ _id: "saved-1", title: "Stale profile" }],
      counts: { activity: 0, bookmarks: 1 },
      pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
    } }));

    expect(container.firstElementChild.dataset.status).toBe(PROFILE_COLLECTION_STATUS.READY);
    expect(container.textContent).toContain("Latest profile");
    expect(container.textContent).not.toContain("Stale profile");
  });

  it("removes locally and reports when a later page became empty", async () => {
    mocks.load.mockResolvedValueOnce({ ok: true, data: {
      items: [{ _id: "saved-1", title: "Only result" }],
      savedSource: "watchlist",
      counts: { activity: 2, bookmarks: 13 },
      pagination: { page: 2, limit: 12, total: 13, totalPages: 2, hasPrevious: true, hasNext: false },
    } });
    mocks.remove.mockResolvedValueOnce({ ok: true, data: { projectId: "saved-1" } });

    await act(async () => root.render(<Probe profileId="writer-1" page={2} />));
    await act(async () => container.querySelector("button").click());

    expect(container.firstElementChild.dataset.emptyPage).toBe("true");
    expect(container.textContent).not.toContain("Only result");
    expect(mocks.remove).toHaveBeenCalledWith("saved-1", { source: "watchlist" });
  });
});
