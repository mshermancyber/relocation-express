import { useState, useRef } from "react";
import SituationForm from "./components/SituationForm.jsx";
import TargetForm from "./components/TargetForm.jsx";
import RelocationReport from "./components/RelocationReport.jsx";
import BackendBadge from "./components/BackendBadge.jsx";
import { chatCompletion } from "./lib/aiClient.js";
import { calcFederalEffectiveRate, lookupCityTax } from "./lib/taxData.js";
import { SYSTEM_PROMPT, SYSTEM_PROMPT_HAIKU, buildRelocationPrompt } from "./lib/prompts.js";
import "./App.css";

const VIEWS = { SITUATION: "situation", TARGET: "target", REPORT: "report" };

const SITUATION_DEFAULT = {
  currentCity: "", currentCompany: "", currentSalary: "",
  hasCar: true,
  filingStatus: "single",
  dependents: "0",
  housingType: "apartment",
  bedrooms: "1",
  rent: "", transportation: "", utilities: "",
  subscriptions: "", bills: "", savings: "",
};

const TARGET_DEFAULT = {
  newCompany: "", newTitle: "", newCity: "",
  offeredSalary: "", jobDescription: "",
};

// ── JSON extraction ────────────────────────────────────────────────────────
// Handles: Qwen3 <think> blocks, markdown fences, text before/after JSON,
// truncated responses, Qwen3 malformed key-value separators, and
// embedded unescaped quotes inside string values
function extractJson(raw) {
  let s = raw;

  // 1. Strip <think>...</think> blocks
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, "");

  // 2. Strip markdown fences
  s = s.replace(/```(?:json)?/gi, "").replace(/```/g, "");

  // 3. Fix Qwen3 quirk: "key " value"  ->  "key": "value"
  //    Model emits key with trailing space inside quotes, no colon, no opening quote on value
  s = s.replace(/"(\w+)\s+"/g, '"$1": "');

  // 4. Fix Qwen3 embedded unescaped quotes inside string values
  //    taxAnalysisNarrative value often contains "label": patterns inside the string
  //    Find each long string value that contains embedded quotes and strip them out
  //    Strategy: for any JSON string value that contains ": (a key-like pattern),
  //    clean the embedded quotes to prevent the brace-walker from misreading them
  s = s.replace(/"(taxAnalysisNarrative|narrative|executiveSummary|recommendationRationale|colNarrative|taxAnalysis[^"]*)":\s*"([\s\S]+?)(?=",?\s*\n\s*"[a-z])/g,
    (match, key, val) => {
      // Only clean if the value contains embedded unescaped quotes (the problem pattern)
      if (val.includes('"')) {
        const clean = val.replace(/"/g, "");
        return `"${key}": "${clean}`;
      }
      return match;
    }
  );

  // 5. Escape unescaped control characters inside string values (Opus 4.7 quirk)
  //    Opus 4.7 sometimes emits literal newlines/tabs inside JSON string values
  {
    let result = "", inString = false, escape = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i], code = s.charCodeAt(i);
      if (escape) { escape = false; result += c; continue; }
      if (c === "\\" && inString) { escape = true; result += c; continue; }
      if (c === '"') { inString = !inString; result += c; continue; }
      if (inString && code === 10) { result += "\\n"; continue; }
      if (inString && code === 13) { result += "\\r"; continue; }
      if (inString && code === 9)  { result += "\\t"; continue; }
      result += c;
    }
    s = result;
  }

  // 6. Fix trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, "$1");

  // 6. Find start of JSON object
  const start = s.indexOf("{");
  if (start === -1) {
    throw new Error("No JSON object found in AI response. Raw (first 500):\n" + raw.substring(0, 500));
  }

  // 6. Walk braces string-aware to find matching close
  let depth = 0, end = -1;
  let inString = false, escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === "\\" && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  // 7. If truncated, attempt repair
  if (end === -1) {
    console.warn("JSON appears truncated — attempting repair");
    let fragment = s.slice(start);
    let d = 0, inStr = false, esc = false;
    for (const c of fragment) {
      if (esc) { esc = false; continue; }
      if (c === "\\" && inStr) { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === "{" || c === "[") d++;
      else if (c === "}" || c === "]") d--;
    }
    fragment = fragment.replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/, "");
    fragment = fragment.replace(/,\s*"[^"]*"\s*$/, "");
    fragment = fragment.trimEnd();
    for (let i = 0; i < Math.abs(d); i++) fragment += "}";
    try {
      JSON.parse(fragment);
      return fragment;
    } catch {
      throw new Error(
        "AI response truncated and could not be repaired. " +
        "Raw tail (last 200): " + raw.slice(-200)
      );
    }
  }

  return s.slice(start, end + 1);
}

function validateSituation(s) {
  const errors = [];
  if (!s.currentCity.trim()) errors.push("Current city is required");
  if (!s.currentSalary)      errors.push("Current salary is required");
  if (!s.rent)               errors.push("Monthly rent is required");
  return errors;
}

function validateTarget(t) {
  const errors = [];
  if (!t.newCity.trim())  errors.push("Target city is required");
  if (!t.offeredSalary)   errors.push("Offered salary is required");
  return errors;
}

export default function App() {
  const [view, setView]               = useState(VIEWS.SITUATION);
  const [situation, setSituation]     = useState(SITUATION_DEFAULT);
  const [target, setTarget]           = useState(TARGET_DEFAULT);
  const [resumeText, setResumeText]   = useState("");
  const [analysis, setAnalysis]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importMsg, setImportMsg]     = useState(null);

  const importRef = useRef();

  const canGoTarget = situation.currentCity && situation.currentSalary;
  const canAnalyze  = target.newCity && target.offeredSalary;

  // ── Save session ──────────────────────────────────────────────────────────
  const handleSave = () => {
    const session = {
      _version: "1.0",
      _saved: new Date().toISOString(),
      situation, target, resumeText, analysis,
    };
    const blob = new Blob([JSON.stringify(session, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const company = (target.newCompany || "session").replace(/\s+/g, "-");
    const city    = (target.newCity    || "").replace(/\s+/g, "-");
    a.href     = url;
    a.download = `rx-session_${company}_${city}_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Load session ──────────────────────────────────────────────────────────
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const session = JSON.parse(ev.target.result);
        if (session.situation) setSituation({ ...SITUATION_DEFAULT, ...session.situation,
          // Ensure new fields have defaults if loading old session JSON
          filingStatus: session.situation.filingStatus || "single",
          dependents:   session.situation.dependents   || "0",
          housingType:  session.situation.housingType  || "apartment",
          bedrooms:     session.situation.bedrooms     || "1",
        });
        if (session.target)    setTarget({ ...TARGET_DEFAULT, ...session.target });
        if (session.resumeText !== undefined) setResumeText(session.resumeText || "");
        if (session.analysis) {
          setAnalysis(session.analysis);
          setView(VIEWS.REPORT);
          setImportMsg("Session loaded — showing saved report.");
        } else {
          setView(VIEWS.SITUATION);
          setImportMsg("Form data loaded — fill in missing fields and run analysis.");
        }
        setTimeout(() => setImportMsg(null), 4000);
      } catch (err) {
        setImportMsg("Error loading session: " + err.message);
        setTimeout(() => setImportMsg(null), 5000);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── AI analysis ───────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    const sitErrs = validateSituation(situation);
    const tgtErrs = validateTarget(target);
    const all = [...sitErrs, ...tgtErrs];
    if (all.length) { setValidationErrors(all); return; }
    setValidationErrors([]);

    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const prompt = buildRelocationPrompt({ situation, target, resumeText });
      // Use slim prompt for Haiku (tax values pre-filled, no redundant rules needed)
      const systemPrompt = __AI_BACKEND__ === "fallback" ? SYSTEM_PROMPT_HAIKU : SYSTEM_PROMPT;
      const raw = await chatCompletion(
        [
          { role: "system", content: systemPrompt },
          { role: "user",   content: prompt },
        ],
        // 8192 output tokens — needed for full JSON with resume + long JD
        // Haiku: temp 0.1 for consistent JSON, 8192 tokens is plenty
        // Qwen3 local: temp 0.3 (higher due to CPU/GPU split noise), 16384 for safety
        __AI_BACKEND__ === "fallback"
          ? { temperature: 0.1, max_tokens: 32768 }
          : { temperature: 0.3, max_tokens: 16384 }
      );

      const dumpToFile = (filename, text) => {
        const blob = new Blob([text], { type: "text/plain" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      };

      let jsonStr;
      try {
        jsonStr = extractJson(raw);
      } catch (extractErr) {
        // Dump raw response to file so we can inspect it
        dumpToFile("rx-debug-raw.txt", raw);
        throw new Error("JSON extraction failed — raw response saved to rx-debug-raw.txt. Error: " + extractErr.message);
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseErr) {
        // Dump both raw and extracted JSON to file
        const debugDump = [
          "=== RAW RESPONSE ===",
          raw,
          "",
          "=== EXTRACTED JSON ===",
          jsonStr,
          "",
          "=== ERROR ===",
          parseErr.message,
          "Position hint: chars around error:",
          jsonStr.substring(Math.max(0, 1400), 1650),
        ].join("\n");
        dumpToFile("rx-debug-parse-error.txt", debugDump);
        throw new Error("JSON parse failed — debug file saved to rx-debug-parse-error.txt. Error: " + parseErr.message);
      }

      // Post-parse math correction — use our verified tax data as ground truth
      // overrides whatever the model calculated to ensure accuracy
      const fa = parsed.financialAnalysis;
      if (fa) {
        // Re-apply verified tax rates from our data model
        const filing = situation.filingStatus || "single";
        const deps   = situation.dependents === "4+" ? 4 : Number(situation.dependents || 0);
        const curTax = lookupCityTax(situation.currentCity || "");
        const nwTax  = lookupCityTax(target.newCity || "");
        const curFed = calcFederalEffectiveRate(fa.currentGrossSalary || 0, filing, deps);
        const nwFed  = calcFederalEffectiveRate(fa.newGrossSalary || 0, filing, deps);

        if (curTax.found) {
          fa.currentFederalTaxRate        = curFed;
          fa.currentStateTaxRate          = curTax.stateRate;
          fa.currentLocalTaxRate          = curTax.localRate;
        }
        fa.currentEffectiveTotalTaxRate = (fa.currentFederalTaxRate||0) + (fa.currentStateTaxRate||0) + (fa.currentLocalTaxRate||0);
        fa.currentAnnualTakeHome  = Math.round(fa.currentGrossSalary * (1 - fa.currentEffectiveTotalTaxRate));
        fa.currentMonthlyTakeHome = fa.currentAnnualTakeHome / 12;

        if (nwTax.found) {
          fa.newFederalTaxRate        = nwFed;
          fa.newStateTaxRate          = nwTax.stateRate;
          fa.newLocalTaxRate          = nwTax.localRate;
        }
        fa.newEffectiveTotalTaxRate = (fa.newFederalTaxRate||0) + (fa.newStateTaxRate||0) + (fa.newLocalTaxRate||0);
        fa.newAnnualTakeHome  = Math.round(fa.newGrossSalary * (1 - fa.newEffectiveTotalTaxRate));
        fa.newMonthlyTakeHome = fa.newAnnualTakeHome / 12;

        fa.monthlyTakeHomeDelta = Math.round((fa.newMonthlyTakeHome - fa.currentMonthlyTakeHome) * 100) / 100;
        fa.annualTakeHomeDelta  = fa.newAnnualTakeHome - fa.currentAnnualTakeHome;

        // Recompute expense total from breakdown if breakdown sums non-zero
        if (fa.newExpenseBreakdown) {
          const neb = fa.newExpenseBreakdown;
          const expSum = (neb.rent||0) + (neb.transportation||0) + (neb.utilities||0) + (neb.subscriptions||0) + (neb.bills||0);
          if (expSum > 0) fa.estimatedNewMonthlyExpenses = expSum;
        }
        fa.monthlyExpenseDelta = Math.round(fa.estimatedNewMonthlyExpenses - fa.currentMonthlyExpenses);

        fa.currentMonthlyDisposableIncome      = Math.round((fa.currentMonthlyTakeHome - fa.currentMonthlyExpenses) * 100) / 100;
        fa.estimatedNewMonthlyDisposableIncome = Math.round((fa.newMonthlyTakeHome - fa.estimatedNewMonthlyExpenses) * 100) / 100;
        fa.disposableIncomeDelta               = Math.round((fa.estimatedNewMonthlyDisposableIncome - fa.currentMonthlyDisposableIncome) * 100) / 100;
        fa.disposableIncomeChangePercent       = fa.currentMonthlyDisposableIncome !== 0
          ? Math.round((fa.disposableIncomeDelta / fa.currentMonthlyDisposableIncome) * 1000) / 10
          : 0;

        fa.newSavingsCapacity    = Math.round((fa.estimatedNewMonthlyDisposableIncome - (fa.savingsTarget||0)) * 100) / 100;
        fa.canMeetSavingsTarget  = fa.newSavingsCapacity >= 0;

        if (fa.yearOneExtraordinaryCosts?.totalYearOne > 0 && fa.disposableIncomeDelta > 0) {
          fa.breakEvenMonths = Math.round((fa.yearOneExtraordinaryCosts.totalYearOne / fa.disposableIncomeDelta) * 10) / 10;
        } else if (fa.disposableIncomeDelta <= 0) {
          fa.breakEvenMonths = 999;
        }

        // Override recommendation if break-even is unrealistic
        // STRONG_RELOCATE requires breakEven <= 18, RELOCATE <= 24
        if (fa.breakEvenMonths > 24 && parsed.recommendation === "STRONG_RELOCATE") {
          parsed.recommendation = "NEGOTIATE";
          parsed.recommendationRationale = (parsed.recommendationRationale || "") +
            ` NOTE: Recommendation downgraded from STRONG_RELOCATE — year-one costs take ${Math.round(fa.breakEvenMonths)} months to break even at current offer. Salary negotiation is needed.`;
        } else if (fa.breakEvenMonths > 18 && parsed.recommendation === "STRONG_RELOCATE") {
          parsed.recommendation = "RELOCATE";
        }

        parsed.financialAnalysis = fa;
      }

      setAnalysis(parsed);
      setView(VIEWS.REPORT);
    } catch (err) {
      setError(err.message || "Analysis failed. Check your AI backend config and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo-mark">
            <span className="logo-bracket">[</span>
            <span className="logo-text">RX</span>
            <span className="logo-bracket">]</span>
          </div>
          <div className="header-titles">
            <h1 className="app-title">Relocation Express</h1>
            <p className="app-subtitle">AI-Powered Career Relocation Analysis // v1.0</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn-secondary"
            style={{ fontSize: 10 }}
            onClick={() => importRef.current?.click()}
            title="Load a previously saved session JSON"
          >
            ⬆ Load Session
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleImport}
          />

          <button
            className="btn-secondary"
            style={{ fontSize: 10 }}
            onClick={handleSave}
            title="Save all form data and analysis to JSON"
          >
            ⬇ Save Session
          </button>

          {analysis && (
            <button
              className="btn-secondary"
              style={{ fontSize: 10 }}
              onClick={() => { setAnalysis(null); setView(VIEWS.SITUATION); }}
            >
              New Analysis
            </button>
          )}

          <BackendBadge />
        </div>
      </header>

      {/* Toast */}
      {importMsg && (
        <div style={{
          background: "var(--accent-dim)",
          border: "1px solid var(--neon-cyan)",
          padding: "8px 24px",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--neon-cyan)",
          letterSpacing: 1,
          textAlign: "center",
        }}>
          {importMsg}
        </div>
      )}

      {/* Nav */}
      <nav className="app-nav">
        <button
          className={`nav-tab ${view === VIEWS.SITUATION ? "active" : ""}`}
          onClick={() => setView(VIEWS.SITUATION)}
        >
          <span className="tab-num">01</span>
          <span className="tab-label">Current Situation</span>
        </button>
        <div className="nav-connector" />
        <button
          className={`nav-tab ${view === VIEWS.TARGET ? "active" : ""} ${!canGoTarget ? "disabled" : ""}`}
          onClick={() => canGoTarget && setView(VIEWS.TARGET)}
        >
          <span className="tab-num">02</span>
          <span className="tab-label">Target Opportunity</span>
        </button>
        <div className="nav-connector" />
        <button
          className={`nav-tab ${view === VIEWS.REPORT ? "active" : ""} ${!analysis ? "disabled" : ""}`}
          onClick={() => analysis && setView(VIEWS.REPORT)}
        >
          <span className="tab-num">03</span>
          <span className="tab-label">Relocation Report</span>
        </button>
      </nav>

      {/* Main */}
      <main className="app-main">

        {/* Step 1 */}
        {view === VIEWS.SITUATION && (
          <div>
            <SituationForm value={situation} onChange={setSituation} />
            {validationErrors.length > 0 && (
              <div className="error-box" style={{ marginTop: 16 }}>
                {validationErrors.map((e, i) => <div key={i}>• {e}</div>)}
              </div>
            )}
            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn-primary"
                onClick={() => {
                  const errs = validateSituation(situation);
                  if (errs.length) { setValidationErrors(errs); return; }
                  setValidationErrors([]);
                  setView(VIEWS.TARGET);
                }}
              >
                Next: Target Opportunity →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {view === VIEWS.TARGET && (
          <div>
            <TargetForm
              value={target}
              onChange={setTarget}
              resumeText={resumeText}
              onResumeText={setResumeText}
            />

            {validationErrors.length > 0 && (
              <div className="error-box" style={{ marginTop: 16 }}>
                {validationErrors.map((e, i) => <div key={i}>• {e}</div>)}
              </div>
            )}

            {error && (
              <div className="error-box" style={{ marginTop: 16 }}>
                <strong>AI Error:</strong> {error}
                <div style={{ marginTop: 8, fontSize: 11, opacity: 0.8 }}>
                  Tip: If truncated, the model hit its token limit. Try a shorter job description or reload and retry.
                </div>
              </div>
            )}

            {loading && (
              <div className="loading-wrap">
                <div className="cyber-spinner" />
                <div className="loading-label">Analyzing relocation...</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", letterSpacing: 1, textAlign: "center", maxWidth: 360 }}>
                  Running tax calculations · Cost of living analysis · Resume matching
                </div>
              </div>
            )}

            {!loading && (
              <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button className="btn-secondary" onClick={() => setView(VIEWS.SITUATION)}>
                  ← Back
                </button>
                <button className="btn-primary" onClick={handleAnalyze} disabled={!canAnalyze}>
                  ⚡ Run Analysis
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3 */}
        {view === VIEWS.REPORT && analysis && (
          <RelocationReport situation={situation} target={target} analysis={analysis} />
        )}
      </main>
    </div>
  );
}
