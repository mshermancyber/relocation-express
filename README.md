# [ RX ] Relocation Express

> AI-powered job relocation analysis platform. Enter your current salary, expenses, and a target job opportunity — get a tax-accurate financial analysis, cost of living comparison, resume match score, skill gap roadmap, and an executive PDF report.

---

## Features

- **Tax-accurate financials** — federal + state + local tax calculated for 300+ US cities, with support for filing status (single / MFJ / head of household), dependents, and Child Tax Credit
- **Cost of living breakdown** — housing priced for your exact unit type (studio / 1BR / 2BR / house or apartment), transportation, utilities
- **Resume ↔ JD match** — skill gap analysis, missing certifications with provider/cost/study time, priority learning path
- **Year-one cost modeling** — car purchase, moving costs, security deposit tracked separately from monthly expenses with break-even calculation
- **PDF report** — executive-style, multi-page, downloadable
- **Save / load sessions** — JSON export and import so you never re-enter data
- **Dual AI backend** — Anthropic Claude API (recommended) or local llama.cpp / Ollama

---

## Quick Start

### 1. Configure

```bash
cp .env.example .env
# Edit .env — add your API key or local AI endpoint
```

### 2. Install & Run

```bash
npm install
npm run build
npm run dev
# Open http://localhost:3030
```

### Docker

```bash
cp .env.example .env
# Edit .env
docker compose up --build
# Open http://localhost:3030
```

---

## Configuration

Edit `.env`:

```env
# Use Anthropic Claude (recommended)
AI_BACKEND=fallback
FALLBACK_AI_API_KEY=sk-ant-your-key-here
FALLBACK_AI_MODEL=claude-opus-4-7

# OR use local llama.cpp / Ollama
AI_BACKEND=local
LOCAL_AI_BASE_URL=http://localhost:11434/v1
LOCAL_AI_MODEL=your-model.gguf
```

### Recommended Models

| Model | Speed | Cost/run | Quality |
|---|---|---|---|
| `claude-opus-4-7` | ~45s | ~$0.30 | Best |
| `claude-sonnet-4-6` | ~20s | ~$0.15 | Very good |
| `claude-haiku-4-5-20251001` | ~15s | ~$0.05 | Good |
| Local llama.cpp (7B–35B) | 2–10 min | $0 | Variable |

Get an Anthropic API key at [console.anthropic.com](https://console.anthropic.com)

---

## Usage

**Step 01 — Current Situation**
Enter your current city, company, annual salary, filing status, number of dependents, housing preference (unit type and bedroom count), and monthly expenses (rent, transportation, utilities, subscriptions, bills, savings target).

**Step 02 — Target Opportunity**
Enter the new company, job title, target city (free text — the AI looks up cost of living), offered salary, and paste the full job description. Optionally upload your resume as a PDF for match scoring.

**Step 03 — Report**
Review the full analysis in-app and click **Export PDF** to download the executive report.

**Saving and loading:**
Click **⬇ Save Session** at any time to download a JSON file containing all your inputs and the analysis result. Click **⬆ Load Session** to restore it later — your form data repopulates instantly and if a completed analysis was saved, it goes straight to the report view.

---

## Demo

The `demo/` folder contains a sample session you can load immediately to see the app in action without entering any data.

### Running the Demo

1. Start the app (`npm run dev` or Docker)
2. Click **⬆ Load Session** in the header
3. Select `demo/rx-session-demo-carmen-sandiego.json`
4. The form populates with Carmen's situation (San Francisco → Miami) and the target job description
5. Optionally upload `demo/carmen_sandiego_resume.pdf` on Step 02 for resume match analysis
6. Click **⚡ Run Analysis**

### About the Demo Data

The demo uses **Carmen Sandiego** — international asset recovery specialist, founder of V.I.L.E., and former ACME Senior Field Agent — as a fictional test candidate.

**Session JSON** (`rx-session-demo-carmen-sandiego.json`) pre-fills:
- Current situation: San Francisco, CA · $142,000 · single · 1BR apartment
- Target: Director of International Asset Recovery at Global Acquisitions & Relocation Enterprises (GARE) · Miami, FL · $158,000
- Full job description for the role (280+ travel days, red coat a plus)
- Carmen's complete resume text embedded directly in the JSON

**Resume PDF** (`carmen_sandiego_resume.pdf`) is a formatted two-page resume you can upload on Step 02 for PDF extraction testing. The resume text is also embedded in the session JSON, so uploading the PDF is optional — the analysis runs either way.

**What the demo tests:**
- SF → Miami financial comparison (CA drops from ~9.3% state tax to 0% FL — genuinely meaningful numbers)
- Resume match against a real-format JD with quantifiable skill gaps
- PDF upload and text extraction pipeline
- Session save/load roundtrip
- Full PDF report generation

> Note: Carmen's Interpol recognition is listed as a certification. The AI's assessment of whether this constitutes valid 2LoD operational risk management experience is left as an exercise for the reader.

---

## How It Works

```
Browser (React)
    │
    ├── Tax math computed client-side from taxData.js (300+ cities, no AI needed)
    ├── Resume PDF extracted client-side via PDF.js (never leaves your machine)
    │
    └── /api/chat  ──►  Express server (server.js)
                            │
                            ├── Anthropic /v1/messages  (Claude API)
                            └── OpenAI-compatible /v1/chat/completions  (local AI)
```

All API keys live server-side. The browser never sees your Anthropic key. Tax calculations and resume extraction happen locally regardless of which AI backend is configured.

---

## Privacy

- Resume text is extracted in the browser and sent only to your configured AI backend
- Session JSON files contain your salary, expense data, and resume text — store them accordingly
- No data is logged or retained by the app itself
- If using the Anthropic API, data is subject to [Anthropic's privacy policy](https://www.anthropic.com/privacy)

---

## Notes

- Tax data covers all 50 states + DC + 60+ cities with local income taxes (NYC, Philadelphia, Detroit, etc.)
- NJ residents commuting to NYC: enter your home city for accurate NJ state tax (no NYC local tax applies)
- The post-parse corrector enforces verified tax rates from `taxData.js` regardless of what the AI calculates
- Opus 4.7 does not support the `temperature` parameter — handled automatically by the server

---

## Tech Stack

- **React 18 + Vite** — frontend
- **Express** — proxy server, serves built frontend, handles CORS
- **jsPDF** — client-side PDF report generation
- **PDF.js** (CDN) — client-side resume text extraction
- **taxData.js** — local US tax database (no API, no lookup fees)
- **Anthropic Claude API** or **OpenAI-compatible local endpoint**
