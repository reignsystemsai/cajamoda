import { resolve } from "node:path";
import { copyFileSync, mkdirSync } from "node:fs";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "startup-store-loader-entry",
      writeBundle(options) {
        const outputDirectory = resolve(import.meta.dirname, options.dir || "dist");
        mkdirSync(resolve(outputDirectory, "startup"), { recursive: true });
        copyFileSync(
          resolve(outputDirectory, "admin/index.html"),
          resolve(outputDirectory, "startup/index.html"),
        );
      },
    },
  ],
  build: {
    rolldownOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        product: resolve(import.meta.dirname, "product/index.html"),
        checkout: resolve(import.meta.dirname, "checkout/index.html"),
        checkout2: resolve(import.meta.dirname, "checkout-2/index.html"),
        checkout3: resolve(import.meta.dirname, "checkout-3/index.html"),
        orderConfirmation: resolve(import.meta.dirname, "order-confirmation/index.html"),
        admin: resolve(import.meta.dirname, "admin/index.html"),
      },
    },
  },
});
