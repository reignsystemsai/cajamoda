import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        product: resolve(import.meta.dirname, "product/index.html"),
        checkout: resolve(import.meta.dirname, "checkout/index.html"),
        orderConfirmation: resolve(import.meta.dirname, "order-confirmation/index.html"),
        admin: resolve(import.meta.dirname, "admin/index.html"),
      },
    },
  },
});
