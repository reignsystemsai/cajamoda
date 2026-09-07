import "./main-original.js";

if (window.location.pathname.startsWith("/checkout")) {
  import("./checkout-ui-refinement.js");
}
