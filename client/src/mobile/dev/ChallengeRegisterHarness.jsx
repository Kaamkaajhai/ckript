import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { CHALLENGE_DETAIL_STATUS } from "../../pages/challenge/challengeDetail";
import ChallengeRegisterMobile from "../screens/challenges/ChallengeRegisterMobile";

const noop = () => {};
const writer = { _id: "writer-1", role: "writer", name: "Aditi Rao", email: "aditi@example.com", preferredCurrency: "INR" };
const competition = {
  _id: "competition-48",
  slug: "48-hours",
  name: "Ckript 48 Hour Global Script Challenge",
  entryFee: { mode: "paid", inrMinor: 9800, usdMinor: 200 },
};

const detail = (overrides = {}) => ({
  public: { status: CHALLENGE_DETAIL_STATUS.READY, data: { competition, phase: "registration_open", timeline: [] }, failure: null },
  entry: { status: CHALLENGE_DETAIL_STATUS.READY, data: null, failure: null },
  refresh: noop,
  retryEntry: noop,
  ...overrides,
});

const registration = (overrides = {}) => ({
  form: { country: "India", language: "Hindi", genres: ["Drama", "Thriller"], experienceLevel: "intermediate", portfolioUrl: "https://aditi.example/work" },
  acceptRules: true,
  acceptCopyright: true,
  currency: "INR",
  errors: {},
  serverError: "",
  processing: false,
  gatewayReady: true,
  gatewayBlocked: false,
  success: null,
  invoiceBusy: false,
  recovering: false,
  pendingPayment: null,
  setField: noop,
  setAcceptance: noop,
  setCurrency: noop,
  setServerError: noop,
  submit: noop,
  recoverPayment: noop,
  downloadInvoice: noop,
  external: {
    loading: false,
    request: null,
    fields: { provider: "luma", fullName: "Aditi Rao", phone: "+91 98765 43210", externalRef: "EVT-8841XY" },
    screenshot: null,
    error: "",
    submitting: false,
    setFields: noop,
    setScreenshot: noop,
    setError: noop,
    submit: noop,
  },
  ...overrides,
});

export default function ChallengeRegisterHarness() {
  const [params] = useSearchParams();
  const state = params.get("state") || "form";
  const fixture = useMemo(() => {
    if (state === "free") return { user: writer, detail: detail({ public: { status: "ready", data: { competition: { ...competition, entryFee: { mode: "free" } }, phase: "registration_open", timeline: [] }, failure: null } }), registration: registration() };
    if (state === "invalid") return { user: writer, detail: detail(), registration: registration({ form: { country: "", language: "", genres: [], experienceLevel: "", portfolioUrl: "example.com" }, acceptRules: false, acceptCopyright: false, errors: { country: "Select your country.", language: "Choose your preferred language.", genres: "Choose at least one genre.", experienceLevel: "Select your experience level.", portfolioUrl: "Portfolio link must start with http:// or https://", acceptRules: "Accept the competition rules to continue.", acceptCopyright: "Confirm the original-work policy to continue." } }) };
    if (state === "pending-payment") return { user: writer, detail: detail(), registration: registration({ pendingPayment: { payment: { razorpay_payment_id: "pay_saved" } }, serverError: "The earlier confirmation did not reach the server." }) };
    if (state === "processing") return { user: writer, detail: detail(), registration: registration({ processing: true }) };
    if (state === "external") return { user: writer, detail: detail(), registration: registration({ external: { ...registration().external, request: { status: "rejected", providerName: "Luma", externalRef: "EVT-8841XY", reviewNote: "The last digit did not match the ticket." } } }) };
    if (state === "external-pending") return { user: writer, detail: detail(), registration: registration({ external: { ...registration().external, request: { status: "pending", providerName: "Luma", externalRef: "EVT-8841XY" } } }) };
    if (state === "external-approved") return { user: writer, detail: detail(), registration: registration({ external: { ...registration().external, request: { status: "approved", providerName: "Luma", externalRef: "EVT-8841XY" } } }) };
    if (state === "success") return { user: writer, detail: detail(), registration: registration({ success: { entry: { eventId: "CGSC-8K4M2QPX" }, invoice: { _id: "invoice-1", invoiceNumber: "CKR-2026-0142" }, timeline: [] } }) };
    if (state === "already") return { user: writer, detail: detail({ entry: { status: "ready", data: { eventId: "CGSC-EXISTING" }, failure: null } }), registration: registration() };
    if (state === "closed") return { user: writer, detail: detail({ public: { status: "ready", data: { competition, phase: "registration_closed", timeline: [] }, failure: null } }), registration: registration() };
    if (state === "role") return { user: { _id: "producer-1", role: "producer", name: "Mira Producer", email: "mira@studio.example" }, detail: detail(), registration: registration() };
    if (state === "error") return { user: writer, detail: detail({ public: { status: "failed", data: null, failure: { message: "The challenge service is unavailable." } } }), registration: registration() };
    return { user: writer, detail: detail(), registration: registration() };
  }, [state]);

  return <ChallengeRegisterMobile user={fixture.user} previewSlug="48-hours" previewState={{ detail: fixture.detail, registration: fixture.registration }} />;
}
