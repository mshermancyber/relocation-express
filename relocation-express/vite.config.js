import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    define: {
      __LOCAL_AI_BASE_URL__:   JSON.stringify(env.LOCAL_AI_BASE_URL   || "http://localhost:8080/v1"),
      __LOCAL_AI_MODEL__:      JSON.stringify(env.LOCAL_AI_MODEL      || "model.gguf"),
      __FALLBACK_AI_BASE_URL__:JSON.stringify(env.FALLBACK_AI_BASE_URL|| "https://api.anthropic.com/v1"),
      __FALLBACK_AI_MODEL__:   JSON.stringify(env.FALLBACK_AI_MODEL   || "claude-sonnet-4-20250514"),
      __FALLBACK_AI_API_KEY__: JSON.stringify(env.FALLBACK_AI_API_KEY || ""),
      __AI_BACKEND__:          JSON.stringify(env.AI_BACKEND          || "local"),
    },
    server: { port: 5173 },
  };
});
