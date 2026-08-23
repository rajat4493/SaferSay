import Stripe from "stripe";
import { retentionPlans, surveyCreditPacks, type CreditPackId, type RetentionPlan } from "@/lib/billingCatalog";

export type { CreditPackId } from "@/lib/billingCatalog";

export function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
  return new Stripe(apiKey);
}

export function getCreditPackPriceId(packId: CreditPackId) {
  const map: Record<CreditPackId, string | undefined> = {
    one: process.env.STRIPE_PRICE_CREDIT_1,
    three: process.env.STRIPE_PRICE_CREDIT_3,
    six: process.env.STRIPE_PRICE_CREDIT_6,
  };
  return map[packId];
}

export function getRetentionPriceId(planId: Exclude<RetentionPlan, "none">) {
  const map: Record<Exclude<RetentionPlan, "none">, string | undefined> = {
    monthly: process.env.STRIPE_PRICE_RETENTION_MONTHLY ?? process.env.STRIPE_PRICE_RETENTION_REPORT,
  };
  return map[planId];
}

export function getCreditPackCredits(packId: CreditPackId) {
  return surveyCreditPacks.find((pack) => pack.id === packId)?.credits ?? 0;
}

export async function createCreditCheckout(params: {
  origin: string;
  tenantId: string;
  tenantName: string;
  packId: CreditPackId;
}) {
  const priceId = getCreditPackPriceId(params.packId);
  if (!priceId) throw new Error("Stripe credit price is not configured.");

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${params.origin}/app/workspace/billing?checkout=success`,
    cancel_url: `${params.origin}/app/workspace/billing?checkout=cancelled`,
    client_reference_id: params.tenantId,
    metadata: {
      tenantId: params.tenantId,
      tenantName: params.tenantName,
      purchaseType: "survey_credits",
      creditPackId: params.packId,
      credits: String(getCreditPackCredits(params.packId)),
    },
  });

  return { checkoutUrl: session.url };
}

export async function createRetentionCheckout(params: {
  origin: string;
  tenantId: string;
  tenantName: string;
  planId: Exclude<RetentionPlan, "none">;
}) {
  const priceId = getRetentionPriceId(params.planId);
  if (!priceId) throw new Error("Stripe retention price is not configured.");

  const plan = retentionPlans.find((item) => item.id === params.planId);
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${params.origin}/app/workspace/billing?checkout=success`,
    cancel_url: `${params.origin}/app/workspace/billing?checkout=cancelled`,
    client_reference_id: params.tenantId,
    metadata: {
      tenantId: params.tenantId,
      tenantName: params.tenantName,
      purchaseType: "report_retention",
      retentionPlan: params.planId,
    },
    subscription_data: {
      metadata: {
        tenantId: params.tenantId,
        retentionPlan: params.planId,
      },
      description: plan?.name,
    },
  });

  return { checkoutUrl: session.url };
}
