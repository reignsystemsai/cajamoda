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
        mkdirSync(resolve(outputDirectory, "analytics"), { recursive: true });
        copyFileSync(
          resolve(outputDirectory, "admin/index.html"),
          resolve(outputDirectory, "startup/index.html"),
        );
        copyFileSync(
          resolve(outputDirectory, "creator-link/index.html"),
          resolve(outputDirectory, "404.html"),
        );
        copyFileSync(
          resolve(import.meta.dirname, "analytics/client.js"),
          resolve(outputDirectory, "analytics/client.js"),
        );
        copyFileSync(
          resolve(import.meta.dirname, "storefront.js"),
          resolve(outputDirectory, "storefront.js"),
        );
        copyFileSync(
          resolve(import.meta.dirname, "analytics/admin.js"),
          resolve(outputDirectory, "analytics/admin.js"),
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
        creators: resolve(import.meta.dirname, "creadores/index.html"),
        creatorPortal: resolve(import.meta.dirname, "creators/index.html"),
        creatorAccept: resolve(import.meta.dirname, "creators/accept/index.html"),
        creatorTerms: resolve(import.meta.dirname, "creators/terms/index.html"),
        creatorLink: resolve(import.meta.dirname, "creator-link/index.html"),
        jery: resolve(import.meta.dirname, "jery/index.html"),
        prueba: resolve(import.meta.dirname, "prueba/index.html"),
        orderConfirmation: resolve(import.meta.dirname, "order-confirmation/index.html"),
        admin: resolve(import.meta.dirname, "admin/index.html"),
      },
    },
  },
});
