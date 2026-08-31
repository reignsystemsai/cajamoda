import { readFile } from "node:fs/promises";

const product = await readFile(new URL("../product/index.html", import.meta.url), "utf8");
const checkout = await readFile(new URL("../checkout/index.html", import.meta.url), "utf8");
const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
const admin = await readFile(new URL("../admin/index.html", import.meta.url), "utf8");

const checks = [
  ["Product Profile is locked", product.includes("Crea o administra tu perfil desde Inicio.")],
  ["Size selection does not add automatically", !/function selectSize[\s\S]*?syncSelectionToBag\(\)[\s\S]*?qsa\(\s*"\[data-size\]"/.test(product)],
  ["Product rating floats", product.includes('class="productRatingSummary"')],
  ["Review panel contains review-only UI", product.includes('aria-label="Reseñas del producto"')],
  ["Review panel has close control", product.includes('id="reviewClose"')],
  ["Review list expands from Leer reseñas", product.includes('id="productReviewList" class="reviewList" hidden') && product.includes('list.hidden=!opening')],
  ["Review panel matches details glass", product.includes('productReviews{position:relative') && product.includes('linear-gradient(145deg,rgba(255,255,255,.70),rgba(255,255,255,.40))')],
  ["Reviews are read-only and loaded from backend", product.includes('fetch(`/api/reviews?productId=') && !product.includes('id="reviewForm"') && server.includes('url.pathname === "/api/reviews"')],
  ["Only approved verified Wix reviews are returned", server.includes("review.verified &&") && server.includes('review?.content?.rating') && server.includes('review?.moderation?.moderationStatus') && !server.includes('request.method === "POST" && url.pathname === "/api/reviews"')],
  ["Bolsa includes wishlist and XS–XL sizing", checkout.includes("data-cart-favorite") && checkout.includes("cartSizeChoices")],
  ["Color is derived from Wix variants", checkout.includes("function visibleColor") && product.includes("function productColorValues")],
  ["Bag lines are canonicalized", checkout.includes("const canonicalItems=[]")],
  ["COP card totals use Stripe minor units", checkout.includes("function copMinorUnits(amount)") && checkout.includes("copMinorUnits(readCart().total)") && checkout.includes("copMinorUnits(checkoutTotal())") && server.includes("unit_amount: unitAmount * 100") && server.includes("unit_amount: Math.round(Number(delivery.fee) * 100)")],
  ["Stripe readiness is recoverable and explicit", checkout.includes('Correo electrónico *</span>') && checkout.includes('required aria-required="true"') && checkout.includes('showToast("Ingresa tu correo electrónico.")') && checkout.includes("if (!stripeSessionUpdating && !stripeSessionSynchronized) syncPaymentInBackground();") && checkout.includes('$("deliveryCity")?.addEventListener("blur", () => {\n    syncCityDaneCode();')],
  ["Stripe button runs sequential preflight instead of hidden gating", checkout.includes("function assertStripePaymentReady()") && checkout.includes("assertStripePaymentReady();") && checkout.includes("!stripeInitializing &&") && !/function updateStripePayAvailability\(\)[\s\S]{0,500}stripeCanConfirm/.test(checkout)],
  ["Checkout failures are highlighted with a diagnostic code", checkout.includes('id="paymentFailure"') && checkout.includes("paymentValidationError") && checkout.includes("function presentPaymentFailure") && checkout.includes("Código de diagnóstico")],
  ["Checkout telemetry is sanitized and admin-readable", server.includes("function redactCheckoutTelemetryMessage") && server.includes('url.pathname === "/api/checkout/errors"') && server.includes("handleGetCheckoutErrors") && admin.includes('data-tab="errors"') && admin.includes("function renderCheckoutErrors")],
  ["Wix review credentials remain server-side", !product.includes("WIX_API_KEY") && server.includes("WIX_API_KEY")]
];

const failed = checks.filter(([,passed]) => !passed);
checks.forEach(([name,passed]) => console.log(`${passed ? "✓" : "✗"} ${name}`));
if(failed.length){
  process.exitCode=1;
}
