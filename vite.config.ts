import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

// `pnpm dev:offline` (mode "offline") keeps the rulebook bindings local, so no Cloudflare login is needed.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), cloudflare({ remoteBindings: mode !== "offline" })],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
}));
