import http from "node:http";
import crypto from "node:crypto";
import Stripe from "stripe";

import {
  createClient,
  ApiKeyStrategy
} from "@wix/sdk";

import {
  productsV3,
  inventoryItemsV3
} from "@wix/stores";

import {
  files
} from "@wix/media";

import {
  orders as ecomOrders
} from "@wix/ecom";

import * as categoriesV3
  from "@wix/categories_categories";

/* ============================================================
   STORE LOADER BACKEND
   ------------------------------------------------------------
   Store Loader -> Secure Backend -> Wix
   ============================================================ */

const PORT =
  Number(
    process.env.PORT ||
    10000
  );

const WIX_API_KEY =
  process.env.WIX_API_KEY;

const WIX_SITE_ID =
  process.env.WIX_SITE_ID;

const LOADER_PASSWORD =
  process.env.LOADER_PASSWORD;

const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN ||
  "https://cajamoda.onrender.com";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_PUBLISHABLE_KEY = safeEnv(process.env.STRIPE_PUBLISHABLE_KEY);
const NEQUI_PHONE = safeEnv(process.env.NEQUI_PHONE);
const ENVIA_API_TOKEN = safeEnv(process.env.ENVIA_API_TOKEN);
const ENVIA_ORIGIN_NAME = safeEnv(process.env.ENVIA_ORIGIN_NAME);
const ENVIA_ORIGIN_PHONE = safeEnv(process.env.ENVIA_ORIGIN_PHONE);
const ENVIA_ORIGIN_STREET = safeEnv(process.env.ENVIA_ORIGIN_STREET);
const ENVIA_ORIGIN_POSTAL_CODE = safeEnv(process.env.ENVIA_ORIGIN_POSTAL_CODE);
const GOOGLE_MAPS_API_KEY = safeEnv(process.env.GOOGLE_MAPS_API_KEY);
const PICKUP_FEE_COP = 10000;
const MOTO_BASE_FEE_COP = 8000;
const MOTO_INCLUDED_KM = 3;
const MOTO_EXTRA_KM_COP = 1000;
const MOTO_QUOTE_CACHE_TTL = 24 * 60 * 60 * 1000;
const motoQuoteCache = new Map();
const stripeIntentSyncLocks = new Map();
const CARTAGENA_PICKUP_ADDRESS = "Cl. 35 #10-22, piso 1, local 1, San Diego, Cartagena de Indias, Bolívar, Colombia";
const STOREFRONT_URL = String(
  process.env.STOREFRONT_URL || "https://www.cajamoda.com"
).replace(/\/$/, "");

const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY)
  : null;

function safeEnv(value) {
  return String(value || "").trim();
}

/* ============================================================
   REQUIRED ENVIRONMENT
   ============================================================ */

const missing = [];

if (
  !WIX_API_KEY
) {
  missing.push(
    "WIX_API_KEY"
  );
}

if (
  !WIX_SITE_ID
) {
  missing.push(
    "WIX_SITE_ID"
  );
}

if (
  !LOADER_PASSWORD
) {
  missing.push(
    "LOADER_PASSWORD"
  );
}

if (
  missing.length
) {

  console.warn(
    `[Store Loader] Missing environment variables: ${missing.join(", ")}`
  );
}

/* ============================================================
   WIX ADMIN CLIENT
   ============================================================ */

const wix =
  WIX_API_KEY &&
  WIX_SITE_ID

    ? createClient({

        auth:
          ApiKeyStrategy({

            apiKey:
              WIX_API_KEY,

            siteId:
              WIX_SITE_ID
          }),

        modules: {

          productsV3,
          inventoryItemsV3,
          categoriesV3,
          files,

          orders:
            ecomOrders
        }
      })

    : null;

/* ============================================================
   TEMPORARY STORE LOADER SESSIONS
   ============================================================ */

const sessions =
  new Map();

const SESSION_TTL =
  12 *
  60 *
  60 *
  1000;

/* ============================================================
   BASIC HELPERS
   ============================================================ */

function now() {

  return Date.now();
}

function createToken() {

  return crypto
    .randomBytes(32)
    .toString("hex");
}

function safeText(
  value,
  maxLength = 500
) {

  return String(
    value ??
    ""
  )
    .trim()
    .slice(
      0,
      maxLength
    );
}

function escapeHtml(
  value
) {

  return String(
    value ??
    ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function sleep(
  milliseconds
) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        milliseconds
      )
  );
}

/* ============================================================
   CORS
   ============================================================ */

function setCors(
  request,
  response
) {

  const origin =
    request.headers.origin ||
    "";

  const allowed =

    origin ===
      ALLOWED_ORIGIN ||

    origin ===
      "https://admin.cajamoda.com" ||

    origin ===
      "https://cajamoda.com" ||

    origin ===
      "https://www.cajamoda.com" ||

    origin ===
      "http://localhost:5173" ||

    origin ===
      "http://127.0.0.1:5173";

  if (
    allowed
  ) {

    response.setHeader(
      "Access-Control-Allow-Origin",
      origin
    );
  }

  response.setHeader(
    "Vary",
    "Origin"
  );

  response.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS"
  );

  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  response.setHeader(
    "Access-Control-Max-Age",
    "86400"
  );
}

/* ============================================================
   RESPONSES
   ============================================================ */

function sendJson(
  response,
  statusCode,
  payload
) {

  response.statusCode =
    statusCode;

  response.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  response.end(
    JSON.stringify(
      payload
    )
  );
}

function sendError(
  response,
  statusCode,
  message
) {

  sendJson(
    response,
    statusCode,
    {
      ok:
        false,

      error:
        message
    }
  );
}

/* ============================================================
   REQUEST BODY
   ============================================================ */

function readBody(
  request
) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const chunks = [];

      let size = 0;

      const maxSize =
        35 *
        1024 *
        1024;

      request.on(
        "data",
        chunk => {

          size +=
            chunk.length;

          if (
            size >
            maxSize
          ) {

            reject(
              new Error(
                "La carga es demasiado grande."
              )
            );

            request.destroy();

            return;
          }

          chunks.push(
            chunk
          );
        }
      );

      request.on(
        "end",
        () => {

          try {

            const raw =
              Buffer
                .concat(
                  chunks
                )
                .toString(
                  "utf8"
                );

            resolve(
              raw
                ? JSON.parse(
                    raw
                  )
                : {}
            );

          } catch {

            reject(
              new Error(
                "Solicitud inválida."
              )
            );
          }
        }
      );

      request.on(
        "error",
        reject
      );
    }
  );
}

function readRawBody(request, maxSize = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", chunk => {
      size += chunk.length;
      if (size > maxSize) {
        reject(new Error("La solicitud es demasiado grande."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

/* ============================================================
   STRIPE CHECKOUT
   ============================================================ */

function stripeChoiceText(item) {
  return [
    item?.size ? `Talla ${safeText(item.size, 40)}` : "",
    item?.color ? `Color ${safeText(item.color, 40)}` : ""
  ].filter(Boolean).join(" · ");
}

function wixVariantPrice(variant) {
  const candidates = [
    variant?.price?.actualPrice?.amount,
    variant?.priceData?.discountedPrice,
    variant?.priceData?.price,
    variant?.price?.amount,
    variant?.price
  ];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value) && value >= 0) return Math.round(value);
  }
  return null;
}

async function stripeLineItemFromCartItem(item) {
  const productId = safeText(item?.productId, 80);
  const variantId = safeText(item?.variantId, 80);
  const quantity = Math.min(20, Math.max(1, Math.floor(Number(item?.quantity || 1))));
  if (!productId) throw new Error("Uno de los productos no tiene un ID válido.");
  if (!wix) throw new Error("Wix no está configurado para verificar precios.");

  const product = await wix.productsV3.getProduct(productId);
  if (!product || product.visible === false) throw new Error("Uno de los productos ya no está disponible.");
  const variants = product?.variantsInfo?.variants || product?.variants || [];
  const variant = variantId
    ? variants.find(candidate => String(candidate?._id || candidate?.id || candidate?.variantId) === variantId)
    : variants[0];
  if (!variant) throw new Error(`La variante seleccionada de ${safeText(product?.name, 80)} ya no está disponible.`);
  if (variant.visible === false || String(variant.inventoryStatus || "").toUpperCase() === "OUT_OF_STOCK") {
    throw new Error(`${safeText(product?.name, 80)} está agotado.`);
  }

  const unitAmount = wixVariantPrice(variant);
  if (!Number.isInteger(unitAmount) || unitAmount < 1) {
    throw new Error(`No pudimos verificar el precio de ${safeText(product?.name, 80)}.`);
  }

  return {
    quantity,
    price_data: {
      currency: "cop",
      // Stripe treats COP as a two-decimal currency in API requests.
      unit_amount: unitAmount * 100,
      product_data: {
        name: safeText(product?.name, 80) || "Producto CajaModa",
        description: stripeChoiceText(item) || undefined,
        metadata: { productId, variantId }
      }
    }
  };
}

async function handleCreateStripeCheckout(request, response) {
  if (!stripe) {
    sendError(response, 503, "Stripe todavía no está configurado en el servidor.");
    return;
  }
  const body = await readBody(request);
  const items = Array.isArray(body?.cart?.items) ? body.cart.items.slice(0, 50) : [];
  if (!items.length) {
    sendError(response, 400, "Tu bolsa está vacía.");
    return;
  }
  const lineItems = await Promise.all(items.map(stripeLineItemFromCartItem));
  const customerEmail = safeText(body?.customer?.email, 250);
  const requestedDelivery = safeText(body?.delivery?.method, 20).toLowerCase();
  const deliveryMethod = ["moto", "national"].includes(requestedDelivery)
    ? requestedDelivery
    : "pickup";
  const delivery = await checkoutDelivery(body);
  const deliveryLabel = deliveryMethod === "pickup"
    ? "Recoger en punto · Cartagena"
    : deliveryMethod === "moto"
      ? `Moto Cartagena · ${delivery.quote.distanceKm} km`
      : `${delivery.quote.carrier || "Envia"} · ${delivery.quote.service || "Envío nacional"}`;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    ui_mode: "elements",
    payment_method_types: ["card"],
    line_items: lineItems,
    customer_email: customerEmail || undefined,
    shipping_options: [{
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: { amount: delivery.fee * 100, currency: "cop" },
        display_name: deliveryLabel,
        delivery_estimate: {
          minimum: { unit: "business_day", value: 1 },
          maximum: { unit: "business_day", value: deliveryMethod === "national" ? 7 : 2 }
        }
          }
    }],
    locale: "es",
    return_url: `${STOREFRONT_URL}/order-confirmation/?stripeSessionId={CHECKOUT_SESSION_ID}`,
    metadata: {
      source: "cajamoda-storefront",
      deliveryMethod,
      deliveryPromise: safeText(body?.delivery?.promise, 40) || "pronto",
      customerName: safeText(body?.customer?.customerName, 160),
      customerPhone: safeText(body?.customer?.customerPhone, 80),
      deliveryAddress: delivery.addressLine,
      deliveryCity: delivery.city,
      deliveryState: delivery.state,
      deliveryPostalCode: delivery.postalCode
    }
  }, {
    idempotencyKey: safeText(body?.requestId, 100) || undefined
  });
  sendJson(response, 200, { ok: true, clientSecret: session.client_secret, sessionId: session.id });
}

async function handleStripeConfirmation(request, response, url) {
  if (!stripe) {
    sendError(response, 503, "Stripe todavía no está configurado.");
    return;
  }
  const sessionId = safeText(url.searchParams.get("sessionId"), 100);
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    sendError(response, 400, "La sesión de pago no es válida.");
    return;
  }
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  sendJson(response, 200, {
    ok: true,
    order: {
      number: session.id.slice(-10).toUpperCase(),
      payment: session.payment_status === "paid" ? "Pago confirmado" : "Pago pendiente",
      paid: session.payment_status === "paid",
      delivery: {
        method: "Entrega CajaModa",
        message: "Te enviaremos la información de entrega por correo."
      }
    }
  });
}

function stripeAddressToWix(address = {}) {
  return {
    country: safeText(address.country, 2),
    subdivision: safeText(address.state, 100),
    city: safeText(address.city, 100),
    postalCode: safeText(address.postal_code, 40),
    addressLine: safeText(address.line1, 250),
    addressLine2: safeText(address.line2, 250)
  };
}

function splitCustomerName(value) {
  const parts = safeText(value, 160).split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || "Cliente",
    lastName: parts.join(" ") || "CajaModa"
  };
}

async function getStripePurchasedLines(session) {
  const result = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ["data.price.product"]
  });
  return result.data.map(line => {
    const stripeProduct = typeof line?.price?.product === "object"
      ? line.price.product
      : {};
    const productId = safeText(stripeProduct?.metadata?.productId, 80);
    const variantId = safeText(stripeProduct?.metadata?.variantId, 80);
    const quantity = Math.max(1, Math.floor(Number(line?.quantity || 1)));
    const amount = Number(line?.price?.unit_amount || 0) / 100;
    if (!productId || !variantId || !Number.isFinite(amount) || amount < 1) {
      throw new Error("Stripe devolvió una línea de pedido incompleta.");
    }
    return {
      productId,
      variantId,
      quantity,
      amount,
      name: safeText(line?.description || stripeProduct?.name, 300) || "Producto CajaModa"
    };
  });
}

async function findStripeWixOrder(sessionId) {
  const result = await wix.orders.searchOrders({
    filter: { number: `S-${sessionId.slice(-12).toUpperCase()}` },
    cursorPaging: { limit: 10 }
  });
  return (result?.orders || [])[0] || null;
}

async function importStripeOrderIntoWix(session, lines) {
  const existing = await findStripeWixOrder(session.id);
  if (existing) return { order: existing, created: false };

  const customer = session?.customer_details || {};
  const shipping = session?.shipping_details || session?.collected_information?.shipping_details || {};
  const name = splitCustomerName(shipping?.name || customer?.name || session?.metadata?.customerName);
  const stripeAddress = stripeAddressToWix(shipping?.address || customer?.address || {});
  const address = session?.metadata?.deliveryMethod === "pickup"
    ? { country: "CO", city: "Cartagena", addressLine: CARTAGENA_PICKUP_ADDRESS }
    : {
        ...stripeAddress,
        country: "CO",
        city: safeText(session?.metadata?.deliveryCity, 100) || stripeAddress.city,
        subdivision: safeText(session?.metadata?.deliveryState, 100) || stripeAddress.subdivision,
        postalCode: safeText(session?.metadata?.deliveryPostalCode, 40) || stripeAddress.postalCode,
        addressLine: safeText(session?.metadata?.deliveryAddress, 250) || stripeAddress.addressLine
      };
  const subtotal = lines.reduce((sum, line) => sum + line.amount * line.quantity, 0);
  const total = Number(session?.amount_total || 0) / 100;

  const imported = await wix.orders.importOrder({
    number: `S-${session.id.slice(-12).toUpperCase()}`,
    status: "APPROVED",
    paymentStatus: "PAID",
    fulfillmentStatus: "NOT_FULFILLED",
    channelInfo: { type: "OTHER_PLATFORM" },
    currency: "COP",
    currencyConversionDetails: { originalCurrency: "COP", conversionRate: "1" },
    buyerInfo: { email: safeText(customer?.email, 250) },
    billingInfo: {
      contactDetails: {
        firstName: name.firstName,
        lastName: name.lastName,
        email: safeText(customer?.email, 250),
        phone: safeText(customer?.phone || session?.metadata?.customerPhone, 80)
      },
      address
    },
    shippingInfo: {
      title: session?.metadata?.deliveryMethod === "pickup"
        ? "Stripe – Pronto – Recoger"
        : session?.metadata?.deliveryMethod === "national"
          ? "Stripe – Rápido – Envío nacional 4–7 días"
          : "Stripe – Pronto – Moto",
      cost: { amount: String(Math.max(0, total - subtotal)) },
      logistics: {
        shippingDestination: {
          address,
          contactDetails: {
            firstName: name.firstName,
            lastName: name.lastName,
            email: safeText(customer?.email, 250),
            phone: safeText(customer?.phone || session?.metadata?.customerPhone, 80)
          }
        }
      }
    },
    lineItems: lines.map(line => ({
      productName: { original: line.name },
      quantity: line.quantity,
      price: { amount: String(line.amount) },
      itemType: { preset: "PHYSICAL" },
      physicalProperties: { shippable: true },
      catalogReference: {
        appId: WIX_STORES_APP_ID,
        catalogItemId: line.productId,
        options: { variantId: line.variantId }
      }
    })),
    priceSummary: {
      subtotal: { amount: String(subtotal) },
      shipping: { amount: String(Math.max(0, total - subtotal)) },
      tax: { amount: "0" },
      discount: { amount: "0" },
      total: { amount: String(total) }
    }
  });
  return { order: imported?.order || imported, created: true };
}

async function decrementStripeInventory(lines) {
  await wix.inventoryItemsV3.bulkDecrementInventoryItemsByVariantAndLocation(
    lines.map(line => ({
      variantId: line.variantId,
      decrementBy: line.quantity
    })),
    { restrictInventory: true, returnEntity: true, reason: "ORDER" }
  );
}

async function syncCompletedStripeSession(session) {
  if (!wix) throw new Error("Wix no está configurado para recibir el pedido.");
  if (session.payment_status !== "paid") return;
  if (session?.metadata?.wixSync === "complete") return;

  const lines = await getStripePurchasedLines(session);
  const imported = await importStripeOrderIntoWix(session, lines);
  if (imported.created) {
    await decrementStripeInventory(lines);
  }
  await stripe.checkout.sessions.update(session.id, {
    metadata: {
      ...session.metadata,
      wixSync: "complete",
      wixOrderId: safeText(imported?.order?._id || imported?.order?.id, 80)
    }
  });
}

function stripeIntentMetadata(lines, body, delivery) {
  const metadata = {
    source: "cajamoda-custom-card",
    itemCount: String(lines.length),
    deliveryMethod: safeText(body?.delivery?.method, 20),
    deliveryPromise: safeText(body?.delivery?.promise, 40) || "pronto",
    customerName: safeText(body?.customer?.customerName, 160),
    customerPhone: safeText(body?.customer?.customerPhone, 80),
    customerEmail: safeText(body?.customer?.email, 250),
    deliveryAddress: safeText(delivery.addressLine, 250),
    deliveryCity: safeText(delivery.city, 100),
    deliveryState: safeText(delivery.state, 100),
    deliveryPostalCode: safeText(delivery.postalCode, 40),
    deliveryFee: String(Math.max(0, Number(delivery.fee || 0)))
  };
  lines.forEach((line, index) => {
    metadata[`item${index}`] = Buffer.from(JSON.stringify({
      p: line.productId,
      v: line.variantId,
      q: line.quantity,
      a: line.amount,
      n: safeText(line.name, 180)
    })).toString("base64url");
  });
  return metadata;
}

function stripeIntentLines(intent) {
  const count = Math.min(35, Math.max(0, Number(intent?.metadata?.itemCount || 0)));
  return Array.from({ length: count }, (_, index) => {
    const encoded = safeText(intent?.metadata?.[`item${index}`], 500);
    const item = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return {
      productId: safeText(item.p, 80),
      variantId: safeText(item.v, 80),
      quantity: Math.max(1, Math.floor(Number(item.q || 1))),
      amount: Number(item.a || 0),
      name: safeText(item.n, 300) || "Producto CajaModa"
    };
  }).filter(line => line.productId && line.variantId && Number.isFinite(line.amount) && line.amount >= 1);
}

async function handleCreateStripePaymentIntent(request, response) {
  if (!stripe) return sendError(response, 503, "Stripe todavía no está configurado en el servidor.");
  const body = await readBody(request);
  const items = Array.isArray(body?.cart?.items) ? body.cart.items.slice(0, 35) : [];
  if (!items.length) return sendError(response, 400, "Tu bolsa está vacía.");
  const verified = await Promise.all(items.map(stripeLineItemFromCartItem));
  const lines = verified.map(line => ({
    productId: safeText(line?.price_data?.product_data?.metadata?.productId, 80),
    variantId: safeText(line?.price_data?.product_data?.metadata?.variantId, 80),
    quantity: Math.max(1, Math.floor(Number(line.quantity || 1))),
    amount: Number(line?.price_data?.unit_amount || 0) / 100,
    name: safeText(line?.price_data?.product_data?.name, 300) || "Producto CajaModa"
  }));
  const delivery = await checkoutDelivery(body);
  const subtotalCents = lines.reduce((sum, line) => sum + Math.round(line.amount * 100) * line.quantity, 0);
  const totalCents = subtotalCents + Math.round(Math.max(0, Number(delivery.fee || 0)) * 100);
  const customerName = safeText(body?.customer?.customerName, 160) || "Cliente CajaModa";
  const customerEmail = safeText(body?.customer?.email, 250);
  const customerPhone = safeText(body?.customer?.customerPhone, 80);
  const intent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: "cop",
    payment_method_types: ["card", "link"],
    receipt_email: customerEmail || undefined,
    description: `CajaModa · ${lines.length} producto${lines.length === 1 ? "" : "s"}`,
    shipping: {
      name: customerName,
      phone: customerPhone || undefined,
      address: {
        line1: delivery.addressLine || CARTAGENA_PICKUP_ADDRESS,
        city: delivery.city || "Cartagena",
        state: delivery.state || "BL",
        postal_code: delivery.postalCode || "130001",
        country: "CO"
      }
    },
    metadata: stripeIntentMetadata(lines, body, delivery)
  }, {
    idempotencyKey: safeText(body?.requestId, 100) || undefined
  });
  sendJson(response, 200, {
    ok: true,
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amount: totalCents
  });
}

async function findStripeIntentWixOrder(intentId) {
  const result = await wix.orders.searchOrders({
    filter: { number: `S-${intentId.slice(-12).toUpperCase()}` },
    cursorPaging: { limit: 10 }
  });
  return (result?.orders || [])[0] || null;
}

async function importStripeIntentIntoWix(intent, lines) {
  const existing = await findStripeIntentWixOrder(intent.id);
  if (existing) return { order: existing, created: false };
  const paymentMethod = typeof intent.payment_method === "object"
    ? intent.payment_method
    : intent.payment_method
      ? await stripe.paymentMethods.retrieve(intent.payment_method)
      : null;
  const billing = paymentMethod?.billing_details || {};
  const name = splitCustomerName(billing.name || intent.metadata.customerName);
  const deliveryMethod = safeText(intent.metadata.deliveryMethod, 20) || "pickup";
  const address = deliveryMethod === "pickup"
    ? { country: "CO", city: "Cartagena", subdivision: "BL", postalCode: "130001", addressLine: CARTAGENA_PICKUP_ADDRESS }
    : {
        country: "CO",
        city: safeText(intent.metadata.deliveryCity, 100),
        subdivision: safeText(intent.metadata.deliveryState, 100),
        postalCode: safeText(intent.metadata.deliveryPostalCode, 40),
        addressLine: safeText(intent.metadata.deliveryAddress, 250)
      };
  const subtotal = lines.reduce((sum, line) => sum + line.amount * line.quantity, 0);
  const total = Number(intent.amount_received || intent.amount || 0) / 100;
  const imported = await wix.orders.importOrder({
    number: `S-${intent.id.slice(-12).toUpperCase()}`,
    status: "APPROVED",
    paymentStatus: "PAID",
    fulfillmentStatus: "NOT_FULFILLED",
    channelInfo: { type: "OTHER_PLATFORM" },
    currency: "COP",
    currencyConversionDetails: { originalCurrency: "COP", conversionRate: "1" },
    buyerInfo: { email: safeText(billing.email || intent.receipt_email || intent.metadata.customerEmail, 250) },
    billingInfo: {
      contactDetails: {
        firstName: name.firstName,
        lastName: name.lastName,
        email: safeText(billing.email || intent.receipt_email || intent.metadata.customerEmail, 250),
        phone: safeText(billing.phone || intent.metadata.customerPhone, 80)
      },
      address
    },
    shippingInfo: {
      title: deliveryMethod === "pickup"
        ? "Stripe – Pronto – Recoger"
        : deliveryMethod === "national"
          ? "Stripe – Rápido – Envío nacional 4–7 días"
          : "Stripe – Pronto – Moto",
      cost: { amount: String(Math.max(0, total - subtotal)) },
      logistics: { shippingDestination: { address, contactDetails: {
        firstName: name.firstName, lastName: name.lastName,
        email: safeText(billing.email || intent.receipt_email || intent.metadata.customerEmail, 250),
        phone: safeText(intent.metadata.customerPhone, 80)
      } } }
    },
    lineItems: lines.map(line => ({
      productName: { original: line.name }, quantity: line.quantity,
      price: { amount: String(line.amount) }, itemType: { preset: "PHYSICAL" },
      physicalProperties: { shippable: true },
      catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: line.productId, options: { variantId: line.variantId } }
    })),
    priceSummary: {
      subtotal: { amount: String(subtotal) }, shipping: { amount: String(Math.max(0, total - subtotal)) },
      tax: { amount: "0" }, discount: { amount: "0" }, total: { amount: String(total) }
    }
  });
  return { order: imported?.order || imported, created: true };
}

async function syncSucceededStripeIntent(paymentIntent) {
  const existingSync = stripeIntentSyncLocks.get(paymentIntent.id);
  if (existingSync) return existingSync;
  const sync = (async () => {
    if (!wix) throw new Error("Wix no está configurado para recibir el pedido.");
    if (paymentIntent.status !== "succeeded" || paymentIntent?.metadata?.wixSync === "complete") return;
    const latest = await stripe.paymentIntents.retrieve(paymentIntent.id);
    if (latest?.metadata?.wixSync === "complete") return;
    const lines = stripeIntentLines(latest);
    if (!lines.length) throw new Error("Stripe devolvió un pedido sin productos verificables.");
    const imported = await importStripeIntentIntoWix(latest, lines);
    if (imported.created) await decrementStripeInventory(lines);
    await stripe.paymentIntents.update(latest.id, { metadata: {
      ...latest.metadata,
      wixSync: "complete",
      wixOrderId: safeText(imported?.order?._id || imported?.order?.id, 80)
    } });
  })();
  stripeIntentSyncLocks.set(paymentIntent.id, sync);
  try {
    return await sync;
  } finally {
    stripeIntentSyncLocks.delete(paymentIntent.id);
  }
}

async function handleStripeIntentConfirmation(request, response, url) {
  if (!stripe) return sendError(response, 503, "Stripe todavía no está configurado.");
  const intentId = safeText(url.searchParams.get("paymentIntent"), 100);
  if (!/^pi_[A-Za-z0-9]+$/.test(intentId)) return sendError(response, 400, "El pago no es válido.");
  const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ["payment_method"] });
  if (intent.status === "succeeded") await syncSucceededStripeIntent(intent);
  const deliveryTitle = intent.metadata.deliveryMethod === "pickup"
    ? "Pronto – Recoger en punto"
    : intent.metadata.deliveryMethod === "national"
      ? "Rápido – Envío nacional 4–7 días"
      : "Pronto – Moto Cartagena";
  sendJson(response, 200, {
    ok: true,
    order: {
      paid: intent.status === "succeeded",
      number: `S-${intent.id.slice(-12).toUpperCase()}`,
      payment: intent.status === "succeeded" ? "Pago con tarjeta confirmado" : "Pago en proceso",
      delivery: getConfirmationDelivery({ shippingInfo: { title: deliveryTitle } })
    }
  });
}

async function handleStripeWebhook(request, response) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    sendError(response, 503, "El webhook de Stripe no está configurado.");
    return;
  }
  const rawBody = await readRawBody(request);
  const signature = request.headers["stripe-signature"];
  const event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  if (event.type === "checkout.session.completed") {
    await syncCompletedStripeSession(event.data.object);
    console.log(`[Stripe] Payment synchronized with Wix: ${event.data.object.id}`);
  }
  if (event.type === "payment_intent.succeeded") {
    await syncSucceededStripeIntent(event.data.object);
    console.log(`[Stripe] Card payment synchronized with Wix: ${event.data.object.id}`);
  }
  sendJson(response, 200, { received: true });
}

/* ============================================================
   CUSTOM CHECKOUT / NEQUI
   ============================================================ */

function maskedNequiPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits.length >= 4 ? `••• ••• ${digits.slice(-4)}` : "Número pendiente";
}

function requireDeliveryEnvironment(method) {
  const origin = [ENVIA_ORIGIN_NAME, ENVIA_ORIGIN_PHONE, ENVIA_ORIGIN_STREET, ENVIA_ORIGIN_POSTAL_CODE];
  if (method === "moto" && (!GOOGLE_MAPS_API_KEY || origin.some(value => !value))) {
    throw new Error("La tarifa de moto todavía no está configurada.");
  }
  if (method === "national" && (!ENVIA_API_TOKEN || origin.some(value => !value))) {
    throw new Error("El envío nacional todavía no está configurado.");
  }
}

async function externalJson(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await fetch(url, { ...options, signal: controller.signal });
    const payload = await result.json().catch(() => ({}));
    if (!result.ok) {
      const message = safeText(payload?.error?.message || payload?.message, 300);
      throw new Error(message || `Servicio de entrega no disponible (${result.status}).`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function fullColombiaAddress(street, city, state = "Bolívar", postalCode = "") {
  return [street, city, state, postalCode, "Colombia"].filter(Boolean).join(", ");
}

async function quoteMotoDelivery(delivery) {
  requireDeliveryEnvironment("moto");
  const destination = safeText(delivery?.address, 250);
  if (!destination) throw new Error("Ingresa la dirección para calcular la moto.");
  const cacheKey = destination.toLocaleLowerCase("es-CO").replace(/\s+/g, " ");
  const cached = motoQuoteCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < MOTO_QUOTE_CACHE_TTL) return cached.quote;
  const payload = await externalJson("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "routes.distanceMeters"
    },
    body: JSON.stringify({
      origin: { address: fullColombiaAddress(ENVIA_ORIGIN_STREET, "Cartagena de Indias", "Bolívar", ENVIA_ORIGIN_POSTAL_CODE) },
      destination: { address: fullColombiaAddress(destination, "Cartagena de Indias") },
      travelMode: "TWO_WHEELER",
      routingPreference: "TRAFFIC_UNAWARE",
      languageCode: "es-CO",
      units: "METRIC"
    })
  });
  const distanceMeters = Number(payload?.routes?.[0]?.distanceMeters);
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    throw new Error("No pudimos calcular la ruta. Revisa la dirección.");
  }
  const distanceKm = Math.ceil(distanceMeters / 1000);
  const fee = MOTO_BASE_FEE_COP + Math.max(0, distanceKm - MOTO_INCLUDED_KM) * MOTO_EXTRA_KM_COP;
  const quote = { method: "moto", fee, distanceKm, carrier: "Moto CajaModa", service: "Pronto", estimate: "24–48 horas" };
  if (motoQuoteCache.size >= 2000) motoQuoteCache.delete(motoQuoteCache.keys().next().value);
  motoQuoteCache.set(cacheKey, { createdAt: Date.now(), quote });
  return quote;
}

function enviaDataArray(payload) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.data) ? payload.data : [];
}

function ratePrice(rate) {
  return Number(rate?.totalPrice ?? rate?.price ?? rate?.cost ?? rate?.amount);
}

function rateMaxDays(rate) {
  const raw = safeText(rate?.deliveryEstimate || rate?.deliveryDate || rate?.estimatedDelivery, 100);
  const numbers = raw.match(/\d+/g)?.map(Number) || [];
  return numbers.length ? Math.max(...numbers) : 99;
}

async function locateColombiaCity(city, state) {
  const payload = await externalJson("https://api.envia.com/locate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city, state, country: "CO" })
  });
  const located = Array.isArray(payload?.data) ? payload.data[0] : payload?.data || payload;
  if (!located?.city) throw new Error("No pudimos validar la ciudad de entrega.");
  return located;
}

async function enviaCarriers() {
  const payload = await externalJson("https://queries.envia.com/available-carrier/CO/0/1", {
    headers: { Authorization: `Bearer ${ENVIA_API_TOKEN}` }
  });
  const names = enviaDataArray(payload)
    .map(item => safeText(item?.name || item?.carrier, 60).toLowerCase())
    .filter(Boolean);
  return [...new Set(names)].slice(0, 16);
}

async function quoteNationalDelivery(delivery, customer, declaredValue) {
  requireDeliveryEnvironment("national");
  const city = safeText(delivery?.city, 100);
  const state = safeText(delivery?.state, 5).toUpperCase();
  const street = safeText(delivery?.address, 250);
  const postalCode = safeText(delivery?.postalCode, 20);
  if (!city || !state || !street) throw new Error("Completa la ciudad, departamento y dirección de entrega.");
  const located = await locateColombiaCity(city, state);
  const carriers = await enviaCarriers();
  if (!carriers.length) throw new Error("Envia no devolvió transportadoras disponibles.");
  const quoteBody = carrier => ({
    origin: {
      name: ENVIA_ORIGIN_NAME, phone: ENVIA_ORIGIN_PHONE, street: ENVIA_ORIGIN_STREET,
      city: "13001000", state: "BL", country: "CO", postalCode: ENVIA_ORIGIN_POSTAL_CODE
    },
    destination: {
      name: safeText(customer?.customerName || customer?.name, 120) || "Cliente CajaModa",
      phone: safeText(customer?.customerPhone || customer?.phone, 50), street,
      city: safeText(located.city, 20), state: safeText(located.state || state, 5), country: "CO",
      postalCode: postalCode || safeText(located.postalCode || located.zipcode, 20)
    },
    packages: [{
      type: "box", content: "Ropa para mujer", amount: 1,
      declaredValue: Math.max(1, Math.round(Number(declaredValue) || 1)),
      lengthUnit: "CM", weightUnit: "KG", weight: 0.5,
      dimensions: { length: 30, width: 25, height: 5 }
    }],
    settings: { currency: "COP" },
    shipment: { type: 1, carrier }
  });
  const responses = await Promise.allSettled(carriers.map(carrier => externalJson("https://api.envia.com/ship/rate/", {
    method: "POST",
    headers: { Authorization: `Bearer ${ENVIA_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(quoteBody(carrier))
  })));
  const rates = responses.flatMap(result => result.status === "fulfilled" ? enviaDataArray(result.value) : [])
    .filter(rate => Number.isFinite(ratePrice(rate)) && ratePrice(rate) >= 0);
  if (!rates.length) throw new Error("No encontramos una tarifa nacional para esta dirección.");
  const timely = rates.filter(rate => rateMaxDays(rate) <= 7);
  const selected = (timely.length ? timely : rates).sort((a, b) => ratePrice(a) - ratePrice(b))[0];
  return {
    method: "national", fee: Math.ceil(ratePrice(selected)),
    carrier: safeText(selected.carrier, 60),
    service: safeText(selected.serviceDescription || selected.service, 100),
    estimate: safeText(selected.deliveryEstimate || "4–7 días", 100)
  };
}

async function calculateDeliveryQuote(body) {
  const method = safeText(body?.delivery?.method, 20).toLowerCase();
  if (method === "pickup") return { method, fee: PICKUP_FEE_COP, carrier: "CajaModa", service: "Recoger", estimate: "24–48 horas" };
  if (method === "moto") return quoteMotoDelivery(body?.delivery || {});
  if (method === "national") return quoteNationalDelivery(body?.delivery || {}, body?.customer || {}, body?.cart?.total);
  throw new Error("Selecciona un método de entrega válido.");
}

async function handleDeliveryQuote(request, response) {
  const body = await readBody(request);
  const quote = await calculateDeliveryQuote(body);
  sendJson(response, 200, { ok: true, quote });
}

async function handleDeliveryDepartments(_request, response) {
  if (!ENVIA_API_TOKEN) return sendError(response, 503, "Envia todavía no está configurado.");
  const payload = await externalJson("https://queries.envia.com/state?country_code=CO", {
    headers: { Authorization: `Bearer ${ENVIA_API_TOKEN}` }
  });
  const departments = enviaDataArray(payload)
    .filter(item => !item?.country_code || String(item.country_code).toUpperCase() === "CO")
    .map(item => ({
    code: safeText(item?.code || item?.code_2_digits || item?.state_code || item?.abbreviation, 5),
    name: safeText(item?.name || item?.state || item?.description, 100)
  })).filter(item => item.code && item.name)
    .filter((item, index, all) => all.findIndex(candidate => candidate.code === item.code) === index)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  if (!departments.length) return sendError(response, 502, "Envia no devolvió los departamentos de Colombia.");
  sendJson(response, 200, { ok: true, departments });
}

async function handleCheckoutConfig(_request, response) {
  sendJson(response, 200, {
    ok: true,
    stripe: {
      configured: Boolean(stripe && STRIPE_PUBLISHABLE_KEY),
      publishableKey: STRIPE_PUBLISHABLE_KEY
    },
    nequi: {
      configured: Boolean(NEQUI_PHONE),
      phone: NEQUI_PHONE,
      masked: maskedNequiPhone(NEQUI_PHONE)
    }
  });
}

function checkoutCustomer(body) {
  const customer = body?.customer || {};
  const name = splitCustomerName(customer.customerName || customer.name);
  return {
    name,
    email: safeText(customer.email, 250),
    phone: safeText(customer.customerPhone || customer.phone, 80)
  };
}

async function checkoutDelivery(body) {
  const requested = safeText(body?.delivery?.method, 20).toLowerCase();
  const method = ["moto", "national"].includes(requested) ? requested : "pickup";
  const addressLine = method !== "pickup"
    ? safeText(body?.delivery?.address || body?.customer?.deliveryAddress, 250)
    : CARTAGENA_PICKUP_ADDRESS;
  const city = method === "national"
    ? safeText(body?.delivery?.city || body?.customer?.deliveryDestinationCity, 100)
    : "Cartagena";
  const quote = await calculateDeliveryQuote(body);
  return {
    method, addressLine, city,
    state: safeText(body?.delivery?.state, 5),
    postalCode: safeText(body?.delivery?.postalCode, 20),
    fee: quote.fee,
    quote
  };
}

async function verifiedCheckoutLines(items) {
  const verified = await Promise.all(items.map(stripeLineItemFromCartItem));
  return verified.map(line => ({
    productId: line.price_data.product_data.metadata.productId,
    variantId: line.price_data.product_data.metadata.variantId,
    quantity: line.quantity,
    amount: Number(line.price_data.unit_amount) / 100,
    name: line.price_data.product_data.name,
    description: line.price_data.product_data.description || ""
  }));
}

function nequiOrderNumber(requestId) {
  const digest = crypto.createHash("sha256").update(requestId).digest("hex").slice(0, 10).toUpperCase();
  return `N-${digest}`;
}

async function handleCreateNequiOrder(request, response) {
  if (!wix) return sendError(response, 503, "Wix no está configurado para recibir el pedido.");
  if (!NEQUI_PHONE) return sendError(response, 503, "El número Nequi todavía no está configurado.");
  const body = await readBody(request);
  const requestId = safeText(body?.requestId, 100);
  const items = Array.isArray(body?.cart?.items) ? body.cart.items.slice(0, 50) : [];
  if (!requestId || !items.length) return sendError(response, 400, "El pedido no es válido.");

  const number = nequiOrderNumber(requestId);
  const existingResult = await wix.orders.searchOrders({ filter: { number }, cursorPaging: { limit: 1 } });
  const existing = existingResult?.orders?.[0];
  if (existing) {
    return sendJson(response, 200, { ok: true, orderId: existing._id || existing.id, orderNumber: number, paymentStatus: existing.paymentStatus });
  }

  const lines = await verifiedCheckoutLines(items);
  const subtotal = lines.reduce((sum, line) => sum + line.amount * line.quantity, 0);
  const customer = checkoutCustomer(body);
  const delivery = await checkoutDelivery(body);
  const reference = safeText(body?.reference, 100);
  const deliveryTitle = delivery.method === "moto"
    ? "Pronto – Moto Cartagena"
    : delivery.method === "national"
      ? `Rápido – Envío nacional 4–7 días – ${delivery.city}`
      : "Pronto – Recoger Cartagena";
  const title = `${deliveryTitle}${reference ? ` · Ref ${reference}` : ""}`;
  const address = {
    country: "CO",
    city: delivery.city,
    subdivision: delivery.state,
    postalCode: delivery.postalCode,
    addressLine: delivery.addressLine
  };

  const imported = await wix.orders.importOrder({
    number,
    status: "APPROVED",
    paymentStatus: "PENDING_MERCHANT",
    fulfillmentStatus: "NOT_FULFILLED",
    channelInfo: { type: "OTHER_PLATFORM" },
    currency: "COP",
    currencyConversionDetails: { originalCurrency: "COP", conversionRate: "1" },
    buyerInfo: { email: customer.email },
    billingInfo: {
      contactDetails: { firstName: customer.name.firstName, lastName: customer.name.lastName, email: customer.email, phone: customer.phone },
      address
    },
    shippingInfo: {
      title,
      cost: { amount: String(delivery.fee) },
      logistics: {
        shippingDestination: {
          address,
          contactDetails: { firstName: customer.name.firstName, lastName: customer.name.lastName, email: customer.email, phone: customer.phone }
        }
      }
    },
    lineItems: lines.map(line => ({
      productName: { original: line.name },
      quantity: line.quantity,
      price: { amount: String(line.amount) },
      itemType: { preset: "PHYSICAL" },
      physicalProperties: { shippable: true },
      catalogReference: { appId: WIX_STORES_APP_ID, catalogItemId: line.productId, options: { variantId: line.variantId } }
    })),
    priceSummary: {
      subtotal: { amount: String(subtotal) },
      shipping: { amount: String(delivery.fee) },
      tax: { amount: "0" },
      discount: { amount: "0" },
      total: { amount: String(subtotal + delivery.fee) }
    }
  });

  await decrementStripeInventory(lines);
  const order = imported?.order || imported;
  sendJson(response, 201, { ok: true, orderId: order?._id || order?.id, orderNumber: number, paymentStatus: "PENDING_MERCHANT" });
}

async function handleConfirmNequiOrder(request, response, orderId) {
  if (!isAuthorized(request)) return sendError(response, 401, "Inicia sesión en Store Loader.");
  if (!wix) return sendError(response, 503, "Wix no está configurado.");
  const order = await wix.orders.getOrder(orderId);
  if (!String(order?.number || "").startsWith("N-")) return sendError(response, 400, "Este no es un pedido Nequi.");
  if (String(order.paymentStatus).toUpperCase() === "PAID") {
    return sendJson(response, 200, { ok: true, order: normalizeWixOrder(order) });
  }
  const updated = await wix.orders.importOrder({ ...order, paymentStatus: "PAID" });
  sendJson(response, 200, { ok: true, order: normalizeWixOrder(updated?.order || updated) });
}

/* ============================================================
   PUBLIC WIX PRODUCT REVIEWS
   ============================================================ */

const WIX_REVIEW_NAMESPACE = process.env.WIX_REVIEW_NAMESPACE || "stores";

async function wixReviewsRequest(path,body){
  if(!WIX_API_KEY || !WIX_SITE_ID){
    throw new Error("Wix Reviews no está configurado.");
  }
  const response = await fetch(`https://www.wixapis.com${path}`,{
    method:"POST",
    headers:{
      "Authorization":WIX_API_KEY,
      "wix-site-id":WIX_SITE_ID,
      "Content-Type":"application/json"
    },
    body:JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if(!response.ok){
    throw new Error(payload?.message || payload?.error || "Wix Reviews rechazó la solicitud.");
  }
  return payload;
}

function normalizeWixReview(review){
  return {
    id:review?._id || review?.id || "",
    rating:Number(review?.content?.rating || review?.rating || 0),
    authorName:review?.author?.authorName || review?.author?.displayName || review?.authorName || "Cliente CajaModa",
    content:review?.content?.body || review?.body || "",
    status:review?.moderation?.moderationStatus || review?.moderationStatus || review?.status || "SUBMITTED",
    verified:review?.verified === true
  };
}

async function handleGetProductReviews(request,response,url){
  const productId=String(url.searchParams.get("productId") || "").trim();
  if(!productId){sendError(response,400,"Falta el producto.");return}
  const payload=await wixReviewsRequest("/reviews/v1/reviews/query",{
    query:{
      filter:{namespace:WIX_REVIEW_NAMESPACE,entityId:productId},
      sort:[{fieldName:"createdDate",order:"DESC"}],
      paging:{limit:100}
    }
  });
  const reviews=(payload?.reviews || payload?.items || [])
    .map(normalizeWixReview)
    .filter(review =>
      review.verified &&
      (review.status === "APPROVED" || review.status === "PUBLISHED")
    );
  const count=reviews.length;
  const averageRating=count
    ? reviews.reduce((sum,review)=>sum+review.rating,0)/count
    : 0;
  sendJson(response,200,{ok:true,reviews,summary:{averageRating,reviewCount:count}});
}

/* ============================================================
   AUTHENTICATION
   ============================================================ */

function cleanSessions() {

  const current =
    now();

  for (
    const [
      token,
      session
    ]
    of sessions
  ) {

    if (
      session.expiresAt <=
      current
    ) {

      sessions.delete(
        token
      );
    }
  }
}

function createSession() {

  cleanSessions();

  const token =
    createToken();

  sessions.set(
    token,
    {

      createdAt:
        now(),

      expiresAt:
        now() +
        SESSION_TTL
    }
  );

  return token;
}

function getBearerToken(
  request
) {

  const header =
    String(
      request
        .headers
        .authorization ||
      ""
    );

  if (
    !header.startsWith(
      "Bearer "
    )
  ) {

    return "";
  }

  return header
    .slice(7)
    .trim();
}

function isAuthorized(
  request
) {

  cleanSessions();

  const token =
    getBearerToken(
      request
    );

  if (
    !token
  ) {

    return false;
  }

  const session =
    sessions.get(
      token
    );

  if (
    !session
  ) {

    return false;
  }

  if (
    session.expiresAt <=
    now()
  ) {

    sessions.delete(
      token
    );

    return false;
  }

  session.expiresAt =
    now() +
    SESSION_TTL;

  return true;
}

/* ============================================================
   IMAGE DATA
   ============================================================ */

function parseDataImage(
  dataUrl
) {

  const value =
    String(
      dataUrl ||
      ""
    );

  const match =
    value.match(
      /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
    );

  if (
    !match
  ) {

    throw new Error(
      "Una de las fotos no tiene un formato válido."
    );
  }

  const mimeType =
    match[1];

  const buffer =
    Buffer.from(
      match[2],
      "base64"
    );

  if (
    !buffer.length
  ) {

    throw new Error(
      "Una de las fotos está vacía."
    );
  }

  const maxImageSize =
    8 *
    1024 *
    1024;

  if (
    buffer.length >
    maxImageSize
  ) {

    throw new Error(
      "Cada foto debe pesar menos de 8 MB."
    );
  }

  return {

    mimeType,

    buffer
  };
}

function extensionForMime(
  mimeType
) {

  switch (
    mimeType
  ) {

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    case "image/gif":
      return "gif";

    case "image/heic":
      return "heic";

    case "image/heif":
      return "heif";

    case "image/jpeg":
    case "image/jpg":
    default:
      return "jpg";
  }
}

/* ============================================================
   WAIT FOR WIX MEDIA
   ============================================================ */

async function waitForFileReady(
  fileId
) {

  const attempts =
    24;

  for (
    let attempt = 0;
    attempt < attempts;
    attempt += 1
  ) {

    try {

      const descriptor =
        await wix
          .files
          .getFileDescriptor(
            fileId
          );

      if (
        descriptor
          ?.operationStatus ===
        "READY"
      ) {

        return descriptor;
      }

    } catch (
      error
    ) {

      if (
        attempt ===
        attempts - 1
      ) {

        throw error;
      }
    }

    await sleep(
      500
    );
  }

  throw new Error(
    "Wix todavía está procesando una foto. Intenta publicar otra vez."
  );
}

/* ============================================================
   UPLOAD ONE IMAGE TO WIX
   ============================================================ */

async function uploadImage(
  dataUrl,
  index
) {

  const {
    mimeType,
    buffer
  } =
    parseDataImage(
      dataUrl
    );

  const extension =
    extensionForMime(
      mimeType
    );

  const fileName =
    `store-loader-${Date.now()}-${index + 1}.${extension}`;

  const generated =
    await wix
      .files
      .generateFileUploadUrl(
        mimeType,
        {
          fileName
        }
      );

  const uploadUrl =
    generated
      ?.uploadUrl;

  if (
    !uploadUrl
  ) {

    throw new Error(
      "Wix no devolvió una dirección para cargar la foto."
    );
  }

  const uploadResponse =
    await fetch(
      uploadUrl,
      {

        method:
          "PUT",

        headers: {

          "Content-Type":
            mimeType
        },

        body:
          buffer
      }
    );

  if (
    !uploadResponse.ok
  ) {

    const text =
      await uploadResponse
        .text();

    throw new Error(
      `No pudimos cargar una foto en Wix. ${text}`
    );
  }

  const uploaded =
    await uploadResponse
      .json();

  const fileId =
    uploaded
      ?.file
      ?.id;

  if (
    !fileId
  ) {

    throw new Error(
      "Wix no devolvió el ID de la foto."
    );
  }

  await waitForFileReady(
    fileId
  );

  return fileId;
}

/* ============================================================
   UPLOAD PRODUCT PHOTOS
   ============================================================ */

async function uploadPhotos(
  photos
) {

  const selected =
    Array.isArray(
      photos
    )
      ? photos
          .filter(Boolean)
          .slice(
            0,
            5
          )
      : [];

  const fileIds = [];

  for (
    let index = 0;
    index < selected.length;
    index += 1
  ) {

    const fileId =
      await uploadImage(
        selected[index],
        index
      );

    fileIds.push(
      fileId
    );
  }

  return fileIds;
}

/* ============================================================
   PRODUCT OPTIONS
   ============================================================ */

function cleanList(
  values,
  maxItems = 20
) {

  if (
    !Array.isArray(
      values
    )
  ) {

    return [];
  }

  return [
    ...new Set(
      values
        .map(
          value =>
            safeText(
              value,
              50
            )
        )
        .filter(Boolean)
    )
  ]
    .slice(
      0,
      maxItems
    );
}

function buildOptions(
  sizes,
  colors
) {

  const options = [];

  if (
    sizes.length
  ) {

    options.push({

      name:
        "Size",

      optionRenderType:
        "TEXT_CHOICES",

      choicesSettings: {

        choices:
          sizes.map(
            size => ({

              name:
                size,

              choiceType:
                "CHOICE_TEXT"
            })
          )
      }
    });
  }

  if (
    colors.length
  ) {

    options.push({

      name:
        "Color",

      optionRenderType:
        "TEXT_CHOICES",

      choicesSettings: {

        choices:
          colors.map(
            color => ({

              name:
                color,

              choiceType:
                "CHOICE_TEXT"
            })
          )
      }
    });
  }

  return options;
}

/* ============================================================
   VARIANT COMBINATIONS
   ============================================================ */

function buildCombinations(
  sizes,
  colors
) {

  if (
    sizes.length &&
    colors.length
  ) {

    return sizes.flatMap(
      size =>
        colors.map(
          color => ({
            size,
            color
          })
        )
    );
  }

  if (
    sizes.length
  ) {

    return sizes.map(
      size => ({
        size,
        color:
          ""
      })
    );
  }

  if (
    colors.length
  ) {

    return colors.map(
      color => ({
        size:
          "",
        color
      })
    );
  }

  return [
    {
      size:
        "",
      color:
        ""
    }
  ];
}

function buildVariantChoices(
  combination
) {

  const choices = [];

  if (
    combination.size
  ) {

    choices.push({

      optionChoiceNames: {

        optionName:
          "Size",

        choiceName:
          combination.size,

        renderType:
          "TEXT_CHOICES"
      }
    });
  }

  if (
    combination.color
  ) {

    choices.push({

      optionChoiceNames: {

        optionName:
          "Color",

        choiceName:
          combination.color,

        renderType:
          "TEXT_CHOICES"
      }
    });
  }

  return choices;
}

/* ============================================================
   VARIANTS
   ============================================================ */

function buildVariants(
  sizes,
  colors,
  price,
  quantity
) {

  const combinations =
    buildCombinations(
      sizes,
      colors
    );

  const totalQuantity =
    Math.max(
      0,
      Number(
        quantity ||
        0
      )
    );

  const quantityPerVariant =
    combinations.length
      ? Math.floor(
          totalQuantity /
          combinations.length
        )
      : totalQuantity;

  let remainder =
    combinations.length
      ? totalQuantity %
        combinations.length
      : 0;

  return combinations.map(
    combination => {

      const variantQuantity =
        quantityPerVariant +
        (
          remainder > 0
            ? 1
            : 0
        );

      if(
        remainder > 0
      ){
        remainder -= 1;
      }

      return {

        visible:
          true,

        choices:
          buildVariantChoices(
            combination
          ),

        price: {

          actualPrice: {

            amount:
              String(
                price
              )
          }
        },

        inventoryItem: {

          quantity:
            variantQuantity
        },

        physicalProperties:
          {}
      };
    }
  );
}


/* ============================================================
   CATEGORY LABEL
   ============================================================ */

const CATEGORY_NAMES = {

  late:
    "Noches Largas",

  chill:
    "Dias Tranquilos",

  quick:
    "Rapido y Facil",

  sun:
    "Bano De Sol"
};

function getCategoryName(
  category
) {

  return (
    CATEGORY_NAMES[
      category
    ] ||
    "CajaModa"
  );
}


const WIX_STORES_APP_ID =
  "215238eb-22a5-4c36-9e7b-e7c08025e04e";

const STORE_CATEGORY_TREE = {
  appNamespace:
    "@wix/stores"
};

const CATEGORY_ROUTE_BY_NAME = {
  "noches largas":
    "late",

  "dias tranquilos":
    "chill",

  "rapido y facil":
    "quick",

  "bano de sol":
    "sun"
};

function normalizeCategoryRouteName(
  value
) {

  return String(
    value ||
    ""
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .trim();
}

function categoryRouteFromName(
  value
) {

  return (
    CATEGORY_ROUTE_BY_NAME[
      normalizeCategoryRouteName(
        value
      )
    ] ||
    ""
  );
}

let categoryRouteCache = {
  expiresAt:
    0,

  routes:
    {}
};

async function queryRoutedCategories() {

  const result =
    await wix
      .categoriesV3
      .queryCategories({
        treeReference:
          STORE_CATEGORY_TREE,

        returnNonVisibleCategories:
          true
      })
      .limit(
        1000
      )
      .find();

  return (
    result?.items ||
    []
  )
    .map(
      category => ({
        id:
          String(
            category?._id ||
            category?.id ||
            ""
          ),

        name:
          String(
            category?.name ||
            ""
          ),

        vibeId:
          categoryRouteFromName(
            category?.name
          )
      })
    )
    .filter(
      category =>
        category.id &&
        category.vibeId
    );
}

async function getCategoryRoutes() {

  if (
    categoryRouteCache
      .expiresAt >
    Date.now()
  ) {

    return (
      categoryRouteCache
        .routes
    );
  }

  if (
    !wix
  ) {

    throw new Error(
      "El servidor todavía no está conectado a Wix."
    );
  }

  const categories =
    await queryRoutedCategories();

  const memberships =
    await Promise.all(
      categories.map(
        async category => {

          const result =
            await wix
              .categoriesV3
              .listItemsInCategory(
                category.id,
                STORE_CATEGORY_TREE,
                {
                  cursorPaging: {
                    limit:
                      100
                  }
                }
              );

          return {
            vibeId:
              category.vibeId,

            productIds:
              (
                result?.items ||
                []
              )
                .filter(
                  item =>
                    !item?.appId ||
                    item.appId ===
                      WIX_STORES_APP_ID
                )
                .map(
                  item =>
                    String(
                      item
                        ?.catalogItemId ||
                      ""
                    )
                )
                .filter(
                  Boolean
                )
          };
        }
      )
    );

  const routes = {};

  for (
    const membership
    of memberships
  ) {

    for (
      const productId
      of membership.productIds
    ) {

      routes[
        productId
      ] =
        membership.vibeId;
    }
  }

  categoryRouteCache = {
    expiresAt:
      Date.now() +
      60 * 1000,

    routes
  };

  return routes;
}

async function assignProductCategory(
  productId,
  categoryKey
) {

  const targetVibe =
    categoryRouteFromName(
      CATEGORY_NAMES[
        categoryKey
      ] ||
      categoryKey
    );

  if (
    !targetVibe
  ) {

    return;
  }

  const categories =
    await queryRoutedCategories();

  const target =
    categories.find(
      category =>
        category.vibeId ===
        targetVibe
    );

  if (
    !target
  ) {

    throw new Error(
      `No existe la categoria Wix "${CATEGORY_NAMES[categoryKey] || categoryKey}".`
    );
  }

  await wix
    .categoriesV3
    .bulkAddItemsToCategory(
      target.id,
      [
        {
          appId:
            WIX_STORES_APP_ID,

          catalogItemId:
            String(
              productId
            )
        }
      ],
      {
        treeReference:
          STORE_CATEGORY_TREE
      }
    );

  categoryRouteCache
    .expiresAt =
      0;
}

/* ============================================================
   CREATE WIX PRODUCT
   ============================================================ */

async function createWixProduct(
  input
) {

  if (
    !wix
  ) {

    throw new Error(
      "El servidor todavía no está conectado a Wix."
    );
  }

  const name =
    safeText(
      input.name,
      80
    );

  const description =
    safeText(
      input.description,
      16000
    );

  const price =
    Number(
      input.price ||
      0
    );

  const quantity =
    Math.max(
      0,
      Number(
        input.quantity ||
        0
      )
    );

  const category =
    safeText(
      input.category,
      30
    );

  const storeId =
    safeText(
      input.storeId,
      100
    ) ||
    "carolize";

  const storeName =
    safeText(
      input.storeName,
      100
    ) ||
    "Carolize Boutique";

  const sizes =
    cleanList(
      input.sizes,
      10
    );

  const colors =
    cleanList(
      input.colors,
      20
    );

  if (
    !name
  ) {

    throw new Error(
      "El producto necesita un nombre."
    );
  }

  if (
    !Number.isFinite(
      price
    ) ||
    price <= 0
  ) {

    throw new Error(
      "El producto necesita un precio válido."
    );
  }

  const photoIds =
    await uploadPhotos(
      input.photos
    );

  const options =
    buildOptions(
      sizes,
      colors
    );

  const variants =
    buildVariants(
      sizes,
      colors,
      price,
      quantity
    );

  const product = {

    name,

    productType:
      "PHYSICAL",

    visible:
      true,

    plainDescription:
      description
        ? `<p>${escapeHtml(description)}</p>`
        : "<p></p>",

    physicalProperties:
      {},

    options,

    variantsInfo: {

      variants
    },

    media:
      photoIds.length
        ? {

            itemsInfo: {

              items:
                photoIds.map(
                  id => ({
                    id
                  })
                )
            }
          }
        : undefined
  };

  const result =
    await wix
      .productsV3
      .bulkCreateProductsWithInventory(
        [
          product
        ],
        {

          fields: [
            "CURRENCY"
          ],

          returnEntity:
            true
        }
      );

  const productResult =
    result
      ?.productResults
      ?.results
      ?.[0];

  if (
    productResult
      ?.itemMetadata
      ?.success ===
    false
  ) {

    throw new Error(
      productResult
        ?.itemMetadata
        ?.error
        ?.message ||
      "Wix rechazó el producto."
    );
  }
const inventoryResults =
  Array.isArray(
    result
      ?.inventoryResults
      ?.results
  )
    ? result.inventoryResults.results
    : [];

if(
  !inventoryResults.length
){

  console.error(
    "[Store Loader Inventory]",
    JSON.stringify(
      result?.inventoryResults || {},
      null,
      2
    )
  );

  throw new Error(
    "Wix creó el producto, pero no creó ningún registro de inventario."
  );
}

const failedInventory =
  inventoryResults.filter(
    item =>
      item
        ?.itemMetadata
        ?.success ===
      false
  );

if(
  failedInventory.length
){

  console.error(
    "[Store Loader Inventory Failure]",
    JSON.stringify(
      failedInventory,
      null,
      2
    )
  );

  throw new Error(
    failedInventory[0]
      ?.itemMetadata
      ?.error
      ?.message ||
    "Wix creó el producto, pero rechazó su inventario."
  );
}

  const created =
    productResult
      ?.item;

  if (
    !created
      ?._id &&
    !created
      ?.id
  ) {

    throw new Error(
      "Wix no devolvió el producto creado."
    );
  }
const createdInventoryItems =
  inventoryResults
    .map(
      inventoryResult =>
        inventoryResult?.item
    )
    .filter(
      inventoryItem =>
        inventoryItem &&
        (
          inventoryItem._id ||
          inventoryItem.id
        )
    );

if(
  !createdInventoryItems.length
){
  throw new Error(
    "Wix creó el producto, pero no devolvió los registros de inventario."
  );
}

const trackedQuantity =
  Math.max(
    0,
    Math.trunc(
      Number(
        quantity || 0
      )
    )
  );

const quantityPerItem =
  Math.floor(
    trackedQuantity /
    createdInventoryItems.length
  );

let quantityRemainder =
  trackedQuantity %
  createdInventoryItems.length;

for(
  const inventoryItem
  of createdInventoryItems
){

  const inventoryItemId =
    inventoryItem._id ||
    inventoryItem.id;

  const itemQuantity =
    quantityPerItem +
    (
      quantityRemainder > 0
        ? 1
        : 0
    );

  if(
    quantityRemainder > 0
  ){
    quantityRemainder -= 1;
  }

  await wix
    .inventoryItemsV3
    .updateInventoryItem(
      inventoryItemId,
      {
        id:
          inventoryItemId,

        revision:
          inventoryItem.revision,

        quantity:
          itemQuantity
      },
      {
        reason:
          "MANUAL"
      }
    );
}
  await assignProductCategory(
    created._id ||
    created.id,
    category
  );

  return {

    id:
      created._id ||
      created.id,

    name:
      created.name ||
      name,

    slug:
      created.slug ||
      "",

    visible:
      created.visible !==
      false,

    price,

    quantity,

    category,

    categoryName:
      getCategoryName(
        category
      ),

    storeId,

    storeName,

    sizes,

    colors,

    photos:
      photoIds,

    wixProduct:
      created
  };
}

/* ============================================================
   LOGIN
   ============================================================ */

async function handleLogin(
  request,
  response
) {

  if (
    !LOADER_PASSWORD
  ) {

    sendError(
      response,
      503,
      "Store Loader todavía no tiene una contraseña configurada."
    );

    return;
  }

  const body =
    await readBody(
      request
    );

  const password =
    String(
      body.password ||
      ""
    );

  const supplied =
    Buffer.from(
      password
    );

  const expected =
    Buffer.from(
      LOADER_PASSWORD
    );

  const matches =

    supplied.length ===
      expected.length &&

    crypto
      .timingSafeEqual(
        supplied,
        expected
      );

  if (
    !matches
  ) {

    sendError(
      response,
      401,
      "Contraseña incorrecta."
    );

    return;
  }

  const token =
    createSession();

  sendJson(
    response,
    200,
    {

      ok:
        true,

      token,

      expiresIn:
        SESSION_TTL
    }
  );
}

/* ============================================================
   PRODUCT ENDPOINT
   ============================================================ */

async function handleCreateProduct(
  request,
  response
) {

  if (
    !isAuthorized(
      request
    )
  ) {

    sendError(
      response,
      401,
      "Inicia sesión en Store Loader."
    );

    return;
  }

  const body =
    await readBody(
      request
    );

  const product =
    await createWixProduct(
      body
    );

  sendJson(
    response,
    201,
    {

      ok:
        true,

      product
    }
  );
}

/* ============================================================
   REAL WIX ORDERS
   ============================================================ */

function getContactDetails(
  order
) {

  return (
    order
      ?.billingInfo
      ?.contactDetails ||

    order
      ?.shippingInfo
      ?.logistics
      ?.shippingDestination
      ?.contactDetails ||

    {}
  );
}

function getOrderCustomerName(
  order
) {

  const contact =
    getContactDetails(
      order
    );

  const directName =
    safeText(
      contact.fullName,
      200
    );

  if (
    directName
  ) {

    return directName;
  }

  const combined =
    [
      safeText(
        contact.firstName,
        100
      ),

      safeText(
        contact.lastName,
        100
      )
    ]
      .filter(Boolean)
      .join(" ");

  if (
    combined
  ) {

    return combined;
  }

  return (
    safeText(
      order
        ?.buyerInfo
        ?.email,
      250
    ) ||
    "Cliente"
  );
}

function getLineItemName(
  item
) {

  return (
    safeText(
      item
        ?.productName
        ?.translated,
      300
    ) ||

    safeText(
      item
        ?.productName
        ?.original,
      300
    ) ||

    safeText(
      item
        ?.productName,
      300
    ) ||

    "Producto"
  );
}

function getOrderProductsText(
  order
) {

  const lineItems =
    Array.isArray(
      order?.lineItems
    )
      ? order.lineItems
      : [];

  return lineItems
    .map(
      item => {

        const quantity =
          Math.max(
            1,
            Number(
              item?.quantity ||
              1
            )
          );

        return (
          `${quantity} × ${getLineItemName(item)}`
        );
      }
    )
    .join(", ");
}

function getOrderTotal(
  order
) {

  const amount =
    order
      ?.priceSummary
      ?.total
      ?.amount;

  const value =
    Number(
      amount ||
      0
    );

  return Number.isFinite(
    value
  )
    ? value
    : 0;
}

function getLocalOrderStatus(
  order
) {

  const fulfillmentStatus =
    String(
      order
        ?.fulfillmentStatus ||
      ""
    )
      .toUpperCase();

  const paymentStatus =
    String(
      order
        ?.paymentStatus ||
      ""
    )
      .toUpperCase();

  if (
    fulfillmentStatus ===
    "FULFILLED"
  ) {

    return "delivered";
  }

  if (
    fulfillmentStatus ===
    "PARTIALLY_FULFILLED"
  ) {

    return "shipped";
  }

  if (
    paymentStatus ===
    "PAID" ||
    paymentStatus ===
    "PARTIALLY_PAID"
  ) {

    return "processing";
  }

  return "new";
}

function getFirstTrackingInfo(
  order
) {

  const fulfillments =
    Array.isArray(
      order?.fulfillments
    )
      ? order.fulfillments
      : [];

  for (
    const fulfillment
    of fulfillments
  ) {

    const trackingInfo =
      fulfillment
        ?.trackingInfo;

    if (
      trackingInfo
    ) {

      return trackingInfo;
    }
  }

  return {};
}

function normalizeWixOrder(
  order
) {

  const trackingInfo =
    getFirstTrackingInfo(
      order
    );

  return {

    id:
      safeText(
        order?._id ||
        order?.id,
        150
      ),

    number:
      safeText(
        order?.number,
        100
      ),

    date:
      safeText(
        order?.createdDate,
        100
      ),

    customer:
      getOrderCustomerName(
        order
      ),

    email:
      safeText(
        order
          ?.buyerInfo
          ?.email,
        250
      ),

    products:
      getOrderProductsText(
        order
      ),

    total:
      getOrderTotal(
        order
      ),

    status:
      getLocalOrderStatus(
        order
      ),

    paymentStatus:
      safeText(
        order
          ?.paymentStatus,
        100
      ),

    paymentMethod:
      String(order?.number || "").startsWith("N-")
        ? "nequi"
        : "card",

    canConfirmPayment:
      String(order?.number || "").startsWith("N-") &&
      !["PAID", "PARTIALLY_PAID"].includes(String(order?.paymentStatus || "").toUpperCase()),

    delivery:
      safeText(order?.shippingInfo?.title, 250),

    fulfillmentStatus:
      safeText(
        order
          ?.fulfillmentStatus,
        100
      ),

    carrier:
      safeText(
        trackingInfo
          ?.shippingProvider,
        200
      ),

    trackingNumber:
      safeText(
        trackingInfo
          ?.trackingNumber,
        300
      )
  };
}

async function getWixOrders() {

  if (
    !wix
  ) {

    throw new Error(
      "El servidor todavía no está conectado a Wix."
    );
  }

  const search = {

    sort: [
      {
        fieldName:
          "createdDate",

        order:
          "DESC"
      }
    ],

    cursorPaging: {

      limit:
        50
    }
  };

  const result =
    await wix
      .orders
      .searchOrders(
        search
      );

  const orderList =
    Array.isArray(
      result?.orders
    )
      ? result.orders
      : [];

  return orderList
    .map(
      normalizeWixOrder
    )
    .filter(
      order =>
        order.id
    );
}

async function handleGetOrders(
  request,
  response
) {

  if (
    !isAuthorized(
      request
    )
  ) {

    sendError(
      response,
      401,
      "Inicia sesión en Store Loader."
    );

    return;
  }

  const orderList =
    await getWixOrders();

  sendJson(
    response,
    200,
    {

      ok:
        true,

      orders:
        orderList
    }
  );
}
async function handleTrackOrder(
  request,
  response,
  url
) {

  const orderNumber =
    safeText(
      url.searchParams.get(
        "order"
      ),
      100
    ).trim();

  const email =
    safeText(
      url.searchParams.get(
        "email"
      ),
      250
    )
      .trim()
      .toLowerCase();

  if(
    !orderNumber ||
    !email
  ){

    sendError(
      response,
      400,
      "Ingresa tu número de pedido y correo electrónico."
    );

    return;
  }

  const result =
    await wix
      .orders
      .searchOrders(
        {
          filter: {
            number:
              orderNumber
          },

          cursorPaging: {
            limit:
              10
          }
        }
      );

  const wixOrders =
    Array.isArray(
      result?.orders
    )
      ? result.orders
      : [];

  const matchedOrder =
    wixOrders.find(
      order => {

        const orderEmail =
          safeText(
            order
              ?.buyerInfo
              ?.email,
            250
          )
            .trim()
            .toLowerCase();

        return (
          safeText(
            order?.number,
            100
          ) === orderNumber &&
          orderEmail === email
        );
      }
    );

  if(
    !matchedOrder
  ){

    sendError(
      response,
      404,
      "No pudimos encontrar un pedido con esos datos."
    );

    return;
  }

  const order =
    normalizeWixOrder(
      matchedOrder
    );

  sendJson(
    response,
    200,
    {
      ok:
        true,

      order: {
        number:
          order.number,

        date:
          order.date,

        products:
          order.products,

        total:
          order.total,

        status:
          order.status,

        fulfillmentStatus:
          order.fulfillmentStatus,

        carrier:
          order.carrier,

        trackingNumber:
          order.trackingNumber
      }
    }
  );
}

const CONFIRMED_PAYMENT_STATUSES = new Set([
  "PAID",
  "PARTIALLY_PAID",
  "AUTHORIZED"
]);

function isCheckoutId(value) {
  return /^[a-z0-9-]{20,80}$/i.test(value);
}

async function findOrderByCheckoutId(checkoutId) {
  if (!wix) throw new Error("Wix no está configurado.");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await wix.orders.searchOrders({
      filter: { checkoutId },
      cursorPaging: { limit: 10 }
    });
    const order = (result?.orders || []).find(
      candidate => safeText(candidate?.checkoutId, 100) === checkoutId
    );
    if (order) return order;
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 700));
  }
  return null;
}

function getConfirmationDelivery(order) {
  const title = safeText(
    order?.shippingInfo?.title ||
    order?.shippingInfo?.logistics?.deliveryTime ||
    order?.shippingInfo?.logistics?.shippingDestination?.address?.city,
    160
  ).trim();
  const normalized = title.toLowerCase();

  if (normalized.includes("pickup") || normalized.includes("recog")) {
    return { method: title || "Pickup Ahora", message: "Te avisaremos cuando tu pedido esté listo." };
  }
  if (normalized.includes("libér") || normalized.includes("liber")) {
    return { method: title || "Libéralo", message: "Te enviaremos actualizaciones durante los próximos 14–21 días." };
  }
  return { method: title || "Entrega CajaModa", message: "Te enviaremos la información de entrega por correo." };
}

async function handleOrderConfirmation(request, response, url) {
  const checkoutId = safeText(url.searchParams.get("checkoutId"), 100).trim();
  if (!isCheckoutId(checkoutId)) {
    sendError(response, 400, "El identificador del pedido no es válido.");
    return;
  }

  const order = await findOrderByCheckoutId(checkoutId);
  if (!order) {
    sendError(response, 404, "El pedido todavía no está disponible.");
    return;
  }

  const paymentStatus = safeText(order?.paymentStatus, 100).toUpperCase();
  const payment = paymentStatus === "AUTHORIZED"
    ? "Pago autorizado"
    : CONFIRMED_PAYMENT_STATUSES.has(paymentStatus)
      ? "Pago confirmado"
      : "Pedido recibido";

  sendJson(response, 200, {
    ok: true,
    order: {
      number: safeText(order?.number, 100),
      payment,
      delivery: getConfirmationDelivery(order)
    }
  });
}

async function wixCouponsRequest(path, body) {
  if (!WIX_API_KEY || !WIX_SITE_ID) throw new Error("Wix Coupons no está configurado.");
  const result = await fetch(`https://www.wixapis.com${path}`, {
    method: "POST",
    headers: {
      "Authorization": WIX_API_KEY,
      "wix-site-id": WIX_SITE_ID,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) {
    throw new Error(payload?.message || payload?.error || "Wix Coupons rechazó la solicitud.");
  }
  return payload;
}

function createReferralCode(order) {
  const orderNumber = safeText(order?.number, 40).replace(/[^a-z0-9]/gi, "");
  const digest = crypto.createHash("sha256")
    .update(safeText(order?.checkoutId, 100))
    .digest("hex")
    .slice(0, 5)
    .toUpperCase();
  return `AMIGA${orderNumber}${digest}`.slice(0, 20).toUpperCase();
}

async function ensureReferralCoupon(order) {
  const code = createReferralCode(order);
  const queried = await wixCouponsRequest("/stores/v2/coupons/query", {
    query: {
      filter: { "specification.code": code },
      paging: { limit: 1 }
    }
  });
  const existing = (queried?.coupons || []).find(
    coupon => coupon?.specification?.code === code
  );

  if (!existing) {
    await wixCouponsRequest("/stores/v2/coupons", {
      specification: {
        name: `Amiga pedido ${safeText(order?.number, 40)}`,
        code,
        percentOffRate: 10,
        scope: { namespace: "stores", group: { name: "product" } },
        startTime: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 30 * 86400000).toISOString(),
        usageLimit: 1,
        limitPerCustomer: 1,
        active: true
      }
    });
  }
  return code;
}

async function handleCreateReferral(request, response) {
  const body = await readBody(request);
  const checkoutId = safeText(body?.checkoutId, 100).trim();
  if (!isCheckoutId(checkoutId)) {
    sendError(response, 400, "El identificador del pedido no es válido.");
    return;
  }

  const order = await findOrderByCheckoutId(checkoutId);
  const paymentStatus = safeText(order?.paymentStatus, 100).toUpperCase();
  if (!order || !CONFIRMED_PAYMENT_STATUSES.has(paymentStatus)) {
    sendError(response, 403, "El pedido debe estar confirmado antes de compartir un descuento.");
    return;
  }

  const code = await ensureReferralCoupon(order);
  sendJson(response, 200, { ok: true, code, url: "https://www.cajamoda.com/" });
}

/* ============================================================
   REAL WIX INVENTORY
   ============================================================ */

function normalizeInventoryItem(
  item
) {

  return {

    id:
      safeText(
        item?._id ||
        item?.id,
        150
      ),

    productId:
      safeText(
        item?.productId,
        150
      ),

    variantId:
      safeText(
        item?.variantId,
        150
      ),

    productName:
      safeText(
        item
          ?.product
          ?.name,
        300
      ),

    variantName:
      safeText(
        item
          ?.product
          ?.variantName,
        300
      ),

    quantity:
      Number.isFinite(
        Number(
          item?.quantity
        )
      )
        ? Number(
            item.quantity
          )
        : 0,

    trackQuantity:
      Boolean(
        item?.trackQuantity
      ),

    inStock:
      Boolean(
        item?.inStock
      ),

    availabilityStatus:
      safeText(
        item?.availabilityStatus,
        100
      )
  };
}

async function getWixInventory() {

  if (
    !wix
  ) {

    throw new Error(
      "El servidor todavía no está conectado a Wix."
    );
  }

const result =
  await wix
    .inventoryItemsV3
    .queryInventoryItems()
    .limit(
      1000
    )
    .find();

console.log(
  "[WIX INVENTORY RAW]",
  JSON.stringify(
    result,
    null,
    2
  )
);

const inventoryItems =
  Array.isArray(
    result?.items
  )
    ? result.items
    : [];
  return inventoryItems
    .map(
      normalizeInventoryItem
    )
    .filter(
      item =>
        item.id
    );
}

async function handleGetInventory(
  request,
  response
) {

  if (
    !isAuthorized(
      request
    )
  ) {

    sendError(
      response,
      401,
      "Inicia sesión en Store Loader."
    );

    return;
  }

  const inventory =
    await getWixInventory();

  sendJson(
    response,
    200,
    {

      ok:
        true,

      inventory
    }
  );
}

/* ============================================================
   SERVER
   ============================================================ */

const server =
  http.createServer(
    async (
      request,
      response
    ) => {

      setCors(
        request,
        response
      );

      if (
        request.method ===
        "OPTIONS"
      ) {

        response.statusCode =
          204;

        response.end();

        return;
      }

      const url =
        new URL(
          request.url,
          `http://${request.headers.host || "localhost"}`
        );

      try {

        /* ------------------------------------------------------
           HEALTH
           ------------------------------------------------------ */

        if (
          request.method ===
            "GET" &&
          url.pathname ===
            "/health"
        ) {

          sendJson(
            response,
            200,
            {

              ok:
                true,

              service:
                "Store Loader API",

              wixConfigured:
                Boolean(
                  WIX_API_KEY &&
                  WIX_SITE_ID
                ),

              loaderConfigured:
                Boolean(
                  LOADER_PASSWORD
                )
            }
          );

          return;
        }

        /* ------------------------------------------------------
           PUBLIC STOREFRONT CATEGORY ROUTER
           ------------------------------------------------------ */

        if (
          request.method ===
            "GET" &&
          url.pathname ===
            "/api/category-routes"
        ) {

          try {

            const routes =
              await getCategoryRoutes();

            sendJson(
              response,
              200,
              {
                routes
              }
            );

          } catch (
            error
          ) {

            console.error(
              "[Category Router]",
              error
            );

            sendJson(
              response,
              500,
              {
                error:
                  "No se pudieron resolver las categorias."
              }
            );
          }

          return;
        }

        if(request.method === "GET" && url.pathname === "/api/reviews"){
          await handleGetProductReviews(request,response,url);
          return;
        }

        if(request.method === "GET" && url.pathname === "/api/order-confirmation"){
          await handleOrderConfirmation(request,response,url);
          return;
        }

        if(request.method === "POST" && url.pathname === "/api/referrals"){
          await handleCreateReferral(request,response);
          return;
        }

        if(request.method === "POST" && url.pathname === "/api/stripe/checkout"){
          await handleCreateStripeCheckout(request,response);
          return;
        }

        if(request.method === "POST" && url.pathname === "/api/stripe/payment-intent"){
          await handleCreateStripePaymentIntent(request,response);
          return;
        }

        if(request.method === "GET" && url.pathname === "/api/stripe/confirmation"){
          await handleStripeConfirmation(request,response,url);
          return;
        }

        if(request.method === "GET" && url.pathname === "/api/stripe/intent-confirmation"){
          await handleStripeIntentConfirmation(request,response,url);
          return;
        }

        if(request.method === "POST" && url.pathname === "/api/stripe/webhook"){
          await handleStripeWebhook(request,response);
          return;
        }

        if(request.method === "GET" && url.pathname === "/api/checkout/config"){
          await handleCheckoutConfig(request,response);
          return;
        }

        if(request.method === "POST" && url.pathname === "/api/delivery/quote"){
          await handleDeliveryQuote(request,response);
          return;
        }

        if(request.method === "GET" && url.pathname === "/api/delivery/departments"){
          await handleDeliveryDepartments(request,response);
          return;
        }

        if(request.method === "POST" && url.pathname === "/api/nequi/orders"){
          await handleCreateNequiOrder(request,response);
          return;
        }

        const nequiConfirmMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/confirm-nequi$/);
        if(request.method === "POST" && nequiConfirmMatch){
          await handleConfirmNequiOrder(request,response,decodeURIComponent(nequiConfirmMatch[1]));
          return;
        }

        /* ------------------------------------------------------
           LOGIN
           ------------------------------------------------------ */

        if (
          request.method ===
            "POST" &&
          url.pathname ===
            "/api/login"
        ) {

          await handleLogin(
            request,
            response
          );

          return;
        }

        /* ------------------------------------------------------
           CREATE PRODUCT
           ------------------------------------------------------ */

        if (
          request.method ===
            "POST" &&
          url.pathname ===
            "/api/products"
        ) {

          await handleCreateProduct(
            request,
            response
          );

          return;
        }

        /* ------------------------------------------------------
           REAL ORDERS
           ------------------------------------------------------ */

        if (
          request.method ===
            "GET" &&
          url.pathname ===
            "/api/orders"
        ) {

          await handleGetOrders(
            request,
            response
          );

          return;
        }
        /* ------------------------------------------------------
   CUSTOMER ORDER TRACKING
   ------------------------------------------------------ */

if (
  request.method ===
    "GET" &&
  url.pathname ===
    "/api/track-order"
) {

  await handleTrackOrder(
    request,
    response,
    url
  );

  return;
}
/* ------------------------------------------------------
   REAL INVENTORY
   ------------------------------------------------------ */

if (
  request.method ===
    "GET" &&
  url.pathname ===
    "/api/inventory"
) {

  await handleGetInventory(
    request,
    response
  );

  return;
}
        /* ------------------------------------------------------
           NOT FOUND
           ------------------------------------------------------ */

        sendError(
          response,
          404,
          "Ruta no encontrada."
        );

      } catch (
        error
      ) {

        console.error(
          "[Store Loader API]",
          error
        );

        sendError(
          response,
          500,
          error?.message ||
          "Ocurrió un error en Store Loader."
        );
      }
    }
  );

/* ============================================================
   START
   ============================================================ */

server.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `[Store Loader API] Running on port ${PORT}`
    );
  }
);
