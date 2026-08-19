import { createClient, OAuthStrategy } from "@wix/sdk";
import { products } from "@wix/stores";
import { currentCart } from "@wix/ecom";
import { redirects } from "@wix/redirects";

/* ============================================================
   CAJAMODA
   WIX PRODUCT + CART + CHECKOUT BRIDGE
   ============================================================ */

const CLIENT_ID =
  import.meta.env.VITE_WIX_CLIENT_ID;

const WIX_STORES_APP_ID =
  "215238eb-22a5-4c36-9e7b-e7c08025e04e";

const SESSION_KEY =
  "wixSession";

if (!CLIENT_ID) {
  throw new Error(
    "VITE_WIX_CLIENT_ID is missing."
  );
}

/* ============================================================
   STORAGE
   ============================================================ */

function readJson(
  key,
  fallback = null
) {
  try {
    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);

  } catch {
    return fallback;
  }
}

function saveJson(
  key,
  value
) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch {}
}

function removeStorage(
  key
) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

/* ============================================================
   VISITOR TOKENS
   ============================================================ */

function getStoredTokens() {
  const tokens =
    readJson(
      SESSION_KEY,
      null
    );

  if (
    !tokens ||
    typeof tokens !== "object"
  ) {
    return undefined;
  }

  return tokens;
}

const storedTokens =
  getStoredTokens();

/* ============================================================
   WIX CLIENT
   ============================================================ */

const wix =
  createClient({
    modules: {
      products,
      currentCart,
      redirects
    },

    auth:
      OAuthStrategy({
        clientId:
          CLIENT_ID,

        tokens:
          storedTokens ??
          undefined
      })
  });

/* ============================================================
   STATE
   ============================================================ */

let catalog = [];

let responseSource =
  "CAJAMODA_WIX";

let lastCart =
  normalizeLocalCart(
    readJson(
      "cajamoda-cart",
      null
    )
  );

/* ============================================================
   BRIDGE
   ============================================================ */

function send(
  type,
  payload = {}
) {
  window.postMessage(
    {
      source:
        responseSource,

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
    document.createElement(
      "div"
    );

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
   VARIANT CHOICES
   ============================================================ */

function getChoices(
  variant
) {
  return (
    variant
      ?.choices ||

    variant
      ?.variant
      ?.choices ||

    {}
  );
}

function getSize(
  variant
) {
  const choices =
    getChoices(
      variant
    );

  return (
    choices.Size ||
    choices.size ||
    choices.Talla ||
    choices.talla ||
    ""
  );
}

function getColor(
  variant
) {
  const choices =
    getChoices(
      variant
    );

  return (
    choices.Color ||
    choices.color ||
    choices.Colour ||
    choices.colour ||
    ""
  );
}

/* ============================================================
   NORMALIZE VARIANT
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

    color:
      getColor(
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
   NORMALIZE PRODUCT
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
    Preserve the existing four CajaModa category rails.
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
        String(id)
    ) ||
    null
  );
}

/* ============================================================
   LOCAL CART
   ============================================================ */

function emptyCart() {
  return {
    items: [],
    count: 0,
    total: 0
  };
}

function createLocalId() {
  if (
    window.crypto
      ?.randomUUID
  ) {
    return window.crypto
      .randomUUID();
  }

  return (
    `${Date.now()}-` +
    Math.random()
      .toString(16)
      .slice(2)
  );
}

function normalizeLocalCart(
  cart
) {
  const sourceItems =
    Array.isArray(
      cart?.items
    )
      ? cart.items
      : Array.isArray(
          cart?.lineItems
        )
        ? cart.lineItems
        : [];

  const items =
    sourceItems.map(
      item => ({
        id:
          item.id ||
          item._id ||
          item.lineItemId ||
          createLocalId(),

        productId:
          item.productId ||
          item
            ?.catalogReference
            ?.catalogItemId ||
          null,

        variantId:
          item.variantId ||
          item
            ?.catalogReference
            ?.options
            ?.variantId ||
          null,

        name:
          item.name ||
          item
            ?.productName
            ?.translated ||
          item
            ?.productName
            ?.original ||
          item.productName ||
          "Producto",

        image:
          item.image ||
          item.imageUrl ||
          item
            ?.media
            ?.url ||
          "",

        size:
          item.size ||
          item
            ?.options
            ?.Size ||
          item
            ?.options
            ?.size ||
          "",

        color:
          item.color ||
          item
            ?.options
            ?.Color ||
          item
            ?.options
            ?.color ||
          "",

        quantity:
          Math.max(
            1,
            Number(
              item.quantity ||
              1
            )
          ),

        price:
          Number(
            item
              ?.price
              ?.amount ??

            item.price ??

            item
              ?.lineItemPrice
              ?.amount ??

            0
          ),

        autoSelected:
          item.autoSelected ===
          true
      })
    );

  const count =
    items.reduce(
      (
        total,
        item
      ) =>
        total +
        item.quantity,
      0
    );

  const total =
    items.reduce(
      (
        subtotal,
        item
      ) =>
        subtotal +
        (
          item.price *
          item.quantity
        ),
      0
    );

  return {
    items,
    count,
    total
  };
}

function saveLocalCart(
  cart
) {
  const normalized =
    normalizeLocalCart(
      cart
    );

  saveJson(
    "cajamoda-cart",
    normalized
  );

  saveJson(
    "cajamoda-checkout-cart",
    normalized
  );

  lastCart =
    normalized;

  return normalized;
}

function readBestLocalCart() {
  const regular =
    normalizeLocalCart(
      readJson(
        "cajamoda-cart",
        null
      )
    );

  const checkout =
    normalizeLocalCart(
      readJson(
        "cajamoda-checkout-cart",
        null
      )
    );

  if (
    regular.items.length
  ) {
    return regular;
  }

  if (
    checkout.items.length
  ) {
    return checkout;
  }

  return emptyCart();
}

/* ============================================================
   VARIANT LOOKUP
   ============================================================ */

function normalizeChoice(
  value
) {
  return String(
    value ||
    ""
  )
    .toLowerCase()
    .trim();
}

function findVariant(
  product,
  item
) {
  if (
    !product ||
    !Array.isArray(
      product.variants
    ) ||
    !product.variants.length
  ) {
    return null;
  }

  /*
    First use a known Wix variant ID.
  */

  if (
    item.variantId
  ) {
    const direct =
      product.variants.find(
        variant =>
          String(
            variant.id
          ) ===
          String(
            item.variantId
          )
      );

    if (direct) {
      return direct;
    }
  }

  const wantedSize =
    normalizeChoice(
      item.size
    );

  const wantedColor =
    normalizeChoice(
      item.color
    );

  /*
    Exact size + color.
  */

  if (
    wantedSize &&
    wantedColor
  ) {
    const exact =
      product.variants.find(
        variant =>
          normalizeChoice(
            variant.size
          ) ===
            wantedSize &&

          normalizeChoice(
            variant.color
          ) ===
            wantedColor &&

          variant.inStock !==
            false
      );

    if (exact) {
      return exact;
    }
  }

  /*
    Size match is enough when the current
    visual color selector doesn't correspond
    to a Wix variant option.
  */

  if (
    wantedSize
  ) {
    const sizeMatch =
      product.variants.find(
        variant =>
          normalizeChoice(
            variant.size
          ) ===
            wantedSize &&

          variant.inStock !==
            false
      );

    if (sizeMatch) {
      return sizeMatch;
    }
  }

  /*
    Final fallback to the first available variant.
  */

  return (
    product.variants.find(
      variant =>
        variant.inStock !==
        false
    ) ||
    product.variants[0] ||
    null
  );
}

/* ============================================================
   WIX CART -> CAJAMODA CART
   ============================================================ */

function normalizeWixCart(
  rawCart
) {
  const wixCart =
    rawCart?.cart ||
    rawCart;

  const lineItems =
    Array.isArray(
      wixCart?.lineItems
    )
      ? wixCart.lineItems
      : [];

  const items =
    lineItems.map(
      line => {
        const productId =
          line
            ?.catalogReference
            ?.catalogItemId ||
          null;

        const variantId =
          line
            ?.catalogReference
            ?.options
            ?.variantId ||
          null;

        const product =
          findProduct(
            productId
          );

        const variant =
          product
            ?.variants
            ?.find(
              candidate =>
                String(
                  candidate.id
                ) ===
                String(
                  variantId
                )
            );

        return {
          id:
            line?._id ||
            line?.id ||
            createLocalId(),

          productId,

          variantId,

          name:
            line
              ?.productName
              ?.translated ||
            line
              ?.productName
              ?.original ||
            product?.name ||
            "Producto",

          image:
            product
              ?.media
              ?.[0] ||
            "",

          size:
            variant?.size ||
            "",

          color:
            variant?.color ||
            "",

          quantity:
            Math.max(
              1,
              Number(
                line?.quantity ||
                1
              )
            ),

          price:
            Number(
              line
                ?.price
                ?.amount ??
              variant?.price ??
              product?.price ??
              0
            ),

          autoSelected:
            true
        };
      }
    );

  return normalizeLocalCart({
    items
  });
}

/* ============================================================
   CART COMPARISON
   ============================================================ */

function cartFingerprint(
  cart
) {
  const normalized =
    normalizeLocalCart(
      cart
    );

  return normalized.items
    .map(
      item => [
        item.productId || "",
        normalizeChoice(
          item.size
        ),
        Number(
          item.quantity ||
          1
        )
      ]
        .join(":")
    )
    .sort()
    .join("|");
}

/* ============================================================
   VISITOR SESSION
   ============================================================ */

function persistCurrentTokens() {
  try {
    const tokens =
      wix.auth
        .getTokens();

    if (tokens) {
      saveJson(
        SESSION_KEY,
        tokens
      );
    }
  } catch {}
}

async function prepareVisitorSession() {
  try {
    const tokens =
      await wix.auth
        .generateVisitorTokens(
          storedTokens
        );

    saveJson(
      SESSION_KEY,
      tokens
    );

    return tokens;

  } catch (
    firstError
  ) {
    /*
      If old stored tokens are unusable,
      create a fresh anonymous visitor session.
    */

    console.warn(
      "[CajaModa] Renewing Wix visitor session."
    );

    removeStorage(
      SESSION_KEY
    );

    try {
      const tokens =
        await wix.auth
          .generateVisitorTokens();

      saveJson(
        SESSION_KEY,
        tokens
      );

      return tokens;

    } catch (
      error
    ) {
      throw (
        error ||
        firstError
      );
    }
  }
}

/* ============================================================
   ERROR HELPERS
   ============================================================ */

function getStatus(
  error
) {
  return Number(
    error
      ?.response
      ?.status ||
    error
      ?.status ||
    error
      ?.statusCode ||
    0
  );
}

function isNotFound(
  error
) {
  return (
    getStatus(error) ===
    404
  );
}

/* ============================================================
   GET CURRENT WIX CART
   ============================================================ */

async function getWixCart() {
  try {
    const result =
      await wix
        .currentCart
        .getCurrentCart();

    persistCurrentTokens();

    return result;

  } catch (
    error
  ) {
    if (
      isNotFound(error)
    ) {
      return null;
    }

    throw error;
  }
}

/* ============================================================
   CART PERSISTENCE
   ============================================================ */

async function getPersistentCart() {
  /*
    CajaModa local storage is intentionally
    preferred when it already has items.

    This prevents Home from erasing a Product-page
    selection while Wix synchronization is still
    finishing.
  */

  const local =
    readBestLocalCart();

  let wixCart = null;

  try {
    wixCart =
      await getWixCart();

  } catch (
    error
  ) {
    console.warn(
      "[CajaModa] Wix cart read warning:",
      error
    );
  }

  const normalizedWix =
    wixCart
      ? normalizeWixCart(
          wixCart
        )
      : emptyCart();

  if (
    local.items.length
  ) {
    lastCart =
      local;

    /*
      If Wix is behind the local bag,
      synchronize quietly in the background.
    */

    if (
      catalog.length &&
      cartFingerprint(local) !==
        cartFingerprint(
          normalizedWix
        )
    ) {
      syncLocalCartToWix(
        local
      )
        .catch(
          error => {
            console.warn(
              "[CajaModa] Background cart sync:",
              error
            );
          }
        );
    }

    return local;
  }

  if (
    normalizedWix
      .items
      .length
  ) {
    return saveLocalCart(
      normalizedWix
    );
  }

  lastCart =
    emptyCart();

  return lastCart;
}

/* ============================================================
   TURN LOCAL BAG INTO WIX LINE ITEMS
   ============================================================ */

function buildWixLineItems(
  localCart
) {
  const cart =
    normalizeLocalCart(
      localCart
    );

  if (
    !cart.items.length
  ) {
    return [];
  }

  return cart.items.map(
    item => {
      const product =
        findProduct(
          item.productId
        );

      if (
        !product
      ) {
        throw new Error(
          `No pudimos encontrar ${item.name || "un producto"} en Wix.`
        );
      }

      const variant =
        findVariant(
          product,
          item
        );

      if (
        product.variants.length &&
        !variant?.id
      ) {
        throw new Error(
          `Selecciona una talla disponible para ${product.name}.`
        );
      }

      const catalogReference = {
        appId:
          WIX_STORES_APP_ID,

        catalogItemId:
          product.id
      };

      if (
        variant?.id
      ) {
        catalogReference.options = {
          variantId:
            variant.id
        };
      }

      return {
        catalogReference,

        quantity:
          Math.max(
            1,
            Number(
              item.quantity ||
              1
            )
          )
      };
    }
  );
}

/* ============================================================
   SYNC CAJAMODA BAG -> REAL WIX CART
   ============================================================ */

async function syncLocalCartToWix(
  localCart
) {
  const cart =
    normalizeLocalCart(
      localCart
    );

  if (
    !cart.items.length
  ) {
    return cart;
  }

  const lineItems =
    buildWixLineItems(
      cart
    );

  /*
    Remove the old Wix current cart so that
    the checkout exactly matches the visible
    CajaModa bag and doesn't duplicate items.
  */

  try {
    await wix
      .currentCart
      .deleteCurrentCart();

  } catch (
    error
  ) {
    if (
      !isNotFound(error)
    ) {
      throw error;
    }
  }

  const result =
    await wix
      .currentCart
      .addToCurrentCart({
        lineItems
      });

  persistCurrentTokens();

  const wixCart =
    result?.cart ||
    result;

  const normalizedWix =
    normalizeWixCart(
      wixCart
    );

  /*
    Keep the local display information if Wix
    hasn't returned enough display fields yet.
  */

  const saved =
    normalizedWix.items.length
      ? saveLocalCart(
          normalizedWix
        )
      : saveLocalCart(
          cart
        );

  return saved;
}

/* ============================================================
   SEND INIT
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

      /*
        Important:
        never initialize the storefront with a
        fake empty cart when a local bag exists.
      */

      cart:
        lastCart,

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
   LOAD WIX PRODUCTS
   ============================================================ */

async function loadCatalog() {
  const result =
    await wix
      .products
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

  /*
    Resolve the best persistent bag only after
    the catalog is available so variants can be
    matched correctly.
  */

  lastCart =
    await getPersistentCart();

  sendInit();
}

/* ============================================================
   CREATE REAL WIX CHECKOUT
   ============================================================ */

async function createPaymentCheckout(
  payload
) {
  try {
    const suppliedCart =
      normalizeLocalCart(
        payload?.cart
      );

    const localCart =
      suppliedCart.items.length
        ? suppliedCart
        : readBestLocalCart();

    if (
      !localCart
        .items
        .length
    ) {
      throw new Error(
        "Tu bolsa está vacía."
      );
    }

    /*
      Make Wix's current cart match exactly
      what the customer sees on Checkout.
    */

    await syncLocalCartToWix(
      localCart
    );

    const customer =
      payload?.customer ||
      {};

    const channelType =
      currentCart
        ?.ChannelType
        ?.OTHER_PLATFORM ||
      "OTHER_PLATFORM";

    const checkoutOptions = {
      channelType
    };

    /*
      Email is safe to prefill.
      Wix's hosted checkout remains responsible
      for final shipping and payment validation.
    */

    if (
      customer.email
    ) {
      checkoutOptions.email =
        customer.email;
    }

    const checkoutResult =
      await wix
        .currentCart
        .createCheckoutFromCurrentCart(
          checkoutOptions
        );

    const checkoutId =
      checkoutResult
        ?.checkoutId ||
      checkoutResult
        ?._id ||
      checkoutResult
        ?.id ||
      "";

    if (
      !checkoutId
    ) {
      throw new Error(
        "Wix no devolvió un checkout válido."
      );
    }

    persistCurrentTokens();

    /*
      Generate the Wix-hosted secure checkout URL.
    */

    const redirectResult =
      await wix
        .redirects
        .createRedirectSession({
          callbacks: {
            postFlowUrl:
              `${window.location.origin}/?checkout=complete`
          },

          ecomCheckout: {
            checkoutId
          },

          origin:
            window.location.origin,

          preferences: {
            checkIfPublish:
              true
          }
        });

    const checkoutUrl =
      redirectResult
        ?.redirectSession
        ?.fullUrl ||
      "";

    if (
      !checkoutUrl
    ) {
      throw new Error(
        "Wix no devolvió la dirección de pago."
      );
    }

    send(
      "CHECKOUT_URL",
      {
        url:
          checkoutUrl,

        checkoutId
      }
    );

  } catch (
    error
  ) {
    console.error(
      "[CajaModa] Checkout error:",
      error
    );

    send(
      "CHECKOUT_ERROR",
      {
        message:
          error?.message ||
          "No pudimos abrir el pago seguro."
      }
    );
  }
}

/* ============================================================
   MESSAGE LISTENER
   ============================================================ */

window.addEventListener(
  "message",
  async event => {
    /*
      All CajaModa HTML pages and this bridge
      execute inside the same browser window.
    */

    if (
      event.source !==
      window
    ) {
      return;
    }

    const message =
      event.data ||
      {};

    const acceptedSources =
      new Set([
        "MODAPOP_IFRAME",
        "CAJAMODA_IFRAME",
        "CAJAMODA_STOREFRONT",
        "CAJAMODA_CHECKOUT"
      ]);

    if (
      !acceptedSources.has(
        message.source
      )
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

    switch (
      message.type
    ) {

      /* ======================================================
         READY
         ====================================================== */

      case "READY":
        sendInit();
        break;

      /* ======================================================
         PRODUCT VARIANTS
         ====================================================== */

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

      /* ======================================================
         PRODUCT META
         ====================================================== */

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

      /* ======================================================
         SUPPLY CONTEXT
         ====================================================== */

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

      /* ======================================================
         PRODUCT SUPPLY
         ====================================================== */

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

      /* ======================================================
         VARIANT INVENTORY
         ====================================================== */

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

      /* ======================================================
         PURCHASE VALIDATION
         ====================================================== */

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

      /* ======================================================
         PRODUCT PAGE ADDED TO BAG
         ====================================================== */

      case "ADD_TO_CART": {
        /*
          product/index.html already writes the
          selected item into cajamoda-cart first.

          Keep that local cart immediately, then
          mirror it into Wix.
        */

        const localCart =
          readBestLocalCart();

        if (
          localCart
            .items
            .length
        ) {
          lastCart =
            localCart;

          /*
            Send local state immediately so the UI
            never waits for Wix networking.
          */

          send(
            "CART_STATE",
            localCart
          );

          /*
            Sync Wix without blocking the product UI.
          */

          if (
            catalog.length
          ) {
            syncLocalCartToWix(
              localCart
            )
              .then(
                cart => {
                  send(
                    "CART_STATE",
                    cart
                  );
                }
              )
              .catch(
                error => {
                  console.warn(
                    "[CajaModa] Cart sync warning:",
                    error
                  );
                }
              );
          }
        }

        break;
      }

      /* ======================================================
         GET CART
         ====================================================== */

      case "GET_CART": {
        const cart =
          await getPersistentCart();

        send(
          "CART_STATE",
          cart
        );

        break;
      }

      /* ======================================================
         CREATE REAL PAYMENT
         ====================================================== */

      case "CREATE_CHECKOUT":
        await createPaymentCheckout(
          payload
        );

        break;

      default:
        break;
    }
  }
);

/* ============================================================
   STORAGE SYNC
   ============================================================ */

window.addEventListener(
  "storage",
  event => {
    if (
      event.key ===
      "cajamoda-cart"
    ) {
      const cart =
        readBestLocalCart();

      if (
        cart.items.length
      ) {
        lastCart =
          cart;
      }
    }
  }
);

/* ============================================================
   START
   ============================================================ */

async function start() {
  /*
    Maintain the same anonymous Wix visitor
    across Home, Product and Checkout.
  */

  await prepareVisitorSession();

  await loadCatalog();
}

start()
  .catch(
    error => {
      console.error(
        "[CajaModa] Wix startup error:",
        error
      );

      /*
        Keep the local storefront usable even
        if Wix temporarily fails.
      */

      lastCart =
        readBestLocalCart();

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
            lastCart,

          features: {
            reviewsEnabled:
              false
          }
        }
      );

      send(
        "SUPPLY_ERROR",
        {
          message:
            "No pudimos conectar CajaModa con Wix."
        }
      );
    }
  );
