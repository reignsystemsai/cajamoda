import { readFile } from "node:fs/promises";

const checkout = await readFile(new URL("../checkout/index.html", import.meta.url), "utf8");
const initializeStart = checkout.indexOf("async function initializeStripePaymentElement()");
const mountAt = checkout.indexOf('paymentElement.mount("#paymentElement")', initializeStart);
const initializeEnd = checkout.indexOf("async function finalizeStripePayment()", initializeStart);
const initializeStripe = initializeStart >= 0 && initializeEnd > initializeStart
  ? checkout.slice(initializeStart, initializeEnd)
  : "";
const confirmationTokenAt = checkout.indexOf("stripeClient.createConfirmationToken(", initializeEnd);
const paymentIntentAt = checkout.indexOf("/api/stripe/payment-intent", initializeEnd);

const checks = [
  ["Stripe.js is loaded", checkout.includes('src="https://js.stripe.com/dahlia/stripe.js"')],
  ["Stripe initializes in deferred payment mode", initializeStripe.includes("stripeClient.elements({")],
  ["Card Payment Element is created", initializeStripe.includes('checkoutElements.create("payment"')],
  ["Stripe Link save-data option is disabled", initializeStripe.includes('wallets: { link: "never" }')],
  ["Card Payment Element mounts", mountAt > initializeStart && mountAt < initializeEnd],
  ["Mount does not wait for a backend request", !initializeStripe.includes("/api/stripe/")],
  ["Mount does not require a Checkout Session", !initializeStripe.includes("initCheckoutElementsSdk") && !initializeStripe.includes("clientSecret")],
  ["Payment is created only after card confirmation", confirmationTokenAt > initializeEnd && paymentIntentAt > confirmationTokenAt]
];

const failed = checks.filter(([, passed]) => !passed);
checks.forEach(([name, passed]) => console.log(`${passed ? "✓" : "✗"} ${name}`));
if (failed.length) {
  console.error("\nCritical checkout invariant failed: Stripe must mount before any payment backend request.");
  process.exitCode = 1;
}
