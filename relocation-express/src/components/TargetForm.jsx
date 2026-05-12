import { useState, useRef } from "react";
import { extractPdfText } from "../lib/pdfParser.js";

const DEFAULT = {
  newCompany: "",
  newTitle: "",
  newCity: "",
  offeredSalary: "",
  jobDescription: "",
};

export default function TargetForm({ value, onChange, resumeText, onResumeText }) {
  const data = value || DEFAULT;
  const set = (k, v) => onChange({ ...data, [k]: v });

  const [resumeFile, setResumeFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith(".pdf")) {
      setParseError("Please upload a PDF file.");
      return;
    }
    setParseError(null);
    setParsing(true);
    setResumeFile(file);
    try {
      const text = await extractPdfText(file);
      onResumeText(text);
    } catch (err) {
      setParseError("Could not parse PDF: " + err.message);
      onResumeText("");
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card">
        <div className="card-title">Target Opportunity</div>
        <div className="form-grid form-grid-2" style={{ gap: 14 }}>
          <div className="field">
            <label>New Company</label>
            <input
              placeholder="e.g. Acme Corp"
              value={data.newCompany}
              onChange={e => set("newCompany", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Job Title</label>
            <input
              placeholder="e.g. Senior Manager, Engineering"
              value={data.newTitle}
              onChange={e => set("newTitle", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Target City (free text)</label>
            <input
              placeholder="e.g. Austin, TX"
              value={data.newCity}
              onChange={e => set("newCity", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Offered Annual Salary ($)</label>
            <input
              type="number"
              placeholder="e.g. 90000"
              value={data.offeredSalary}
              onChange={e => set("offeredSalary", e.target.value)}
            />
          </div>
        </div>

        <div className="section-divider">
          <span>Job Description</span>
        </div>

        <div className="field">
          <label>Paste Job Description</label>
          <textarea
            rows={8}
            placeholder="Paste the full job description here — the more detail, the better the resume match analysis..."
            value={data.jobDescription}
            onChange={e => set("jobDescription", e.target.value)}
            style={{ minHeight: 160 }}
          />
        </div>
      </div>

      {/* Resume Upload */}
      <div className="card">
        <div className="card-title">Resume Upload</div>
        <div
          className={`upload-zone ${resumeFile && !parseError ? "has-file" : ""} ${dragging ? "drag-over" : ""}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <div className="upload-icon">{resumeFile && !parseError ? "✅" : "📄"}</div>
          {parsing ? (
            <div className="upload-label" style={{ color: "var(--neon-cyan)" }}>PARSING PDF...</div>
          ) : resumeFile && !parseError ? (
            <>
              <div className="upload-filename">{resumeFile.name}</div>
              <div className="upload-label" style={{ marginTop: 4, color: "var(--neon-green)" }}>
                {resumeText ? `${resumeText.split(" ").length.toLocaleString()} words extracted` : "Parsed"}
              </div>
            </>
          ) : (
            <>
              <div className="upload-label">DROP RESUME PDF HERE</div>
              <div className="upload-label" style={{ marginTop: 4, opacity: 0.5 }}>or click to browse</div>
            </>
          )}
        </div>

        {parseError && (
          <div className="error-box" style={{ marginTop: 10 }}>{parseError}</div>
        )}

        {resumeFile && (
          <button
            className="btn-secondary"
            style={{ marginTop: 10, fontSize: 10 }}
            onClick={() => {
              setResumeFile(null);
              onResumeText("");
              if (fileRef.current) fileRef.current.value = "";
            }}
          >
            Remove Resume
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          onChange={e => handleFile(e.target.files?.[0])}
        />

        <p style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "var(--text-muted)",
          marginTop: 12,
          letterSpacing: 0.5,
        }}>
          Resume text is extracted client-side and sent only to your configured AI backend.
          PDF only. Resume upload is optional — skip for financial-only analysis.
        </p>
      </div>
    </div>
  );
}
