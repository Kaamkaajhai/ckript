// @vitest-environment happy-dom
/*
 * The three behaviours of the shared write hook that no view-model test can reach: when the
 * writer's request list re-reads itself, what the cached account is allowed to learn from a
 * reveal, and what happens to a viewer whose message slot could not be spent.
 */
import { act, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../services/api";
import { REQUEST_POLL_MS, useProjectActions } from "./useProjectActions";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;
let latest;

// Published from a layout effect rather than assigned during render: assigning is a render side
// effect, and the layout effect still runs before `act` returns, so the assertions read the value
// from the commit they just triggered.
function Probe(props) {
  const actions = useProjectActions(props);
  useLayoutEffect(() => { latest = actions; });
  return null;
}

const mount = async (props) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root.render(<Probe {...props} />); });
};

const setVisibility = (state) => {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
};

const requestCalls = () => api.get.mock.calls.filter(([url]) => url.includes("purchase-requests/mine")).length;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  api.get.mockResolvedValue({ data: [] });
  setVisibility("visible");
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
  container = null;
  root = null;
  vi.useRealTimers();
});

describe("the writer's request list", () => {
  const owner = { script: { _id: "p1", isCreator: true, creator: { _id: "w1" } } };

  it("reads once on mount and again on each poll", async () => {
    await mount(owner);
    expect(requestCalls()).toBe(1);
    await act(async () => { vi.advanceTimersByTime(REQUEST_POLL_MS); });
    expect(requestCalls()).toBe(2);
  });

  /*
   * The desktop page polled every 15 seconds forever — including in a background tab and on a dead
   * connection, which is 240 authenticated requests an hour from a page nobody is looking at.
   */
  it("stops polling a tab nobody is looking at, and catches up when they come back", async () => {
    await mount(owner);
    expect(requestCalls()).toBe(1);

    await act(async () => { setVisibility("hidden"); });
    await act(async () => { vi.advanceTimersByTime(REQUEST_POLL_MS * 3); });
    expect(requestCalls()).toBe(1);

    // Coming back does not make the writer wait out the remainder of an interval.
    await act(async () => { setVisibility("visible"); });
    expect(requestCalls()).toBe(2);
  });

  it("is not read at all for someone who is not the writer", async () => {
    await mount({ script: { _id: "p1", isCreator: false, creator: { _id: "w1" } } });
    await act(async () => { vi.advanceTimersByTime(REQUEST_POLL_MS * 2); });
    expect(requestCalls()).toBe(0);
  });
});

describe("revealing a contact", () => {
  const script = { _id: "p1", creator: { _id: "w1", name: "Mira" } };

  it("records the spend on the cached account exactly once per writer", async () => {
    const setUser = vi.fn();
    await mount({ script, user: { _id: "v1" }, setUser });

    api.post.mockResolvedValueOnce({ data: { contact: { email: "m@x.com" }, alreadyRevealed: false, remainingContacts: 9 } });
    await act(async () => { await latest.revealContact(); });
    expect(setUser).toHaveBeenCalledTimes(1);

    // A writer already revealed costs nothing, so writing them into the account again would
    // inflate the used count on every re-open.
    api.post.mockResolvedValueOnce({ data: { contact: { email: "m@x.com" }, alreadyRevealed: true, remainingContacts: 9 } });
    await act(async () => { await latest.revealContact(); });
    expect(setUser).toHaveBeenCalledTimes(1);
  });

  it("keeps the refusal beside the control instead of clearing the section", async () => {
    await mount({ script, user: { _id: "v1" } });
    api.post.mockRejectedValueOnce({ response: { status: 403, data: { message: "This writer has opted out." } } });
    await act(async () => { await latest.revealContact(); });
    expect(latest.revealError).toBe("This writer has opted out.");
    expect(latest.revealedContact).toBe(null);
  });

  it("forgets one writer's details when the screen moves to another writer's project", async () => {
    await mount({ script, user: { _id: "v1" } });
    api.post.mockResolvedValueOnce({ data: { contact: { email: "m@x.com" }, alreadyRevealed: true } });
    await act(async () => { await latest.revealContact(); });
    expect(latest.revealedContact).toEqual({ email: "m@x.com" });

    await act(async () => {
      root.render(<Probe script={{ _id: "p2", creator: { _id: "w2", name: "Ana" } }} user={{ _id: "v1" }} />);
    });
    expect(latest.revealedContact).toBe(null);
  });
});

describe("opening a conversation", () => {
  const script = { _id: "p1", creator: { _id: "w1", name: "Mira" } };

  it("spends a slot for a first conversation and answers with the thread path", async () => {
    api.post.mockResolvedValueOnce({ data: { messagesUsed: 1 } });
    await mount({ script, user: { _id: "v1" }, setUser: vi.fn() });
    let path;
    await act(async () => { path = await latest.messageWriter(); });
    expect(api.post).toHaveBeenCalledWith("/payment/message-writer/w1");
    expect(path).toContain("recipientId=w1");
  });

  it("spends nothing on a writer already messaged", async () => {
    await mount({
      script,
      user: { _id: "v1", subscription: { messagedWriters: [{ writerId: "w1" }] } },
    });
    let path;
    await act(async () => { path = await latest.messageWriter(); });
    expect(api.post).not.toHaveBeenCalled();
    expect(path).toContain("recipientId=w1");
  });

  it("answers with no path when the slot was refused, so nobody is dropped into a thread", async () => {
    api.post.mockRejectedValueOnce({ response: { status: 403, data: { message: "Message limit reached." } } });
    const notify = vi.fn();
    await mount({ script, user: { _id: "v1" }, notify });
    let path;
    await act(async () => { path = await latest.messageWriter(); });
    expect(path).toBe("");
    expect(notify).toHaveBeenCalledWith("Message limit reached.", "error");
  });
});
