import { useCallback, useState } from "react";
import api from "../../services/financeApi";

/**
 * The control actions on the payments page — grants, plan changes, bank-review decisions.
 *
 * These hit the EXISTING admin endpoints and are therefore gated by adminOnly on the server. The
 * finance page only renders them for a viewer whose role is admin, so the server check and the UI
 * agree; the server remains the actual boundary, and an accountant who crafted the request by hand
 * would still be refused.
 *
 * Uses the normal authenticated client, not the admin console's session-scoped one: this page is
 * reached by logging in, not through the console's access-code gate, so authorisation comes from
 * the signed-in user's own role.
 *
 * Every action reports through `onResult(message, tone)` and re-fetches via `refresh()` — the row
 * a grant just changed must not keep showing its old state.
 */
export default function useFinanceActions({ refresh, onResult }) {
  const [busy, setBusy] = useState("");

  const run = useCallback(async (key, request, successMessage) => {
    if (busy) return;
    setBusy(key);
    try {
      await request();
      onResult?.(successMessage, "success");
      refresh?.();
    } catch (error) {
      onResult?.(error?.response?.data?.message || "That action could not be completed.", "error");
    } finally {
      setBusy("");
    }
  }, [busy, refresh, onResult]);

  return {
    busy,
    grantPremium: (user) => run(
      `premium-${user._id}`,
      () => api.post(`/admin/users/${user._id}/grant-premium`),
      `Premium granted to ${user.name || user.email}.`,
    ),
    removePremium: (user) => run(
      `remove-premium-${user._id}`,
      () => api.post(`/admin/users/${user._id}/remove-premium`),
      `Premium removed from ${user.name || user.email}.`,
    ),
    grantWriterPlan: (user, tier = "silver", cycle = "monthly") => run(
      `writer-plan-${user._id}`,
      () => api.post(`/admin/users/${user._id}/grant-writer-plan`, { tier, cycle }),
      `${tier} plan granted to ${user.name || user.email}.`,
    ),
    removeWriterPlan: (user) => run(
      `remove-writer-plan-${user._id}`,
      () => api.post(`/admin/users/${user._id}/remove-writer-plan`),
      `Writer plan removed from ${user.name || user.email}.`,
    ),
    approveBankReview: (review) => run(
      `bank-approve-${review._id}`,
      () => api.put(`/admin/bank-details/reviews/${review._id}/approve`),
      "Bank details approved.",
    ),
    rejectBankReview: (review, note = "") => run(
      `bank-reject-${review._id}`,
      () => api.put(`/admin/bank-details/reviews/${review._id}/reject`, { note }),
      "Bank details rejected.",
    ),
    unblockBankReview: (review) => run(
      `bank-unblock-${review._id}`,
      () => api.put(`/admin/bank-details/reviews/${review._id}/unblock`),
      "Bank updates unblocked.",
    ),
  };
}
