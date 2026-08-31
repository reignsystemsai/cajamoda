"use strict";

const API = import.meta.env.VITE_STORE_API_URL || "https://cajamoda-storeload-api.onrender.com";
const byId = id => document.getElementById(id);
const checkoutToken = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

let cart = loadCart();
let prontoMethod = "";
let quote = null;
let quoteKey = "";
let quoteTimer = 0;
let quoteRun = 0;
let prepareTimer = 0;
let prepareRun = 0;
let stripeKey = "";
let stripe = null;
let elements = null;
let paymentElement = null;
let clientSecret = "";
let paymentIntentId = "";
let preparedKey = "";
let authoritativeTotals = null;
let cardComplete = false;
let submitting = false;
let paymentMethod = "card";
let nequiPhone = "";

function uid() {
  return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function storedJson(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function deliveryMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["p", "pronto", "pickup", "pick"].includes(normalized)) return "pickup";
  if (["l", "liberalo", "libéralo", "ship", "global"].includes(normalized)) return "ship";
  if (["r", "rapido", "rápido", "fast", "national"].includes(normalized)) return "fast";
  return "";
}

function numericPrice(value) {
  if (value && typeof value === "object") return numericPrice(value.amount ?? value.value ?? value.price);
  if (typeof value === "number") return Math.round(value);
  const normalized = String(value || "").replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  return Math.round(Number(normalized) || 0);
}

function loadCart() {
  const source = storedJson("cajamoda-checkout-cart") || storedJson("cajamoda-cart") || {};
  const sourceItems = Array.isArray(source.items) ? source.items : Array.isArray(source.lineItems) ? source.lineItems : [];
  const items = sourceItems.map(item => {
    const modes = [...new Set((item.allowedDeliveryModes || item.deliveryModes || [item.deliveryMode || "fast"])
      .map(deliveryMode).filter(Boolean))];
    const selected = deliveryMode(item.selectedDeliveryMode || item.deliveryMode);
    return {
      id: item.id || item._id || item.lineItemId || uid(),
      productId: item.productId || item.catalogReference?.catalogItemId || "",
      variantId: item.variantId || item.catalogReference?.options?.variantId || "",
      name: item.name || item.productName || "Producto CajaModa",
      image: item.image || item.imageUrl || item.media?.url || "",
      size: item.size || item.options?.Size || item.options?.Talla || "",
      color: item.color || item.options?.Color || "",
      quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
      price: numericPrice(item.unitPrice ?? item.price ?? item.lineItemPrice ?? item.priceData?.discountedPrice ?? item.priceData?.price),
      allowedDeliveryModes: modes,
      selectedDeliveryMode: modes.includes(selected) ? selected : ""
    };
  });
  return { items, revision: Number(source.revision || 0) };
}

function saveCart() {
  const saved = {
    items: cart.items.map(item => ({ ...item, unitPrice: item.price })),
    revision: ++cart.revision,
    count: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    total: cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    authoritative: true,
    updatedAt: Date.now()
  };
  localStorage.setItem("cajamoda-checkout-cart", JSON.stringify(saved));
  localStorage.setItem("cajamoda-cart", JSON.stringify(saved));
}

function cop(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function cartSubtotal() {
  return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function fulfillment() {
  const modes = cart.items.map(item => item.selectedDeliveryMode);
  return {
    hasPronto: modes.includes("pickup"),
    hasFast: modes.includes("fast"),
    hasShip: modes.includes("ship"),
    get hasNational() { return this.hasFast || this.hasShip; }
  };
}

function fulfillmentReady() {
  const profile = fulfillment();
  return cart.items.length > 0 &&
    cart.items.every(item => item.selectedDeliveryMode && item.allowedDeliveryModes.includes(item.selectedDeliveryMode)) &&
    (!profile.hasPronto || ["pickup", "moto"].includes(prontoMethod));
}

function pickupOnly() {
  const profile = fulfillment();
  return profile.hasPronto && !profile.hasNational && prontoMethod === "pickup";
}

function customer() {
  const firstName = byId("firstName").value.trim();
  const lastName = byId("lastName").value.trim();
  const phone = byId("phone").value.trim();
  return {
    firstName, lastName, phone, customerPhone: phone,
    customerName: `${firstName} ${lastName}`.trim(),
    email: byId("email").value.trim()
  };
}

function shippingAddress() {
  return {
    line1: byId("address").value.trim(),
    line2: byId("complement").value.trim(),
    city: byId("city").selectedOptions[0]?.textContent || "",
    state: byId("department").value,
    postal_code: byId("postalCode").value.trim(),
    country: "CO"
  };
}

function billingAddress() {
  if (byId("billingSame").checked) return shippingAddress();
  return {
    line1: byId("billingAddress").value.trim(), line2: "",
    city: byId("billingCity").value.trim(),
    state: byId("billingDepartment").value.trim(),
    postal_code: byId("billingPostalCode").value.trim(), country: "CO"
  };
}

function payload() {
  const profile = fulfillment();
  const address = shippingAddress();
  return {
    checkoutToken,
    requestId: uid(),
    cart: { items: cart.items },
    customer: customer(),
    billing: billingAddress(),
    delivery: {
      method: profile.hasPronto && profile.hasNational ? "mixed" : profile.hasPronto ? prontoMethod : "national",
      prontoMethod: profile.hasPronto ? prontoMethod : "",
      promise: profile.hasPronto && profile.hasNational ? "mixed" : profile.hasShip ? "liberalo" : profile.hasFast ? "rapido-nacional" : "pronto",
      city: address.city,
      cityDaneCode: byId("cityDaneCode").value,
      state: byId("department").value,
      stateName: byId("department").selectedOptions[0]?.textContent || "",
      postalCode: address.postal_code,
      address: [address.line1, byId("neighborhood").value.trim(), address.line2].filter(Boolean).join(", "),
      addressLine1: address.line1,
      neighborhood: byId("neighborhood").value.trim(),
      complement: address.line2,
      references: ""
    },
    currency: "COP",
    country: "CO"
  };
}

function fulfillmentKey() {
  return cart.items.map(item => [item.productId, item.variantId, item.quantity, item.selectedDeliveryMode].join(":"))
    .sort().join("|");
}

function currentQuoteKey() {
  return [fulfillmentKey(), prontoMethod, byId("department").value, byId("cityDaneCode").value,
    byId("address").value.trim(), byId("neighborhood").value.trim(), byId("postalCode").value.trim(),
    byId("complement").value.trim()].join("|").toLowerCase();
}

function currentPrepareKey() {
  return JSON.stringify({ quoteKey: currentQuoteKey(), quote, customer: customer(), billing: billingAddress() });
}

function validForm({ mark = false } = {}) {
  const required = [byId("firstName"), byId("lastName"), byId("email"), byId("phone")];
  if (!pickupOnly()) required.push(byId("department"), byId("city"), byId("address"));
  if (fulfillment().hasNational) required.push(byId("cityDaneCode"));
  if (!byId("billingSame").checked) required.push(byId("billingAddress"), byId("billingCity"), byId("billingDepartment"), byId("billingPostalCode"));
  const invalid = required.filter(field => !field.value.trim() || (field.type === "email" && !field.checkValidity()));
  if (mark) invalid.forEach(field => field.type !== "hidden" && field.classList.add("invalid"));
  return fulfillmentReady() && invalid.length === 0 && quote && quoteKey === currentQuoteKey();
}

function setPanelError(panelId, isError) {
  byId(panelId).classList.toggle("error", Boolean(isError));
}

function clearError() {
  byId("checkoutError").hidden = true;
  ["productsPanel", "contactPanel", "deliveryPanel", "billingPanel", "paymentPanel"].forEach(id => setPanelError(id, false));
}

function diagnosticCode() {
  return `C3${Date.now().toString(36).slice(-7).toUpperCase()}${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}

function reportError(code, message, stage) {
  const profile = fulfillment();
  void fetch(`${API}/api/checkout/errors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reference: code,
      stage: `checkout3.${stage}`,
      code: "CHECKOUT_3_FAILED",
      message,
      itemCount: cart.items.length,
      totalCop: authoritativeTotals?.totalCop || 0,
      deliveryMethod: profile.hasPronto && profile.hasNational ? "mixed" : profile.hasPronto ? prontoMethod : "national",
      readiness: {
        cartHasItems: cart.items.length > 0,
        deliverySelections: fulfillmentReady(),
        contact: Boolean(customer().customerName && customer().email && customer().phone),
        citySelected: pickupOnly() || Boolean(byId("cityDaneCode").value),
        addressPresent: pickupOnly() || Boolean(byId("address").value.trim()),
        deliveryQuote: Boolean(quote && quoteKey === currentQuoteKey()),
        stripeLoaded: Boolean(stripe),
        cardComplete,
        stripeSynchronized: Boolean(authoritativeTotals && preparedKey === currentPrepareKey()),
        stripeUpdating: Boolean(!authoritativeTotals && validForm())
      },
      page: location.pathname
    })
  }).catch(() => {});
}

function showError(message, panelId = "paymentPanel", suppliedCode = "") {
  const code = suppliedCode || diagnosticCode();
  byId("errorMessage").textContent = message || "Ocurrió un error inesperado.";
  byId("errorCode").textContent = `Código de diagnóstico: ${code}`;
  byId("checkoutError").hidden = false;
  setPanelError(panelId, true);
  console.error(`[Checkout 3 ${code}]`, message);
  reportError(code, message, panelId);
}

function renderCart() {
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  byId("itemCount").textContent = count === 1 ? "1 producto" : `${count} productos`;
  byId("cartItems").innerHTML = cart.items.length ? cart.items.map(item => `
    <article class="cartItem">
      ${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : '<div class="imageFallback"></div>'}
      <div><div class="cartName">${escapeHtml(item.name)}</div><div class="cartMeta">${[item.size, item.color, `Cantidad: ${item.quantity}`].filter(Boolean).map(escapeHtml).join(" · ")}</div>
      <select class="deliverySelect" data-line-id="${escapeHtml(item.id)}"><option value="">Elige la entrega</option>${item.allowedDeliveryModes.map(mode => `<option value="${mode}" ${item.selectedDeliveryMode === mode ? "selected" : ""}>${mode === "pickup" ? "Pronto" : mode === "ship" ? "Libéralo" : "Rápido Nacional"}</option>`).join("")}</select></div>
      <div class="cartPrice">${cop(item.price * item.quantity)}</div>
    </article>`).join("") : "<p>Tu bolsa está vacía.</p>";
  byId("prontoChoice").hidden = !fulfillment().hasPronto;
  document.querySelectorAll("[data-pronto]").forEach(button => button.classList.toggle("active", button.dataset.pronto === prontoMethod));
  renderTotals();
}

function renderTotals() {
  const subtotal = authoritativeTotals?.subtotalCop ?? cartSubtotal();
  const delivery = authoritativeTotals?.deliveryCop ?? (quoteKey === currentQuoteKey() ? Number(quote?.fee || 0) : null);
  const total = authoritativeTotals?.totalCop ?? (delivery === null ? null : subtotal + delivery);
  byId("subtotal").textContent = cop(subtotal);
  byId("deliveryFee").textContent = delivery === null ? "Por calcular" : cop(delivery);
  byId("finalTotal").textContent = total === null ? "—" : cop(total);
  byId("payLabel").textContent = authoritativeTotals ? `Pagar ${cop(authoritativeTotals.totalCop)}` : "Pagar";
}

function syncDeliveryVisibility() {
  byId("deliveryFields").hidden = pickupOnly();
  if (pickupOnly()) {
    byId("billingSame").checked = false;
    byId("billingSame").disabled = true;
  } else {
    byId("billingSame").disabled = false;
  }
  byId("billingFields").hidden = byId("billingSame").checked;
}

function destroyPayment() {
  prepareRun += 1;
  try { paymentElement?.destroy(); } catch {}
  byId("paymentElement").replaceChildren();
  elements = null;
  paymentElement = null;
  clientSecret = "";
  paymentIntentId = "";
  preparedKey = "";
  authoritativeTotals = null;
  cardComplete = false;
  submitting = false;
  byId("paySpinner").hidden = true;
  byId("paymentStatus").textContent = "Completa los pasos anteriores para preparar el pago.";
  refreshPaymentButton();
  renderTotals();
}

function refreshPaymentButton() {
  const ready = paymentMethod === "card" && Boolean(elements && clientSecret && cardComplete && preparedKey === currentPrepareKey());
  byId("payButton").disabled = !ready || submitting;
  byId("nequiButton").disabled = !(paymentMethod === "nequi" && validForm() && byId("nequiReference").value.trim());
}

function scheduleQuote() {
  clearTimeout(quoteTimer);
  quoteRun += 1;
  quote = null;
  quoteKey = "";
  destroyPayment();
  clearError();
  syncDeliveryVisibility();
  renderTotals();
  if (!fulfillmentReady()) {
    byId("deliveryStatus").textContent = "Selecciona la entrega de cada producto.";
    return;
  }
  if (!pickupOnly() && (!byId("department").value || !byId("cityDaneCode").value || !byId("address").value.trim())) {
    byId("deliveryStatus").textContent = "Completa la dirección para calcular la entrega.";
    return;
  }
  const run = quoteRun;
  byId("deliveryStatus").textContent = "Calculando la entrega…";
  quoteTimer = setTimeout(() => fetchQuote(run), 450);
}

async function fetchQuote(run) {
  const key = currentQuoteKey();
  try {
    const response = await fetch(`${API}/api/delivery/quote`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload())
    });
    const result = await response.json().catch(() => ({}));
    if (run !== quoteRun) return;
    if (!response.ok || !result.quote) throw new Error(result.message || result.error || "No pudimos calcular la entrega.");
    quote = result.quote;
    quoteKey = key;
    byId("deliveryStatus").textContent = `${quote.title || "Entrega"}: ${cop(quote.fee)}.`;
    byId("deliveryStatus").classList.remove("error");
    renderTotals();
    schedulePrepare();
  } catch (error) {
    if (run !== quoteRun) return;
    byId("deliveryStatus").textContent = error.message;
    byId("deliveryStatus").classList.add("error");
    showError(error.message, "deliveryPanel", error.code);
  }
}

function schedulePrepare() {
  clearTimeout(prepareTimer);
  if (paymentMethod !== "card" || !stripeKey || !validForm()) {
    refreshPaymentButton();
    return;
  }
  const run = ++prepareRun;
  byId("paymentStatus").textContent = "Preparando el pago seguro…";
  prepareTimer = setTimeout(() => preparePayment(run), 300);
}

async function preparePayment(run) {
  const key = currentPrepareKey();
  try {
    const request = payload();
    request.requestId = `${checkoutToken}:${run}`;
    const response = await fetch(`${API}/api/checkout-3/payment/prepare`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request)
    });
    const result = await response.json().catch(() => ({}));
    if (run !== prepareRun) return;
    if (!response.ok || !result.clientSecret || !result.paymentIntentId || !result.totals) {
      const error = new Error(result.message || result.error || "Stripe no pudo preparar el pago.");
      error.code = result.diagnosticCode;
      throw error;
    }
    stripe ||= window.Stripe(stripeKey);
    clientSecret = result.clientSecret;
    paymentIntentId = result.paymentIntentId;
    authoritativeTotals = result.totals;
    preparedKey = key;
    elements = stripe.elements({ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#111111", borderRadius: "12px" } }, loader: "auto" });
    paymentElement = elements.create("payment", {
      layout: { type: "tabs", defaultCollapsed: false },
      fields: { billingDetails: "never" },
      wallets: { applePay: "never", googlePay: "never", link: "never" }
    });
    paymentElement.on("change", event => {
      cardComplete = Boolean(event.complete);
      if (event.error) showError(event.error.message, "paymentPanel");
      byId("paymentStatus").textContent = cardComplete ? "Tarjeta lista. Puedes confirmar el pago." : "Completa los datos de la tarjeta.";
      refreshPaymentButton();
    });
    paymentElement.mount("#paymentElement");
    byId("paymentStatus").textContent = "Completa los datos de la tarjeta.";
    clearError();
    renderTotals();
    refreshPaymentButton();
  } catch (error) {
    if (run !== prepareRun) return;
    destroyPayment();
    byId("paymentStatus").textContent = "No se pudo preparar el pago.";
    showError(error.message, "paymentPanel", error.code);
  }
}

async function confirmPayment() {
  if (!elements || !stripe || !clientSecret || submitting || preparedKey !== currentPrepareKey()) return;
  clearError();
  submitting = true;
  byId("paySpinner").hidden = false;
  refreshPaymentButton();
  try {
    const submitted = await elements.submit();
    if (submitted.error) throw submitted.error;
    const contact = customer();
    const result = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${location.origin}/order-confirmation/?checkout3Payment=${encodeURIComponent(paymentIntentId)}`,
        payment_method_data: {
          billing_details: { name: contact.customerName, email: contact.email, phone: contact.phone, address: billingAddress() }
        }
      },
      redirect: "if_required"
    });
    if (result.error) throw result.error;
    if (result.paymentIntent?.id) {
      sessionStorage.setItem("cajamoda-checkout-3-payment", result.paymentIntent.id);
      location.assign(`/order-confirmation/?checkout3Payment=${encodeURIComponent(result.paymentIntent.id)}`);
    }
  } catch (error) {
    submitting = false;
    byId("paySpinner").hidden = true;
    showError(error.message || "Stripe rechazó el pago.", "paymentPanel", error.decline_code || error.code);
    refreshPaymentButton();
  }
}

async function loadCities() {
  const state = byId("department").value;
  const stateName = byId("department").selectedOptions[0]?.textContent || "";
  byId("city").disabled = true;
  byId("city").innerHTML = '<option value="">Selecciona</option>';
  byId("cityDaneCode").value = "";
  if (!state) return scheduleQuote();
  try {
    const response = await fetch(`${API}/api/delivery/cities?state=${encodeURIComponent(state)}&stateName=${encodeURIComponent(stateName)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No pudimos cargar las ciudades.");
    byId("city").innerHTML += result.cities.map(city => `<option value="${escapeHtml(city.daneCode)}">${escapeHtml(city.name)}</option>`).join("");
    byId("city").disabled = false;
  } catch (error) { showError(error.message, "deliveryPanel"); }
  scheduleQuote();
}

async function submitNequi() {
  if (!validForm({ mark: true }) || !byId("nequiReference").value.trim()) return;
  byId("nequiButton").disabled = true;
  clearError();
  try {
    const request = payload();
    request.requestId = checkoutToken;
    request.reference = byId("nequiReference").value.trim();
    const response = await fetch(`${API}/api/nequi/orders`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || "No pudimos registrar el pago Nequi.");
    location.assign(`/order-confirmation/?nequiOrder=${encodeURIComponent(result.orderNumber || result.orderId)}`);
  } catch (error) {
    showError(error.message, "paymentPanel");
    refreshPaymentButton();
  }
}

function bindEvents() {
  byId("cartItems").addEventListener("change", event => {
    const select = event.target.closest("[data-line-id]");
    if (!select) return;
    const item = cart.items.find(candidate => String(candidate.id) === select.dataset.lineId);
    if (item) item.selectedDeliveryMode = select.value;
    if (!fulfillment().hasPronto) prontoMethod = "";
    saveCart(); renderCart(); scheduleQuote();
  });
  document.querySelectorAll("[data-pronto]").forEach(button => button.addEventListener("click", () => {
    prontoMethod = button.dataset.pronto;
    renderCart(); scheduleQuote();
  }));
  byId("department").addEventListener("change", loadCities);
  byId("city").addEventListener("change", () => { byId("cityDaneCode").value = byId("city").value; scheduleQuote(); });
  ["address", "neighborhood", "postalCode", "complement"].forEach(id => byId(id).addEventListener("input", scheduleQuote));
  ["firstName", "lastName", "email", "phone", "billingAddress", "billingCity", "billingDepartment", "billingPostalCode"].forEach(id => {
    byId(id).addEventListener("input", () => {
      byId(id).classList.remove("invalid"); destroyPayment(); clearTimeout(prepareTimer); prepareTimer = setTimeout(schedulePrepare, 350); refreshPaymentButton();
    });
  });
  byId("billingSame").addEventListener("change", () => { byId("billingFields").hidden = byId("billingSame").checked; destroyPayment(); schedulePrepare(); });
  document.querySelectorAll("[data-payment]").forEach(button => button.addEventListener("click", () => {
    paymentMethod = button.dataset.payment;
    document.querySelectorAll("[data-payment]").forEach(tab => tab.classList.toggle("active", tab === button));
    byId("cardPayment").hidden = paymentMethod !== "card";
    byId("nequiPayment").hidden = paymentMethod !== "nequi";
    byId("payButton").hidden = paymentMethod !== "card";
    byId("nequiButton").hidden = paymentMethod !== "nequi";
    if (paymentMethod === "card") schedulePrepare();
    refreshPaymentButton();
  }));
  byId("nequiReference").addEventListener("input", refreshPaymentButton);
  byId("payButton").addEventListener("click", confirmPayment);
  byId("nequiButton").addEventListener("click", submitNequi);
}

async function initialize() {
  renderCart(); bindEvents(); syncDeliveryVisibility();
  if (!cart.items.length) {
    showError("Tu bolsa está vacía.", "productsPanel");
    return;
  }
  try {
    const [configResponse, departmentsResponse] = await Promise.all([
      fetch(`${API}/api/checkout/config`), fetch(`${API}/api/delivery/departments`)
    ]);
    const config = await configResponse.json();
    const departments = await departmentsResponse.json();
    if (!configResponse.ok || !config?.stripe?.publishableKey) throw new Error("Stripe no está configurado.");
    stripeKey = config.stripe.publishableKey;
    nequiPhone = config?.nequi?.phone || "";
    byId("nequiNumber").textContent = config?.nequi?.masked || nequiPhone || "No configurado";
    if (!departmentsResponse.ok || !Array.isArray(departments.departments)) throw new Error("No pudimos cargar los departamentos.");
    byId("department").innerHTML += departments.departments.map(item => `<option value="${escapeHtml(item.code)}">${escapeHtml(item.name)}</option>`).join("");
    scheduleQuote();
  } catch (error) {
    showError(error.message, "paymentPanel");
  }
}

initialize();
