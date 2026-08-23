// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastContext } from "../../components/feedback/toastContext";
import CollaborationRequestsMobile from "./CollaborationRequestsMobile";

const mocks = vi.hoisted(() => ({
  state: null,
  invites: null,
  activity: null,
  refresh: vi.fn(),
  respond: vi.fn(),
  acceptInvite: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock("socket.io-client", () => ({ io: () => ({ on: vi.fn(), disconnect: vi.fn() }) }));
vi.mock("../../../components/collab/collaborationRequests", async (importOriginal) => ({
  ...(await importOriginal()),
  useCollabRequestPage: () => mocks.state,
  useCollabInvitePage: () => mocks.invites,
  useCollabActivityPage: () => mocks.activity,
  respondToCollabRequest: (...args) => mocks.respond(...args),
  acceptCollabInvite: (...args) => mocks.acceptInvite(...args),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let container;
let root;

const ready = (requests = []) => ({
  status: "ready",
  requests,
  pagination: { page: 1, pages: 1, total: requests.length, hasNext: false, hasPrevious: false },
  error: "",
  refresh: mocks.refresh,
});

beforeEach(() => {
  mocks.state = ready([{
    id: "r1",
    scriptId: "s1",
    scriptTitle: "Night Train",
    requester: { id: "u2", name: "Asha Rao" },
    requestedRole: "commenter",
    message: "I can help with dialogue.",
    status: "pending",
  }]);
  mocks.respond.mockResolvedValue({ message: "Request accepted", request: { status: "accepted" } });
  mocks.invites = { status: "idle", invitations: [], pagination: { page: 1, pages: 1 }, error: "", refresh: mocks.refresh };
  mocks.activity = { status: "idle", activity: [], pagination: { page: 1, pages: 1 }, error: "", refresh: mocks.refresh };
  mocks.acceptInvite.mockResolvedValue({ message: "Invitation accepted", script: { id: "s1", title: "Night Train" } });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  vi.clearAllMocks();
});

async function render(path = "/collaborations") {
  await act(async () => {
    root.render(
      <ToastContext.Provider value={mocks.toast}>
        <MemoryRouter initialEntries={[path]}>
          <div className="ckm"><CollaborationRequestsMobile user={{ _id: "u1", role: "writer" }} /></div>
        </MemoryRouter>
      </ToastContext.Provider>,
    );
    await Promise.resolve();
  });
}

describe("native collaboration requests", () => {
  it("renders one title, the requester, project, message, and current role choices", async () => {
    await render();
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.textContent).toContain("Asha Rao");
    expect(container.textContent).toContain("Night Train");
    expect(container.textContent).toContain("I can help with dialogue.");
    expect([...container.querySelectorAll("option")].map((option) => option.textContent)).toEqual(["Co-writer", "Commenter", "Reader", "Co-owner"]);
  });

  it("accepts with the selected role through the shared operation", async () => {
    await render();
    const select = container.querySelector("select");
    await act(async () => { select.value = "viewer"; select.dispatchEvent(new Event("change", { bubbles: true })); });
    const accept = [...container.querySelectorAll("button")].find((button) => button.textContent === "Accept");
    await act(async () => { accept.click(); await Promise.resolve(); });
    expect(mocks.respond).toHaveBeenCalledWith(expect.objectContaining({ id: "r1" }), {
      decision: "accepted",
      role: "viewer",
      accessLevel: "content_only",
    });
    expect(mocks.toast.success).toHaveBeenCalled();
  });

  it("renders sent status with a canonical project destination", async () => {
    mocks.state = ready([{ id: "r2", scriptId: "s/2", scriptTitle: "Second Draft", requestedRole: "viewer", status: "rejected", message: "" }]);
    await render("/collaborations?tab=sent");
    expect(container.textContent).toContain("Second Draft");
    expect(container.textContent).toContain("rejected");
    expect(container.querySelector('a[href="/share/project/s%2F2"]')).toBeTruthy();
  });

  it("renders durable empty and failed states", async () => {
    mocks.state = ready([]);
    await render();
    expect(container.textContent).toContain("No incoming requests");

    mocks.state = { ...ready([]), status: "error", error: "Offline" };
    await act(async () => { root.render(
      <ToastContext.Provider value={mocks.toast}>
        <MemoryRouter initialEntries={["/collaborations"]}>
          <div className="ckm"><CollaborationRequestsMobile user={{ _id: "u1", role: "writer" }} /></div>
        </MemoryRouter>
      </ToastContext.Provider>,
    ); });
    expect(container.textContent).toContain("Could not load requests");
    expect(container.textContent).toContain("Offline");
  });

  it("accepts a current invitation in-app and keeps a workspace action visible", async () => {
    mocks.invites = {
      status: "ready",
      invitations: [{ id: "i1", scriptId: "s1", scriptTitle: "Night Train", token: "token-1", role: "editor", accessLevel: "content_only", expired: false, invitedBy: { name: "Mira" } }],
      pagination: { page: 1, pages: 1 },
      error: "",
      refresh: mocks.refresh,
    };
    await render("/collaborations?tab=invites");
    expect(container.textContent).toContain("From Mira");
    const accept = [...container.querySelectorAll("button")].find((button) => button.textContent === "Accept invitation");
    await act(async () => { accept.click(); await Promise.resolve(); });
    expect(mocks.acceptInvite).toHaveBeenCalledWith("token-1");
    expect(container.textContent).toContain("Invitation accepted");
    expect(container.querySelector('a[href="/create-project/s1"]')).toBeTruthy();
  });

  it("states expired invitations without presenting a dead acceptance control", async () => {
    mocks.invites = {
      status: "ready",
      invitations: [{ id: "i2", scriptTitle: "Old Draft", token: "old", role: "viewer", accessLevel: "content_only", expired: true }],
      pagination: { page: 1, pages: 1 },
      error: "",
      refresh: mocks.refresh,
    };
    await render("/collaborations?tab=invites");
    expect(container.textContent).toContain("This link is no longer valid");
    expect([...container.querySelectorAll("button")].some((button) => button.textContent === "Accept invitation")).toBe(false);
  });

  it("renders paged activity with project context and workspace navigation", async () => {
    mocks.activity = {
      status: "ready",
      activity: [{ id: "a1", scriptId: "s/2", scriptTitle: "Second Draft", action: "invite_accepted", actor: { name: "Asha" }, createdAt: new Date().toISOString() }],
      pagination: { page: 1, pages: 2, hasNext: true, hasPrevious: false },
      error: "",
      refresh: mocks.refresh,
    };
    await render("/collaborations?tab=activity");
    expect(container.textContent).toContain("Asha invite accepted");
    expect(container.textContent).toContain("Second Draft");
    expect(container.querySelector('a[href="/create-project/s%2F2"]')).toBeTruthy();
    expect(container.textContent).toContain("Page 1 of 2");
  });
});
