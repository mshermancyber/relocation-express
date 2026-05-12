// server.js — lightweight Express proxy for Relocation Express
// Handles CORS and proxies AI requests server-side so API keys stay safe
// Serves the built Vite frontend from /dist

import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3030;

// ── Config from .env ───────────────────────────────────────────────────────
const AI_BACKEND        = process.env.AI_BACKEND        || "local";
const LOCAL_AI_BASE_URL = process.env.LOCAL_AI_BASE_URL || "http://localhost:11434/v1";
const LOCAL_AI_MODEL    = process.env.LOCAL_AI_MODEL    || "model.gguf";
const FALLBACK_BASE_URL = process.env.FALLBACK_AI_BASE_URL || "https://api.anthropic.com/v1";
const FALLBACK_MODEL    = process.env.FALLBACK_AI_MODEL || "claude-haiku-4-5-20251001";
const FALLBACK_API_KEY  = process.env.FALLBACK_AI_API_KEY || "";

const isAnthropic = FALLBACK_BASE_URL.includes("anthropic.com");

app.use(express.json({ limit: "2mb" }));

// ── CORS for local dev ─────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ── Config endpoint — tells the frontend which backend/model is active ─────
app.get("/api/config", (req, res) => {
  res.json({
    backend:     AI_BACKEND,
    model:       AI_BACKEND === "fallback" ? FALLBACK_MODEL : LOCAL_AI_MODEL,
    baseUrl:     AI_BACKEND === "fallback" ? FALLBACK_BASE_URL : LOCAL_AI_BASE_URL,
    isAnthropic: AI_BACKEND === "fallback" && isAnthropic,
  });
});

// ── AI proxy endpoint ──────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, temperature = 0.1, max_tokens = 32768 } = req.body;

    let apiUrl, headers, body;

    if (AI_BACKEND === "fallback" && isAnthropic) {
      // ── Native Anthropic /v1/messages ────────────────────────────────────
      const systemMsg   = messages.find(m => m.role === "system");
      const userMessages = messages.filter(m => m.role !== "system");

      apiUrl  = `${FALLBACK_BASE_URL}/messages`;
      headers = {
        "Content-Type":      "application/json",
        "x-api-key":         FALLBACK_API_KEY,
        "anthropic-version": "2023-06-01",
      };
      // Opus 4.7+ deprecates temperature — only include for older models
      const modelSupportsTemp = !FALLBACK_MODEL.includes("opus-4-7");
      body = {
        model:      FALLBACK_MODEL,
        max_tokens,
        ...(modelSupportsTemp && { temperature }),
        messages:   userMessages,
        ...(systemMsg && { system: systemMsg.content }),
      };
    } else if (AI_BACKEND === "fallback") {
      // ── OpenAI-compatible fallback ───────────────────────────────────────
      apiUrl  = `${FALLBACK_BASE_URL}/chat/completions`;
      headers = {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${FALLBACK_API_KEY}`,
      };
      body = { model: FALLBACK_MODEL, messages, temperature, max_tokens };
    } else {
      // ── Local llama.cpp / Ollama ─────────────────────────────────────────
      apiUrl  = `${LOCAL_AI_BASE_URL}/chat/completions`;
      headers = { "Content-Type": "application/json" };
      body    = { model: LOCAL_AI_MODEL, messages, temperature, max_tokens };
    }

    const upstream = await fetch(apiUrl, {
      method:  "POST",
      headers,
      body:    JSON.stringify(body),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      return res.status(upstream.status).json({ error: err });
    }

    const data = await upstream.json();

    // Normalize response to { content: "..." }
    let content;
    if (AI_BACKEND === "fallback" && isAnthropic) {
      content = data.content?.find(b => b.type === "text")?.text || "";
    } else {
      content = data.choices?.[0]?.message?.content || "";
    }

    res.json({ content });
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Serve built frontend ───────────────────────────────────────────────────
app.use(express.static(join(__dirname, "dist")));
app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n[ RELOCATION EXPRESS ] server running on http://localhost:${PORT}`);
  console.log(`  Backend: ${AI_BACKEND.toUpperCase()} — ${AI_BACKEND === "fallback" ? FALLBACK_MODEL : LOCAL_AI_MODEL}`);
  console.log(`  API key: ${FALLBACK_API_KEY ? "configured" : "not set"}\n`);
});
