import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../services/api";
import {
  buildPayoutSubmission,
  loadMembershipProofAccessUrl,
  loadPayoutDetails,
  normalizeMembershipReviews,
  normalizePayoutState,
  submitMembershipProof,
  submitPayoutDetails,
  validateMembershipProof,
} from "./accountCredentials";

vi.mock("../../services/api", () => ({ default: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe("account credential contract", () => {
  it("never places a masked account number back into an editable draft", () => {
    const state = normalizePayoutState({
      bankDetails: { accountHolderName: "Mira", accountNumber: "****1234", routingNumber: "HDFC0001234" },
      bankDetailsReview: { status: "approved" },
    });
    expect(state.display.accountNumber).toBe("****1234");
    expect(state.draft.accountNumber).toBe("");
  });

  it("normalizes and validates the canonical payout submission", () => {
    const result = buildPayoutSubmission({
      accountHolderName: " Mira Rao ", bankName: " HDFC ", accountNumber: "1234 5678",
      routingNumber: "hdfc0001234", accountType: "savings", country: "in", currency: "usd",
    });
    expect(result).toEqual({ ok: true, data: {
      accountHolderName: "Mira Rao", bankName: "HDFC", accountNumber: "12345678",
      routingNumber: "HDFC0001234", accountType: "savings", swiftCode: "", iban: "", country: "IN", currency: "INR",
    } });
  });

  it("returns field errors before sending incomplete payout data", async () => {
    const result = await submitPayoutDetails({ accountHolderName: "Mira" });
    expect(result.ok).toBe(false);
    expect(result.fieldErrors).toHaveProperty("accountNumber");
    expect(api.put).not.toHaveBeenCalled();
  });

  it("loads and submits payout data only through the transaction endpoints", async () => {
    api.get.mockResolvedValueOnce({ data: { bankDetails: null, bankDetailsReview: { status: "not_submitted" } } });
    expect((await loadPayoutDetails()).ok).toBe(true);
    api.put.mockResolvedValueOnce({ data: { message: "Queued", bankDetailsReview: { status: "pending", requestedDetails: { accountNumber: "****5678" } } } });
    const result = await submitPayoutDetails({ accountHolderName: "Mira", bankName: "HDFC", accountNumber: "12345678", routingNumber: "HDFC0001234", country: "IN", currency: "INR" });
    expect(result.data.review.status).toBe("pending");
    expect(api.put).toHaveBeenCalledWith("/transactions/bank-details", expect.objectContaining({ accountNumber: "12345678" }));
  });

  it("projects proof availability without returning its private URL", () => {
    const reviews = normalizeMembershipReviews({ membershipVerification: { wga: { requested: true, status: "rejected", proofUrl: "private", adminNote: "Expired card" } } });
    expect(reviews.wga).toMatchObject({ requested: true, status: "rejected", hasProof: true, adminNote: "Expired card" });
    expect(reviews.wga).not.toHaveProperty("proofUrl");
  });

  it("refuses unsupported and oversized proof files", () => {
    expect(validateMembershipProof({ type: "image/svg+xml", size: 10 }).ok).toBe(false);
    expect(validateMembershipProof({ type: "application/pdf", size: 10 * 1024 * 1024 + 1 }).ok).toBe(false);
    expect(validateMembershipProof({ type: "application/pdf", size: 100 }).ok).toBe(true);
  });

  it("uploads a valid proof with exact progress and resolves signed access", async () => {
    api.post.mockImplementationOnce((_url, _body, config) => {
      config.onUploadProgress({ loaded: 50, total: 100 });
      return Promise.resolve({ data: { message: "Submitted", user: { writerProfile: { membershipVerification: { wga: { status: "pending" } } } } } });
    });
    const progress = vi.fn();
    const file = new File(["proof"], "card.pdf", { type: "application/pdf" });
    expect((await submitMembershipProof({ membershipType: "wga", file, onProgress: progress })).ok).toBe(true);
    expect(progress).toHaveBeenCalledWith(50);
    expect(api.post.mock.calls[0][2]).not.toHaveProperty("headers");
    api.get.mockResolvedValueOnce({ data: { url: "https://asset.test/signed" } });
    expect(await loadMembershipProofAccessUrl("wga")).toMatchObject({ ok: true, data: { url: "https://asset.test/signed" } });
  });
});
