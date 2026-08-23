// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHALLENGE_DETAIL_STATUS } from "../../../pages/challenge/challengeDetail";
import ChallengeRegisterMobile from "./ChallengeRegisterMobile";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const noop = vi.fn();
const user = { _id: "u1", role: "writer", name: "Aditi Rao", email: "aditi@example.com" };
const competition = { _id: "c1", slug: "48-hours", name: "48 Hour Challenge", entryFee: { mode: "paid", inrMinor: 9800, usdMinor: 200 } };
const detail = (phase = "registration_open", entry = null) => ({ public: { status: CHALLENGE_DETAIL_STATUS.READY, data: { competition, phase, timeline: [] }, failure: null }, entry: { status: CHALLENGE_DETAIL_STATUS.READY, data: entry, failure: null }, refresh: noop, retryEntry: noop });
const registration = (over = {}) => ({
  form: { country: "India", language: "Hindi", genres: ["Drama"], experienceLevel: "intermediate", portfolioUrl: "" },
  acceptRules: true, acceptCopyright: true, currency: "INR", errors: {}, serverError: "", processing: false, gatewayBlocked: false, success: null, invoiceBusy: false, recovering: false, pendingPayment: null,
  setField: noop, setAcceptance: noop, setCurrency: noop, setServerError: noop, submit: noop, recoverPayment: noop, downloadInvoice: noop,
  external: { loading: false, request: null, fields: { provider: "luma", fullName: "Aditi", phone: "+91 98765 43210", externalRef: "EVT-1" }, screenshot: null, error: "", submitting: false, setFields: noop, setScreenshot: noop, setError: noop, submit: noop },
  ...over,
});
let host;
let root;
const mount = async ({ detailState = detail(), registrationState = registration(), viewer = user } = {}) => {
  await act(async () => root.render(<MemoryRouter initialEntries={["/challenge/register?c=48-hours"]}><ChallengeRegisterMobile user={viewer} previewSlug="48-hours" previewState={{ detail: detailState, registration: registrationState }} /></MemoryRouter>));
  return host;
};

describe("ChallengeRegisterMobile", () => {
  beforeEach(() => { host = document.createElement("div"); document.body.appendChild(host); root = createRoot(host); });
  afterEach(() => { act(() => root.unmount()); host.remove(); vi.clearAllMocks(); });

  it("renders the exact paid challenge form in the flow shell", async () => {
    const el = await mount();
    expect(el.querySelector('[data-shell-mode="flow"]')).not.toBeNull();
    expect(el.querySelector('[data-screen-id="challenge-register"]')).not.toBeNull();
    expect(el.querySelector("h1").textContent).toContain("48 Hour Challenge");
    expect(el.textContent).toContain("INR · ₹98");
    expect(el.textContent).toContain("USD · $2");
    expect(el.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
    expect(el.querySelector('button[form="ckm-challenge-register-form"]').textContent).toContain("Continue to payment");
  });

  it("keeps validation reasons beside their controls", async () => {
    const errors = { country: "Select your country.", genres: "Choose at least one genre.", acceptRules: "Accept the competition rules to continue." };
    const el = await mount({ registrationState: registration({ errors, acceptRules: false, form: { country: "", language: "Hindi", genres: [], experienceLevel: "intermediate", portfolioUrl: "" } }) });
    for (const message of Object.values(errors)) expect(el.textContent).toContain(message);
    expect(el.querySelectorAll('[aria-invalid="true"]').length).toBeGreaterThanOrEqual(3);
  });

  it("renders a free event without any payment choice", async () => {
    const free = { ...competition, entryFee: { mode: "free" } };
    const el = await mount({ detailState: { ...detail(), public: { status: "ready", data: { competition: free, phase: "registration_open", timeline: [] }, failure: null } } });
    expect(el.textContent).toContain("No payment is required");
    expect(el.textContent).not.toContain("Payment currency");
    expect(el.querySelector('button[form="ckm-challenge-register-form"]').textContent).toContain("Register for free");
  });

  it("offers server-side recovery without creating another checkout", async () => {
    const el = await mount({ registrationState: registration({ pendingPayment: { payment: { razorpay_payment_id: "pay_1" } } }) });
    expect(el.textContent).toContain("A payment still needs confirmation");
    const confirm = [...el.querySelectorAll("button")].find((button) => button.textContent.includes("Confirm payment"));
    act(() => confirm.click());
    expect(noop).toHaveBeenCalled();
  });

  it("switches to the third-party claim and keeps it in the one route form", async () => {
    const el = await mount();
    const external = [...el.querySelectorAll('input[type="radio"]')].find((input) => input.value === "external");
    act(() => external.click());
    expect(el.textContent).toContain("Name on that registration");
    expect(el.textContent).toContain("Proof screenshot");
    expect(el.querySelectorAll("form")).toHaveLength(1);
    expect(el.querySelector('button[form="ckm-challenge-register-form"]').textContent).toContain("Send for verification");
  });

  it("renders pending external review without a second payment action", async () => {
    const pending = registration();
    pending.external = { ...pending.external, request: { status: "pending", providerName: "Luma", externalRef: "EVT-1" } };
    const el = await mount({ registrationState: pending });
    expect(el.textContent).toContain("With our team for review");
    expect(el.querySelector('button[form="ckm-challenge-register-form"]')).toBeNull();
  });

  it("returns a successful registration to the exact dashboard and exposes the invoice", async () => {
    const success = { entry: { eventId: "CGSC-ABC12345" }, invoice: { _id: "i1", invoiceNumber: "CKR-14" }, timeline: [] };
    const el = await mount({ registrationState: registration({ success }) });
    expect(el.textContent).toContain("CGSC-ABC12345");
    expect(el.querySelector('a[href="/challenge/dashboard?c=48-hours"]')).not.toBeNull();
    expect(el.textContent).toContain("Download invoice CKR-14");
  });

  it("states already-registered, closed, and wrong-role standings", async () => {
    expect((await mount({ detailState: detail("registration_open", { eventId: "CGSC-OLD" }) })).textContent).toContain("already registered");
    act(() => root.unmount()); root = createRoot(host);
    expect((await mount({ detailState: detail("registration_closed") })).textContent).toContain("Registration is not open");
    act(() => root.unmount()); root = createRoot(host);
    expect((await mount({ viewer: { _id: "p1", role: "producer" } })).textContent).toContain("writer account is required");
  });
});
