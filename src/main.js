import { createClient, OAuthStrategy } from "@wix/sdk";
import { products } from "@wix/stores";

const WIX_CLIENT_ID = "c682f362-82a0-4e32-a16c-acae124ad9a7";

const SOURCE = "CAJAMODA_WIX";
const STOREFRONT_SOURCE = "CAJAMODA_STOREFRONT";

const wixClient = createClient({
  modules: {
    products
  },
  auth: OAuthStrategy({
    clientId: WIX_CLIENT_ID
  })
});

function send(type, payload = {}) {
  window.postMessage(
    {
      source: SOURCE,
      type,
      payload
    },
    window.location.origin
  );
}

function stripHtml(value = "") {
  const element = document.createElement("div");
  element.innerHTML = String(value);
  return element.textContent || element.innerText || "";
}

function imageUrlFromMediaItem(item) {
  return (
    item?.image?.url ||
    item?.url ||
    item?.src ||
    ""
  );
}

function extractMedia(product) {
  const urls = [];

  const main =
    product?.media?.mainMedia?.image?.url ||
    product?.media?.mainMedia?.url ||
    product?.image?.url ||
    "";

  if (main) {
    urls.push(main);
  }

  const items =
    product?.media?.items ||
    product?.media?.mediaItems ||
    [];

  for (const item of items) {
    const url = imageUrlFromMediaItem(item);

    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  }

  return urls;
}

function extractPrice(product) {
  return Number(
    product?.priceData?.discountedPrice ??
    product?.priceData?.price ??
    product?.price?.amount ??
    product?.price ??
    0
  );
}

function extractSizes(product) {
  const options =
    product?.productOptions ||
    product?.options ||
    [];

  const sizeOption = options.find(option => {
    const name = String(
      option?.name ||
      option?.title ||
      ""
    ).toLowerCase();

    return (
      name.includes("size") ||
      name.includes("talla")
    );
  });

  if (!sizeOption) {
    return [];
  }

  const choices =
    sizeOption?.choices ||
    sizeOption?.values ||
    [];

  return choices
    .map(choice =>
      String(
        choice?.description ||
        choice?.value ||
        choice?.name ||
        choice
      ).trim()
    )
    .filter(Boolean);
}

function classifyProduct(name = "") {
  const text = String(name).toLowerCase();

  if (
    text.includes("vestido") ||
    text.includes("dress")
  ) {
    return "Vestidos";
  }

  if (
    text.includes("top") ||
    text.includes("blusa") ||
    text.includes("shirt")
  ) {
    return "Tops";
  }

  if (
    text.includes("conjunto") ||
    text.includes("set")
  ) {
    return "Conjuntos";
  }

  if (
    text.includes("enterizo") ||
    text.includes("jumpsuit")
  ) {
    return "Enterizos";
  }

  return "Vestidos";
}

function normalizeWixProduct(product) {
  const media = extractMedia(product);

  return {
    id:
      product?._id ||
      product?.id,

    masterProductId:
      product?._id ||
      product?.id,

    source: "wix",

    name:
      product?.name ||
      "Producto",

    productType:
      classifyProduct(product?.name),

    vibeId: "late",

    vibes: ["late"],

    price:
      extractPrice(product),

    media,

    sizes:
      extractSizes(product),

    variants: [],

    deliveryModes: [
      "pickup",
      "fast",
      "ship"
    ],

    inventoryMode:
      product?.stock?.trackInventory
        ? "STOCKED"
        : "WIX",

    inventoryStatus:
      product?.stock?.inStock === false
        ? "OUT_OF_STOCK"
        : "AVAILABLE",

    inventoryQuantity:
      product?.stock?.quantity ??
      null,

    fulfillmentConfidence:
      null,

    supplyRef:
      null,

    defaultLocationId:
      null,

    inventoryItems: [],

    supplySyncAt:
      new Date().toISOString(),

    description:
      stripHtml(
        product?.description ||
        ""
      ),

    reviews: []
  };
}

async function loadCatalog() {
  try {
    const result =
      await wixClient.products
        .queryProducts()
        .limit(100)
        .find();

    const wixProducts =
      result?.items ||
      [];

    const normalized =
      wixProducts
        .map(normalizeWixProduct)
        .filter(product => product.id);

    send("INIT", {
      products: normalized,

      sellerId: "CAJAMODA",

      storefrontId: "CAJAMODA",

      storefrontSlug: "cajamoda",

      brand: {
        name: "CAJAMODA",
        publicName: "CajaModa",
        monogram: "CM"
      },

      identity: {},

      cart: {
        items: [],
        count: 0,
        total: 0
      },

      features: {
        reviewsEnabled: false
      },

      inventoryCheckoutMode:
       
