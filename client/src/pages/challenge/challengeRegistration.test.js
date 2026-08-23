// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../services/api";
import {
  challengeRegistrationMode,
  challengeRegistrationPaths,
  challengeRegistrationPrices,
  createChallengeRegistrationOrder,
  emptyChallengeRegistration,
  forgetChallengeRegistrationPayment,
  readChallengeRegistrationPayment,
  reconcileChallengeRegistrationPayment,
  registrationPayload,
  rememberChallengeRegistrationPayment,
  submitExternalRegistration,
  validateChallengeRegistration,
  validateExternalRegistration,
  verifyChallengeRegistrationPayment,
} from "./challengeRegistration";

vi.mock("../../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const validForm = {
  country: "India",
  language: "Hindi",
  genres: ["Drama"],
  experienceLevel: "intermediate",
  portfolioUrl: "https://example.com/work",
};

describe("challenge registration model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("defaults existing challenges to paid and preserves the exact slug", () => {
    expect(challengeRegistrationMode({})).toBe("paid");
    expect(challengeRegistrationMode({ entryFee: { mode: "free" } })).toBe("free");
    expect(challengeRegistrationPaths({ slug: "48 hours" })).toEqual({
      detail: "/challenge/c/48%20hours",
      dashboard: "/challenge/dashboard?c=48%20hours",
    });
  });

  it("uses public minor-unit prices without trusting presentation arithmetic", () => {
    expect(challengeRegistrationPrices({ entryFee: { inrMinor: 12500, usdMinor: 350 } })).toEqual({ INR: 12500, USD: 350 });
    expect(challengeRegistrationPrices({})).toEqual({ INR: 9800, USD: 200 });
  });

  it("validates every entry field and both legal acknowledgements", () => {
    const invalid = validateChallengeRegistration({ form: emptyChallengeRegistration() });
    expect(invalid.ok).toBe(false);
    expect(Object.keys(invalid.errors)).toEqual([
      "country", "language", "genres", "experienceLevel", "acceptRules", "acceptCopyright",
    ]);
    expect(validateChallengeRegistration({ form: validForm, acceptRules: true, acceptCopyright: true })).toEqual({ ok: true, errors: {}, first: "" });
  });

  it("normalizes the payload before any admission path", () => {
    expect(registrationPayload({ form: { ...validForm, portfolioUrl: "  https://example.com  " }, acceptRules: true, acceptCopyright: true, currency: "USD" })).toMatchObject({
      portfolioUrl: "https://example.com",
      acceptRules: true,
      acceptCopyright: true,
      currency: "USD",
    });
  });

  it("pins create, verify and server-side recovery endpoints", async () => {
    api.post.mockResolvedValue({ data: { ok: true } });
    await createChallengeRegistrationOrder({ competitionId: "c/1", payload: validForm });
    expect(api.post).toHaveBeenNthCalledWith(1, "/competitions/c%2F1/create-registration-order", validForm);
    await verifyChallengeRegistrationPayment({ competitionId: "c1", payment: { razorpay_payment_id: "p1" } });
    expect(api.post).toHaveBeenNthCalledWith(2, "/competitions/c1/verify-registration-payment", { razorpay_payment_id: "p1" });
    await reconcileChallengeRegistrationPayment({ competitionId: "c1" });
    expect(api.post).toHaveBeenNthCalledWith(3, "/competitions/c1/reconcile-registration-payment");
  });

  it("keeps a captured callback only for the exact competition and user", () => {
    rememberChallengeRegistrationPayment({ competitionId: "c1", userId: "u1", payment: { razorpay_payment_id: "p1" } });
    rememberChallengeRegistrationPayment({ competitionId: "c2", userId: "u1", payment: { razorpay_payment_id: "p2" } });
    expect(readChallengeRegistrationPayment({ competitionId: "c1", userId: "u1" })?.payment.razorpay_payment_id).toBe("p1");
    expect(readChallengeRegistrationPayment({ competitionId: "c2", userId: "u1" })?.payment.razorpay_payment_id).toBe("p2");
    forgetChallengeRegistrationPayment({ competitionId: "c1", userId: "u1" });
    expect(readChallengeRegistrationPayment({ competitionId: "c1", userId: "u1" })).toBeNull();
    expect(readChallengeRegistrationPayment({ competitionId: "c2", userId: "u1" })?.payment.razorpay_payment_id).toBe("p2");
  });

  it("validates a third-party claim and leaves the multipart boundary to the browser", async () => {
    expect(validateExternalRegistration({ fields: {} })).toMatch(/platform/);
    expect(validateExternalRegistration({ fields: { provider: "luma", fullName: "Aditi", phone: "+91 98765 43210", externalRef: "EVT-1" } })).toBe("");
    api.post.mockResolvedValue({ data: { request: { status: "pending" } } });
    await submitExternalRegistration({
      competitionId: "c1",
      fields: { provider: "luma", fullName: "Aditi", phone: "+91 98765 43210", externalRef: "EVT-1" },
      registration: { ...validForm, acceptRules: true, acceptCopyright: true },
    });
    const [, body] = api.post.mock.calls[0];
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("provider")).toBe("luma");
    expect(api.post.mock.calls[0]).toHaveLength(2);
  });
});
