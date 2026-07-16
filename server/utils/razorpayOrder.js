// Create a Razorpay order in the requested currency. If a USD order fails (e.g. the merchant account
// doesn't have International Payments / multi-currency enabled), transparently retry the order in INR
// and flag the fallback so the client can show a note. `inrAmount` = the equivalent INR minor amount
// (paise) used for that fallback. Shared by the plan and script checkout controllers.
export const createOrderWithUsdFallback = async (razorpay, { amount, currency, inrAmount, receipt, notes }) => {
  try {
    const order = await razorpay.orders.create({ amount, currency, receipt, ...(notes ? { notes } : {}) });
    return { order, fellBackToINR: false };
  } catch (err) {
    if (String(currency).toUpperCase() === "USD" && inrAmount) {
      const order = await razorpay.orders.create({ amount: inrAmount, currency: "INR", receipt, ...(notes ? { notes } : {}) });
      return { order, fellBackToINR: true };
    }
    throw err;
  }
};
