"use strict";

const API = "https://cajamoda-storeload-api.onrender.com";
const PICKUP_FEE_COP = 10000;
const $ = id => document.getElementById(id);

let cart = readCart();
let selectedPronto = localStorage.getItem("cajamoda-checkout-2-pronto") || "";
let deliveryQuote = null;
let deliveryQuoteKey = "";
let quotePending = false;
let quoteTimer = 0;
let quoteVersion = 0;
let prepareTimer = 0;
let stripePublishableKey = "";
let stripeClient = null;
let stripeCheckout = null;
let stripeActions = null;
let stripeElement = null;
let stripeSessionId = "";
let stripePreparedKey = "";
let stripeAmountTotalMinor = 0;
let stripeExpectedAmountMinor = 0;
let stripeCanConfirm = false;
let stripePreparing = false;
let stripeSubmitting = false;
let stripeVersion = 0;
let activePayment = "card";
let paymentStepOpen = false;

function createId() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeDeliveryMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (["p", "pronto", "pickup", "pick"].includes(mode)) return "pickup";
  if (["l", "liberalo", "libéralo", "ship", "global"].includes(mode)) return "ship";
  if (["r", "rapido", "rápido", "fast", "national"].includes(mode)) return "fast";
  return "";
}

function parsePrice(value) {
  if (value && typeof value === "object") return parsePrice(value.amount ?? value.value ?? value.price);
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
    return Math.round(Number(cleaned) || 0);
  }
  return Math.round(Number(value) || 0);
}

function normalizeCart(source) {
  const rawItems = Array.isArray(source?.items) ? source.items : Array.isArray(source?.lineItems) ? source.lineItems : [];
  const items = rawItems.map(item => {
    const allowedDeliveryModes = [...new Set((item.allowedDeliveryModes || item.deliveryModes || [item.deliveryMode || "fast"])
      .map(normalizeDeliveryMode).filter(Boolean))];
    const selectedDeliveryMode = normalizeDeliveryMode(item.selectedDeliveryMode || item.deliveryMode);
    const unitPrice = parsePrice(item.unitPrice ?? item.price ?? item.lineItemPrice ?? item.priceData?.discountedPrice ?? item.priceData?.price);
    return {
      id: item.id || item._id || item.lineItemId || createId(),
      productId: item.productId || item.catalogReference?.catalogItemId || "",
      variantId: item.variantId || item.catalogReference?.options?.variantId || "",
      name: item.name || item.productName || "Producto",
      image: item.image || item.imageUrl || item.media?.url || "",
      size: item.size || item.options?.Size || item.options?.Talla || "",
      color: item.color || item.options?.Color || "",
      quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
      unitPrice,
      price: unitPrice,
      allowedDeliveryModes,
      selectedDeliveryMode: allowedDeliveryModes.includes(selectedDeliveryMode) ? selectedDeliveryMode : ""
    };
  });
  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    revision: Math.max(0, Number(source?.revision || 0))
  };
}

function readCart() {
  return normalizeCart(readJson("cajamoda-checkout-cart", null) || readJson("cajamoda-cart", { items: [] }));
}

function saveCart() {
  cart.revision += 1;
  cart.updatedAt = Date.now();
  cart.authoritative = true;
  localStorage.setItem("cajamoda-checkout-cart", JSON.stringify(cart));
  localStorage.setItem("cajamoda-cart", JSON.stringify(cart));
  window.postMessage({ source: "CAJAMODA_CHECKOUT", type: "SYNC_CART", payload: { cart } }, "*");
}

function money(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function deliveryProfile() {
  const modes = cart.items.map(item => item.selectedDeliveryMode);
  return {
    hasPronto: modes.includes("pickup"),
    hasFast: modes.includes("fast"),
    hasShip: modes.includes("ship"),
    get hasNational() { return this.hasFast || this.hasShip; }
  };
}

function fulfillmentComplete() {
  const profile = deliveryProfile();
  return cart.items.length > 0 &&
    cart.items.every(item => item.selectedDeliveryMode && item.allowedDeliveryModes.includes(item.selectedDeliveryMode)) &&
    (!profile.hasPronto || ["pickup", "moto"].includes(selectedPronto));
}

function cartFingerprint() {
  return cart.items.map(item => [item.productId, item.variantId, item.quantity, item.selectedDeliveryMode].join(":"))
    .sort().join("|");
}

function quoteFingerprint() {
  return [
    cartFingerprint(), selectedPronto, $("department").value, $("cityDaneCode").value,
    $("address").value.trim(), $("neighborhood").value.trim(), $("postalCode").value.trim(),
    $("complement").value.trim()
  ].join("|").toLowerCase();
}

function quoteMatches() {
  return Boolean(deliveryQuote && deliveryQuoteKey === quoteFingerprint());
}

function finalTotalCop() {
  return cart.total + (quoteMatches() ? Number(deliveryQuote.fee || 0) : 0);
}

function customer() {
  const firstName = $("firstName").value.trim();
  const lastName = $("lastName").value.trim();
  const email = $("email").value.trim();
  const phone = $("phone").value.trim();
  return { firstName, lastName, email, phone, customerName: [firstName, lastName].filter(Boolean).join(" "), customerPhone: phone };
}

function deliveryMethod() {
  const profile = deliveryProfile();
  if (profile.hasPronto && profile.hasNational) return "mixed";
  if (profile.hasPronto) return selectedPronto;
  return "national";
}

function deliveryAddress() {
  return {
    line1: $("address").value.trim(),
    line2: $("complement").value.trim(),
    city: $("city").selectedOptions[0]?.textContent || "",
    state: $("department").value,
    postal_code: $("postalCode").value.trim(),
    country: "CO"
  };
}

function billingAddress() {
  if ($("billingSame").checked) return deliveryAddress();
  return {
    line1: $("billingAddress").value.trim(),
    line2: "",
    city: $("billingCity").value.trim(),
    state: $("billingDepartment").value.trim(),
    postal_code: $("billingPostalCode").value.trim(),
    country: "CO"
  };
}

function checkoutPayload() {
  const profile = deliveryProfile();
  const contact = customer();
  const cityName = $("city").selectedOptions[0]?.textContent || "";
  const address = deliveryAddress();
  return {
    requestId: createId(),
    cart,
    customer: contact,
    delivery: {
      method: deliveryMethod(),
      prontoMethod: profile.hasPronto ? selectedPronto : "",
      promise: profile.hasPronto && profile.hasNational ? "mixed" : profile.hasShip ? "liberalo" : profile.hasFast ? "rapido-nacional" : "pronto",
      city: cityName,
      cityDaneCode: $("cityDaneCode").value,
      state: $("department").value,
      stateName: $("department").selectedOptions[0]?.textContent || "",
      postalCode: address.postal_code,
      fee: quoteMatches() ? Number(deliveryQuote.fee || 0) : 0,
      address: [address.line1, $("neighborhood").value.trim(), address.line2].filter(Boolean).join(", "),
      addressLine1: address.line1,
      neighborhood: $("neighborhood").value.trim(),
      complement: address.line2,
      references: ""
    },
    currency: "COP",
    country: "CO"
  };
}

function formReady({ highlight = false } = {}) {
  const profile = deliveryProfile();
  const pickupOnly = profile.hasPronto && !profile.hasNational && selectedPronto === "pickup";
  const required = [$("firstName"), $("lastName"), $("email"), $("phone")];
  if (!pickupOnly) required.push($("department"), $("city"), $("address"));
  if (!$("billingSame").checked) required.push($("billingAddress"), $("billingCity"), $("billingDepartment"), $("billingPostalCode"));
  if (profile.hasNational) required.push($("cityDaneCode"));
  const invalid = required.filter(field => !field.value.trim() || (field.type === "email" && !field.checkValidity()));
  if (highlight) invalid.forEach(field => field.type !== "hidden" && field.classList.add("invalid"));
  return fulfillmentComplete() && invalid.length === 0 && quoteMatches() && !quotePending;
}

function preparationKey() {
  return JSON.stringify({ quote: quoteFingerprint(), total: finalTotalCop(), customer: customer(), billing: billingAddress() });
}

function renderCart() {
  $("itemCount").textContent = cart.count === 1 ? "1 producto" : `${cart.count} productos`;
  $("bagSubtotal").textContent = money(cart.total);
  $("subtotal").textContent = money(cart.total);
  $("cartList").innerHTML = cart.items.length ? cart.items.map(item => `
    <article class="cartItem">
      ${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : "<div></div>"}
      <div>
        <div class="cartName">${escapeHtml(item.name)}</div>
        <div class="cartMeta">${[item.size, item.color, `Cantidad: ${item.quantity}`].filter(Boolean).map(escapeHtml).join(" · ")}</div>
        <select class="deliverySelect" data-line="${escapeHtml(item.id)}" aria-label="Entrega para ${escapeHtml(item.name)}">
          <option value="">Selecciona la entrega</option>
          ${item.allowedDeliveryModes.map(mode => `<option value="${mode}" ${item.selectedDeliveryMode === mode ? "selected" : ""}>${mode === "pickup" ? "Pronto" : mode === "ship" ? "Libéralo" : "Rápido Nacional"}</option>`).join("")}
        </select>
        <div class="cartPrice">${money(item.unitPrice * item.quantity)}</div>
      </div>
    </article>`).join("") : '<section class="card">Tu bolsa está vacía.</section>';
  const profile = deliveryProfile();
  $("prontoChoice").hidden = !profile.hasPronto;
  document.querySelectorAll("[data-pronto]").forEach(button => button.classList.toggle("active", button.dataset.pronto === selectedPronto));
  $("continueButton").disabled = !fulfillmentComplete();
  $("paymentTab").disabled = !fulfillmentComplete();
  renderTotals();
}

function renderTotals(stripeSession = null) {
  if (stripeSession?.total) {
    $("subtotal").textContent = stripeSession.total.subtotal?.amount || money(cart.total);
    $("deliveryFee").textContent = stripeSession.total.shippingRate?.amount || money(deliveryQuote?.fee || 0);
    $("finalTotal").textContent = stripeSession.total.total?.amount || money(finalTotalCop());
    return;
  }
  $("subtotal").textContent = money(cart.total);
  $("deliveryFee").textContent = quoteMatches() ? money(deliveryQuote.fee) : quotePending ? "Calculando…" : "Por calcular";
  $("finalTotal").textContent = quoteMatches() ? money(finalTotalCop()) : "—";
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function showStep(payment) {
  paymentStepOpen = payment;
  $("bagStep").hidden = payment;
  $("paymentStep").hidden = !payment;
  $("bagTab").classList.toggle("active", !payment);
  $("paymentTab").classList.toggle("active", payment);
  if (payment) {
    syncPickupBillingRule();
    scheduleQuote();
    maybePrepareStripe();
  }
  scrollTo({ top: 0, behavior: "smooth" });
}

function syncPickupBillingRule() {
  const profile = deliveryProfile();
  const pickupOnly = profile.hasPronto && !profile.hasNational && selectedPronto === "pickup";
  $("shippingCard").hidden = pickupOnly;
  if (pickupOnly && !$("address").value.trim()) {
    $("billingSame").checked = false;
    $("billingSame").disabled = true;
  } else {
    $("billingSame").disabled = false;
  }
  $("billingFields").hidden = $("billingSame").checked;
}

async function loadDepartments() {
  try {
    const response = await fetch(`${API}/api/delivery/departments`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No pudimos cargar los departamentos.");
    $("department").innerHTML = '<option value="">Departamento</option>' + result.departments
      .map(item => `<option value="${escapeHtml(item.code)}">${escapeHtml(item.name)}</option>`).join("");
  } catch (error) {
    $("deliveryStatus").textContent = error.message;
  }
}

async function loadCities() {
  const state = $("department").value;
  const stateName = $("department").selectedOptions[0]?.textContent || "";
  $("city").disabled = true;
  $("city").innerHTML = '<option value="">Ciudad</option>';
  $("cityDaneCode").value = "";
  if (!state) return;
  try {
    const response = await fetch(`${API}/api/delivery/cities?state=${encodeURIComponent(state)}&stateName=${encodeURIComponent(stateName)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No pudimos cargar las ciudades.");
    $("city").innerHTML = '<option value="">Ciudad</option>' + result.cities
      .map(city => `<option value="${escapeHtml(city.daneCode)}">${escapeHtml(city.name)}</option>`).join("");
    $("city").disabled = false;
  } catch (error) {
    $("deliveryStatus").textContent = error.message;
  }
}

function scheduleQuote() {
  clearTimeout(quoteTimer);
  quoteVersion += 1;
  deliveryQuote = null;
  deliveryQuoteKey = "";
  quotePending = false;
  resetStripe();
  const profile = deliveryProfile();
  const pickupOnly = profile.hasPronto && !profile.hasNational && selectedPronto === "pickup";
  if (pickupOnly) {
    deliveryQuote = { method: "pickup", prontoMethod: "pickup", fee: PICKUP_FEE_COP, groups: [], title: "Pronto: Recoger" };
    deliveryQuoteKey = quoteFingerprint();
    $("deliveryStatus").textContent = "Recogida Pronto confirmada.";
    renderTotals();
    maybePrepareStripe();
    return;
  }
  const addressReady = $("department").value && $("cityDaneCode").value && $("address").value.trim();
  if (!fulfillmentComplete() || !addressReady) {
    $("deliveryStatus").textContent = "Completa la dirección para calcular la entrega.";
    renderTotals();
    return;
  }
  quotePending = true;
  $("deliveryStatus").textContent = "Calculando entrega con Envia…";
  renderTotals();
  const version = quoteVersion;
  quoteTimer = setTimeout(() => requestQuote(version), 500);
}

async function requestQuote(version) {
  const fingerprint = quoteFingerprint();
  try {
    const response = await fetch(`${API}/api/delivery/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(checkoutPayload())
    });
    const result = await response.json().catch(() => ({}));
    if (version !== quoteVersion) return;
    if (!response.ok || !result.quote) throw new Error(result.error || "Envia no pudo calcular la entrega.");
    deliveryQuote = result.quote;
    deliveryQuoteKey = fingerprint;
    quotePending = false;
    $("deliveryStatus").textContent = `Entrega calculada: ${money(deliveryQuote.fee)}.`;
    renderTotals();
    maybePrepareStripe();
    updateNequiButton();
  } catch (error) {
    if (version !== quoteVersion) return;
    quotePending = false;
    deliveryQuote = null;
    deliveryQuoteKey = "";
    $("deliveryStatus").textContent = error.message;
    renderTotals();
  }
}

function setStripeStatus(message) {
  $("stripeStatus").textContent = message;
}

function showPaymentError(message = "") {
  $("paymentError").textContent = message;
  $("paymentError").hidden = !message;
}

function resetStripe() {
  stripeVersion += 1;
  try { stripeElement?.destroy?.(); } catch {}
  $("stripePaymentElement").replaceChildren();
  $("stripeElementShell").hidden = true;
  stripeCheckout = null;
  stripeActions = null;
  stripeElement = null;
  stripeSessionId = "";
  stripePreparedKey = "";
  stripeAmountTotalMinor = 0;
  stripeExpectedAmountMinor = 0;
  stripeCanConfirm = false;
  stripePreparing = false;
  stripeSubmitting = false;
  $("payButton").textContent = "Pagar";
  $("payButton").disabled = true;
  showPaymentError();
  setStripeStatus("Completa tus datos y la entrega para preparar el pago.");
}

async function maybePrepareStripe() {
  if (!paymentStepOpen || activePayment !== "card" || stripePreparing || stripeCheckout || !stripePublishableKey || !formReady()) return;
  const key = preparationKey();
  const expectedAmountMinor = Math.round(finalTotalCop() * 100);
  const version = ++stripeVersion;
  stripePreparing = true;
  setStripeStatus("Preparando el pago seguro…");
  showPaymentError();
  try {
    const response = await fetch(`${API}/api/checkout-2/stripe/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(checkoutPayload())
    });
    const result = await response.json().catch(() => ({}));
    if (version !== stripeVersion) return;
    if (!response.ok || !result.clientSecret || !result.sessionId) throw new Error(result.error || "No pudimos preparar Stripe.");
    stripeClient ||= window.Stripe(stripePublishableKey);
    stripeCheckout = stripeClient.initCheckoutElementsSdk({
      clientSecret: result.clientSecret,
      elementsOptions: { appearance: { theme: "stripe", variables: { colorPrimary: "#080808", borderRadius: "12px", fontFamily: "Inter, Arial, sans-serif" } } }
    });
    const loaded = await stripeCheckout.loadActions();
    if (version !== stripeVersion) return;
    if (loaded?.type === "error") throw new Error(loaded.error?.message || "No pudimos cargar Stripe.");
    stripeActions = loaded.actions;
    stripeSessionId = result.sessionId;
    stripeAmountTotalMinor = Number(result.amountTotal);
    stripeExpectedAmountMinor = expectedAmountMinor;
    stripePreparedKey = key;
    stripeElement = stripeCheckout.createPaymentElement({ layout: "accordion", fields: { billingDetails: "never" } });
    stripeElement.on?.("ready", () => { $("stripeElementShell").hidden = false; });
    stripeElement.mount("#stripePaymentElement");
    $("stripeElementShell").hidden = false;
    stripeCheckout.on("change", applyStripeSession);
    applyStripeSession(stripeActions.getSession());
  } catch (error) {
    if (version !== stripeVersion) return;
    resetStripe();
    showPaymentError(error.message);
    setStripeStatus("No pudimos preparar el pago seguro.");
  } finally {
    if (version === stripeVersion) stripePreparing = false;
  }
}

function applyStripeSession(session) {
  if (!session || !stripeActions) return;
  const stripeMinor = Number(session.total?.total?.minorUnitsAmount);
  const amountMatches = session.currency === "cop" &&
    stripeMinor === stripeAmountTotalMinor &&
    stripeAmountTotalMinor === stripeExpectedAmountMinor;
  stripeCanConfirm = Boolean(session.canConfirm && amountMatches && stripePreparedKey === preparationKey());
  renderTotals(session);
  const displayAmount = session.total?.total?.amount;
  if (displayAmount) $("payButton").textContent = `Pagar ${displayAmount}`;
  $("payButton").disabled = !stripeCanConfirm || stripeSubmitting;
  setStripeStatus(amountMatches ? (session.canConfirm ? "Pago listo para confirmar." : "Completa los datos de la tarjeta.") : "El total de Stripe no coincide con el pedido.");
}

async function confirmStripePayment() {
  if (!stripeActions || !stripeCanConfirm || stripeSubmitting || stripePreparedKey !== preparationKey()) return;
  stripeSubmitting = true;
  $("payButton").disabled = true;
  showPaymentError();
  try {
    const contact = customer();
    const options = {
      email: contact.email,
      phoneNumber: contact.phone,
      billingAddress: { name: contact.customerName, address: billingAddress() }
    };
    const profile = deliveryProfile();
    if (!(profile.hasPronto && !profile.hasNational && selectedPronto === "pickup")) {
      options.shippingAddress = { name: contact.customerName, address: deliveryAddress() };
    }
    const result = await stripeActions.confirm(options);
    if (result?.type === "error") throw new Error(result.error?.message || "No pudimos procesar el pago.");
    location.href = `${location.origin}/order-confirmation/?stripeSessionId=${encodeURIComponent(stripeSessionId)}`;
  } catch (error) {
    stripeSubmitting = false;
    showPaymentError(error.message);
    applyStripeSession(stripeActions.getSession());
  }
}

function updateNequiButton() {
  $("nequiButton").disabled = !(formReady() && $("nequiReference").value.trim());
}

async function submitNequi() {
  if (!formReady({ highlight: true }) || !$("nequiReference").value.trim()) return;
  $("nequiButton").disabled = true;
  $("nequiError").hidden = true;
  try {
    const response = await fetch(`${API}/api/nequi/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...checkoutPayload(), reference: $("nequiReference").value.trim() })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.orderNumber) throw new Error(result.error || "No pudimos registrar el pago Nequi.");
    location.href = `/order-confirmation/?nequiOrder=${encodeURIComponent(result.orderNumber)}`;
  } catch (error) {
    $("nequiError").textContent = error.message;
    $("nequiError").hidden = false;
    updateNequiButton();
  }
}

async function loadConfig() {
  const response = await fetch(`${API}/api/checkout/config`);
  const result = await response.json();
  stripePublishableKey = String(result?.stripe?.publishableKey || "");
  $("nequiNumber").textContent = result?.nequi?.masked || "Número pendiente";
}

function bindEvents() {
  $("continueButton").onclick = () => showStep(true);
  $("bagTab").onclick = () => showStep(false);
  $("paymentTab").onclick = () => showStep(true);
  $("cartList").onchange = event => {
    const select = event.target.closest("[data-line]");
    if (!select) return;
    const item = cart.items.find(candidate => candidate.id === select.dataset.line);
    if (!item) return;
    item.selectedDeliveryMode = select.value;
    if (!deliveryProfile().hasPronto) selectedPronto = "";
    saveCart();
    renderCart();
    scheduleQuote();
  };
  document.querySelectorAll("[data-pronto]").forEach(button => button.onclick = () => {
    selectedPronto = button.dataset.pronto;
    localStorage.setItem("cajamoda-checkout-2-pronto", selectedPronto);
    renderCart();
    syncPickupBillingRule();
    scheduleQuote();
  });
  $("department").onchange = async () => { await loadCities(); scheduleQuote(); };
  $("city").onchange = () => { $("cityDaneCode").value = $("city").value; scheduleQuote(); };
  ["address", "neighborhood", "postalCode", "complement"].forEach(id => $(id).oninput = scheduleQuote);
  ["firstName", "lastName", "email", "phone", "billingAddress", "billingCity", "billingDepartment", "billingPostalCode"].forEach(id => {
    $(id).oninput = () => { $(id).classList.remove("invalid"); resetStripe(); clearTimeout(prepareTimer); prepareTimer = setTimeout(maybePrepareStripe, 250); updateNequiButton(); };
  });
  $("billingSame").onchange = () => { $("billingFields").hidden = $("billingSame").checked; resetStripe(); maybePrepareStripe(); updateNequiButton(); };
  $("cardTab").onclick = () => {
    activePayment = "card";
    $("cardTab").classList.add("active"); $("nequiTab").classList.remove("active");
    $("cardPane").hidden = false; $("nequiPane").hidden = true;
    maybePrepareStripe();
  };
  $("nequiTab").onclick = () => {
    activePayment = "nequi";
    $("nequiTab").classList.add("active"); $("cardTab").classList.remove("active");
    $("nequiPane").hidden = false; $("cardPane").hidden = true;
    updateNequiButton();
  };
  $("payButton").onclick = confirmStripePayment;
  $("nequiReference").oninput = updateNequiButton;
  $("nequiButton").onclick = submitNequi;
  document.querySelectorAll("input,select").forEach(field => field.addEventListener("input", () => field.classList.remove("invalid")));
}

async function start() {
  bindEvents();
  renderCart();
  await Promise.all([loadConfig(), loadDepartments()]);
  if (!cart.items.length) return;
  window.addEventListener("storage", event => {
    if (!["cajamoda-cart", "cajamoda-checkout-cart"].includes(event.key)) return;
    cart = readCart();
    renderCart();
    scheduleQuote();
  });
}

start().catch(error => showPaymentError(error.message));
