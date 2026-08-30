const NATIONAL_MODES = Object.freeze({
  rapido: "fast",
  liberalo: "ship"
});

export const NATIONAL_SHIPPING = Object.freeze({
  rapido: Object.freeze({
    type: "R",
    mode: NATIONAL_MODES.rapido,
    label: "Rápido Nacional",
    estimate: "4–7 días",
    maxDays: 7
  }),
  liberalo: Object.freeze({
    type: "L",
    mode: NATIONAL_MODES.liberalo,
    label: "Libéralo",
    estimate: "14–28 días",
    maxDays: 28
  })
});

export const STANDARD_CLOTHING_PARCEL = Object.freeze({
  type: "box",
  content: "Ropa para mujer",
  amount: 1,
  lengthUnit: "CM",
  weightUnit: "KG",
  weight: 0.5,
  dimensions: Object.freeze({
    length: 30,
    width: 25,
    height: 5
  })
});

function selectedDeliveryMode(line) {
  return String(
    line?.selectedDeliveryMode ||
    line?.price_data?.product_data?.metadata?.selectedDeliveryMode ||
    ""
  ).trim().toLowerCase();
}

export function nationalShipmentType(line) {
  const mode = selectedDeliveryMode(line);
  if (mode === NATIONAL_MODES.rapido) return "R";
  if (mode === NATIONAL_MODES.liberalo) return "L";
  return "";
}

export function groupNationalShipmentLines(lines = []) {
  const groups = { R: [], L: [] };
  for (const line of Array.isArray(lines) ? lines : []) {
    const type = nationalShipmentType(line);
    if (type) groups[type].push(line);
  }
  return groups;
}

export function nationalShipmentDefinition(type) {
  if (type === "R") return NATIONAL_SHIPPING.rapido;
  if (type === "L") return NATIONAL_SHIPPING.liberalo;
  return null;
}

export function buildNationalShipmentPlan(lines = [], quotes = {}) {
  const groups = groupNationalShipmentLines(lines);
  return ["R", "L"]
    .filter(type => groups[type].length)
    .map(type => {
      const definition = nationalShipmentDefinition(type);
      const quote = quotes[type] || {};
      return {
        type,
        mode: definition.mode,
        label: definition.label,
        estimate: definition.estimate,
        maxDays: definition.maxDays,
        items: groups[type],
        fee: Math.max(0, Number(quote.fee || 0)),
        carrier: String(quote.carrier || ""),
        service: String(quote.service || "")
      };
    });
}

export function nationalShipmentCount(lines = []) {
  return buildNationalShipmentPlan(lines).length;
}

export function applyNationalQuoteToPlan(lines = [], quote = {}) {
  const groups = groupNationalShipmentLines(lines);
  const quotes = {
    R: groups.R.length ? quote : {},
    L: groups.L.length ? quote : {}
  };
  return buildNationalShipmentPlan(lines, quotes);
}

export function publicNationalShipmentPlan(plan = []) {
  return (Array.isArray(plan) ? plan : [])
    .filter(shipment => shipment?.type === "R" || shipment?.type === "L")
    .map(shipment => ({
      type: shipment.type,
      label: String(shipment.label || ""),
      estimate: String(shipment.estimate || ""),
      fee: Math.max(0, Number(shipment.fee || 0)),
      carrier: String(shipment.carrier || ""),
      service: String(shipment.service || ""),
      itemCount: Array.isArray(shipment.items)
        ? shipment.items.reduce(
            (total, line) => total + Math.max(1, Math.floor(Number(line?.quantity || 1))),
            0
          )
        : Math.max(0, Math.floor(Number(shipment.itemCount || 0)))
    }));
}

export function nationalShippingSummary(lines = []) {
  return buildNationalShipmentPlan(lines)
    .map(shipment => `${shipment.label} · ${shipment.estimate}`)
    .join(" + ");
}
