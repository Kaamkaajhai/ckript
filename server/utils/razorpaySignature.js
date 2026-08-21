import crypto from "crypto";

/**
 * Verify a Razorpay payment signature.
 *
 * Razorpay signs `order_id|payment_id` with the key secret. Checking it is what proves the callback
 * came from Razorpay and not from someone POSTing plausible ids at the verify endpoint.
 *
 * This exists because the same eight lines were written out six times — twice in paymentController,
 * three times in scriptController, once in competitionController — and had already drifted apart in
 * their error messages. Six copies of a security check is six chances for one to be edited wrongly,
 * and nothing would fail loudly if it were.
 *
 * All six compared with `!==`, which returns as soon as two bytes differ. That leaks, through timing,
 * how much of a guessed signature was correct, which is the standard way to walk an HMAC one byte at
 * a time. `timingSafeEqual` always reads both buffers to the end.
 *
 * The secret is read at CALL time, never at module load: dotenv.config() runs inside server.js's
 * body, after every import has been evaluated, so a module-level read captures undefined and every
 * verification silently fails. That trap is documented in companyContacts.js and has bitten this
 * codebase before.
 *
 * @returns {boolean} true only if the signature is genuine.
 */
export const verifyRazorpaySignature = ({ orderId, paymentId, signature } = {}) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.error("[razorpay] RAZORPAY_KEY_SECRET is not set — cannot verify any payment");
    return false;
  }
  if (!orderId || !paymentId || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(String(signature), "utf8");

  // timingSafeEqual throws on a length mismatch, so the lengths must be compared first. That
  // comparison leaks only the LENGTH, which is a fixed 64 hex characters for SHA-256 and therefore
  // tells an attacker nothing they did not already know.
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
};

export default verifyRazorpaySignature;
