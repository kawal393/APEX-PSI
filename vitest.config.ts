import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // The second path is deliberate: supabase/functions/_shared/rate-limit.ts is written
    // without any Deno-only API precisely so the edge functions' guard logic is covered by
    // this suite. Function entrypoints (index.ts) still need Deno and are not collected.
    include: ["src/**/*.{test,spec}.{ts,tsx}", "supabase/functions/_shared/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
