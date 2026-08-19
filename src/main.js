import { createClient, OAuthStrategy } from "@wix/sdk";
import { products } from "@wix/stores";

const clientId = import.meta.env.VITE_WIX_CLIENT_ID;

if (!clientId) {
  throw new Error("VITE_WIX_CLIENT_ID is missing.");
}

const wix = createClient({
  modules: { products },
  auth: OAuthStrategy({ clientId })
});

let catalog = [];
let responseSource = "CAJAMODA_WIX";

function send(type, payload = {}) {
  window.postMessage(
    { source: responseSource, type, payload },
    window.location.origin
  );
}

function cleanText(html = "") {
  const el = document.createElement("div");
  el.innerHTML = String(html);
  return el.textContent || "";
}

function getPrice(product) {
  return Number(
    product?.priceData?.discountedPrice ??
    product?.priceData?.price ??
    product?.price?.amount ??
    product?.price ??
    0
  );
}

function getImages(product) {
  const urls = [];

  const add = url => {
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  };

  add(product?.media?.mainMedia?.image?.url);
  add(product?.media?.mainMedia?.url);
  add(product?.image?.url);
  add(product?.imageUrl);

  for (const item of product?.media?.items || []) {
    add(item?.image?.url);
    add(item?.url);
    add(item?.imageUrl);
  }

  return urls;
}

function getSize(variant) {
  const choices =
    variant?.choices ||
    variant?.variant?.choices ||
    {};

  return (
    choices.Size ||
    choices.size ||
    choices.Talla ||
    choices.talla ||
    ""
  );
}

function normalizeProduct(product) {
  const id = product?._id || product?.id || "";
  const basePrice = getPrice(product);

  const variants = (product?.variants || []).map(item => {
    const raw = item?.variant || item;

    return {
      id:
        item?._id ||
        item?.id ||
        raw?._id ||
        raw?.id ||
        "",

      productId: id,
      size: getSize(item),

      sku:
        raw?.sku ||
        item?.sku ||
        "",

      price: Number(
        raw?.priceData?.price ??
        item?.priceData?.price ??
        basePrice
      ),

      inStock:
        raw?.stock?.inStock !== false &&
        item?.stock?.inStock !== false
    };
  });

  const sizes = [
    ...new Set(
      variants
        .map(item => item.size)
        .filter(Boolean)
    )
  ];

  return {
    id,
    masterProductId: id,
    source: "wix",

    name:
      product?.name ||
      "Producto",

    productType:
      "Vestidos",

    vibeId:
      "late",

    vibes:
      ["late"],

    price:
      basePrice,

    media:
      getImages(product),

    sizes,
    variants,

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
      product?.stock?.quantity ?? null,

    description:
      cleanText(product?.description || ""),

    inventoryItems: [],
    reviews: []
  };
}
function sendInit() {
  send("INIT", {
    products: catalog,

    sellerId: "CAJAMODA",
    storefrontId: "CAJAMODA",
    storefrontSlug: "cajamoda",

    brand: {
      name: "CAJAMODA",
      publicName: "CajaModa",
      monogram: "CM"
    },

    cart: {
      items: [],
      count: 0,
      total: 0
    },

    features: {
      reviewsEnabled: false
    },

    supplyContext: {
      enabled: true,
      checkoutMode: "DEFAULT_LOCATION_NATIVE",
      supportsLocationInventory: false,
      locations: [],
      inventoryItems: []
    }
  });
}

function findProduct(id) {
  return (
    catalog.find(
      product =>
        String(product.id) === String(id)
    ) || null
  );
}

async function loadCatalog() {
  const result =
    await wix.products
      .queryProducts()
      .limit(100)
      .find();

  catalog =
    (result?.items || [])
      .map(normalizeProduct)
      .filter(product => product.id);

  console.log(
    `[CajaModa] Loaded ${catalog.length} products`
  );

  sendInit();
}

window.addEventListener("message", event => {
  if (event.source !== window) return;

  const message = event.data || {};

  if (
    message.source !== "MODAPOP_IFRAME" &&
    message.source !== "CAJAMODA_IFRAME"
  ) {
    return;
  }

  responseSource =
    message.source === "MODAPOP_IFRAME"
      ? "MODAPOP_WIX"
      : "CAJAMODA_WIX";

  const payload = message.payload || {};

  switch (message.type) {
    case "READY":
      sendInit();
      break;

    case "REQUEST_VARIANTS": {
      const product = findProduct(payload.productId);

      if (product) {
        send("VARIANTS", {
          productId: product.id,
          variants: product.variants
        });
      }

      break;
    }

    case "REQUEST_PRODUCT_META": {
      const product = findProduct(payload.productId);

      if (product) {
        send("PRODUCT_META", product);
      }

      break;
    }

    case "REQUEST_SUPPLY_CONTEXT":
      send("SUPPLY_CONTEXT", {
        enabled: true,
        checkoutMode: "DEFAULT_LOCATION_NATIVE",
        supportsLocationInventory: false,
        locations: [],
        inventoryItems: []
      });
      break;
          case "REQUEST_PRODUCT_SUPPLY":
      send("PRODUCT_SUPPLY", {
        productId: payload.productId,
        locations: [],
        inventoryItems: []
      });
      break;

    case "REQUEST_VARIANT_INVENTORY":
      send("VARIANT_INVENTORY", {
        productId: payload.productId,
        variantId: payload.variantId,
        locations: [],
        inventoryItems: []
      });
      break;

    case "VALIDATE_PURCHASE_PATH":
      send("PURCHASE_PATH_STATE", {
        allowed: true,
        sellable: true,
        checkoutMode: "DEFAULT_LOCATION_NATIVE",
        supplyIntent: payload.supplyIntent || null
      });
      break;

    case "GET_CART":
      send("CART_STATE", {
        items: [],
        count: 0,
        total: 0
      });
      break;

    default:
      break;
  }
});

loadCatalog().catch(error => {
  console.error(
    "[CajaModa] Wix catalog error:",
    error
  );

  send("SUPPLY_ERROR", {
    message:
      "No pudimos cargar los productos de CajaModa."
  });
});
