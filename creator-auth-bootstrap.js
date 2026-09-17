import http from "node:http";
import crypto from "node:crypto";
import { createClient, ApiKeyStrategy } from "@wix/sdk";
import { productsV3 } from "@wix/stores";

const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SECRET_KEY = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const WIX_API_KEY = process.env.WIX_API_KEY;
const WIX_SITE_ID = process.env.WIX_SITE_ID;
const STOREFRONT_URL = String(process.env.STOREFRONT_URL || "https://www.cajamoda.com").replace(/\/$/, "");
const PORT = Number(process.env.PORT || 10000);
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const SETUP_TTL_MS = 48 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const PACKAGING_COST = 2700;
const OPERATION_FEE_RATE = 0.25;
const FORMULA_VERSION = "2026-09-15-operation-fee";
const nativeFetch = globalThis.fetch.bind(globalThis);
const originalCreateServer = http.createServer.bind(http);

const wix = WIX_API_KEY && WIX_SITE_ID
  ? createClient({ auth: ApiKeyStrategy({ apiKey: WIX_API_KEY, siteId: WIX_SITE_ID }), modules: { productsV3 } })
  : null;

function headers(extra = {}) {
  return { apikey: SUPABASE_SECRET_KEY, Authorization: `Bearer ${SUPABASE_SECRET_KEY}`, ...extra };
}
function hashToken(value) { return crypto.createHash("sha256").update(String(value || "")).digest("hex"); }
function randomToken() { return crypto.randomBytes(32).toString("hex"); }
function normalizeEmail(value) { return String(value || "").trim().toLowerCase(); }
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function passwordValid(value) { return typeof value === "string" && value.length >= 8 && value.length <= 200; }
function maskEmail(value) {
  const [name, domain] = String(value || "").split("@");
  if (!name || !domain) return "";
  return `${name.slice(0, 1)}${"*".repeat(Math.max(3, Math.min(8, name.length - 1)))}@${domain}`;
}
function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}
function passwordMatches(password, stored) {
  try {
    const [scheme, salt, expected] = String(stored || "").split("$");
    if (scheme !== "scrypt" || !salt || !expected) return false;
    const actual = crypto.scryptSync(password, salt, 64);
    const expectedBuffer = Buffer.from(expected, "hex");
    return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
  } catch { return false; }
}
function cors(req, res) {
  const origin = String(req.headers.origin || "");
  if (["https://cajamoda.com", "https://www.cajamoda.com", "https://admin.cajamoda.com", "http://localhost:5173", "http://127.0.0.1:5173"].includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
}
function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("Solicitud inválida."); }
}
async function profileByEmail(email, activeOnly = false) {
  const query = new URLSearchParams({ select: "*", email: `eq.${email}`, limit: "1" });
  if (activeOnly) query.set("status", "eq.active");
  const response = await nativeFetch(`${SUPABASE_URL}/rest/v1/creator_profiles?${query}`, { headers: headers() });
  const rows = response.ok ? await response.json().catch(() => []) : [];
  return Array.isArray(rows) ? rows[0] || null : null;
}
async function profileByRecoveryToken(token) {
  const query = new URLSearchParams({ select: "*", password_reset_token_hash: `eq.${hashToken(token)}`, limit: "1" });
  const response = await nativeFetch(`${SUPABASE_URL}/rest/v1/creator_profiles?${query}`, { headers: headers() });
  const rows = response.ok ? await response.json().catch(() => []) : [];
  const profile = Array.isArray(rows) ? rows[0] || null : null;
  if (!profile || profile.status !== "active") return null;
  if (!profile.password_reset_expires_at || new Date(profile.password_reset_expires_at).getTime() <= Date.now()) return null;
  return profile;
}
async function patchProfile(id, values) {
  const response = await nativeFetch(`${SUPABASE_URL}/rest/v1/creator_profiles?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH", headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }), body: JSON.stringify(values)
  });
  if (!response.ok) throw new Error("No pudimos actualizar la cuenta de creadora.");
}
async function createSession(creatorId) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const response = await nativeFetch(`${SUPABASE_URL}/rest/v1/creator_sessions`, {
    method: "POST", headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ creator_id: creatorId, token_hash: hashToken(token), expires_at: expiresAt })
  });
  if (!response.ok) throw new Error("No pudimos iniciar tu sesión.");
  return token;
}
async function profileForSession(req) {
  const authorization = String(req.headers.authorization || "");
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;
  const query = new URLSearchParams({ select: "creator_id,expires_at,revoked_at", token_hash: `eq.${hashToken(token)}`, limit: "1" });
  const response = await nativeFetch(`${SUPABASE_URL}/rest/v1/creator_sessions?${query}`, { headers: headers() });
  const rows = response.ok ? await response.json().catch(() => []) : [];
  const session = Array.isArray(rows) ? rows[0] || null : null;
  if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) return null;
  const profiles = await nativeFetch(`${SUPABASE_URL}/rest/v1/creator_profiles?id=eq.${encodeURIComponent(session.creator_id)}&status=eq.active&select=*&limit=1`, { headers: headers() });
  const profileRows = profiles.ok ? await profiles.json().catch(() => []) : [];
  return Array.isArray(profileRows) ? profileRows[0] || null : null;
}
async function revokeSessions(creatorId) {
  await nativeFetch(`${SUPABASE_URL}/rest/v1/creator_sessions?creator_id=eq.${encodeURIComponent(creatorId)}&revoked_at=is.null`, {
    method: "PATCH", headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }), body: JSON.stringify({ revoked_at: new Date().toISOString() })
  });
}
async function sendEmail(profile, subject, heading, message, buttonLabel, buttonUrl) {
  if (!WIX_API_KEY || !WIX_SITE_ID) throw new Error("Wix email is not configured.");
  const html = `<!doctype html><html><body style="margin:0;background:#fff7fb;font-family:Arial,sans-serif;color:#171217"><div style="max-width:620px;margin:0 auto;padding:36px 20px"><div style="text-align:center;font-family:Georgia,serif;font-size:28px;letter-spacing:4px">CAJAMODA</div><div style="margin-top:26px;padding:34px;border:1px solid #efdce5;border-radius:24px;background:#fff"><h1 style="font-family:Georgia,serif;font-weight:400">${heading}</h1><p style="line-height:1.7;color:#655d62">${message}</p><a href="${buttonUrl}" style="display:inline-block;margin-top:16px;padding:14px 24px;border-radius:999px;background:#171217;color:#fff;text-decoration:none;font-weight:700">${buttonLabel}</a><p style="margin-top:24px;font-size:12px;color:#8a7e84">Este enlace es personal y de un solo uso.</p></div></div></body></html>`;
  const response = await nativeFetch("https://www.wixapis.com/email-transmissions/v1/email-transmissions/send", {
    method: "POST", headers: { Authorization: WIX_API_KEY, "wix-site-id": WIX_SITE_ID, "Content-Type": "application/json" },
    body: JSON.stringify({ emailTransmission: { emailSubject: subject, emailHtmlContent: html, senderName: "CajaModa Colombia", toRecipients: [{ name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(), emailAddress: profile.email }], type: "TRANSACTIONAL" } })
  });
  if (!response.ok) throw new Error("No pudimos enviar el correo.");
}
async function issueRecovery(profile, mode) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + (mode === "setup" ? SETUP_TTL_MS : RESET_TTL_MS)).toISOString();
  await patchProfile(profile.id, { password_reset_token_hash: hashToken(token), password_reset_expires_at: expiresAt, updated_at: new Date().toISOString() });
  const parameter = mode === "setup" ? "setup" : "reset";
  await sendEmail(
    profile,
    mode === "setup" ? "Crea tu contraseña de CajaModa" : "Restablece tu contraseña de CajaModa",
    mode === "setup" ? "Crea tu contraseña" : "Cambia tu contraseña",
    mode === "setup" ? "Tu cuenta de creadora ya está activa. Usa este enlace una sola vez para crear tu contraseña." : "Recibimos una solicitud para cambiar la contraseña de tu cuenta de creadora.",
    mode === "setup" ? "CREAR CONTRASEÑA" : "CAMBIAR CONTRASEÑA",
    `${STOREFRONT_URL}/creators/?${parameter}=${encodeURIComponent(token)}`
  );
}
async function completeRecovery(token, password) {
  if (!passwordValid(password)) throw new Error("La contraseña debe tener al menos 8 caracteres.");
  const profile = await profileByRecoveryToken(token);
  if (!profile) throw new Error("El enlace venció o ya fue utilizado.");
  const timestamp = new Date().toISOString();
  await patchProfile(profile.id, {
    password_hash: passwordHash(password), password_set_at: profile.password_set_at || timestamp, password_changed_at: timestamp,
    password_reset_token_hash: null, password_reset_expires_at: null, updated_at: timestamp
  });
  await revokeSessions(profile.id);
  return { profile, sessionToken: await createSession(profile.id) };
}

async function verifyStoreOwner(req) {
  try {
    const response = await nativeFetch(`http://127.0.0.1:${PORT}/api/store-owner/creator-marketing-assets`, { headers: { Authorization: String(req.headers.authorization || "") } });
    return response.ok;
  } catch { return false; }
}

async function handleAuth(req, res, url) {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) return false;
  const path = url.pathname;
  const authPaths = new Set([
    "/api/creators/login", "/api/creators/password/setup/request", "/api/creators/password/setup/complete",
    "/api/creators/password-reset/request", "/api/creators/password-reset/complete", "/api/creators/password/initialize",
    "/api/creators/password/change", "/api/creators/email-recovery"
  ]);
  const lifecycleMatch = path.match(/^\/api\/store-owner\/creator-applications\/([0-9a-f-]+)\/lifecycle$/i);
  if (!authPaths.has(path) && !lifecycleMatch) return false;
  cors(req, res);
  if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return true; }
  if (req.method !== "POST" && !(lifecycleMatch && req.method === "PATCH")) { json(res, 405, { ok: false, error: "Método no permitido." }); return true; }
  try {
    const body = await readBody(req);
    if (path === "/api/creators/login") {
      const email = normalizeEmail(body.email), password = String(body.password || "");
      if (!validEmail(email) || !password) { json(res, 401, { ok: false, error: "Correo o contraseña incorrectos." }); return true; }
      const profile = await profileByEmail(email, true);
      if (!profile) { json(res, 401, { ok: false, error: "Correo o contraseña incorrectos." }); return true; }
      if (!profile.password_hash) { json(res, 409, { ok: false, code: "PASSWORD_SETUP_REQUIRED", error: "Necesitas crear tu contraseña para continuar." }); return true; }
      if (!passwordMatches(password, profile.password_hash)) { json(res, 401, { ok: false, error: "Correo o contraseña incorrectos." }); return true; }
      json(res, 200, { ok: true, sessionToken: await createSession(profile.id) }); return true;
    }
    if (path === "/api/creators/password/setup/request") {
      const email = normalizeEmail(body.email), profile = validEmail(email) ? await profileByEmail(email, true) : null;
      if (profile && !profile.password_hash) await issueRecovery(profile, "setup");
      json(res, 200, { ok: true, message: "Si tu cuenta necesita contraseña, recibirás un enlace de configuración." }); return true;
    }
    if (path === "/api/creators/password/setup/complete" || path === "/api/creators/password-reset/complete") {
      const result = await completeRecovery(String(body.token || ""), String(body.password || ""));
      json(res, 200, { ok: true, sessionToken: result.sessionToken }); return true;
    }
    if (path === "/api/creators/password-reset/request") {
      const email = normalizeEmail(body.email), profile = validEmail(email) ? await profileByEmail(email, true) : null;
      if (profile && profile.password_hash) await issueRecovery(profile, "reset");
      json(res, 200, { ok: true, message: "Si existe una cuenta activa con ese correo, recibirás un enlace para cambiar tu contraseña." }); return true;
    }
    if (path === "/api/creators/password/initialize") {
      const profile = await profileForSession(req);
      if (!profile) { json(res, 401, { ok: false, error: "Inicia sesión en tu cuenta de creadora." }); return true; }
      if (profile.password_hash) { json(res, 409, { ok: false, error: "Tu contraseña ya fue creada." }); return true; }
      if (!passwordValid(body.password)) { json(res, 400, { ok: false, error: "La contraseña debe tener al menos 8 caracteres." }); return true; }
      const timestamp = new Date().toISOString();
      await patchProfile(profile.id, { password_hash: passwordHash(body.password), password_set_at: timestamp, password_changed_at: timestamp, updated_at: timestamp });
      json(res, 200, { ok: true }); return true;
    }
    if (path === "/api/creators/password/change") {
      const profile = await profileForSession(req);
      if (!profile) { json(res, 401, { ok: false, error: "Inicia sesión en tu cuenta de creadora." }); return true; }
      if (!profile.password_hash || !passwordMatches(String(body.currentPassword || ""), profile.password_hash)) { json(res, 400, { ok: false, error: "La contraseña actual es incorrecta." }); return true; }
      if (!passwordValid(body.newPassword)) { json(res, 400, { ok: false, error: "La nueva contraseña debe tener al menos 8 caracteres." }); return true; }
      await patchProfile(profile.id, { password_hash: passwordHash(body.newPassword), password_changed_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      json(res, 200, { ok: true, message: "Contraseña actualizada." }); return true;
    }
    if (path === "/api/creators/email-recovery") {
      const digits = String(body.phone || "").replace(/\D/g, "");
      let masked = "";
      if (digits.length >= 7) {
        const response = await nativeFetch(`${SUPABASE_URL}/rest/v1/creator_applications?select=email,phone,status&status=eq.approved&limit=5000`, { headers: headers() });
        const rows = response.ok ? await response.json().catch(() => []) : [];
        const match = (Array.isArray(rows) ? rows : []).find(row => String(row.phone || "").replace(/\D/g, "") === digits);
        if (match) masked = maskEmail(match.email);
      }
      json(res, 200, { ok: true, maskedEmail: masked || null, message: masked ? `Tu correo registrado es ${masked}` : "No pudimos confirmar una cuenta con esos datos." }); return true;
    }
    if (lifecycleMatch) {
      if (!(await verifyStoreOwner(req))) { json(res, 403, { ok: false, error: "Creator management is reserved for CajaModa administration." }); return true; }
      const profileResponse = await nativeFetch(`${SUPABASE_URL}/rest/v1/creator_profiles?application_id=eq.${encodeURIComponent(lifecycleMatch[1])}&select=*&limit=1`, { headers: headers() });
      const rows = profileResponse.ok ? await profileResponse.json().catch(() => []) : [];
      const profile = Array.isArray(rows) ? rows[0] || null : null;
      if (!profile) { json(res, 404, { ok: false, error: "Creator account not found." }); return true; }
      const activate = String(body.status || "").toLowerCase() === "active";
      await patchProfile(profile.id, { status: activate ? "active" : "inactive", deactivated_at: activate ? null : new Date().toISOString(), activated_at: activate ? (profile.activated_at || new Date().toISOString()) : profile.activated_at, updated_at: new Date().toISOString() });
      if (!activate) await revokeSessions(profile.id);
      if (activate && !profile.password_hash) await issueRecovery({ ...profile, status: "active" }, "setup");
      json(res, 200, { ok: true, status: activate ? "active" : "inactive", passwordSetupRequired: activate && !profile.password_hash }); return true;
    }
  } catch (error) {
    json(res, 400, { ok: false, error: error?.message || "No pudimos completar la acción." }); return true;
  }
  return false;
}

async function calculateCommissionItems(items, rate) {
  const source = Array.isArray(items) ? items : [];
  const ids = [...new Set(source.map(item => String(item?.productId || "").trim()).filter(Boolean))];
  const products = new Map(await Promise.all(ids.map(async id => {
    const result = wix?.productsV3 ? await wix.productsV3.getProduct(id).catch(() => null) : null;
    return [id, result?.product || result || null];
  })));
  const historyResponse = await nativeFetch(`${SUPABASE_URL}/rest/v1/creator_commissions?status=in.(earned,batched,paid)&select=products&limit=5000`, { headers: headers() }).catch(() => null);
  const historyRows = historyResponse?.ok ? await historyResponse.json().catch(() => []) : [];
  const historical = new Map();
  for (const row of Array.isArray(historyRows) ? historyRows : []) for (const item of Array.isArray(row.products) ? row.products : []) {
    const id = String(item?.productId || "");
    if (id && Number.isFinite(Number(item?.unitCost)) && !historical.has(id)) historical.set(id, Number(item.unitCost));
  }
  let amount = 0;
  let base = 0;
  const calculated = source.map(item => {
    const productId = String(item?.productId || ""), variantId = String(item?.variantId || ""), sku = String(item?.sku || "").toUpperCase();
    const product = products.get(productId), variants = Array.isArray(product?.variantsInfo?.variants) ? product.variantsInfo.variants : [];
    const variant = variants.find(v => String(v?._id || v?.id || v?.variantId) === variantId) || variants.find(v => sku && String(v?.sku || "").toUpperCase() === sku);
    const costs = variants.map(v => v?.revenueDetails?.cost?.amount).filter(v => v !== undefined && v !== null && Number.isFinite(Number(v))).map(Number);
    const uniqueCosts = [...new Set(costs)];
    const rawCost = Number.isFinite(Number(item?.unitCost)) ? Number(item.unitCost) : (variant?.revenueDetails?.cost?.amount ?? (uniqueCosts.length === 1 ? uniqueCosts[0] : historical.get(productId)));
    const costKnown = rawCost !== undefined && rawCost !== null && Number.isFinite(Number(rawCost));
    const quantity = Math.max(1, Math.floor(Number(item?.quantity || 1)));
    const unitSalePrice = Math.max(0, Number(item?.unitSalePrice ?? item?.amount ?? 0));
    const operationFeePerItem = Math.round(unitSalePrice * OPERATION_FEE_RATE);
    const commissionableProfit = costKnown ? Math.max(0, unitSalePrice - Number(rawCost) - PACKAGING_COST - operationFeePerItem) * quantity : 0;
    base += commissionableProfit;
    amount += Math.round(commissionableProfit * rate / 100);
    return { ...item, quantity, unitSalePrice, unitCost: costKnown ? Number(rawCost) : null, costKnown, packagingCostPerItem: PACKAGING_COST, operationFeeRate: OPERATION_FEE_RATE, operationFeePerItem, formulaVersion: FORMULA_VERSION, commissionableProfit };
  });
  return { products: calculated.slice(0, 50), amount, base };
}
async function reconcileCreatorPurchase(event) {
  try {
    const orderId = String(event?.order_id || "").trim(), slug = String(event?.campaign || "").trim().toLowerCase();
    if (!orderId || !slug || event?.source !== "creator" || event?.event_type !== "purchase" || event?.server_verified !== true) return;
    const existing = await nativeFetch(`${SUPABASE_URL}/rest/v1/creator_commissions?order_id=eq.${encodeURIComponent(orderId)}&select=id&limit=1`, { headers: headers() });
    const existingRows = existing.ok ? await existing.json().catch(() => []) : [];
    if (Array.isArray(existingRows) && existingRows.length) return;
    const profileResponse = await nativeFetch(`${SUPABASE_URL}/rest/v1/creator_profiles?slug=eq.${encodeURIComponent(slug)}&status=eq.active&select=*&limit=1`, { headers: headers() });
    const profiles = profileResponse.ok ? await profileResponse.json().catch(() => []) : [];
    const profile = Array.isArray(profiles) ? profiles[0] || null : null;
    if (!profile) return;
    const items = Array.isArray(event?.properties?.items) ? event.properties.items : [];
    const calculated = await calculateCommissionItems(items, Number(profile.commission_rate || 10));
    if (!items.length || !calculated.products.every(item => item.costKnown === true)) return;
    const subtotal = items.reduce((sum, item) => sum + Math.max(0, Number(item?.amount || 0)) * Math.max(1, Number(item?.quantity || 1)), 0);
    await nativeFetch(`${SUPABASE_URL}/rest/v1/creator_commissions?on_conflict=order_id`, {
      method: "POST", headers: headers({ "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" }),
      body: JSON.stringify({ creator_id: profile.id, order_id: orderId, payment_method: String(event?.payment_method || "stripe"), product_subtotal: subtotal, commission_rate: Number(profile.commission_rate || 10), commission_amount: calculated.amount, products: calculated.products, earned_at: event?.occurred_at || new Date().toISOString() })
    });
  } catch (error) { console.error("[Creator commission reconcile]", error); }
}

globalThis.fetch = async function creatorAwareFetch(input, init = {}) {
  const response = await nativeFetch(input, init);
  try {
    const url = String(typeof input === "string" ? input : input?.url || "");
    if (response.ok && url.includes("/rest/v1/analytics_events") && String(init?.method || "GET").toUpperCase() === "POST" && typeof init?.body === "string") {
      const parsed = JSON.parse(init.body), events = Array.isArray(parsed) ? parsed : [parsed];
      for (const event of events) if (event?.event_type === "purchase" && event?.source === "creator" && event?.server_verified === true) setTimeout(() => reconcileCreatorPurchase(event), 250);
    }
  } catch {}
  return response;
};

http.createServer = function creatorAwareCreateServer(listener) {
  return originalCreateServer(async function creatorAwareListener(req, res) {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      if (await handleAuth(req, res, url)) return;
    } catch {}
    return listener.call(this, req, res);
  });
};
