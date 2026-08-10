// @vitest-environment happy-dom
import { act, createRef, forwardRef, useImperativeHandle } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AI_IMAGE_ALLOWANCE } from "../../../config/aiEntitlements";
import { useAiCover } from "./useAiCover";

/*
 * The entitlement and quota behaviour of AI cover generation — the part that used to be wrong in
 * three different ways at once: a gate that disagreed with the server, a cap that no server
 * enforced, and a count the UI rendered from React state a reload reset.
 *
 * NOT tested here: the image pipeline itself (blob → File → thumbnail) beyond the one assertion
 * that a success path sets a thumbnail, and the watermark canvas helper, which needs a real 2D
 * context.
 */

const post = vi.fn();
vi.mock("../../../services/api", () => ({ default: { post: (...args) => post(...args) } }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let container;
let probeRef;

// Expose the hook through React's imperative-ref contract, without mutating a module global during
// render (which React's purity lint correctly rejects).
const Probe = forwardRef(function Probe(props, ref) {
  const value = useAiCover(props);
  useImperativeHandle(ref, () => value, [value]);
  return null;
});

const mount = (props) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  probeRef = createRef();
  act(() => root.render(<Probe ref={probeRef} {...props} />));
};

const baseProps = (overrides = {}) => ({
  user: { subscription: { plan: "gold" } },
  title: "The Four O'Clock Train",
  formData: { primaryGenre: "Drama", logline: "A logline." },
  showToast: vi.fn(),
  openPricingModal: vi.fn(),
  setThumbnailFile: vi.fn(),
  ...overrides,
});

const okResponse = (data = {}) => ({
  data: { base64Image: "data:image/jpeg;base64,AAAA", ...data },
});

beforeEach(() => {
  post.mockReset();
  // The hook fetches its own base64 payload back to build a File.
  globalThis.fetch = vi.fn(async () => ({ blob: async () => new Blob(["x"]) }));
});

afterEach(() => {
  if (root) act(() => root.unmount());
  document.body.innerHTML = "";
  probeRef = undefined;
});

describe("plan entitlement", () => {
  it("refuses a free plan and offers the pricing modal", async () => {
    const props = baseProps({ user: { subscription: { plan: "free" } } });
    mount(props);

    await act(async () => { await probeRef.current.generateAiCover(); });

    expect(post).not.toHaveBeenCalled();
    const [, tone, action] = props.showToast.mock.calls[0];
    expect(tone).toBe("warning");
    expect(action.label).toMatch(/pricing/i);
    action.onClick();
    expect(props.openPricingModal).toHaveBeenCalledWith("writer");
  });

  it.each(["silver", "gold", "diamond", "pro", "enterprise"])(
    "allows a %s subscriber — the gold-only gate is gone",
    async (plan) => {
      // The defect this replaces: `enforceGoldPlan` refused every one of these but "gold",
      // for an endpoint the server served to all of them.
      post.mockResolvedValue(okResponse({ attempts: 1, remaining: 14 }));
      const props = baseProps({ user: { subscription: { plan } } });
      mount(props);

      await act(async () => { await probeRef.current.generateAiCover(); });

      expect(post).toHaveBeenCalledWith("/scripts/generate-ai-cover", expect.any(Object));
      expect(props.setThumbnailFile).toHaveBeenCalled();
    }
  );

  it("treats a missing subscription as free rather than throwing", async () => {
    const props = baseProps({ user: {} });
    mount(props);
    await act(async () => { await probeRef.current.generateAiCover(); });
    expect(post).not.toHaveBeenCalled();
  });
});

describe("the allowance is the server's number", () => {
  it("seeds the remaining count from the user's spent total", () => {
    mount(baseProps({ user: { subscription: { plan: "gold", aiImagesGeneratedTotal: 12 } } }));
    expect(probeRef.current.aiCoverRemaining).toBe(AI_IMAGE_ALLOWANCE - 12);
  });

  it("assumes the full allowance when the counter is absent", () => {
    // Documents predating `aiImagesGeneratedTotal` must not read as "spent everything".
    mount(baseProps());
    expect(probeRef.current.aiCoverRemaining).toBe(AI_IMAGE_ALLOWANCE);
  });

  it("replaces its count with the server's on every response", async () => {
    post.mockResolvedValue(okResponse({ attempts: 9, remaining: 6 }));
    mount(baseProps());

    await act(async () => { await probeRef.current.generateAiCover(); });

    expect(probeRef.current.aiCoverRemaining).toBe(6);
    expect(probeRef.current.aiCoverAttempts).toBe(9);
  });

  it("falls back to decrementing when a response omits the count", async () => {
    post.mockResolvedValue(okResponse());
    mount(baseProps());
    await act(async () => { await probeRef.current.generateAiCover(); });
    expect(probeRef.current.aiCoverRemaining).toBe(AI_IMAGE_ALLOWANCE - 1);
  });

  it("coalesces two taps before React can commit the disabled state", async () => {
    let resolvePost;
    post.mockReturnValue(new Promise((resolve) => { resolvePost = resolve; }));
    mount(baseProps());

    let first;
    let second;
    await act(async () => {
      first = probeRef.current.generateAiCover();
      second = probeRef.current.generateAiCover();
      await Promise.resolve();
    });

    expect(post).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePost(okResponse({ attempts: 1, remaining: 14 }));
      await Promise.all([first, second]);
    });
    expect(probeRef.current.aiCoverRemaining).toBe(14);
  });

  it("refuses locally once the allowance is spent, without an upgrade prompt", async () => {
    const props = baseProps({
      user: { subscription: { plan: "gold", aiImagesGeneratedTotal: AI_IMAGE_ALLOWANCE } },
    });
    mount(props);

    await act(async () => { await probeRef.current.generateAiCover(); });

    expect(post).not.toHaveBeenCalled();
    // A paying writer who has spent the period must NOT be sold the plan they already hold.
    const [, , action] = props.showToast.mock.calls[0];
    expect(action ?? null).toBeNull();
  });
});

describe("server refusals", () => {
  it("offers an upgrade on a 403 that says so", async () => {
    post.mockRejectedValue({
      response: { status: 403, data: { message: "Paid plan required.", requiresUpgrade: true } },
    });
    const props = baseProps();
    mount(props);

    await act(async () => { await probeRef.current.generateAiCover(); });

    const [message, , action] = props.showToast.mock.calls[0];
    expect(message).toBe("Paid plan required.");
    expect(action.label).toMatch(/pricing/i);
  });

  it("zeroes the local count on a 429 and offers no upgrade", async () => {
    post.mockRejectedValue({
      response: { status: 429, data: { message: "You've used all 15…", quotaExhausted: true } },
    });
    const props = baseProps();
    mount(props);

    await act(async () => { await probeRef.current.generateAiCover(); });

    expect(probeRef.current.aiCoverRemaining).toBe(0);
    const [, , action] = props.showToast.mock.calls[0];
    expect(action ?? null).toBeNull();
  });

  it("shows an ordinary failure without touching the count", async () => {
    post.mockRejectedValue({ response: { status: 500, data: { message: "Upstream is down." } } });
    const props = baseProps();
    mount(props);

    await act(async () => { await probeRef.current.generateAiCover(); });

    expect(probeRef.current.aiCoverRemaining).toBe(AI_IMAGE_ALLOWANCE);
    const [message, , action] = props.showToast.mock.calls[0];
    expect(message).toBe("Upstream is down.");
    expect(action ?? null).toBeNull();
  });
});

describe("preconditions", () => {
  it("asks for a title before spending an image", async () => {
    const props = baseProps({ title: "" });
    mount(props);
    await act(async () => { await probeRef.current.generateAiCover(); });
    expect(post).not.toHaveBeenCalled();
    expect(props.showToast.mock.calls[0][0]).toMatch(/title/i);
  });
});
