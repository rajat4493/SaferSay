import Stripe from "stripe";

export async function createCycleCheckout(origin: string, cycleId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      mode: "mock" as const,
      checkoutUrl: `${origin}/app/workspace/billing?mock_paid_cycle=${cycleId}`,
    };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: process.env.STRIPE_CURRENCY ?? "gbp",
          unit_amount: Number(process.env.STRIPE_CYCLE_AMOUNT_MINOR ?? 20000),
          product_data: { name: "SaferSay survey cycle" },
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/app/workspace/billing?paid_cycle=${cycleId}`,
    cancel_url: `${origin}/app/workspace/billing`,
    metadata: { cycleId },
  });

  return { mode: "stripe" as const, checkoutUrl: session.url };
}
