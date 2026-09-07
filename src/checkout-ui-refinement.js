(() => {
  "use strict";

  if (!window.location.pathname.startsWith("/checkout")) return;

  const explanations = {
    pickup: {
      title: "Pronto",
      copy: "Local · 24–48 h. Después de tu dirección eliges Recoger en punto o Moto a tu dirección."
    },
    fast: {
      title: "Rápido",
      copy: "Envío nacional · 4–7 días."
    },
    ship: {
      title: "Libéralo",
      copy: "Lanzamiento anticipado · 14–28 días."
    }
  };

  const style = document.createElement("style");
  style.textContent = `
    .cartDeliveryChoices{
      display:grid!important;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:8px!important;
      align-items:stretch!important;
      margin-top:10px;
    }
    .cartDeliveryLabel{
      grid-column:1/-1;
      margin:0 0 2px!important;
      color:#111!important;
      font-size:9px!important;
      font-weight:750!important;
    }
    .cartDeliveryChoice{
      width:100%;
      min-width:0!important;
      min-height:40px!important;
      height:auto!important;
      padding:8px 7px!important;
      border:1px solid rgba(0,0,0,.12)!important;
      border-radius:14px!important;
      background:linear-gradient(145deg,rgba(255,255,255,.84),rgba(255,255,255,.52))!important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.98),0 8px 22px rgba(0,0,0,.045);
      backdrop-filter:blur(24px) saturate(150%);
      -webkit-backdrop-filter:blur(24px) saturate(150%);
      color:#111!important;
      font-size:8px!important;
      font-weight:750!important;
      line-height:1.2;
    }
    .cartDeliveryChoice.selected{
      background:#080808!important;
      border-color:#080808!important;
      color:#fff!important;
    }
    .cartDeliveryExplanation{
      grid-column:1/-1;
      margin-top:1px;
      padding:10px 12px;
      border:1px solid rgba(0,0,0,.07);
      border-radius:13px;
      background:linear-gradient(145deg,rgba(255,255,255,.82),rgba(255,255,255,.48));
      box-shadow:inset 0 1px 0 rgba(255,255,255,.98),0 8px 22px rgba(0,0,0,.04);
      color:#626262;
      font-size:8px;
      line-height:1.5;
    }
    .cartDeliveryExplanation strong{color:#111;font-weight:750}
    .deliveryGlass,.paymentGlass,.paymentSummary,.summaryCard,.cartItem{
      border-color:rgba(0,0,0,.07)!important;
      background:linear-gradient(145deg,rgba(255,255,255,.88),rgba(255,255,255,.56))!important;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.98),0 14px 36px rgba(0,0,0,.055)!important;
      backdrop-filter:blur(28px) saturate(148%)!important;
      -webkit-backdrop-filter:blur(28px) saturate(148%)!important;
    }
    .shippingFields .deliveryField{
      background:linear-gradient(145deg,rgba(255,255,255,.84),rgba(255,255,255,.50))!important;
      border-color:rgba(0,0,0,.075)!important;
      box-shadow:inset 0 1px 0 #fff,0 8px 22px rgba(0,0,0,.035)!important;
    }
    .deliveryChoices{gap:10px!important}
    .deliveryChoice{
      min-height:48px!important;
      border-radius:15px!important;
      background:linear-gradient(145deg,rgba(255,255,255,.86),rgba(255,255,255,.52));
      box-shadow:inset 0 1px 0 rgba(255,255,255,.98),0 8px 22px rgba(0,0,0,.04);
      backdrop-filter:blur(24px) saturate(150%);
      -webkit-backdrop-filter:blur(24px) saturate(150%);
    }
    .deliveryChoice.isSelected{background:#080808!important;color:#fff!important}
    .prontoAddressGate{
      margin:12px 0 0;
      padding:11px 12px;
      border:1px solid rgba(0,0,0,.075);
      border-radius:13px;
      background:linear-gradient(145deg,rgba(255,255,255,.82),rgba(255,255,255,.48));
      color:#666;
      font-size:8px;
      line-height:1.45;
    }
    .prontoAddressGate strong{display:block;margin-bottom:3px;color:#111;font-size:9px}
    #prontoReceivingChoice[hidden],#bagProntoReceivingChoice[hidden]{display:none!important}
    .paymentMethodTabs,.deliveryGlass,.paymentSummary,.customCardShell,.billingGlass{overflow:hidden}
    @media(max-width:390px){
      .cartDeliveryChoices{grid-template-columns:1fr}
      .cartDeliveryLabel,.cartDeliveryExplanation{grid-column:auto}
    }
  `;
  document.head.append(style);

  function addressReady() {
    const department = document.getElementById("deliveryDepartment")?.value || "";
    const city = document.getElementById("deliveryCityDaneCode")?.value || document.getElementById("deliveryCity")?.value || "";
    const address = document.getElementById("deliveryAddress")?.value.trim() || "";
    return Boolean(department && city && address);
  }

  function hasProntoItems() {
    return [...document.querySelectorAll("[data-cart-delivery='pickup']")].length > 0;
  }

  function syncProductDeliveryUI() {
    document.querySelectorAll(".cartDeliveryChoices").forEach(group => {
      const label = group.querySelector(".cartDeliveryLabel");
      if (label) label.textContent = "Opciones de entrega";

      group.querySelectorAll("[data-cart-delivery]").forEach(button => {
        const mode = button.dataset.cartDelivery;
        const names = { pickup: "Pronto", fast: "Rápido", ship: "Libéralo" };
        if (names[mode]) button.textContent = names[mode];
      });

      const selected = group.querySelector("[data-cart-delivery].selected");
      let explanation = group.querySelector(".cartDeliveryExplanation");
      if (!selected) {
        explanation?.remove();
        return;
      }

      const data = explanations[selected.dataset.cartDelivery];
      if (!data) return;
      if (!explanation) {
        explanation = document.createElement("div");
        explanation.className = "cartDeliveryExplanation";
        explanation.setAttribute("aria-live", "polite");
        group.append(explanation);
      }
      explanation.innerHTML = `<strong>${data.title}</strong>${data.copy}`;
    });
  }

  function ensureProntoGate() {
    const receiving = document.getElementById("prontoReceivingChoice");
    if (!receiving) return;

    let gate = document.getElementById("prontoAddressGate");
    if (!gate) {
      gate = document.createElement("div");
      gate.id = "prontoAddressGate";
      gate.className = "prontoAddressGate";
      gate.innerHTML = "<strong>Pronto</strong>Ingresa tu dirección para ver Recoger en punto, Moto y el valor correspondiente.";
      receiving.before(gate);
    }

    const showGate = hasProntoItems() && !addressReady();
    gate.hidden = !showGate;
  }

  function syncProntoReceivingUI() {
    const ready = addressReady();
    const hasPronto = hasProntoItems();
    const shouldShow = hasPronto && ready;

    const receiving = document.getElementById("prontoReceivingChoice");
    const bagReceiving = document.getElementById("bagProntoReceivingChoice");
    if (receiving) receiving.hidden = !shouldShow;
    if (bagReceiving) bagReceiving.hidden = !shouldShow;

    ensureProntoGate();
  }

  function sync() {
    syncProductDeliveryUI();
    syncProntoReceivingUI();
  }

  document.addEventListener("input", event => {
    if (["deliveryDepartment", "deliveryCity", "deliveryAddress", "deliveryPostalCode"].includes(event.target?.id)) {
      queueMicrotask(sync);
    }
  }, true);

  document.addEventListener("change", event => {
    if (["deliveryDepartment", "deliveryCity", "deliveryAddress", "deliveryPostalCode"].includes(event.target?.id)) {
      queueMicrotask(sync);
    }
  }, true);

  document.addEventListener("click", event => {
    if (event.target?.closest?.("[data-cart-delivery],[data-pronto-delivery]")) {
      setTimeout(sync, 0);
    }
  }, true);

  const observer = new MutationObserver(() => queueMicrotask(sync));
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });

  sync();
})();
