/**
 * The publishable Razorpay key for a checkout, taken from the order the server just created.
 *
 * The key id is public by design — it identifies the merchant account in the browser and is not a
 * secret. What matters is WHICH account it names, and the three call sites this replaces each ended
 * their fallback chain with a hardcoded `rzp_live_…` literal:
 *
 *   key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_…"
 *
 * That last link is the dangerous one. A build whose server is configured with TEST keys but whose
 * order response omits the key — a new endpoint that forgets it, a staging server, a partial deploy
 * — silently falls through to the LIVE account. Test cards are declined, real cards are charged, and
 * the checkout looks completely normal while it happens. The literal also pins the account at build
 * time, so rotating the key means rebuilding the front end.
 *
 * The order response is the right source: the same request that fixed the amount fixes the account,
 * so the two can never disagree. If it is absent, that is a server misconfiguration and the checkout
 * must refuse to open rather than guess which merchant to bill.
 *
 * @param {object} order the create-order response body
 * @returns {string} the key id
 * @throws {Error} when the server did not send one
 */
export const razorpayKeyFromOrder = (order = {}) => {
  const key = order.keyId || order.key || import.meta.env.VITE_RAZORPAY_KEY_ID || "";
  if (!key) {
    throw new Error(
      "Payment is not configured: the server did not return a Razorpay key. Refusing to open checkout rather than default to another account."
    );
  }
  return key;
};

export default razorpayKeyFromOrder;
