// @vitest-environment happy-dom
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../services/api";
import { forgetPendingCharge, readPendingCharge, rememberPendingCharge } from "./checkout";
import { useProjectCheckout } from "./useProjectCheckout";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const buyer = { _id: "viewer-1", name: "Ravi", role: "producer", email: "ravi@studio.com" };

const project = (extra = {}) => ({
  _id: "p1",
  title: "The Monsoon Archive",
  price: 240000,
  creator: { _id: "writer-1", name: "Mira" },
  canPurchase: true,
  myPendingRequest: {
    _id: "req-1",
    status: "approved",
    amount: 240000,
    paymentDueAt: new Date(Date.now() + 40 * 3600 * 1000).toISOString(),
  },
  ...extra,
});

let container;
let root;
let hook;
let opened;

/*
 * A stand-in for the gateway overlay, which cannot be mounted in a unit run at all.
 *
 * `open()` records the options and does nothing else — the tests drive the two things that
 * actually happen next by calling `options.handler(...)` (the buyer paid) or
 * `options.modal.ondismiss()` (they closed the sheet) themselves. That is the whole point: the
 * only part of this flow we control is what happens on either side of that overlay.
 */
function installGateway() {
  opened = [];
  window.Razorpay = function Razorpay(options) {
    return { open: () => opened.push(options) };
  };
}

/*
 * The hook under test, published to the test through an effect rather than assigned during render:
 * assigning to a module variable while rendering is a render side effect, and the effect runs after
 * every commit, so `hook` is always the value the last render produced.
 */
function Probe({ script, ...props }) {
  const value = useProjectCheckout({ script, user: buyer, ...props });
  useEffect(() => { hook = value; });
  return null;
}

async function mount(script, props = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<Probe script={script} {...props} />);
    await Promise.resolve();
  });
}

const tick = async (times = 3) => {
  for (let i = 0; i < times; i += 1) {
    await act(async () => { await Promise.resolve(); });
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  forgetPendingCharge();
  installGateway();
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  forgetPendingCharge();
  delete window.Razorpay;
});

describe("useProjectCheckout", () => {
  it("refuses to open a payment sheet before the boxes are ticked, and names the box", async () => {
    await mount(project());
    await act(async () => { await hook.pay(); });

    expect(api.post).not.toHaveBeenCalled();
    expect(opened).toHaveLength(0);
    expect(hook.error).toContain("Platform and Writer");
    expect(hook.processing).toBe(false);
  });

  it("carries the order through the gateway and unlocks on verification", async () => {
    const refresh = vi.fn().mockResolvedValue(null);
    api.post
      .mockResolvedValueOnce({ data: { orderId: "order_1", amount: 25200000, currency: "INR", keyId: "key" } })
      .mockResolvedValueOnce({ data: { success: true, message: "Payment successful.", invoice: { _id: "inv-1", invoiceNumber: "CK-1" }, purchaseRequest: { id: "req-1" } } });

    await mount(project(), { refresh });
    await act(async () => { hook.setAcceptance("platform", true); });
    await act(async () => { hook.setAcceptance("writer", true); });
    await act(async () => { hook.setAcceptance("rights", true); });

    let payment;
    await act(async () => { payment = hook.pay(); await Promise.resolve(); });

    expect(opened).toHaveLength(1);
    expect(opened[0].order_id).toBe("order_1");
    expect(hook.lastCharge.currency).toBe("INR");

    await act(async () => {
      await opened[0].handler({ razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "sig" });
      await payment;
    });

    expect(hook.success.invoiceNumber).toBe("CK-1");
    expect(hook.success.purchaseRequestId).toBe("req-1");
    expect(refresh).toHaveBeenCalled();
    // The unlock succeeded, so nothing is left owing a verification.
    expect(readPendingCharge({ scriptId: "p1", userId: "viewer-1" })).toBeNull();
  });

  it("writes the payment down BEFORE verifying it, and keeps it when verification fails (DEF-32)", async () => {
    api.post
      .mockResolvedValueOnce({ data: { orderId: "order_1", amount: 100, currency: "INR", keyId: "key" } })
      .mockRejectedValueOnce({ response: { status: 500, data: { message: "Server unavailable." } } });

    await mount(project());
    await act(async () => {
      hook.setAcceptance("platform", true);
      hook.setAcceptance("writer", true);
      hook.setAcceptance("rights", true);
    });
    await tick(1);
    await act(async () => { hook.pay(); await Promise.resolve(); });

    await act(async () => {
      await opened[0].handler({ razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "sig" });
    });

    const stored = readPendingCharge({ scriptId: "p1", userId: "viewer-1" });
    expect(stored.payment.razorpay_payment_id).toBe("pay_1");
    expect(hook.error).toContain("payment was taken");
    expect(hook.error).toContain("pay_1");
    expect(hook.success).toBeNull();
  });

  it("finishes an unverified charge on the way back in, without asking the buyer to press anything", async () => {
    rememberPendingCharge({
      scriptId: "p1",
      userId: "viewer-1",
      payment: { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "sig" },
    });
    api.post.mockResolvedValueOnce({ data: { success: true, message: "Payment already completed.", invoice: { _id: "inv-1", invoiceNumber: "CK-9" } } });

    await mount(project());
    await tick(4);

    expect(api.post).toHaveBeenCalledWith("/scripts/purchase/verify-payment", expect.objectContaining({
      razorpay_payment_id: "pay_1",
    }));
    expect(hook.success.invoiceNumber).toBe("CK-9");
    expect(readPendingCharge({ scriptId: "p1", userId: "viewer-1" })).toBeNull();
  });

  it("leaves a failed recovery visible and retryable rather than silently swallowing it", async () => {
    rememberPendingCharge({
      scriptId: "p1",
      userId: "viewer-1",
      payment: { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "sig" },
    });
    api.post.mockRejectedValue({ response: { status: 503, data: { message: "Try again shortly." } } });

    await mount(project());
    await tick(4);

    expect(hook.pendingCharge.payment.razorpay_payment_id).toBe("pay_1");
    expect(hook.error).toBe("Try again shortly.");
    expect(hook.recovering).toBe(false);
  });

  it("unlocks a free project without touching the gateway", async () => {
    api.post
      .mockResolvedValueOnce({ data: { noPaymentRequired: true, purchaseRequestId: "req-1" } })
      .mockResolvedValueOnce({ data: { success: true, message: "Access confirmed." } });

    await mount(project({ price: 0, myPendingRequest: { _id: "req-1", status: "approved", amount: 0, paymentDueAt: new Date(Date.now() + 3600000).toISOString() } }));
    await act(async () => {
      hook.setAcceptance("platform", true);
      hook.setAcceptance("writer", true);
      hook.setAcceptance("rights", true);
    });
    await tick(1);
    await act(async () => { await hook.pay(); });

    expect(opened).toHaveLength(0);
    expect(api.post.mock.calls[1]).toEqual(["/scripts/purchase/verify-payment", { scriptId: "p1", freeAccess: true }]);
    expect(hook.success.message).toBe("Access confirmed.");
  });

  it("re-reads the project when the server says the standing moved underneath us", async () => {
    const refresh = vi.fn().mockResolvedValue(null);
    api.post.mockRejectedValueOnce({ response: { status: 410, data: { message: "Payment window expired for this approved request." } } });

    await mount(project(), { refresh });
    await act(async () => {
      hook.setAcceptance("platform", true);
      hook.setAcceptance("writer", true);
      hook.setAcceptance("rights", true);
    });
    await tick(1);
    await act(async () => { await hook.pay(); });

    expect(refresh).toHaveBeenCalled();
    expect(hook.error).toContain("window expired");
    expect(opened).toHaveLength(0);
  });

  it("treats a dismissed sheet as neither an error nor a success", async () => {
    api.post.mockResolvedValueOnce({ data: { orderId: "order_1", amount: 100, currency: "INR", keyId: "key" } });

    await mount(project());
    await act(async () => {
      hook.setAcceptance("platform", true);
      hook.setAcceptance("writer", true);
      hook.setAcceptance("rights", true);
    });
    await tick(1);
    await act(async () => { hook.pay(); await Promise.resolve(); });
    await act(async () => { opened[0].modal.ondismiss(); });

    expect(hook.error).toBe("");
    expect(hook.success).toBeNull();
    expect(hook.processing).toBe(false);
  });

  it("does not offer a pay path at all where the standing forbids one", async () => {
    await mount(project({ myPendingRequest: { status: "pending" } }));
    await act(async () => { await hook.pay(); });

    expect(api.post).not.toHaveBeenCalled();
    expect(hook.standing.canPay).toBe(false);
  });
});
