import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { normalizeBillingTerms, type RetentionPlan } from "@/lib/billingCatalog";
import { getStripe, getCreditPackCredits, type CreditPackId } from "@/lib/paymentService";
import { requireDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ ok: false, error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ ok: false, error: "Missing Stripe signature." }, { status: 400 });

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid Stripe signature." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      // Delayed methods can complete Checkout before funds settle. Their
      // credits are granted only by async_payment_succeeded below.
      if (session.payment_status === "paid") await handleCheckoutCompleted(session);
    }
    if (event.type === "checkout.session.async_payment_succeeded") {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    }
    if (event.type === "customer.subscription.deleted") {
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
    }
    return NextResponse.json({ ok: true });
  } catch {
    // Do not log customer/session payloads here; Stripe can retry the event.
    console.error("Stripe webhook handling failed.");
    return NextResponse.json({ ok: false, error: "Webhook handling failed." }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const tenantId = session.metadata?.tenantId ?? session.client_reference_id;
  if (!tenantId) return;

  const repo = new IdentityRepository(requireDatabasePool());
  const settings = await repo.getTenantSelfSettings(tenantId);
  const currentTerms = normalizeBillingTerms(settings.billingTerms);

  if (session.metadata?.purchaseType === "survey_credits") {
    const packId = session.metadata.creditPackId as CreditPackId | undefined;
    // Older checkout sessions used the legacy `single` pack id. Prefer the
    // current catalogue but retain the signed session's explicit count so a
    // historical paid checkout can never silently grant zero credits.
    const credits = getCreditPackCredits(packId as CreditPackId) || Number(session.metadata.credits ?? 0);
    if (!Number.isSafeInteger(credits) || credits < 1) {
      throw new Error("Paid checkout did not contain a valid survey-credit pack.");
    }
    const granted = await repo.grantSurveyCredits(tenantId, credits, `stripe:${session.id}`);
    const available = await repo.listAvailableSurveyCredits(tenantId);
    await repo.updateTenantPlan(tenantId, settings.planTier, { ...settings.features, aiInsights: true }, {
      ...currentTerms,
      surveyCredits: available.length,
      aiInsightsIncluded: true,
      contractNote: `Stripe checkout completed. Added ${granted} survey credit${granted === 1 ? "" : "s"}; unused credits expire after 24 months.`,
    });
    await repo.addSupportNote(tenantId, "stripe-webhook@safersay", `Payment received: added ${granted} survey credit${granted === 1 ? "" : "s"} and enabled AI insights.`);
  }

  if (session.metadata?.purchaseType === "report_retention") {
    const retentionPlan = session.metadata.retentionPlan as RetentionPlan | undefined;
    if (retentionPlan && retentionPlan !== "none") {
      await repo.updateTenantPlan(tenantId, settings.planTier, settings.features, {
        ...currentTerms,
        retentionPlan,
        contractNote: `Stripe subscription active. Retention plan: ${retentionPlan}.`,
      });
      await repo.addSupportNote(tenantId, "stripe-webhook@safersay", `Retention subscription activated: ${retentionPlan}.`);
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) return;

  const repo = new IdentityRepository(requireDatabasePool());
  const settings = await repo.getTenantSelfSettings(tenantId);
  const currentTerms = normalizeBillingTerms(settings.billingTerms);
  await repo.updateTenantPlan(tenantId, settings.planTier, settings.features, {
    ...currentTerms,
    retentionPlan: "none",
    contractNote: "Stripe retention subscription cancelled. Reports should be exported or released unless a new contract is agreed.",
  });
  await repo.addSupportNote(tenantId, "stripe-webhook@safersay", "Retention subscription cancelled.");
}
