// src/lib/aiClient.js
// All AI calls go through the local Express proxy (/api/chat)
// This avoids CORS issues and keeps API keys server-side
// Config is fetched from /api/config at runtime

let _config = null;

async function getConfig() {
  if (_config) return _config;
  try {
    const res = await fetch("/api/config");
    _config = await res.json();
  } catch {
    // Fallback for local dev without server (e.g. npm run dev with vite proxy)
    _config = {
      backend:     __AI_BACKEND__,
      model:       __AI_BACKEND__ === "fallback" ? __FALLBACK_AI_MODEL__ : __LOCAL_AI_MODEL__,
      isAnthropic: __FALLBACK_AI_BASE_URL__.includes("anthropic.com"),
    };
  }
  return _config;
}

/**
 * Send a chat completion request via the server-side proxy.
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} options
 * @returns {Promise<string>} assistant message content
 */
export async function chatCompletion(messages, options = {}) {
  const { temperature = 0.1, max_tokens = 8192 } = options;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, temperature, max_tokens }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI proxy error [${response.status}]: ${err}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(`AI backend error: ${data.error}`);
  return data.content;
}

/** Returns active backend info for UI display */
export async function getActiveBackend() {
  const cfg = await getConfig();
  return cfg;
}
