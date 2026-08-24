const API_BASE =
  import.meta.env.VITE_STORE_API_URL ||
  "https://cajamoda-storeload-api.onrender.com";

const $ = id => document.getElementById(id);

const checkoutId = (() => {
  const query = new URLSearchParams(location.search).get("checkoutId");
  if (query) return query;
  try { return localStorage.getItem("cajamoda-pending-checkout") || ""; }
  catch { return ""; }
})();

const stripeSessionId = new URLSearchParams(location.search).get("stripeSessionId") || "";
const nequiOrderNumber = new URLSearchParams(location.search).get("nequiOrder") || "";

let confirmation = null;

function setStatus(message, error = false) {
  $("statusText").textContent = message;
  $("statusText").classList.toggle("error", error);
}

async function loadConfirmation() {
  if (nequiOrderNumber) {
    $("confirmationTitle").textContent = "PEDIDO RECIBIDO";
    $("orderNumber").textContent = `Pedido #${nequiOrderNumber}`;
    $("paymentStatus").textContent = "Pago Nequi por confirmar";
    $("deliveryMethod").textContent = "Entrega CajaModa";
    $("deliveryMessage").textContent = "Confirmaremos el pago y te enviaremos la información de entrega.";
    $("shareButton").hidden = true;
    setStatus("Tu pedido está reservado mientras verificamos el pago.");
    try { localStorage.removeItem("cajamoda-pending-nequi-order"); } catch {}
    return;
  }
  if (stripeSessionId) {
    const response = await fetch(
      `${API_BASE}/api/stripe/confirmation?sessionId=${encodeURIComponent(stripeSessionId)}`,
      { headers: { Accept: "application/json" } }
    );
    const payload = await response.json();
    if (!response.ok || !payload?.ok || !payload?.order?.paid) {
      throw new Error(payload?.error || "El pago todavía no está confirmado.");
    }
    confirmation = payload.order;
    $("confirmationTitle").textContent = "COMPRA CONFIRMADA";
    $("orderNumber").textContent = `Pago #${confirmation.number}`;
    $("paymentStatus").textContent = confirmation.payment;
    $("deliveryMethod").textContent = confirmation.delivery?.method || "Entrega CajaModa";
    $("deliveryMessage").textContent = confirmation.delivery?.message || "Te enviaremos actualizaciones por correo.";
    $("shareButton").hidden = true;
    return;
  }
  if (!checkoutId) throw new Error("No encontramos el identificador de tu compra.");

  const response = await fetch(
    `${API_BASE}/api/order-confirmation?checkoutId=${encodeURIComponent(checkoutId)}`,
    { headers: { Accept: "application/json" } }
  );
  const payload = await response.json();
  if (!response.ok || !payload?.ok) throw new Error(payload?.error || "No pudimos confirmar tu compra.");

  confirmation = payload.order;
  $("confirmationTitle").textContent = "COMPRA CONFIRMADA";
  $("orderNumber").textContent = `Pedido #${confirmation.number}`;
  $("paymentStatus").textContent = confirmation.payment;
  $("deliveryMethod").textContent = confirmation.delivery?.method || "Método de entrega confirmado";
  $("deliveryMessage").textContent = confirmation.delivery?.message || "Te enviaremos actualizaciones sobre tu pedido.";
  $("shareButton").disabled = false;
  $("shareButton").textContent = "Compartir descuento";
  try { localStorage.removeItem("cajamoda-pending-checkout"); } catch {}
}

async function createReferral() {
  if (!confirmation) return;
  $("shareButton").disabled = true;
  setStatus("Preparando el descuento…");

  try {
    const response = await fetch(`${API_BASE}/api/referrals`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ checkoutId })
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || "No pudimos preparar el descuento.");

    const shareText = `Te regalo 10% en CajaModa. Usa el código ${payload.code}: ${payload.url}`;
    if (navigator.share) {
      await navigator.share({ title: "10% en CajaModa", text: shareText, url: payload.url });
      setStatus("Descuento listo para tu amiga.");
    } else {
      await navigator.clipboard.writeText(shareText);
      setStatus("Enlace y código copiados.");
    }
  } catch (error) {
    if (error?.name !== "AbortError") setStatus(error?.message || "No pudimos compartir el descuento.", true);
  } finally {
    $("shareButton").disabled = false;
  }
}

$("shareButton").addEventListener("click", createReferral);

loadConfirmation().catch(error => {
  $("confirmationTitle").textContent = "COMPRA RECIBIDA";
  $("paymentStatus").textContent = "Revisa tu correo de confirmación";
  setStatus(error?.message || "No pudimos cargar los detalles.", true);
});
