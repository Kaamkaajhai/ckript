// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INCOMING_FOLLOW_REQUEST_STATUS,
} from "../../../../pages/profile/useIncomingFollowRequests";
import { ToastContext } from "../../../components/feedback/toastContext";
import FollowRequestsMobile from "./FollowRequestsMobile";

const mocks = vi.hoisted(() => ({
  state: null,
  decide: vi.fn(),
  reload: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("../../../../pages/profile/useIncomingFollowRequests", async (importOriginal) => ({
  ...(await importOriginal()),
  useIncomingFollowRequests: () => mocks.state,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const ready = (requests = []) => ({
  status: INCOMING_FOLLOW_REQUEST_STATUS.READY,
  requests,
  error: "",
  actingId: "",
  decide: mocks.decide,
  reload: mocks.reload,
});

beforeEach(() => {
  mocks.state = ready([{
    _id: "request-1",
    createdAt: "2026-08-21T00:00:00.000Z",
    from: {
      _id: "writer-2",
      name: "Asha Rao",
      role: "writer",
      bio: "Writes grounded dramas.",
      writerProfile: { username: "asha" },
    },
  }]);
  mocks.decide.mockResolvedValue({ ok: true, data: { status: "accepted" } });
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
      <ToastContext.Provider value={mocks.toast}>
        <MemoryRouter initialEntries={["/follow-requests"]}>
          <div className="ckm"><FollowRequestsMobile user={{ _id: "writer-1", role: "writer" }} /></div>
        </MemoryRouter>
      </ToastContext.Provider>,
    );
    await Promise.resolve();
  });
}

describe("native follow requests", () => {
  it("renders the request, profile target, and one accessible page title", async () => {
    await render();
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.textContent).toContain("Asha Rao");
    expect(container.textContent).toContain("Writes grounded dramas.");
    expect(container.querySelector('a[href="/profile/asha"]')).toBeTruthy();
  });

  it("accepts through the shared state and reports success", async () => {
    await render();
    const accept = [...container.querySelectorAll("button")].find((button) => button.textContent === "Accept");
    await act(async () => { accept.click(); await Promise.resolve(); });
    expect(mocks.decide).toHaveBeenCalledWith("writer-2", "accept");
    expect(mocks.toast.success).toHaveBeenCalledWith("Follow request accepted", "Asha Rao can now follow your profile.");
  });

  it("renders the durable empty and failed states", async () => {
    mocks.state = ready([]);
    await render();
    expect(container.textContent).toContain("No pending requests");

    mocks.state = { ...ready([]), status: INCOMING_FOLLOW_REQUEST_STATUS.FAILED, error: "Offline" };
    await act(async () => { root.render(
      <ToastContext.Provider value={mocks.toast}>
        <MemoryRouter initialEntries={["/follow-requests"]}>
          <div className="ckm"><FollowRequestsMobile user={{ _id: "writer-1", role: "writer" }} /></div>
        </MemoryRouter>
      </ToastContext.Provider>,
    ); });
    expect(container.textContent).toContain("Could not load follow requests");
    expect(container.textContent).toContain("Offline");
  });
});
