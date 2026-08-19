import { createClient, OAuthStrategy } from "@wix/sdk";
import { products } from "@wix/stores";

/*
  ============================================================
  CAJAMODA WIX DATA BRIDGE
  ------------------------------------------------------------
  This file handles DATA ONLY.

  index.html owns:
  - Layout
  - CSS
  - Navigation
  - Product-card design
  - Product screen
  - Favorites
  - Search
  - Filters
  - Delivery UI
  - Bottom navigation

  Wix supplies:
  - Product names
  - Product images
  - Prices
  - Sizes
  - Variants
  - Product descriptions
  - Stock status

  Wix does NOT control CajaModa's visual design.
  ============================================================
*/

const CLIENT_ID =
  import.meta.env.VITE_WIX_CLIENT_ID;

if (!CLIENT_ID) {
  throw new Error(
    "VITE_WIX_CLIENT_ID is missing."
  );
}

const wix = createClient({
  modules: {
    products
  },

  auth: OAuthStrategy({
    clientId: CLIENT_ID
  })
});

let catalog = [];

let responseSource =
  "CAJAMODA_WIX";


/* ============================================================
   BRIDGE
   ============================================================ */

function send(
  type,
  payload = {}
) {
  window.postMessage(
    {
      source: responseSource,
      type,
      payload
    },
    window.location.origin
  );
}


/* ============================================================
   TEXT
   ============================================================ */

function cleanText(
  html = ""
) {
  const element =
    document.createElement("div");

  element.innerHTML =
    String(html);

  return (
    element.textContent ||
    element.innerText ||
    ""
  );
}


/* ============================================================
   PRICE
   ============================================================ */

function getPrice(
  product
) {
  return Number(
    product
      ?.priceData
      ?.discountedPrice ??

    product
      ?.priceData
      ?.price ??

    product
      ?.price
      ?.amount ??

    product
      ?.price ??

    0
  );
}


/* ============================================================
   IMAGES
   ============================================================ */

function getImages(
  product
) {
  const urls = [];

  function add(
    url
  ) {
    if (
      url &&
      !urls.includes(url)
    ) {
      urls.push(url);
    }
  }

  add(
    product
      ?.media
      ?.mainMedia
      ?.image
      ?.url
  );

  add(
    product
      ?.media
      ?.mainMedia
      ?.url
  );

  add(
    product
      ?.image
      ?.url
  );

  add(
    product
      ?.imageUrl
  );

  const mediaItems =
    product
      ?.media
      ?.items ||
    [];

  for (
    const item
    of mediaItems
  ) {
    add(
      item
        ?.image
        ?.url
    );

    add(
      item
        ?.url
    );

    add(
      item
        ?.imageUrl
    );
  }

  return urls;
}


/* ============================================================
   PRODUCT TYPE
   ============================================================ */

function getProductType(
  product
) {
  const text =
    String(
      product?.name ||
      ""
    )
      .toLowerCase();

  if (
    text.includes("top") ||
    text.includes("blusa") ||
    text.includes("camisa")
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


/* ============================================================
   SIZE
   ============================================================ */

function getSize(
  variant
) {
  const choices =
    variant
      ?.choices ||

    variant
      ?.variant
      ?.choices ||

    {};

  return (
    choices.Size ||
    choices.size ||
    choices.Talla ||
    choices.talla ||
    ""
  );
}


/* ============================================================
   VARIANT
   ============================================================ */

function normalizeVariant(
  productId,
  variant,
  basePrice
) {
  const raw =
    variant?.variant ||
    variant;

  const id =
    variant?._id ||
    variant?.id ||
    raw?._id ||
    raw?.id ||
    variant?.variantId ||
    "";

  const price =
    Number(
      raw
        ?.priceData
        ?.discountedPrice ??

      raw
        ?.priceData
        ?.price ??

      variant
        ?.priceData
        ?.discountedPrice ??

      variant
        ?.priceData
        ?.price ??

      raw
        ?.price
        ?.amount ??

      variant
        ?.price
        ?.amount ??

      basePrice
    );

  const inStock =
    raw
      ?.stock
      ?.inStock !== false &&

    variant
      ?.stock
      ?.inStock !== false;

  return {
    id,

    productId,

    size:
      getSize(
        variant
      ),

    sku:
      raw?.sku ||
      variant?.sku ||
      "",

    price,

    inStock
  };
}


/* ============================================================
   PRODUCT
   ============================================================ */

function normalizeProduct(
  product,
  index
) {
  const id =
    product?._id ||
    product?.id ||
    "";

  const basePrice =
    getPrice(
      product
    );

  const rawVariants =
    Array.isArray(
      product?.variants
    )
      ? product.variants
      : [];

  const variants =
    rawVariants
      .map(
        variant =>
          normalizeVariant(
            id,
            variant,
            basePrice
          )
      )
      .filter(
        variant =>
          variant.id
      );

  const sizes =
    [
      ...new Set(
        variants
          .map(
            variant =>
              variant.size
          )
          .filter(Boolean)
      )
    ];

  /*
    Preserve the CajaModa vibe architecture.

    Wix does not determine visual layout.

    When products do not yet contain a CajaModa-specific vibe,
    they are distributed through the existing four CajaModa rails.
  */

  const vibes = [
    "late",
    "chill",
    "quick",
    "sun"
  ];

  const vibeId =
    product
      ?.additionalInfoSections
      ?.find?.(
        section =>
          String(
            section?.title ||
            ""
          )
            .toLowerCase() ===
          "vibe"
      )
      ?.description ||

    vibes[
      index %
      vibes.length
    ];

  return {
    id,

    masterProductId:
      id,

    source:
      "wix",

    name:
      product?.name ||
      "Producto",

    productType:
      getProductType(
        product
      ),

    vibeId:
      String(
        vibeId
      )
        .toLowerCase()
        .trim(),

    vibes: [
      String(
        vibeId
      )
        .toLowerCase()
        .trim()
    ],

    price:
      basePrice,

    media:
      getImages(
        product
      ),

    sizes,

    variants,

    deliveryModes: [
      "pickup",
      "fast",
      "ship"
    ],

    inventoryMode:
      product
        ?.stock
        ?.trackInventory
        ? "STOCKED"
        : "WIX",

    inventoryStatus:
      product
        ?.stock
        ?.inStock === false
        ? "OUT_OF_STOCK"
        : "AVAILABLE",

    inventoryQuantity:
      product
        ?.stock
        ?.quantity ??
      null,

    fulfillmentConfidence:
      null,

    supplyRef:
      null,

    defaultLocationId:
      null,

    inventoryItems:
      [],

    supplySyncAt:
      new Date()
        .toISOString(),

    description:
      cleanText(
        product?.description ||
        ""
      ),

    reviews:
      []
  };
}


/* ============================================================
   EMPTY CART STATE
   ============================================================ */

function emptyCart() {
  return {
    items: [],
    count: 0,
    total: 0
  };
}


/* ============================================================
   INITIALIZE CAJAMODA
   ============================================================ */

function sendInit() {
  send(
    "INIT",
    {
      products:
        catalog,

      sellerId:
        "CAJAMODA",

      storefrontId:
        "CAJAMODA",

      storefrontSlug:
        "cajamoda",

      brand: {
        name:
          "CAJAMODA",

        publicName:
          "CajaModa",

        monogram:
          "CM"
      },

      cart:
        emptyCart(),

      features: {
        reviewsEnabled:
          false
      },

      supplyContext: {
        enabled:
          true,

        checkoutMode:
          "DEFAULT_LOCATION_NATIVE",

        supportsLocationInventory:
          false,

        supportsReservations:
          false,

        supportsPreorder:
          false,

        supportsCustomMultiLocationCheckout:
          false,

        locations:
          [],

        inventoryItems:
          []
      },

      inventoryCheckoutMode:
        "DEFAULT_LOCATION_NATIVE"
    }
  );
}


/* ============================================================
   PRODUCT LOOKUP
   ============================================================ */

function findProduct(
  id
) {
  return (
    catalog.find(
      product =>
        String(
          product.id
        ) ===
        String(
          id
        )
    ) ||
    null
  );
}


/* ============================================================
   WIX PRODUCT LOAD
   ============================================================ */

async function loadCatalog() {
  const result =
    await wix.products
      .queryProducts()
      .limit(100)
      .find();

  const wixProducts =
    result?.items ||
    [];

  catalog =
    wixProducts
      .map(
        (
          product,
          index
        ) =>
          normalizeProduct(
            product,
            index
          )
      )
      .filter(
        product =>
          product.id
      );

  console.log(
    `[CajaModa] Loaded ${catalog.length} Wix products`
  );

  sendInit();
}


/* ============================================================
   STOREFRONT MESSAGE LISTENER
   ============================================================ */

window.addEventListener(
  "message",
  event => {

    if (
      event.source !== window
    ) {
      return;
    }

    const message =
      event.data ||
      {};

    /*
      Support both the original bridge name
      and the new CajaModa bridge name.

      This preserves your existing index.html
      without changing its design.
    */

    if (
      message.source !==
        "MODAPOP_IFRAME" &&

      message.source !==
        "CAJAMODA_IFRAME" &&

      message.source !==
        "CAJAMODA_STOREFRONT"
    ) {
      return;
    }

    if (
      message.source ===
      "MODAPOP_IFRAME"
    ) {
      responseSource =
        "MODAPOP_WIX";
    } else {
      responseSource =
        "CAJAMODA_WIX";
    }

    const payload =
      message.payload ||
      {};


    /* --------------------------------------------------------
       READY
       -------------------------------------------------------- */

    switch (
      message.type
    ) {

      case "READY":

        sendInit();

        break;


      /* ------------------------------------------------------
         VARIANTS
         ------------------------------------------------------ */

      case "REQUEST_VARIANTS": {

        const product =
          findProduct(
            payload.productId
          );

        if (
          product
        ) {
          send(
            "VARIANTS",
            {
              productId:
                product.id,

              variants:
                product.variants
            }
          );
        }

        break;
      }


      /* ------------------------------------------------------
         PRODUCT META
         ------------------------------------------------------ */

      case "REQUEST_PRODUCT_META": {

        const product =
          findProduct(
            payload.productId
          );

        if (
          product
        ) {
          send(
            "PRODUCT_META",
            product
          );
        }

        break;
      }


      /* ------------------------------------------------------
         SUPPLY CONTEXT
         ------------------------------------------------------ */

      case "REQUEST_SUPPLY_CONTEXT":

        send(
          "SUPPLY_CONTEXT",
          {
            enabled:
              true,

            checkoutMode:
              "DEFAULT_LOCATION_NATIVE",

            supportsLocationInventory:
              false,

            supportsReservations:
              false,

            supportsPreorder:
              false,

            supportsCustomMultiLocationCheckout:
              false,

            locations:
              [],

            inventoryItems:
              []
          }
        );

        break;


      /* ------------------------------------------------------
         PRODUCT SUPPLY
         ------------------------------------------------------ */

      case "REQUEST_PRODUCT_SUPPLY":

        send(
          "PRODUCT_SUPPLY",
          {
            productId:
              payload.productId,

            locations:
              [],

            inventoryItems:
              []
          }
        );

        break;


      /* ------------------------------------------------------
         VARIANT INVENTORY
         ------------------------------------------------------ */

      case "REQUEST_VARIANT_INVENTORY":

        send(
          "VARIANT_INVENTORY",
          {
            productId:
              payload.productId,

            variantId:
              payload.variantId,

            locations:
              [],

            inventoryItems:
              []
          }
        );

        break;


      /* ------------------------------------------------------
         PURCHASE VALIDATION
         ------------------------------------------------------ */

      case "VALIDATE_PURCHASE_PATH":

        send(
          "PURCHASE_PATH_STATE",
          {
            allowed:
              true,

            sellable:
              true,

            checkoutMode:
              "DEFAULT_LOCATION_NATIVE",

            supplyIntent:
              payload.supplyIntent ||
              null
          }
        );

        break;


      /* ------------------------------------------------------
         CART STATE
         ------------------------------------------------------ */

      case "GET_CART":

        send(
          "CART_STATE",
          emptyCart()
        );

        break;


      default:

        break;
    }
  }
);


/* ============================================================
   START
   ============================================================ */

loadCatalog()
  .catch(
    error => {

      console.error(
        "[CajaModa] Wix catalog error:",
        error
      );

      send(
        "SUPPLY_ERROR",
        {
          message:
            "No pudimos cargar los productos de CajaModa."
        }
      );
    }
  );
