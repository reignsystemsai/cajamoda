import { readFile } from "node:fs/promises";

const checkout = await readFile(new URL("../checkout/index.html", import.meta.url), "utf8");
const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
const initializeStart = checkout.indexOf("async function initializeStripePaymentElement()");
const mountAt = checkout.indexOf('paymentElement.mount("#paymentElement")', initializeStart);
const initializeEnd = checkout.indexOf("async function finalizeStripePayment()", initializeStart);
const initializeStripe = initializeStart >= 0 && initializeEnd > initializeStart
  ? checkout.slice(initializeStart, initializeEnd)
  : "";
const confirmationTokenAt = checkout.indexOf("stripeClient.createConfirmationToken(", initializeEnd);
const paymentIntentAt = checkout.indexOf("/api/stripe/payment-intent", initializeEnd);
const finalizeStart = checkout.indexOf("async function finalizeStripePayment()");
const finalizeEnd = checkout.indexOf("async function submitStripePayment()", finalizeStart);
const finalizeStripe = finalizeStart >= 0 && finalizeEnd > finalizeStart
  ? checkout.slice(finalizeStart, finalizeEnd)
  : "";
const paymentHandlerStart = server.indexOf("async function handleCreateStripePaymentIntent(");
const paymentHandlerEnd = server.indexOf("async function findStripeIntentWixOrder(", paymentHandlerStart);
const paymentHandler = paymentHandlerStart >= 0 && paymentHandlerEnd > paymentHandlerStart
  ? server.slice(paymentHandlerStart, paymentHandlerEnd)
  : "";

const checks = [
  ["Stripe.js is loaded", checkout.includes('src="https://js.stripe.com/dahlia/stripe.js"')],
  ["Stripe initializes in deferred payment mode", initializeStripe.includes("stripeClient.elements({")],
  ["Card Payment Element is created", initializeStripe.includes('checkoutElements.create("payment"')],
  ["Stripe Link save-data option is disabled", initializeStripe.includes('wallets: { link: "never" }')],
  ["Card Payment Element mounts", mountAt > initializeStart && mountAt < initializeEnd],
  ["Mount does not wait for a backend request", !initializeStripe.includes("/api/stripe/")],
  ["Mount does not require a Checkout Session", !initializeStripe.includes("initCheckoutElementsSdk") && !initializeStripe.includes("clientSecret")],
  ["Payment is created only after card confirmation", confirmationTokenAt > initializeEnd && paymentIntentAt > confirmationTokenAt],
  ["Final card submit requires the signed checkout token", finalizeStripe.includes("deliveryQuoteToken")],
  ["Final card submit does not revalidate customer or delivery", !finalizeStripe.includes("validatePaymentDetails()") && !finalizeStripe.includes("deliveryQuoteMatchesCart()")],
  ["Final card submit never requotes delivery", !finalizeStripe.includes("refreshDeliveryQuote(")],
  ["Signed delivery token carries verified checkout lines", server.includes("lines: lockedLines") && server.includes("function verifiedCheckoutQuotePayload")],
  ["PaymentIntent uses the signed checkout snapshot", paymentHandler.includes("verifiedCheckoutQuotePayload(body)")],
  ["PaymentIntent does not contact Wix or recalculate delivery", !paymentHandler.includes("verifiedCheckoutCatalogItems") && !paymentHandler.includes("calculateDeliveryQuote(")],
  ["Libéralo never falls back to Rápido", server.includes('if (mode === "ship") return "Libéralo";') && server.includes('if (mode === "fast") return "Rápido Nacional";')],
  ["Authorized Stripe orders stay pending in Wix", server.includes('paymentStatus: intent.status === "requires_capture" ? "PENDING_MERCHANT" : "PAID"')],
  ["Captured Stripe orders are marked paid in Wix", server.includes("paymentCollectionMarkOrderAsPaid")],
  ["Stripe order emails are itemized and idempotent", server.includes("stripeOrderEmailHtml") && server.includes('idempotencyKey: `stripe-order-${intent.id}-${state}`')]
];

const failed = checks.filter(([, passed]) => !passed);
checks.forEach(([name, passed]) => console.log(`${passed ? "✓" : "✗"} ${name}`));
if (failed.length) {
  console.error("\nCritical checkout invariant failed: Stripe must mount before any payment backend request.");
  process.exitCode = 1;
}
