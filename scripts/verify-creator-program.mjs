import { readFileSync } from "node:fs";

const server = readFileSync(new URL("../server.js", import.meta.url), "utf8");
const portal = readFileSync(new URL("../creators/dashboard.html", import.meta.url), "utf8");
const authPortal = readFileSync(new URL("../creators/index.html", import.meta.url), "utf8");
const acceptance = readFileSync(new URL("../creators/accept/index.html", import.meta.url), "utf8");
const terms = readFileSync(new URL("../creators/terms/index.html", import.meta.url), "utf8");
const admin = readFileSync(new URL("../admin/index.html", import.meta.url), "utf8");
const adminScript = readFileSync(new URL("../analytics/admin-core.js", import.meta.url), "utf8");
const authLayer = readFileSync(new URL("../creator-auth-bootstrap.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/202609130006_finalize_creator_agreements.sql", import.meta.url), "utf8");
const growthMigration = readFileSync(new URL("../supabase/migrations/202609160200_creator_growth_system.sql", import.meta.url), "utf8");
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
  [terms.includes(publicEarningsExplanation) && ["1. Nivel 1:", "2. Nivel 2:", "3. Nivel 3:", "COP 5.040"].every(value => terms.includes(value)) && ["1. Nivel 1:", "2. Nivel 2:", "3. Nivel 3:", "COP 5.040"].every(value => acceptance.includes(value)) && !terms.includes("tarifa de operación del 25%"), "Creator agreement and onboarding show numbered examples for all three levels"],
  [["ESTÁS INVITADA ✦", "ACUERDO FIRMADO ✦", "ACUERDO ACTUALIZADO ✦", "ACCESO SEGURO ✦"].every(value => server.includes(value)), "Creator transactional emails use purpose-specific banners"],
  [server.includes('CREATOR_AGREEMENT_DISPLAY_VERSION = "17 de septiembre de 2026"') && !server.includes('versión ${CREATOR_AGREEMENT_VERSION}'), "Creator emails show the friendly agreement date while internal checks retain the technical version"],
  [admin.includes('id="productProfitabilitySummary"') && admin.includes('id="quickProfitabilitySummary"'), "Main and quick editors show protected profitability"],
  [protectedMargin(12014, 15) >= 0.15 && protectedMargin(12014, 20) < 0.15, "The reference product allows 15% and blocks 20% at Tier 3"],
  [portal.includes("Ganancias obtenidas") && portal.includes("Fin de mes") && portal.includes("Pago del 15"), "Creator earnings and both payout cards are present in Spanish"],
  [["Fecha", "Producto", "Base de ganancias", "Nivel", "Ganancias", "Pago", "Estado"].every(value => portal.includes(`<th>${value}</th>`)), "Creator ledger contains the promised Spanish earnings-base columns"],
  [!portal.includes("Order Total") && !portal.includes("Gross Sales") && !portal.includes("product_subtotal"), "Creator portal does not expose sale totals"],
  [portal.includes("base elegible de cada producto") && server.includes("CREATOR_COMMISSION_EXPLANATION"), "Creator portal and transactional messages retain the private earnings-base explanation"],
  [server.includes("function creatorVisibleProducts(products)") && server.includes("products: creatorVisibleProducts(row.products)") && server.includes("commission_base: creatorCommissionBase(row.products)") && server.includes("tier: {") && !/sales: rows\.map[\s\S]{0,800}(?:unitCost|packagingCost|operationFee|product_subtotal|commission_rate:)/.test(server), "Creator API returns only the approved private-safe commission fields"],
  [server.includes("function creatorOwnerBreakdown(products, commissionAmount)") && admin.includes("Costo del producto") && admin.includes("Base de comisión") && adminScript.includes("sale.productCost") && adminScript.includes("sale.margin"), "Owner ledger retains the full private breakdown"],
  [server.includes("const itemSize = normalizeCreatorChoice") && server.includes("existingVariantSize(candidate)") && server.includes("existingVariantChoice(candidate"), "Network Manager resolves Wix variants by ID, SKU, or selected options"],
  [server.includes("verifiedCostsByProductId") && server.includes("verifiedHistoricalCosts.length === 1"), "Missing Wix variant cost falls back only to one consistent verified product cost"],
  [server.includes("product?.unitCost !== null") && server.includes("product?.unitCost !== undefined") && server.includes("costKnown ? Math.round(totals.productCost) : null"), "Missing product cost cannot be mistaken for COP 0"],
  [adminScript.includes('"Costo no disponible"') && adminScript.includes("sale.costKnown===false"), "Owner ledger identifies unresolved costs instead of displaying false zeroes"],
  [server.includes('url.pathname === "/api/creators/agreement"') && server.includes("agreementRequired: profile.agreement_version !== CREATOR_AGREEMENT_VERSION"), "Existing creators can accept the current agreement"],
  [portal.includes('lang="es"') && authPortal.includes('lang="es"') && acceptance.includes('lang="es"'), "The complete creator experience is Spanish"],
  [server.includes("function creatorValidCommissionBase(rows)") && server.includes("creatorCommissionBase(row?.products)") && server.includes("eligibleCommissionBaseTotal") && !server.includes("lifetimeProductSales"), "Tier gates use only cumulative private-safe commission base"],
  [portal.includes('id="photoInput"') && server.includes('/api/creators/profile-photo') && server.includes("creatorProfilePhotoUrl") && adminScript.includes("creator.profilePhotoUrl"), "Creator profile photo upload appears in creator and owner views"],
  [portal.includes("TU PRÓXIMA META") && portal.includes('id="progressFill"') && portal.includes("CREADORA DESTACADA") && portal.includes("CajaModa Unboxing Experience"), "Creator shows dynamic milestone progress and unlock states"],
  [server.includes("creatorUpcomingPayoutBuckets") && portal.includes("VENTAS ANTERIORES") && portal.includes('<details class="period" open>'), "Current pay-period sales and collapsed prior-period archive are wired"],
  [portal.includes("Centro de Contenido") && portal.includes("Recompensas") && portal.includes("Mis ventas") && portal.includes("Mi perfil"), "Creator dashboard includes the complete Spanish growth navigation"],
  [growthMigration.includes("creator_marketing_assets") && growthMigration.includes("creator_reward_state") && growthMigration.includes("enable row level security") && growthMigration.includes("grant select, insert, update, delete") && !growthMigration.includes("grant select, insert, update, delete on table public.creator_marketing_assets to anon"), "Creator growth persistence is backend-only with RLS"],
  [server.includes("creatorEligibleMarketingAssets") && server.includes("minimum_tier") && server.includes("asset.start_at") && server.includes("asset.end_at") && server.includes("cityMatch"), "Marketing assets are filtered by level, city, dates, and active status"],
  [admin.includes("Marketing Hub") && adminScript.includes("Create Asset") === false && adminScript.includes("renderMarketingAssets") && adminScript.includes("data-toggle-asset"), "Network Manager includes Marketing Hub controls"],
  [server.includes('function isKarolNetworkManager(request)') && server.includes('function storeOwnerPermissions(role)') && server.includes('permissions: storeOwnerPermissions(role)') && server.includes('permissions: storeOwnerPermissions(session.role)') && server.includes('? ["marketing", "network"] : []') && admin.includes('data-network-manager') && admin.includes('permissions?.includes("network")'), "Karolay owner access includes Network Management and Red de Creadoras across login and reload"],
  [server.includes("cityCampaignEligible") && server.includes("leadershipEventEligible") && portal.includes("Elegible para consideración"), "Campaign and event benefits are presented as consideration, not guarantees"],
  [authPortal.includes("/api/creators/login") && authPortal.includes("PASSWORD_SETUP_REQUIRED") && authLayer.includes("/api/creators/password-reset/request") && authLayer.includes("/api/creators/email-recovery"), "Creator password login and recovery are wired"],
  [authLayer.includes("SESSION_TTL_MS = 90") && authLayer.includes("reconcileCreatorPurchase") && authLayer.includes("/lifecycle"), "90-day sessions, automatic commission reconciliation, and creator lifecycle controls are wired"]
];

let failed = false;
for (const [ok, label] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
