import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Finding 8 Fix: Explicitly replace NODE_ENV so bundlers/tree-shakers
  // can dead-code-eliminate all dev-only branches in production builds.
  define: {
    "process.env.NODE_ENV": JSON.stringify(mode === "production" ? "production" : "development"),
  },
  build: {
    // Ensures esbuild drops all dead code (e.g. if(__DEV__){...} blocks)
    minify: "esbuild",
  },
}));
