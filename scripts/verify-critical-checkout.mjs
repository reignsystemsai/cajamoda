import { readFile } from "node:fs/promises";

const checkout = await readFile(new URL("../checkout/index.html", import.meta.url), "utf8");
const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
const initializeStart = checkout.indexOf("async function initializeStripePaymentElement()");
const mountAt = checkout.indexOf('paymentElement.mount("#paymentElement")', initializeStart);
const initializeEnd = checkout.indexOf("async function submitStripePayment()", initializeStart);
const initializeStripe = initializeStart >= 0 && initializeEnd > initializeStart
  ? checkout.slice(initializeStart, initializeEnd)
  : "";
const submitEnd = checkout.indexOf("async function submitNequiPayment()", initializeEnd);
const submitStripe = initializeEnd >= 0 && submitEnd > initializeEnd
  ? checkout.slice(initializeEnd, submitEnd)
  : "";

const checks = [
  ["Stripe.js is loaded", checkout.includes('src="https://js.stripe.com/dahlia/stripe.js"')],
  ["Stripe Checkout Session is prepared", initializeStripe.includes("/api/stripe/checkout")],
  ["Stripe Checkout Elements SDK is initialized", initializeStripe.includes("initCheckoutElementsSdk")],
  ["Card Payment Element is created", initializeStripe.includes("createPaymentElement")],
  ["Stripe Link save-data option is disabled", server.includes('link: { display: "never" }')],
  ["Card Payment Element mounts", mountAt > initializeStart && mountAt < initializeEnd],
  ["Confirmed delivery is synchronized into Stripe", checkout.includes("/api/stripe/checkout/update")],
  ["Final payment uses Checkout Session confirmation", submitStripe.includes("checkoutActions.confirm()")],
  ["Direct PaymentIntent submission is not used", !checkout.includes("/api/stripe/payment-intent")],
  ["Libéralo never falls back to Rápido", server.includes('if (mode === "ship") return "Libéralo";') && server.includes('if (mode === "fast") return "Rápido Nacional";')],
  ["Authorized Stripe orders stay pending in Wix", server.includes('paymentStatus: intent.status === "requires_capture" ? "PENDING_MERCHANT" : "PAID"')],
  ["Captured Stripe orders are marked paid in Wix", server.includes("paymentCollectionMarkOrderAsPaid")],
  ["Stripe order emails are itemized and idempotent", server.includes("stripeOrderEmailHtml") && server.includes('idempotencyKey: `stripe-order-${intent.id}-${state}`')]
];

const failed = checks.filter(([, passed]) => !passed);
checks.forEach(([name, passed]) => console.log(`${passed ? "✓" : "✗"} ${name}`));
if (failed.length) {
  console.error("\nCritical checkout invariant failed: the working Stripe Checkout Session flow must remain intact.");
  process.exitCode = 1;
}
