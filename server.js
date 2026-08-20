import http from "node:http";
import crypto from "node:crypto";

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
  available
) {

  const combinations =
    buildCombinations(
      sizes,
      colors
    );

  return combinations.map(
    combination => ({

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

        inStock:
          available
      },

      physicalProperties:
        {}
    })
  );
}

/* ============================================================
   CATEGORY LABEL
   ============================================================ */

const CATEGORY_NAMES = {

  late:
    "Noches Largas",

  chill:
    "Días Tranquilos",

  quick:
    "Rápido y Fácil",

  sun:
    "Baño de Sol"
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
      quantity > 0
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
