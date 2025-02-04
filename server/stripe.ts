import Stripe from "stripe";
import { SelectProduct } from "@db/schema";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function createCheckoutSession(
  productId: number,
  product: SelectProduct,
  userId: number,
  successUrl: string,
  cancelUrl: string,
) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price: product.stripePriceId,
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId.toString(),
    metadata: {
      productId: productId.toString(),
      userId: userId.toString(),
    },
  });

  return session;
}

export async function handleWebhook(
  body: string,
  signature: string,
  webhookSecret: string,
) {
  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    return event;
  } catch (err) {
    throw new Error(`Webhook Error: ${(err as Error).message}`);
  }
}
