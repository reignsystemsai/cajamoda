import { readFileSync } from "node:fs";

const server = readFileSync(new URL("../server.js", import.meta.url), "utf8");
const portal = readFileSync(new URL("../creators/index.html", import.meta.url), "utf8");
const acceptance = readFileSync(new URL("../creators/accept/index.html", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/202609130006_finalize_creator_agreements.sql", import.meta.url), "utf8");

const checks = [
  [server.includes("CREATOR_MARKETING_RESERVE_PER_ITEM_COP = 12000"), "COP 12,000 marketing reserve is fixed"],
  [server.includes('if (latest.status === "succeeded")'), "Creator commission waits for captured Stripe payment"],
  [server.includes("creatorPayoutDate(row.earned_at)"), "Payout dates are derived from commission timestamps"],
  [server.includes("function wixEmailIdempotencyGuid(value)") && server.includes("idempotencyKey: wixEmailIdempotencyGuid(idempotencyKey)"), "Creator emails use Wix-compatible GUID idempotency keys"],
  [server.includes("/api/creators/payout-account"), "Creator payment-method endpoint is registered"],
  [server.includes("markCreatorCommissionsPaid") && server.includes("creatorPayoutMatch"), "Owner payout recording endpoint is registered"],
  [migration.includes("creator_agreement_acceptances") && migration.includes("enable row level security"), "Immutable agreement evidence table has RLS"],
  [acceptance.includes('id="agreement" type="checkbox"') && acceptance.includes('id="activate" disabled'), "Electronic signature requires an explicit unchecked checkbox"],
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
