import { createClient, OAuthStrategy } from "@wix/sdk";
import { products } from "@wix/stores";

const WIX_CLIENT_ID = import.meta.env.VITE_WIX_CLIENT_ID;
const STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";
const TOKEN_KEY = "cajamoda-wix-session";

const storefrontSources = new Set([
  "CAJAMODA_STOREFRONT",
  "CAJAMODA_IFRAME",
  "MODAPOP_IFRAME"
]);

let activeResponseSource = "CAJAMODA_WIX";
let initialized = false;
let initializing = null;
let productCache = [];

if (!WIX_CLIENT_ID) {
  throw new Error(
    "Missing VITE_WIX_CLIENT_ID in the Render environment."
  );
}

function readTokens() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);

    return raw
      ? JSON.parse(raw)
      : undefined;
  } catch {
    return undefined;
  }
}

const wixClient = createClient({
  modules: {
    products
  },

  auth: OAuthStrategy({
    clientId: WIX_CLIENT_ID,
    tokens: readTokens()
  })
});

function saveTokens() {
  try {
    const tokens =
      wixClient.auth.getTokens?.();

    if (tokens) {
      localStorage.setItem(
        TOKEN_KEY,
        JSON.stringify(tokens)
      );
    }
  } catch {}
}

function responseSourceFor(incomingSource) {
  return incomingSource === "MODAPOP_IFRAME"
    ? "MODAPOP_WIX"
    : "CAJAMODA_WIX";
}

function send(
  type,
  payload = {},
  source = activeResponseSource
) {
  window.postMessage(
    {
      source,
      type,
      payload
    },
    window.location.origin
  );
}

function stripHtml(value = "") {
  const element =
    document.createElement("div");

  element.innerHTML =
    String(value);

  return (
    element.textContent ||
    element.innerText ||
    ""
  );
}

function firstValue(...values) {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return undefined;
}

function imageUrlFromMediaItem(item) {
  return (
    firstValue(
      item?.image?.url,
      item?.url,
      item?.src,
      item?.imageUrl,
      item?.media?.url
    ) || ""
  );
}

function extractMedia(product) {
  const urls = [];

  const main =
    firstValue(
      product?.media?.mainMedia?.image?.url,
      product?.media?.mainMedia?.url,
      product?.image?.url,
      product?.imageUrl
    );

  if (main) {
    urls.push(main);
  }

  const items =
    product?.media?.items ||
    product?.media?.mediaItems ||
    [];

  for (const item of items) {
    const url =
      imageUrlFromMediaItem(item);

    if (
      url &&
      !urls.includes(url)
    ) {
      urls.push(url);
    }
  }

  return urls;
}

function extractPrice(product) {
  return Number(
   
