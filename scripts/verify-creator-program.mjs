import { readFileSync } from "node:fs";

const server = readFileSync(new URL("../server.js", import.meta.url), "utf8");
const portal = readFileSync(new URL("../creators/index.html", import.meta.url), "utf8");
const acceptance = readFileSync(new URL("../creators/accept/index.html", import.meta.url), "utf8");
const terms = readFileSync(new URL("../creators/terms/index.html", import.meta.url), "utf8");
const admin = readFileSync(new URL("../admin/index.html", import.meta.url), "utf8");
const adminScript = readFileSync(new URL("../analytics/admin.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/202609130006_finalize_creator_agreements.sql", import.meta.url), "utf8");
const publicEarningsExplanation = "CajaModa asigna a cada producto una base de ganancias después de considerar sus costos internos. Tus ganancias corresponden al porcentaje de tu nivel aplicado a esa base. Los costos y cálculos internos de CajaModa son confidenciales.";

function protectedMargin(cost, discountPercent) {
  const originalPrice = Math.round(cost * 2.816);
  const salePrice = Math.round(originalPrice * (1 - discountPercent / 100));
  const operationFee = Math.round(salePrice * 0.25);
  const commissionable = Math.max(0, salePrice - cost - 2700 - operationFee);
  const creatorCommission = Math.round(commissionable * 0.30);
  return (commissionable - creatorCommission) / salePrice;
}

const checks = [
  [server.includes("PRODUCT_PRICE_MULTIPLIER = 2.816"), "Existing 2.816 product multiplier is preserved"],
  [server.includes("PRODUCT_PACKAGING_COST_COP = 2700"), "COP 2,700 packaging cost is fixed"],
  [server.includes("PRODUCT_OPERATION_FEE_RATE = 0.25"), "Creator calculation uses the 25% operation fee"],
  [server.includes("PRODUCT_MIN_CAJAMODA_MARGIN_RATE = 0.15") && server.includes("assertProtectedProductMargin"), "Server protects CajaModa's 15% minimum margin"],
  [server.includes('formulaVersion: CREATOR_COMMISSION_FORMULA_VERSION') && server.includes("hasStoredLegacySnapshot"), "New commissions are snapshotted without rewriting historical commissions"],
  [server.includes('if (latest.status === "succeeded")'), "Creator commission waits for captured Stripe payment"],
  [server.includes("creatorPayoutDate(row.earned_at)"), "Payout dates are derived from commission timestamps"],
  [server.includes("function wixEmailIdempotencyGuid(value)") && server.includes("idempotencyKey: wixEmailIdempotencyGuid(idempotencyKey)"), "Creator emails use Wix-compatible GUID idempotency keys"],
  [server.includes("/api/creators/payout-account"), "Creator payment-method endpoint is registered"],
  [server.includes("markCreatorCommissionsPaid") && server.includes("creatorPayoutMatch"), "Owner payout recording endpoint is registered"],
  [migration.includes("creator_agreement_acceptances") && migration.includes("enable row level security"), "Immutable agreement evidence table has RLS"],
  [acceptance.includes('id="agreement" type="checkbox"') && acceptance.includes('id="activate" disabled'), "Electronic signature requires an explicit unchecked checkbox"],
  [acceptance.includes(publicEarningsExplanation) && !acceptance.includes("costo de adquisición") && !acceptance.includes("COP 2.700"), "Creator acceptance uses the approved private-base explanation"],
  [terms.includes(publicEarningsExplanation) && terms.includes("COP 5.585") && terms.includes("COP 16.800") && !terms.includes("tarifa de operación del 25%"), "Creator terms use the approved private-base explanation and examples"],
  [admin.includes('id="productProfitabilitySummary"') && admin.includes('id="quickProfitabilitySummary"'), "Main and quick editors show protected profitability"],
  [protectedMargin(12014, 15) >= 0.15 && protectedMargin(12014, 20) < 0.15, "The reference product allows 15% and blocks 20% at Tier 3"],
  [portal.includes("Ganancias obtenidas") && portal.includes("Fin de mes") && portal.includes("Pago del 15"), "Creator earnings and both payout cards are present in Spanish"],
  [portal.includes("<th>Fecha</th><th>Hora</th><th>Producto</th><th>Base de ganancias</th><th>Nivel</th><th>Ganancias</th><th>Fecha de pago</th><th>Estado</th>"), "Creator ledger contains the promised Spanish earnings-base columns"],
  [!portal.includes("Order Total") && !portal.includes("Gross Sales") && !portal.includes("product_subtotal"), "Creator portal does not expose sale totals"],
  [portal.includes(publicEarningsExplanation) && server.includes("CREATOR_COMMISSION_EXPLANATION"), "Creator portal and transactional messages use the approved explanation"],
  [server.includes("function creatorVisibleProducts(products)") && server.includes("products: creatorVisibleProducts(row.products)") && server.includes("commission_base: creatorCommissionBase(row.products)") && server.includes("tier: {") && !/sales: rows\.map[\s\S]{0,800}(?:unitCost|packagingCost|operationFee|product_subtotal|commission_rate:)/.test(server), "Creator API returns only the approved private-safe commission fields"],
  [server.includes("function creatorOwnerBreakdown(products, commissionAmount)") && admin.includes("Product Cost") && admin.includes("Commission Base") && adminScript.includes("sale.productCost") && adminScript.includes("sale.margin"), "Owner ledger retains the full private breakdown"],
  [server.includes('url.pathname === "/api/creators/agreement"') && server.includes("agreementRequired: profile.agreement_version !== CREATOR_AGREEMENT_VERSION"), "Existing creators can accept the current agreement"],
  [portal.includes('lang="es"') && acceptance.includes('lang="es"'), "The complete creator experience is Spanish"],
  [server.includes("function creatorValidCommissionBase(rows)") && server.includes("creatorCommissionBase(row?.products)") && server.includes("eligibleCommissionBaseTotal") && !server.includes("lifetimeProductSales"), "Tier gates use only cumulative private-safe commission base"],
  [portal.includes('id="photoInput"') && server.includes('/api/creators/profile-photo') && server.includes("creatorProfilePhotoUrl") && adminScript.includes("creator.profilePhotoUrl"), "Creator profile photo upload appears in creator and owner views"],
  [!portal.includes('id="tier"') && portal.includes("TU CAMINO DE GANANCIAS") && portal.includes("COP 0–299.999") && portal.includes("COP 300.000–999.999") && portal.includes("COP 1.000.000+") && portal.includes("isNudging"), "Creator shows one dynamic current-level bar with all three earnings requirements"],
  [server.includes("creatorUpcomingPayoutBuckets") && portal.includes("VENTAS ANTERIORES") && portal.includes('<details class="period" open>'), "Current pay-period sales and collapsed prior-period archive are wired"],
  [![portal, acceptance, terms].some(page => /comisi[oó]n/i.test(page)), "Creator pages use earnings language without commission wording"]
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
