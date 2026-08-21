// Which merchant account a checkout bills.
//
// The key id is public, so this is not about secrecy — it is about the fallback chain that used to
// end in a hardcoded `rzp_live_…` literal at three call sites. A build whose server holds TEST keys
// but whose order response omits the key fell through to the LIVE account: test cards declined, real
// cards charged, checkout looking entirely normal throughout.
import { describe, it, expect } from "vitest";
import { razorpayKeyFromOrder } from "./razorpayKey";

describe("the key comes from the order the server just created", () => {
  it("uses keyId", () => {
    expect(razorpayKeyFromOrder({ keyId: "rzp_test_FROMSERVER" })).toBe("rzp_test_FROMSERVER");
  });

  it("accepts the older `key` spelling, which some endpoints still return", () => {
    expect(razorpayKeyFromOrder({ key: "rzp_test_LEGACY" })).toBe("rzp_test_LEGACY");
  });

  it("prefers keyId when an endpoint sends both", () => {
    expect(razorpayKeyFromOrder({ keyId: "rzp_test_NEW", key: "rzp_test_OLD" })).toBe("rzp_test_NEW");
  });
});

describe("it refuses to guess", () => {
  it("throws rather than opening checkout against an unknown account", () => {
    // The whole point. Previously this returned a LIVE key and billed real cards.
    expect(() => razorpayKeyFromOrder({})).toThrow(/did not return a Razorpay key/i);
    expect(() => razorpayKeyFromOrder()).toThrow(/did not return a Razorpay key/i);
  });

  it("never falls back to a hardcoded account", () => {
    let thrown = null;
    try { razorpayKeyFromOrder({ amount: 45000, currency: "INR" }); } catch (e) { thrown = e; }
    expect(thrown).toBeTruthy();
    expect(String(thrown.message)).not.toMatch(/rzp_live/);
  });
});
