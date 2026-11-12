import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// BASE_PATH lets GitHub Pages serve the app from /<repo>/.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
});
