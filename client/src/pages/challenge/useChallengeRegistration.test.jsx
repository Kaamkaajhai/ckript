// @vitest-environment happy-dom
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useChallengeRegistration from "./useChallengeRegistration";
import * as model from "./challengeRegistration";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("./challengeRegistration", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createChallengeRegistrationOrder: vi.fn(),
    fetchRegistrationInvoice: vi.fn(),
    loadChallengeRazorpaySdk: vi.fn().mockResolvedValue(true),
    loadExternalRegistration: vi.fn().mockResolvedValue({ ok: true, data: { request: null } }),
    reconcileChallengeRegistrationPayment: vi.fn(),
    registerForFreeChallenge: vi.fn(),
    submitExternalRegistration: vi.fn(),
    verifyChallengeRegistrationPayment: vi.fn(),
  };
});

let host;
let root;
const stateRef = { current: null };
const user = { _id: "u1", role: "writer", name: "Aditi", email: "a@example.com" };
const competition = { _id: "c1", slug: "48-hours", name: "48 Hours", entryFee: { mode: "paid" } };

function Probe(props) {
  const value = useChallengeRegistration(props);
  useEffect(() => { stateRef.current = value; }, [value]);
  return null;
}

const mount = async (props) => {
  await act(async () => root.render(<Probe {...props} />));
  await act(async () => {});
};

const fill = async () => {
  await act(async () => {
    stateRef.current.setField("country", "India");
    stateRef.current.setField("language", "Hindi");
    stateRef.current.setField("genres", ["Drama"]);
    stateRef.current.setField("experienceLevel", "intermediate");
    stateRef.current.setAcceptance("acceptRules", true);
    stateRef.current.setAcceptance("acceptCopyright", true);
  });
};

describe("useChallengeRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    window.Razorpay = undefined;
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    delete window.Razorpay;
  });

  it("uses the direct endpoint only for an explicitly free challenge", async () => {
    model.registerForFreeChallenge.mockResolvedValue({ ok: true, data: { entry: { eventId: "CGSC-FREE" } } });
    await mount({ competition: { ...competition, entryFee: { mode: "free" } }, user });
    await fill();
    await act(async () => stateRef.current.submit());
    expect(model.registerForFreeChallenge).toHaveBeenCalledOnce();
    expect(model.createChallengeRegistrationOrder).not.toHaveBeenCalled();
    expect(stateRef.current.success.entry.eventId).toBe("CGSC-FREE");
  });

  it("opens the persisted provider order and verifies the captured callback", async () => {
    let options;
    window.Razorpay = class RazorpayMock {
      constructor(value) { options = value; }
      open() {}
      on() {}
    };
    model.createChallengeRegistrationOrder.mockResolvedValue({ ok: true, data: { key: "key", orderId: "order_1", amount: 9800, currency: "INR", reusedOrder: true } });
    model.verifyChallengeRegistrationPayment.mockResolvedValue({ ok: true, data: { entry: { eventId: "CGSC-PAID" } } });
    await mount({ competition, user });
    await fill();
    let promise;
    await act(async () => { promise = stateRef.current.submit(); await Promise.resolve(); });
    await act(async () => {});
    expect(options.order_id).toBe("order_1");
    await act(async () => options.handler({ razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "sig" }));
    await act(async () => promise);
    expect(model.verifyChallengeRegistrationPayment).toHaveBeenCalledWith({ competitionId: "c1", payment: expect.objectContaining({ razorpay_payment_id: "pay_1" }) });
    expect(stateRef.current.success.entry.eventId).toBe("CGSC-PAID");
  });

  it("recovers a captured payment without creating another order", async () => {
    model.reconcileChallengeRegistrationPayment.mockResolvedValue({ ok: true, data: { entry: { eventId: "CGSC-RECOVER" } } });
    await mount({ competition, user });
    await act(async () => stateRef.current.recoverPayment());
    expect(model.reconcileChallengeRegistrationPayment).toHaveBeenCalledWith({ competitionId: "c1" });
    expect(model.createChallengeRegistrationOrder).not.toHaveBeenCalled();
    expect(stateRef.current.success.entry.eventId).toBe("CGSC-RECOVER");
  });
});
