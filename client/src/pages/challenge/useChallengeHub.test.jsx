// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useChallengeHub from "./useChallengeHub";

const mocks = vi.hoisted(() => ({ publicLoad: vi.fn(), mineLoad: vi.fn() }));

vi.mock("./challengeHub", async (importOriginal) => ({
  ...(await importOriginal()),
  loadChallengeHubPublic: mocks.publicLoad,
  loadMyChallenges: mocks.mineLoad,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

function Probe({ user }) {
  const hub = useChallengeHub({ user });
  return (
    <div data-public={hub.public.status} data-mine={hub.mine.status}>
      {hub.mine.data?.items?.map((item) => item.entry._id).join(",") || hub.mine.failure?.message || ""}
    </div>
  );
}

let container;
let root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  mocks.publicLoad.mockResolvedValue({ ok: true, data: { live: [] } });
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

describe("useChallengeHub", () => {
  it("aborts an obsolete owner request and never renders the previous account's entries", async () => {
    const first = deferred();
    const second = deferred();
    mocks.mineLoad.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    await act(async () => root.render(<Probe user={{ _id: "writer-1" }} />));
    const firstSignal = mocks.mineLoad.mock.calls[0][0].signal;
    await act(async () => root.render(<Probe user={{ _id: "writer-2" }} />));
    expect(firstSignal.aborted).toBe(true);

    await act(async () => second.resolve({ ok: true, data: { items: [{ entry: { _id: "new-entry" } }] } }));
    await act(async () => first.resolve({ ok: true, data: { items: [{ entry: { _id: "stale-entry" } }] } }));

    expect(container.firstElementChild.dataset.mine).toBe("ready");
    expect(container.textContent).toContain("new-entry");
    expect(container.textContent).not.toContain("stale-entry");
  });

  it("does not call the authenticated endpoint for a signed-out visitor", async () => {
    await act(async () => root.render(<Probe user={null} />));
    expect(mocks.mineLoad).not.toHaveBeenCalled();
    expect(container.firstElementChild.dataset.mine).toBe("idle");
  });
});
