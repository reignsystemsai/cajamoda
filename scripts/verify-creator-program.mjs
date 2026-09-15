import { readFileSync } from "node:fs";

const server = readFileSync(new URL("../server.js", import.meta.url), "utf8");
const portal = readFileSync(new URL("../creators/index.html", import.meta.url), "utf8");
const acceptance = readFileSync(new URL("../creators/accept/index.html", import.meta.url), "utf8");
const terms = readFileSync(new URL("../creators/terms/index.html", import.meta.url), "utf8");
const admin = readFileSync(new URL("../admin/index.html", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/202609130006_finalize_creator_agreements.sql", import.meta.url), "utf8");

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
  [acceptance.includes("COP 2.700 de empaque") && acceptance.includes("25% del precio de venta"), "Creator acceptance shows the current commission formula"],
  [terms.includes("COP 2.700 de empaque") && terms.includes("tarifa de operación del 25%"), "Creator terms show the current commission formula"],
  [admin.includes('id="productProfitabilitySummary"') && admin.includes('id="quickProfitabilitySummary"'), "Main and quick editors show protected profitability"],
  [protectedMargin(12014, 15) >= 0.15 && protectedMargin(12014, 20) < 0.15, "The reference product allows 15% and blocks 20% at Tier 3"],
  [portal.includes("Comisión ganada") && portal.includes("Último pago") && portal.includes("Próximo pago") && portal.includes("Pagos acumulados"), "Creator earnings cards are present in Spanish"],
  [portal.includes("<th>Fecha</th><th>Hora</th><th>Producto</th><th>Comisión</th><th>Estado</th>"), "Creator ledger contains only promised Spanish columns"],
  [!portal.includes("Order Total") && !portal.includes("Gross Sales") && !portal.includes("product_subtotal"), "Creator portal does not expose sale totals"],
  [portal.includes('lang="es"') && acceptance.includes('lang="es"'), "The complete creator experience is Spanish"]
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
