import { useState } from "react";

const DEFAULT = {
  currentCity: "",
  currentCompany: "",
  currentSalary: "",
  hasCar: true,
  // Tax profile
  filingStatus: "single",   // "single" | "married" | "head"
  dependents: "0",           // number of qualifying children
  // Housing preferences
  housingType: "apartment",  // "apartment" | "house"
  bedrooms: "1",             // "studio" | "1" | "2" | "3" | "4+"
  // Expenses
  rent: "",
  transportation: "",
  utilities: "",
  subscriptions: "",
  bills: "",
  savings: "",
};

const BEDROOM_OPTIONS = [
  { value: "studio", label: "Studio" },
  { value: "1",      label: "1 BR" },
  { value: "2",      label: "2 BR" },
  { value: "3",      label: "3 BR" },
  { value: "4+",     label: "4+ BR" },
];

export default function SituationForm({ value, onChange }) {
  const data = { ...DEFAULT, ...value };
  const set = (k, v) => onChange({ ...data, [k]: v });

  const totalExpenses = (
    Number(data.rent || 0) +
    Number(data.transportation || 0) +
    Number(data.utilities || 0) +
    Number(data.subscriptions || 0) +
    Number(data.bills || 0)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card">
        <div className="card-title">Current Position</div>
        <div className="form-grid form-grid-3" style={{ gap: 14 }}>
          <div className="field">
            <label>Current City</label>
            <input
              placeholder="e.g. Austin, TX"
              value={data.currentCity}
              onChange={e => set("currentCity", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Current Company</label>
            <input
              placeholder="e.g. Acme Corp"
              value={data.currentCompany}
              onChange={e => set("currentCompany", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Current Annual Salary ($)</label>
            <input
              type="number"
              placeholder="e.g. 95000"
              value={data.currentSalary}
              onChange={e => set("currentSalary", e.target.value)}
            />
          </div>
        </div>

        {/* Transportation */}
        <div className="section-divider" style={{ marginTop: 18 }}>
          <span>Transportation</span>
        </div>
        <label className="checkbox-field" style={{ display: "inline-flex", width: "auto" }}>
          <input
            type="checkbox"
            checked={data.hasCar}
            onChange={e => set("hasCar", e.target.checked)}
          />
          <span>I currently own / lease a car</span>
        </label>
      </div>

      {/* Tax Profile */}
      <div className="card">
        <div className="card-title">Tax Profile</div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}>
          Used for accurate federal tax calculation — significantly affects take-home comparison.
        </p>

        <div className="section-divider" style={{ marginTop: 0, marginBottom: 14 }}>
          <span>Filing Status</span>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
          {[
            { value: "single",  label: "Single" },
            { value: "married", label: "Married Filing Jointly" },
            { value: "head",    label: "Head of Household" },
          ].map(opt => (
            <label key={opt.value} className="checkbox-field" style={{
              flex: "1 0 auto",
              justifyContent: "center",
              border: data.filingStatus === opt.value ? "1px solid var(--neon-cyan)" : "1px solid var(--border)",
              background: data.filingStatus === opt.value ? "var(--accent-dim)" : "var(--bg-input)",
              cursor: "pointer",
            }}>
              <input type="radio" name="filingStatus" value={opt.value}
                checked={data.filingStatus === opt.value}
                onChange={() => set("filingStatus", opt.value)}
                style={{ width: 14, height: 14, accentColor: "var(--neon-cyan)" }}
              />
              <span style={{ fontSize: 13 }}>{opt.label}</span>
            </label>
          ))}
        </div>

        <div className="section-divider" style={{ marginTop: 0, marginBottom: 14 }}>
          <span>Qualifying Dependents (children)</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          {["0","1","2","3","4+"].map(n => (
            <label key={n} className="checkbox-field" style={{
              flex: "1 0 auto",
              justifyContent: "center",
              minWidth: 60,
              border: data.dependents === n ? "1px solid var(--neon-cyan)" : "1px solid var(--border)",
              background: data.dependents === n ? "var(--accent-dim)" : "var(--bg-input)",
              cursor: "pointer",
              padding: "8px 12px",
            }}>
              <input type="radio" name="dependents" value={n}
                checked={data.dependents === n}
                onChange={() => set("dependents", n)}
                style={{ width: 14, height: 14, accentColor: "var(--neon-cyan)" }}
              />
              <span style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}>{n}</span>
            </label>
          ))}
        </div>
        <p style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 6 }}>
          Each qualifying child = $2,000 Child Tax Credit (phases out above $200k single / $400k MFJ)
        </p>
      </div>

      {/* Housing Preferences */}
      <div className="card">
        <div className="card-title">Housing Preferences</div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, fontFamily: "var(--font-mono)", letterSpacing: 0.5 }}>
          Used to estimate target city rent for the right unit type — not just a studio average.
        </p>

        {/* Housing type toggle */}
        <div className="section-divider" style={{ marginTop: 0, marginBottom: 14 }}>
          <span>Unit Type</span>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          {[
            { value: "apartment", label: "🏢 Apartment / Condo" },
            { value: "house",     label: "🏠 House / Townhome" },
          ].map(opt => (
            <label
              key={opt.value}
              className="checkbox-field"
              style={{
                flex: 1,
                justifyContent: "center",
                border: data.housingType === opt.value
                  ? "1px solid var(--neon-cyan)"
                  : "1px solid var(--border)",
                background: data.housingType === opt.value
                  ? "var(--accent-dim)"
                  : "var(--bg-input)",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="housingType"
                value={opt.value}
                checked={data.housingType === opt.value}
                onChange={() => set("housingType", opt.value)}
                style={{ width: 14, height: 14, accentColor: "var(--neon-cyan)" }}
              />
              <span style={{ fontSize: 13 }}>{opt.label}</span>
            </label>
          ))}
        </div>

        {/* Bedrooms */}
        <div className="section-divider" style={{ marginTop: 0, marginBottom: 14 }}>
          <span>Bedrooms Needed</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {BEDROOM_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className="checkbox-field"
              style={{
                flex: "1 0 auto",
                justifyContent: "center",
                minWidth: 70,
                border: data.bedrooms === opt.value
                  ? "1px solid var(--neon-cyan)"
                  : "1px solid var(--border)",
                background: data.bedrooms === opt.value
                  ? "var(--accent-dim)"
                  : "var(--bg-input)",
                cursor: "pointer",
                padding: "8px 12px",
              }}
            >
              <input
                type="radio"
                name="bedrooms"
                value={opt.value}
                checked={data.bedrooms === opt.value}
                onChange={() => set("bedrooms", opt.value)}
                style={{ width: 14, height: 14, accentColor: "var(--neon-cyan)" }}
              />
              <span style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}>{opt.label}</span>
            </label>
          ))}
        </div>

        {/* Selection summary */}
        <div style={{
          marginTop: 14,
          padding: "8px 12px",
          background: "var(--bg-input)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--neon-cyan)",
          letterSpacing: 1,
        }}>
          AI will estimate: {data.bedrooms === "studio" ? "Studio" : `${data.bedrooms === "4+" ? "4+" : data.bedrooms}-bedroom`} {data.housingType === "house" ? "house / townhome" : "apartment / condo"} in target city
        </div>
      </div>

      {/* Monthly Budget */}
      <div className="card">
        <div className="card-title">Monthly Budget</div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}>
          {[
            { key: "rent",           label: "Current Rent / Mortgage", ph: "2500" },
            { key: "transportation", label: "Transportation",           ph: "200"  },
            { key: "utilities",      label: "Utilities",                ph: "150"  },
            { key: "subscriptions",  label: "Monthly Subscriptions",    ph: "100"  },
            { key: "bills",          label: "Other Bills",              ph: "300"  },
            { key: "savings",        label: "Savings Target",           ph: "500"  },
          ].map(({ key, label, ph }) => (
            <div className="field" key={key}>
              <label>{label} ($/mo)</label>
              <input
                type="number"
                placeholder={ph}
                value={data[key]}
                onChange={e => set(key, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Monthly summary */}
        {totalExpenses > 0 && (
          <div style={{
            marginTop: 16,
            padding: "10px 14px",
            background: "var(--bg-input)",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: 1 }}>TOTAL MONTHLY EXPENSES (excl. savings)</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 20, fontWeight: 700, color: "var(--neon-cyan)" }}>
                ${totalExpenses.toLocaleString()}/mo
              </div>
            </div>
            {Number(data.savings) > 0 && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: 1 }}>SAVINGS TARGET</div>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 16, fontWeight: 600, color: "var(--neon-green)" }}>
                  ${Number(data.savings).toLocaleString()}/mo
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
