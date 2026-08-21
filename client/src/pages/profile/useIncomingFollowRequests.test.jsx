// @vitest-environment happy-dom
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  decideIncomingFollowRequest,
  loadIncomingFollowRequests,
} from "./authenticatedProfile";
import {
  INCOMING_FOLLOW_REQUEST_STATUS,
  useIncomingFollowRequests,
} from "./useIncomingFollowRequests";

vi.mock("./authenticatedProfile", () => ({
  loadIncomingFollowRequests: vi.fn(),
  decideIncomingFollowRequest: vi.fn(),
}));

let state;
const captureState = (value) => { state = value; };
const Probe = () => {
  const current = useIncomingFollowRequests();
  useEffect(() => captureState(current), [current]);
  return null;
};

const flush = async () => {
  await act(async () => { await Promise.resolve(); });
};

beforeEach(() => {
  vi.clearAllMocks();
  state = undefined;
});

describe("incoming follow request state", () => {
  it("loads requests and removes only the successfully decided member", async () => {
    loadIncomingFollowRequests.mockResolvedValue({
      ok: true,
      data: [{ from: { _id: "one" } }, { from: { _id: "two" } }],
    });
    decideIncomingFollowRequest.mockResolvedValue({ ok: true, data: { status: "accepted" } });
    const host = document.createElement("div");
    const root = createRoot(host);

    await act(async () => { root.render(<Probe />); });
    await flush();
    expect(state.status).toBe(INCOMING_FOLLOW_REQUEST_STATUS.READY);
    expect(state.requests).toHaveLength(2);

    await act(async () => { await state.decide("one", "accept"); });
    expect(decideIncomingFollowRequest).toHaveBeenCalledWith({ fromUserId: "one", decision: "accept" });
    expect(state.requests).toEqual([{ from: { _id: "two" } }]);
    act(() => root.unmount());
  });

  it("keeps a failed request actionable and exposes retry state", async () => {
    loadIncomingFollowRequests.mockResolvedValue({ ok: false, message: "Offline" });
    const host = document.createElement("div");
    const root = createRoot(host);

    await act(async () => { root.render(<Probe />); });
    await flush();
    expect(state.status).toBe(INCOMING_FOLLOW_REQUEST_STATUS.FAILED);
    expect(state.error).toBe("Offline");
    expect(state.reload).toEqual(expect.any(Function));
    act(() => root.unmount());
  });
});
