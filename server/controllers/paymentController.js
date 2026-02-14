import Stripe from "stripe";

// Initialize Stripe only if the secret key is provided
const stripe = process.env.STRIPE_SECRET 
  ? new Stripe(process.env.STRIPE_SECRET)
  : null;

export const createCheckout = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ message: "Payment service not configured. Please add STRIPE_SECRET to .env file." });
    }
    
    const { amount, scriptId } = req.body;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Script Unlock" },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/success?scriptId=${scriptId}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });
    res.json({ id: session.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
