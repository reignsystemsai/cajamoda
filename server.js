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
