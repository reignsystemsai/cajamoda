import { createClient, OAuthStrategy, media } from "@wix/sdk";
import { products } from "@wix/stores";
import { currentCart } from "@wix/ecom";
import { redirects } from "@wix/redirects";

const CLIENT_ID = import.meta.env.VITE_WIX_CLIENT_ID;

const STORES_APP_ID =
  "1380b703-ce81-ff05-f115-39571d94dfcd";

const TOKEN_KEY =
  "cajamoda-wix-session";

const BRIDGE_SOURCE =
  "MODAPOP_WIX";


/* =========================================================
   WIX CLIENT
   ========================================================= */

function readTokens() {
  try {
    return (
      JSON.parse(
        localStorage.getItem(TOKEN_KEY) || "null"
      ) || undefined
    );
  } catch {
    return undefined;
  }
}


const wixClient = createClient({
  modules: {
    products,
    currentCart,
    redirects
  },

  auth: OAuthStrategy({
    clientId: CLIENT_ID,
    tokens: readTokens()
  })
});


function saveTokens() {
  try {
    const tokens =
      wixClient.auth.getTokens();

    if (tokens) {
      localStorage.setItem(
        TOKEN_KEY,
        JSON.stringify(tokens)
      );
    }
  } catch {}
}


async function ensureVisitorSession() {
  const existing =
    readTokens();

  if (existing) {
    wixClient.auth.setTokens(existing);
    return;
  }

  const tokens =
    await wixClient.auth.generateVisitorTokens();

  wixClient.auth.setTokens(tokens);
  saveTokens();
}


/* =========================================================
   BRIDGE TO EXISTING MODAPOP UI
   ========================================================= */

function send(type, payload = {}) {
  window.postMessage(
    {
      source: BRIDGE_SOURCE,
      type,
      payload
    },
    window.location.origin
  );
}


/* =========================================================
   HELPERS
   ========================================================= */

const wixProducts =
  new Map();


function numberValue(value) {
  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}


function cleanDescription(value) {
  if (!value) return "";

  if (typeof value !== "string") {
    return "";
  }

  const element =
    document.createElement("div");

  element.innerHTML =
    value;

  return (
    element.textContent ||
    element.innerText ||
    ""
  ).trim();
}


function imageUrl(value) {
  if (!value) return "";

  const source =
    typeof value === "string"
      ? value
      : value.url ||
        value.image?.url ||
        "";

  if (!source) return "";

  if (
    source.startsWith("wix:image://")
  ) {
    try {
      return media.getImageUrl(
        source
      ).url;
    } catch {
      return "";
    }
  }

  return source;
}


function getProductImages(product) {
  const candidates = [
    product.media?.mainMedia?.image?.url,
    product.media?.mainMedia?.image,

    ...(product.media?.items || [])
      .map(
        item =>
          item.image?.url ||
          item.image
      )
  ];

  return [
    ...new Set(
      candidates
        .map(imageUrl)
        .filter(Boolean)
    )
  ];
}


function getOptions(product) {
  return (
    product.productOptions ||
    product.options ||
    []
  );
}


function getSizeOption(product) {
  const options =
    getOptions(product);

  return (
    options.find(option =>
      /size|talla/i.test(
        String(option?.name || "")
      )
    ) ||
    options[0] ||
    null
  );
}


function getSizes(product) {
  const option =
    getSizeOption(product);

  if (!option) {
    return ["Única"];
  }

  const choices =
    option.choices ||
    [];

  const sizes =
    choices
      .map(choice =>
        choice.description ||
        choice.name ||
        choice.value ||
        ""
      )
      .filter(Boolean);

  return sizes.length
    ? sizes
    : ["Única"];
}


function getProductPrice(product) {
  return numberValue(
    product.priceData
      ?.discountedPrice ??

    product.priceData
      ?.price ??

    product.convertedPriceData
      ?.discountedPrice ??

    product.convertedPriceData
      ?.price ??

    0
  );
}


/* =========================================================
   PRODUCT MAPPING
   ========================================================= */

function mapProduct(product) {
  const id =
    product._id ||
    product.id;

  return {
    id,

    masterProductId:
      id,

    source:
      "wix",

    name:
      product.name ||
      "Producto",

    /*
      Current storefront grouping.
      We will make categories dynamic after
      the basic commerce path is working.
    */
    productType:
      "Vestidos",

    vibeId:
      "late",

    price:
      getProductPrice(product),

    media:
      getProductImages(product),

    sizes:
      getSizes(product),

    /*
      We intentionally use Wix selected
      product options for this first build.

      That means we don't need a separate
      variant lookup just to make purchasing work.
    */
    variants: [],

    deliveryModes: [
      "ship"
    ],

    inventoryStatus:
      product.stock?.inStock === false
        ? "OUT_OF_STOCK"
        : "AVAILABLE",

    description:
      cleanDescription(
        product.description
      )
  };
}


/* =========================================================
   CATALOG
   ========================================================= */

async function loadProducts() {
  const result =
    await wixClient.products
      .queryProducts()
      .find();

  const items =
    result.items || [];

  wixProducts.clear();

  items.forEach(product => {
    wixProducts.set(
      String(
        product._id ||
        product.id
      ),
      product
    );
  });

  saveTokens();

  return items.map(
    mapProduct
  );
}


/* =========================================================
   CART MAPPING
   ========================================================= */

function cartSize(item) {
  const options =
    item.catalogReference
      ?.options
      ?.options ||
    {};

  const sizeKey =
    Object.keys(options)
      .find(key =>
        /size|talla/i.test(key)
      );

  if (sizeKey) {
    return String(
      options[sizeKey]
    );
  }

  return "";
}


function mapCart(cart) {
  const lineItems =
    cart?.lineItems ||
    [];

  const items =
    lineItems.map(item => ({
      id:
        item._id ||
        item.id,

      productId:
        item.catalogReference
          ?.catalogItemId ||
        null,

      variantId:
        item.catalogReference
          ?.options
          ?.variantId ||
        null,

      name:
        item.productName
          ?.original ||

        item.productName ||

        item.name ||

        "Producto",

      image:
        imageUrl(
          item.image ||
          item.media?.url ||
          item.imageUrl ||
          ""
        ),

      size:
        cartSize(item),

      deliveryMode:
        "ship",

      quantity:
        numberValue(
          item.quantity || 1
        ),

      price:
        numberValue(
          item.price?.amount ??
          item.lineItemPrice?.amount ??
          item.price ??
          0
        )
    }));


  const total =
    numberValue(
      cart?.subtotal?.amount ??
      cart?.priceSummary
        ?.subtotal
        ?.amount
    ) ||
    items.reduce(
      (sum, item) =>
        sum +
        item.price *
        item.quantity,
      0
    );


  return {
    items,

    count:
      items.reduce(
        (sum, item) =>
          sum +
          item.quantity,
        0
      ),

    total
  };
}


async function loadCart() {
  try {
    const cart =
      await wixClient
        .currentCart
        .getCurrentCart();

    saveTokens();

    return mapCart(cart);
  } catch {
    return {
      items: [],
      count: 0,
      total: 0
    };
  }
}


/* =========================================================
   ADD PRODUCT
   ========================================================= */

function selectedProductOptions(
  product,
  selectedSize
) {
  const option =
    getSizeOption(product);

  if (
    !option ||
    !selectedSize ||
    selectedSize === "Única"
  ) {
    return null;
  }

  return {
    [option.name]:
      selectedSize
  };
}


async function addProductToCart(
  payload
) {
  const product =
    wixProducts.get(
      String(
        payload.productId
      )
    );

  if (!product) {
    throw new Error(
      "Producto no encontrado en Wix."
    );
  }


  const catalogReference = {
    appId:
      STORES_APP_ID,

    catalogItemId:
      payload.productId
  };


  const options =
    selectedProductOptions(
      product,
      payload.size
    );


  if (options) {
    catalogReference.options = {
      options
    };
  }


  const response =
    await wixClient
      .currentCart
      .addToCurrentCart({
        lineItems: [
          {
            catalogReference,

            quantity:
              payload.quantity || 1
          }
        ]
      });


  saveTokens();


  return mapCart(
    response.cart ||
    response
  );
}


/* =========================================================
   PREVENT DUPLICATES / CHANGE SIZE
   ========================================================= */

async function syncSelection(
  payload
) {
  let cart =
    await loadCart();


  const existing =
    cart.items.find(
      item =>
        String(
          item.productId
        ) ===
        String(
          payload.productId
        )
    );


  if (existing) {
    const sameSize =
      String(
        existing.size || ""
      ) ===
      String(
        payload.size || ""
      );


    if (
      sameSize &&
      payload.preventDuplicate
    ) {
      return cart;
    }


    await wixClient
      .currentCart
      .removeLineItemsFromCurrentCart(
        [existing.id]
      );
  }


  return addProductToCart(
    payload
  );
}


/* =========================================================
   CART QUANTITY
   ========================================================= */

async function updateQuantity(
  payload
) {
  const response =
    await wixClient
      .currentCart
      .updateCurrentCartLineItemQuantity([
        {
          _id:
            payload.lineItemId,

          quantity:
            payload.quantity
        }
      ]);


  saveTokens();


  return mapCart(
    response.cart ||
    response
  );
}


/* =========================================================
   REMOVE CART ITEM
   ========================================================= */

async function removeItem(
  payload
) {
  const response =
    await wixClient
      .currentCart
      .removeLineItemsFromCurrentCart([
        payload.lineItemId
      ]);


  saveTokens();


  return mapCart(
    response.cart ||
    response
  );
}


/* =========================================================
   WIX CHECKOUT
   ========================================================= */

async function openCheckout() {
  const checkout =
    await wixClient
      .currentCart
      .createCheckoutFromCurrentCart({
        channelType:
          currentCart.ChannelType
            ?.WEB ||
          "WEB"
      });


  const redirect =
    await wixClient
      .redirects
      .createRedirectSession({
        ecomCheckout: {
          checkoutId:
            checkout.checkoutId
        },

        callbacks: {
          postFlowUrl:
            window.location.origin
        }
      });


  saveTokens();


  const url =
    redirect
      ?.redirectSession
      ?.fullUrl;


  if (!url) {
    throw new Error(
      "Wix no devolvió la dirección de checkout."
    );
  }


  window.location.href =
    url;
}


/* =========================================================
   INITIAL LOAD
   ========================================================= */

let initialized =
  false;


async function initialize() {
  if (initialized) {
    return;
  }

  initialized =
    true;


  if (!CLIENT_ID) {
    console.error(
      "VITE_WIX_CLIENT_ID is missing."
    );

    send(
      "CART_ERROR",
      {
        message:
          "Falta la conexión de Wix Headless."
      }
    );

    return;
  }


  try {
    await ensureVisitorSession();


    const [
      catalog,
      cart
    ] =
      await Promise.all([
        loadProducts(),
        loadCart()
      ]);


    send(
      "INIT",
      {
        products:
          catalog,

        cart,

        brand: {
          name:
            "MODAPOP",

          publicName:
            "ModaPop"
        },

        supplyContext: {
          enabled:
            true,

          checkoutMode:
            "DEFAULT_LOCATION_NATIVE",

          supportsLocationInventory:
            false
        }
      }
    );

  } catch (error) {
    console.error(
      "Wix initialization failed:",
      error
    );


    send(
      "CART_ERROR",
      {
        message:
          "No pudimos conectar el catálogo de Wix."
      }
    );
  }
}


/* =========================================================
   EXISTING STOREFRONT EVENTS
   ========================================================= */

window.addEventListener(
  "message",
  async event => {

    if (
      event.source !== window
    ) {
      return;
    }


    const message =
      event.data ||
      {};


    if (
      message.source !==
      "MODAPOP_IFRAME"
    ) {
      return;
    }


    const payload =
      message.payload ||
      {};


    try {
      switch (
        message.type
      ) {

        case "READY":
          await initialize();
          break;


        case "GET_CART":
          send(
            "CART_STATE",
            await loadCart()
          );
          break;


        /*
          Sizes are already loaded from
          Wix product options in INIT.
        */
        case "REQUEST_VARIANTS":
          break;


        case "REQUEST_PRODUCT_META": {
          const product =
            wixProducts.get(
              String(
                payload.productId
              )
            );

          if (product) {
            send(
              "PRODUCT_META",
              mapProduct(product)
            );
          }

          break;
        }


        case "REQUEST_SUPPLY_CONTEXT":
          send(
            "SUPPLY_CONTEXT",
            {
              enabled:
                true,

              checkoutMode:
                "DEFAULT_LOCATION_NATIVE",

              supportsLocationInventory:
                false
            }
          );
          break;


        /*
          Advanced supplier/location
          inventory comes later.
        */
        case "REQUEST_PRODUCT_SUPPLY":
        case "REQUEST_VARIANT_INVENTORY":
          break;


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
                payload.supplyIntent
            }
          );
          break;


        case "SYNC_BAG_SELECTION":
          send(
            "CART_WORKING",
            {
              message:
                "Actualizando bolsa…"
            }
          );


          send(
            "CART_STATE",
            await syncSelection(
              payload
            )
          );
          break;


        case "UPDATE_BAG_QUANTITY":
          send(
            "CART_STATE",
            await updateQuantity(
              payload
            )
          );
          break;


        case "REMOVE_BAG_ITEM":
          send(
            "CART_STATE",
            await removeItem(
              payload
            )
          );
          break;


        case "BUY_NOW":
          send(
            "BUY_WORKING",
            {
              message:
                "Abriendo checkout…"
            }
          );


          await syncSelection({
            ...payload,

            preventDuplicate:
              true
          });


          send(
            "BUY_SUCCESS",
            {}
          );


          await openCheckout();
          break;


        case "CHECKOUT_BAG":
          send(
            "CART_WORKING",
            {
              message:
                "Abriendo checkout…"
            }
          );


          await openCheckout();
          break;


        default:
          break;
      }

    } catch (error) {
      console.error(
        `Wix bridge error: ${message.type}`,
        error
      );


      const checkoutError =
        message.type ===
          "BUY_NOW" ||

        message.type ===
          "CHECKOUT_BAG";


      send(
        checkoutError
          ? "BUY_ERROR"
          : "CART_ERROR",

        {
          message:
            error?.message ||
            "No pudimos completar la operación."
        }
      );
    }
  }
);


/* =========================================================
   START
   ========================================================= */

initialize();
