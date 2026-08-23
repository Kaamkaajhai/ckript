// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useChallengeDetail from "./useChallengeDetail";

const mocks = vi.hoisted(() => ({ publicLoad: vi.fn(), entryLoad: vi.fn() }));

vi.mock("./challengeDetail", async (importOriginal) => ({
  ...(await importOriginal()),
  loadChallengeDetail: mocks.publicLoad,
  loadChallengeEntrySummary: mocks.entryLoad,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

function Probe({ slug = "48-hours", user = null }) {
  const detail = useChallengeDetail({ slug, user, poll: false });
  return <div data-public={detail.public.status} data-entry={detail.entry.status}><button type="button" onClick={detail.refresh}>Refresh</button>{detail.entry.data?.eventId || detail.public.data?.competition?.name || ""}</div>;
}

let container;
let root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  mocks.publicLoad.mockResolvedValue({ ok: true, data: { competition: { _id: "c1" }, phase: "live" } });
  mocks.entryLoad.mockResolvedValue({ ok: true, data: null });
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

describe("useChallengeDetail", () => {
  it("loads the public record for signed-out visitors without calling the owner endpoint", async () => {
    await act(async () => root.render(<Probe />));
    expect(container.firstElementChild.dataset.public).toBe("ready");
    expect(container.firstElementChild.dataset.entry).toBe("idle");
    expect(mocks.entryLoad).not.toHaveBeenCalled();
  });

  it("retains a ready record while a phase refresh is in flight", async () => {
    const refresh = deferred();
    mocks.publicLoad
      .mockResolvedValueOnce({ ok: true, data: { competition: { _id: "c1", name: "Ready challenge" }, phase: "registration_open" } })
      .mockReturnValueOnce(refresh.promise);
    await act(async () => root.render(<Probe />));
    expect(container.textContent).toContain("Ready challenge");
    await act(async () => container.querySelector("button").click());
    expect(container.firstElementChild.dataset.public).toBe("ready");
    expect(container.textContent).toContain("Ready challenge");
    await act(async () => refresh.resolve({ ok: true, data: { competition: { _id: "c1", name: "Refreshed challenge" }, phase: "live" } }));
    expect(container.textContent).toContain("Refreshed challenge");
  });

  it("aborts an obsolete owner's entry check and never renders its result", async () => {
    const first = deferred();
    const second = deferred();
    mocks.entryLoad.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    await act(async () => root.render(<Probe user={{ _id: "u1" }} />));
    const firstSignal = mocks.entryLoad.mock.calls[0][0].signal;
    await act(async () => root.render(<Probe user={{ _id: "u2" }} />));
    expect(firstSignal.aborted).toBe(true);
    await act(async () => second.resolve({ ok: true, data: { eventId: "NEW" } }));
    await act(async () => first.resolve({ ok: true, data: { eventId: "STALE" } }));

    expect(container.textContent).toContain("NEW");
    expect(container.textContent).not.toContain("STALE");
  });
});
