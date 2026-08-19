import { createClient, OAuthStrategy } from "@wix/sdk";
import { products } from "@wix/stores";

const CLIENT_ID = import.meta.env.VITE_WIX_CLIENT_ID;

if (!CLIENT_ID) {
  throw new Error("VITE_WIX_CLIENT_ID is missing.");
}

const wix = createClient({
  modules: { products },
  auth: OAuthStrategy({
    clientId: CLIENT_ID
  })
});

let catalog = [];
let responseSource = "CAJAMODA_WIX";

function send(type, payload = {}) {
  window.postMessage(
    {
      source: responseSource,
      type,
      payload
    },
    window.location.origin
  );
}

function cleanText(value = "") {
  const el = document.createElement("div");
  el.innerHTML = String(value);
  return el.textContent || "";
}

function mediaUrls(product) {
  const urls = [];

  const main =
    product?.media?.mainMedia?.image?.url ||
    product?.media?.mainMedia?.url ||
    product?.image?.url ||
    "";

  if (main) urls.push(main);

  const items =
    product?.media?.items ||
    [];

  for (const item of items) {
    const url =
      item?.image?.url ||
      item?.url ||
      "";

    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  }

  return urls;
}

function productPrice(product) {
  return Number(
    product?.priceData?.discountedPrice ??
    product?.priceData?.price ??
    product?.price?.amount ??
    product?.price ??
    0
  );
}

function sizeFromChoices(choices = {}) {
  return (
    choices.Size ||
    choices.size ||
    choices.Talla ||
    choices.talla ||
    ""
  );
}

function normalizeVariant(productId, variant, price) {
  const raw =
    variant?.variant ||
    variant;

  const choices =
    variant?.choices ||
    raw?.choices ||
    {};

  return {
    id:
      variant?._id ||
      variant?.id ||
      raw?._id ||
      raw?.id ||
      "",

    productId,

    size:
      sizeFromChoices(choices),

    sku:
      raw?.sku ||
      variant?.sku ||
      "",

    price:
      Number(
        raw?.priceData?.price ??
        variant?.priceData?.price ??
        price
      ),

    inStock:
      raw?.stock?.inStock !== false &&
      variant?.stock?.inStock !== false
  };
}

function normalizeProduct(product) {
  const id =
    product?._id ||
    product?.id ||
    "";

  const price =
    productPrice(product);

  const variants =
    (product
