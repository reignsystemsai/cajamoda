import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        product: resolve(import.meta.dirname, "product/index.html"),
      },
    },
  },
});
