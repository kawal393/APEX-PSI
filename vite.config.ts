import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// APEX PSI — Vite configuration

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Public (publishable) fallbacks so a publish build without injected settings never ships a blank site.
  const fallback = {
    VITE_SUPABASE_URL: "https://qhtntebpcribjiwrdtdd.supabase.co",
    VITE_SUPABASE_PUBLISHABLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFodG50ZWJwY3JpYmppd3JkdGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTUxNTgsImV4cCI6MjA4Nzc5MTE1OH0.XdHR4S7-MtNHa8WUfHxWtCBrofr68k1qIXIOGnsZoXc",
  };
  const loaded = { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env } as Record<string, string | undefined>;
  const env = { ...loaded, VITE_SUPABASE_URL: loaded.VITE_SUPABASE_URL || fallback.VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY: loaded.VITE_SUPABASE_PUBLISHABLE_KEY || fallback.VITE_SUPABASE_PUBLISHABLE_KEY } as Record<string, string | undefined>;
  const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
  const missing = required.filter((name) => !env[name]);
  if (missing.length) {
    console.warn(`[apex] Missing ${missing.join(", ")} at build time (${mode}).`);
  }
  return {
  define: Object.fromEntries(required.filter((name) => env[name]).map((name) => [
    `import.meta.env.${name}`, JSON.stringify(env[name]),
  ])),
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mcpPlugin()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
      "react-router-dom": path.resolve(__dirname, "./node_modules/react-router-dom"),
    },
    dedupe: ["react", "react-dom", "react-router-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
    force: true,
  },
  };
});
