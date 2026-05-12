import { useState, useEffect } from "react";
import { getActiveBackend } from "../lib/aiClient.js";

export default function BackendBadge() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    getActiveBackend().then(setInfo).catch(() => setInfo({ backend: "unknown", model: "unknown" }));
  }, []);

  if (!info) return null;

  const label = info.isAnthropic ? "CLAUDE" : info.backend === "local" ? "LOCAL AI" : "FALLBACK";
  const shortModel = (info.model || "").split("/").pop().split(".")[0].substring(0, 24);

  return (
    <div className="backend-badge">
      <div className="backend-dot" />
      <span>{label}</span>
      <span style={{ color: "var(--text-muted)", fontSize: 9 }}>// {shortModel}</span>
    </div>
  );
}
