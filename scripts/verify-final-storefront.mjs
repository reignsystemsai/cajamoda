import { readFile } from "node:fs/promises";

const product = await readFile(new URL("../product/index.html", import.meta.url), "utf8");
const checkout = await readFile(new URL("../checkout/index.html", import.meta.url), "utf8");
const server = await readFile(new URL("../server.js", import.meta.url), "utf8");

const checks = [
  ["Product Profile is locked", product.includes("Crea o administra tu perfil desde Inicio.")],
  ["Size selection does not add automatically", !/function selectSize[\s\S]*?syncSelectionToBag\(\)[\s\S]*?qsa\(\s*"\[data-size\]"/.test(product)],
  ["Product rating floats", product.includes('class="productRatingSummary"')],
  ["Review panel contains review-only UI", product.includes('aria-label="Reseñas del producto"')],
  ["Review panel has close control", product.includes('id="reviewClose"')],
  ["Review form posts through backend", product.includes('fetch("/api/reviews"') && server.includes('url.pathname === "/api/reviews"')],
  ["Bolsa includes wishlist and XS–XL sizing", checkout.includes("data-cart-favorite") && checkout.includes("cartSizeChoices")],
  ["Color is derived from Wix variants", checkout.includes("function visibleColor") && product.includes("function productColorValues")],
  ["Bag lines are canonicalized", checkout.includes("const canonicalItems=[]")],
  ["Wix review credentials remain server-side", !product.includes("WIX_API_KEY") && server.includes("WIX_API_KEY")]
];

const failed = checks.filter(([,passed]) => !passed);
checks.forEach(([name,passed]) => console.log(`${passed ? "✓" : "✗"} ${name}`));
if(failed.length){
  process.exitCode=1;
}
