import { exportPdf } from "../lib/exportPdf.js";

const REC_STYLES = {
  STRONG_RELOCATE: { bg: "rgba(0,230,130,0.12)", border: "#00e682", color: "#00e682" },
  RELOCATE:        { bg: "rgba(0,230,200,0.12)", border: "#00e6c8", color: "#00e6c8" },
  NEGOTIATE:       { bg: "rgba(240,224,64,0.12)", border: "#f0e040", color: "#f0e040" },
  NEUTRAL:         { bg: "rgba(106,136,160,0.12)", border: "#6a88a0", color: "#6a88a0" },
  DECLINE:         { bg: "rgba(255,45,126,0.12)", border: "#ff2d7e", color: "#ff2d7e" },
};

const SEV_COLOR = {
  HIGH: "#ff2d7e", MEDIUM: "#f0e040", LOW: "#00ffe0",
  STRONG_MATCH: "#00e682", GOOD_MATCH: "#00ffe0",
  PARTIAL_MATCH: "#f0e040", WEAK_MATCH: "#ff8c00", NO_RESUME: "#6a88a0",
};

function delta(val) {
  if (!val && val !== 0) return "—";
  const abs = Math.abs(val);
  if (val > 0) return `▲ +$${abs.toLocaleString()}`;
  if (val < 0) return `▼ -$${abs.toLocaleString()}`;
  return "—";
}
function deltaClass(val) {
  if (val > 0) return "positive";
  if (val < 0) return "negative";
  return "neutral";
}

function SectionHead({ label, accent = "var(--neon-cyan)" }) {
  return (
    <div className="report-header" style={{ borderLeftColor: accent, color: accent }}>
      {label}
    </div>
  );
}

function StatBox({ label, value, cls = "" }) {
  return (
    <div className="stat-box">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${cls}`}>{value}</div>
    </div>
  );
}

export default function RelocationReport({ situation, target, analysis }) {
  if (!analysis) return null;
  const fa  = analysis.financialAnalysis || {};
  const col = analysis.costOfLiving || {};
  const rm  = analysis.resumeMatch || {};
  const recStyle = REC_STYLES[analysis.recommendation] || REC_STYLES.NEUTRAL;

  const handleExport = () => exportPdf(situation, target, analysis);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Action bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", letterSpacing: 1 }}>
          ANALYSIS COMPLETE // {target.newTitle} @ {target.newCompany}
        </div>
        <button className="btn-pink" onClick={handleExport}>
          ⬇ Export PDF Report
        </button>
      </div>

      {/* Recommendation banner */}
      <div
        className="rec-banner"
        style={{ background: recStyle.bg, borderColor: recStyle.border }}
      >
        <div style={{ flex: 1 }}>
          <div className="rec-label" style={{ color: recStyle.color }}>AI RECOMMENDATION</div>
          <div className="rec-value" style={{ color: recStyle.color }}>
            {(analysis.recommendation || "NEUTRAL").replace(/_/g, " ")}
          </div>
        </div>
        {analysis.recommendationRationale && (
          <div style={{ flex: 2, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-secondary)", borderLeft: `1px solid ${recStyle.border}`, paddingLeft: 16 }}>
            {analysis.recommendationRationale}
          </div>
        )}
      </div>

      {/* Executive Summary */}
      <div className="card">
        <SectionHead label="Executive Summary" />
        <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.7 }}>
          {analysis.executiveSummary}
        </p>
      </div>

      {/* Financial Snapshot */}
      <div className="card">
        <SectionHead label="Financial Analysis" accent="var(--neon-cyan)" />

        <div className="stat-grid">
          <StatBox label={`Monthly Take-Home (${situation.currentCity})`} value={`$${Math.round(fa.currentMonthlyTakeHome||0).toLocaleString()}/mo`} />
          <StatBox label={`Monthly Take-Home (${target.newCity})`}        value={`$${Math.round(fa.newMonthlyTakeHome||0).toLocaleString()}/mo`} cls={deltaClass((fa.newMonthlyTakeHome||0)-(fa.currentMonthlyTakeHome||0))} />
          <StatBox label="Take-Home Delta"                                 value={delta(fa.monthlyTakeHomeDelta)} cls={deltaClass(fa.monthlyTakeHomeDelta)} />
          <StatBox label="Disposable Income Delta"                         value={delta(fa.disposableIncomeDelta)} cls={deltaClass(fa.disposableIncomeDelta)} />
          <StatBox label={`Effective Tax (${situation.currentCity})`}      value={`${((fa.currentEffectiveTotalTaxRate||0)*100).toFixed(1)}%`} />
          <StatBox label={`Effective Tax (${target.newCity})`}             value={`${((fa.newEffectiveTotalTaxRate||0)*100).toFixed(1)}%`} cls={deltaClass((fa.currentEffectiveTotalTaxRate||0)-(fa.newEffectiveTotalTaxRate||0))} />
          {fa.breakEvenMonths > 0 && (
            <StatBox
              label="Year-1 Break-Even"
              value={fa.breakEvenMonths >= 999 ? "N/A" : `${Math.round(fa.breakEvenMonths)} months`}
              cls={fa.breakEvenMonths <= 12 ? "positive" : fa.breakEvenMonths <= 24 ? "neutral" : "negative"}
            />
          )}
        </div>

        {/* Comparison table — full tax breakdown */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 8 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ textAlign: "left", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", padding: "6px 8px", letterSpacing: 1 }}>METRIC</th>
              <th style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neon-cyan)", padding: "6px 8px" }}>CURRENT</th>
              <th style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neon-pink)", padding: "6px 8px" }}>NEW</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Annual Gross Salary",   `$${(fa.currentGrossSalary||0).toLocaleString()}`,                       `$${(fa.newGrossSalary||0).toLocaleString()}`,                       null],
              ["Federal Tax Rate",      `${((fa.currentFederalTaxRate||0)*100).toFixed(1)}%`,                    `${((fa.newFederalTaxRate||0)*100).toFixed(1)}%`,                     null],
              ["State Tax Rate",        `${((fa.currentStateTaxRate||0)*100).toFixed(2)}%`,                      `${((fa.newStateTaxRate||0)*100).toFixed(2)}%`,                       null],
              ["Local Tax Rate",        `${((fa.currentLocalTaxRate||0)*100).toFixed(2)}%`,                      `${((fa.newLocalTaxRate||0)*100).toFixed(2)}%`,                       null],
              ["Effective Total Tax",   `${((fa.currentEffectiveTotalTaxRate||0)*100).toFixed(1)}%`,             `${((fa.newEffectiveTotalTaxRate||0)*100).toFixed(1)}%`,              null],
              ["Annual Take-Home",      `$${(fa.currentAnnualTakeHome||0).toLocaleString()}`,                    `$${(fa.newAnnualTakeHome||0).toLocaleString()}`,                     fa.annualTakeHomeDelta],
              ["Monthly Take-Home",     `$${Math.round(fa.currentMonthlyTakeHome||0).toLocaleString()}`,         `$${Math.round(fa.newMonthlyTakeHome||0).toLocaleString()}`,          fa.monthlyTakeHomeDelta],
              ["Monthly Expenses",      `$${Math.round(fa.currentMonthlyExpenses||0).toLocaleString()}`,         `$${Math.round(fa.estimatedNewMonthlyExpenses||0).toLocaleString()}`, (fa.estimatedNewMonthlyExpenses||0)-(fa.currentMonthlyExpenses||0)],
              ["Disposable / Month",    `$${Math.round(fa.currentMonthlyDisposableIncome||0).toLocaleString()}`, `$${Math.round(fa.estimatedNewMonthlyDisposableIncome||0).toLocaleString()}`, fa.disposableIncomeDelta],
            ].map(([label, cur, nw, dVal], i) => {
              const isSection = [0,5].includes(i);
              const nwColor = dVal !== null
                ? (label === "Monthly Expenses"
                    ? (dVal < 0 ? "var(--neon-green)" : dVal > 0 ? "var(--neon-pink)" : "var(--text-primary)")
                    : (dVal > 0 ? "var(--neon-green)" : dVal < 0 ? "var(--neon-pink)" : "var(--text-primary)"))
                : "var(--neon-cyan)";
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? "var(--bg-card-alt)" : "transparent", borderTop: isSection ? "1px solid var(--border-bright)" : "none" }}>
                  <td style={{ padding: "7px 8px", color: isSection ? "var(--text-primary)" : "var(--text-muted)", fontFamily: "var(--font-body)", fontWeight: isSection ? 600 : 400 }}>{label}</td>
                  <td style={{ textAlign: "right", padding: "7px 8px", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{cur}</td>
                  <td style={{ textAlign: "right", padding: "7px 8px", fontFamily: "var(--font-mono)", fontSize: 12, color: nwColor, fontWeight: dVal !== null ? 600 : 400 }}>{nw}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {fa.taxAnalysisNarrative && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--bg-input)", borderRadius: "var(--radius)", borderLeft: "3px solid var(--neon-cyan)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neon-cyan)", letterSpacing: 1, marginBottom: 6 }}>TAX ANALYSIS</div>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{fa.taxAnalysisNarrative}</p>
          </div>
        )}

        {/* New expense breakdown */}
        {fa.newExpenseBreakdown && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 8 }}>NEW LOCATION EXPENSE BREAKDOWN</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", padding: "4px 8px" }}>CATEGORY</th>
                  <th style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neon-cyan)", padding: "4px 8px" }}>CURRENT</th>
                  <th style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neon-pink)", padding: "4px 8px" }}>NEW</th>
                  <th style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", padding: "4px 8px" }}>DELTA</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Rent",          situation.rent,          fa.newExpenseBreakdown.rent],
                  ["Transportation",situation.transportation, fa.newExpenseBreakdown.transportation],
                  ["Utilities",     situation.utilities,      fa.newExpenseBreakdown.utilities],
                  ["Subscriptions", situation.subscriptions,  fa.newExpenseBreakdown.subscriptions],
                  ["Bills",         situation.bills,          fa.newExpenseBreakdown.bills],
                ].map(([label, cur, nw], i) => {
                  const d = (Number(nw)||0) - (Number(cur)||0);
                  const dc = d < 0 ? "var(--neon-green)" : d > 0 ? "var(--neon-pink)" : "var(--text-muted)";
                  return (
                    <tr key={i} style={{ background: i%2===0 ? "var(--bg-card-alt)" : "transparent" }}>
                      <td style={{ padding: "6px 8px", color: "var(--text-muted)" }}>{label}</td>
                      <td style={{ textAlign: "right", padding: "6px 8px", color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>${Number(cur||0).toLocaleString()}</td>
                      <td style={{ textAlign: "right", padding: "6px 8px", color: "var(--neon-cyan)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>${Number(nw||0).toLocaleString()}</td>
                      <td style={{ textAlign: "right", padding: "6px 8px", color: dc, fontFamily: "var(--font-mono)" }}>{d>0?"+":""}{d.toLocaleString()}</td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: "1px solid var(--border-bright)", background: "var(--bg-card)" }}>
                  <td style={{ padding: "8px 8px", color: "var(--neon-cyan)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700 }}>TOTAL</td>
                  <td style={{ textAlign: "right", padding: "8px 8px", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>${Math.round(fa.currentMonthlyExpenses||0).toLocaleString()}</td>
                  <td style={{ textAlign: "right", padding: "8px 8px", color: "var(--neon-cyan)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>${Math.round(fa.estimatedNewMonthlyExpenses||0).toLocaleString()}</td>
                  <td style={{ textAlign: "right", padding: "8px 8px", fontFamily: "var(--font-mono)", fontWeight: 700, color: (fa.monthlyExpenseDelta||0)<0?"var(--neon-green)":"var(--neon-pink)" }}>{(fa.monthlyExpenseDelta||0)>0?"+":""}{Math.round(fa.monthlyExpenseDelta||0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            {fa.newExpenseBreakdown?.transportationNote && (
              <div style={{ marginTop: 6, padding: "6px 10px", background: "var(--bg-input)", borderRadius: "var(--radius)", fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                Transport calc: {fa.newExpenseBreakdown.transportationNote}
              </div>
            )}
          </div>
        )}

        {/* Break-even warning */}
        {fa.breakEvenMonths > 0 && fa.breakEvenMonths < 999 && (
          <div style={{
            marginTop: 10, padding: "10px 14px",
            background: fa.breakEvenMonths <= 12 ? "var(--success-dim)"
              : fa.breakEvenMonths <= 24 ? "var(--warn-dim)"
              : "var(--danger-dim)",
            border: `1px solid ${fa.breakEvenMonths <= 12 ? "var(--neon-green)"
              : fa.breakEvenMonths <= 24 ? "var(--warn)"
              : "var(--neon-pink)"}`,
            borderRadius: "var(--radius)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: 1 }}>
                YEAR-1 BREAK-EVEN
              </div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 700,
                color: fa.breakEvenMonths <= 12 ? "var(--neon-green)"
                  : fa.breakEvenMonths <= 24 ? "var(--warn)"
                  : "var(--neon-pink)"
              }}>
                {Math.round(fa.breakEvenMonths)} months
                {fa.breakEvenMonths > 36 && " ⚠ HIGH RISK"}
              </div>
            </div>
            <div style={{ textAlign: "right", maxWidth: 260 }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: 1 }}>
                {fa.breakEvenMonths <= 12 ? "EXCELLENT — costs recovered quickly"
                  : fa.breakEvenMonths <= 24 ? "ACCEPTABLE — costs recovered within 2 years"
                  : fa.breakEvenMonths <= 36 ? "MARGINAL — negotiate higher salary to improve"
                  : "UNFAVORABLE — negotiate salary before relocating"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                ${(fa.yearOneExtraordinaryCosts?.totalYearOne || 0).toLocaleString()} one-time ÷ ${Math.round(Math.abs(fa.disposableIncomeDelta)).toLocaleString()}/mo delta
              </div>
            </div>
          </div>
        )}

        {/* Savings capacity */}
        {fa.savingsTarget > 0 && (
          <div style={{
            marginTop: 12, padding: "10px 14px",
            background: fa.canMeetSavingsTarget ? "var(--success-dim)" : "var(--danger-dim)",
            border: `1px solid ${fa.canMeetSavingsTarget ? "var(--neon-green)" : "var(--neon-pink)"}`,
            borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: 1 }}>SAVINGS TARGET ${(fa.savingsTarget||0).toLocaleString()}/mo</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, color: fa.canMeetSavingsTarget ? "var(--neon-green)" : "var(--neon-pink)" }}>
                {fa.canMeetSavingsTarget ? "CAN MEET TARGET" : "CANNOT MEET TARGET"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>CAPACITY AFTER EXPENSES</div>
              <div style={{ fontFamily: "var(--font-head)", fontSize: 15, fontWeight: 700, color: fa.canMeetSavingsTarget ? "var(--neon-green)" : "var(--neon-pink)" }}>
                ${Math.round(fa.newSavingsCapacity||0).toLocaleString()}/mo
              </div>
            </div>
          </div>
        )}

        {/* Year 1 extraordinary costs */}
        {fa.yearOneExtraordinaryCosts?.totalYearOne > 0 && (
          <div style={{ marginTop: 12, padding: "12px 14px", background: "var(--warn-dim)", border: "1px solid var(--neon-yellow)", borderRadius: "var(--radius)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neon-yellow)", letterSpacing: 1, marginBottom: 8 }}>YEAR 1 ONE-TIME COSTS (not in monthly)</div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                ["Car Purchase",     fa.yearOneExtraordinaryCosts.carPurchase],
                ["Moving Costs",     fa.yearOneExtraordinaryCosts.movingCosts],
                ["Security Deposit", fa.yearOneExtraordinaryCosts.securityDeposit],
              ].filter(([,v]) => Number(v) > 0).map(([label, val], i) => (
                <div key={i}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)" }}>{label}</div>
                  <div style={{ fontFamily: "var(--font-head)", fontSize: 16, fontWeight: 700, color: "var(--neon-yellow)" }}>${Number(val||0).toLocaleString()}</div>
                </div>
              ))}
              <div style={{ marginLeft: "auto" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neon-yellow)" }}>TOTAL YEAR 1</div>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 16, fontWeight: 700, color: "var(--neon-yellow)" }}>${(fa.yearOneExtraordinaryCosts.totalYearOne||0).toLocaleString()}</div>
              </div>
            </div>
            {fa.yearOneExtraordinaryCosts.notes && (
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>{fa.yearOneExtraordinaryCosts.notes}</p>
            )}
          </div>
        )}
      </div>

      {/* Cost of Living */}
      <div className="card">
        <SectionHead label="Cost of Living Breakdown" accent="var(--neon-pink)" />

        <div className="stat-grid">
          <StatBox label="CoL Index (Current)" value={col.colIndexCurrent || "—"} />
          <StatBox label="CoL Index (New)"     value={col.colIndexNew     || "—"} cls={deltaClass((col.colIndexNew||0) < (col.colIndexCurrent||0) ? 1 : -1)} />
          <StatBox label="CoL Delta"           value={col.colDeltaPercent != null ? `${col.colDeltaPercent >= 0 ? "+" : ""}${col.colDeltaPercent.toFixed(1)}%` : "—"} cls={deltaClass(-(col.colDeltaPercent||0))} />
        </div>

        {col.colNarrative && (
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>{col.colNarrative}</p>
        )}

        {/* Housing */}
        {col.housing && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 8 }}>HOUSING</div>

            {/* Target unit callout */}
            {col.housing.targetUnitEstimatedRent > 0 && (
              <div style={{
                marginBottom: 12, padding: "10px 14px",
                background: "var(--accent-dim)", border: "1px solid var(--neon-cyan)",
                borderRadius: "var(--radius)", display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neon-cyan)", letterSpacing: 1 }}>YOUR TARGET UNIT</div>
                  <div style={{ fontFamily: "var(--font-head)", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" }}>
                    {col.housing.targetUnitType || col.housing.candidateHousingNeed || "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neon-cyan)", letterSpacing: 1 }}>EST. RENT (NEW CITY)</div>
                  <div style={{ fontFamily: "var(--font-head)", fontSize: 20, fontWeight: 700, color: "var(--neon-cyan)" }}>
                    ${(col.housing.targetUnitEstimatedRent||0).toLocaleString()}/mo
                  </div>
                </div>
              </div>
            )}

            <div className="stat-grid">
              <StatBox label="1BR Apt (Current City)" value={`$${(col.housing.currentAvgRent1BR||0).toLocaleString()}/mo`} />
              <StatBox label="1BR Apt (New City)"     value={`$${(col.housing.newAvgRent1BR||0).toLocaleString()}/mo`} cls={deltaClass((col.housing.currentAvgRent1BR||0) - (col.housing.newAvgRent1BR||0))} />
              <StatBox label="2BR Apt (New City)"     value={`$${(col.housing.newAvgRent2BR||0).toLocaleString()}/mo`} />
            </div>
            {col.housing.notes && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>{col.housing.notes}</p>}
          </div>
        )}

        {/* Transportation */}
        {col.transportation && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", letterSpacing: 1, marginBottom: 8 }}>TRANSPORTATION</div>
            <div className="stat-grid">
              {col.transportation.carRequired !== undefined && (
                <StatBox label="Car Required" value={col.transportation.carRequired ? "YES" : "NO"} cls={col.transportation.carRequired && !situation.hasCar ? "negative" : "positive"} />
              )}
              <StatBox label="Avg Used Car"      value={col.transportation.avgUsedCarPrice ? `$${col.transportation.avgUsedCarPrice.toLocaleString()}` : "—"} />
              <StatBox label="Insurance / Mo"    value={col.transportation.avgCarInsuranceMonthly ? `$${col.transportation.avgCarInsuranceMonthly}/mo` : "—"} />
              <StatBox label="Transit Pass"      value={col.transportation.publicTransitMonthlyPass ? `$${col.transportation.publicTransitMonthlyPass}/mo` : "—"} />
            </div>
            {col.transportation.transitionRecommendation && (
              <div style={{ marginTop: 8, padding: "10px 12px", background: "var(--accent-dim)", borderRadius: "var(--radius)", fontSize: 12, color: "var(--neon-cyan)" }}>
                → {col.transportation.transitionRecommendation}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resume Match */}
      <div className="card">
        <SectionHead label="Resume ↔ Job Description Match" accent="var(--neon-yellow)" />

        {rm.matchTier === "NO_RESUME" || !rm.matchScore ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No resume provided — match analysis not available.</p>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                border: `4px solid ${SEV_COLOR[rm.matchTier] || "#6a88a0"}`,
                boxShadow: `0 0 20px ${SEV_COLOR[rm.matchTier] || "#6a88a0"}40`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ fontFamily: "var(--font-head)", fontSize: 22, fontWeight: 700, color: SEV_COLOR[rm.matchTier] }}>{rm.matchScore}%</span>
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 18, fontWeight: 700, color: SEV_COLOR[rm.matchTier], letterSpacing: 1 }}>
                  {(rm.matchTier || "").replace(/_/g, " ")}
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                  {(rm.matchedSkills||[]).length} matched skills · {(rm.gaps||[]).length} gaps identified
                </div>
              </div>
            </div>

            <div className="match-bar-wrap">
              <div className="match-bar-track">
                <div className="match-bar-fill" style={{ width: `${rm.matchScore}%`, background: SEV_COLOR[rm.matchTier] }} />
              </div>
            </div>

            <div className="form-grid form-grid-2" style={{ gap: 12, marginTop: 16 }}>
              {rm.matchedSkills?.length > 0 && (
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neon-green)", letterSpacing: 1, marginBottom: 8 }}>MATCHED SKILLS</div>
                  {rm.matchedSkills.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, fontSize: 12, color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--neon-green)" }}>✓</span>
                      {s}
                    </div>
                  ))}
                </div>
              )}
              {rm.gaps?.length > 0 && (
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neon-pink)", letterSpacing: 1, marginBottom: 8 }}>GAPS</div>
                  {rm.gaps.map((g, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, fontSize: 12, color: "var(--text-secondary)" }}>
                      <span style={{ color: "var(--neon-pink)" }}>✗</span>
                      {g}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {rm.narrative && (
              <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--bg-input)", borderRadius: "var(--radius)", borderLeft: "3px solid var(--neon-yellow)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neon-yellow)", letterSpacing: 1, marginBottom: 6 }}>ANALYST ASSESSMENT</div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>{rm.narrative}</p>
              </div>
            )}

            {/* Skill Gap Analysis */}
            {rm.skillGapAnalysis && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--neon-pink)", letterSpacing: 2, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 3, height: 14, background: "var(--neon-pink)", borderRadius: 2 }} />
                  SKILL GAP ANALYSIS
                </div>

                {/* Gap summary banner */}
                {rm.skillGapAnalysis.gapSummary && (
                  <div style={{ padding: "10px 14px", background: "var(--danger-dim)", border: "1px solid var(--neon-pink)", borderRadius: "var(--radius)", marginBottom: 14 }}>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>{rm.skillGapAnalysis.gapSummary}</p>
                  </div>
                )}

                {/* Three gap categories */}
                {[
                  { key: "missingHardSkills",    label: "MISSING HARD SKILLS",    color: "var(--neon-pink)",   icon: "⚡" },
                  { key: "missingCertifications", label: "MISSING CERTIFICATIONS", color: "var(--neon-yellow)", icon: "🎓" },
                  { key: "missingExperience",     label: "MISSING EXPERIENCE",     color: "var(--neon-orange)", icon: "📋" },
                ].map(({ key, label, color, icon }) => {
                  const items = rm.skillGapAnalysis[key];
                  if (!items?.length) return null;
                  return (
                    <div key={key} style={{ marginBottom: 16 }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color, letterSpacing: 1, marginBottom: 8 }}>{icon} {label}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {items.map((item, i) => {
                          const name = item.skill || item.certification || item.experienceArea || "";
                          const priority = item.priority || "IMPORTANT";
                          const pColor = priority === "CRITICAL" ? "var(--neon-pink)" : priority === "IMPORTANT" ? "var(--neon-yellow)" : "var(--text-muted)";
                          return (
                            <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 14px", borderLeft: `3px solid ${pColor}` }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                                <span style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{name}</span>
                                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: pColor, border: `1px solid ${pColor}`, padding: "2px 6px", borderRadius: 2, flexShrink: 0, marginLeft: 8 }}>{priority}</span>
                              </div>
                              {item.jdContext && (
                                <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 6 }}>
                                  JD: "{item.jdContext}"
                                </div>
                              )}
                              {/* Cert-specific fields */}
                              {item.provider && (
                                <div style={{ display: "flex", gap: 16, marginBottom: 6, flexWrap: "wrap" }}>
                                  {item.provider && <span style={{ fontSize: 11, color: "var(--neon-yellow)" }}>Provider: {item.provider}</span>}
                                  {item.estimatedStudyTime && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Study time: {item.estimatedStudyTime}</span>}
                                  {item.estimatedCost && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Cost: {item.estimatedCost}</span>}
                                  {item.yearsRequired && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Required: {item.yearsRequired}</span>}
                                </div>
                              )}
                              {item.remediation && (
                                <div style={{ fontSize: 11, color: "var(--neon-cyan)", display: "flex", gap: 6, alignItems: "flex-start" }}>
                                  <span style={{ flexShrink: 0 }}>→</span>
                                  <span>{item.remediation}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Priority learning path */}
                {rm.skillGapAnalysis.priorityLearningPath?.length > 0 && (
                  <div style={{ marginTop: 4, padding: "12px 14px", background: "var(--accent-dim)", border: "1px solid var(--neon-cyan)", borderRadius: "var(--radius)" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neon-cyan)", letterSpacing: 1, marginBottom: 8 }}>PRIORITY LEARNING PATH</div>
                    <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                      {rm.skillGapAnalysis.priorityLearningPath.map((step, i) => (
                        <li key={i} style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--text-secondary)" }}>
                          <span style={{ fontFamily: "var(--font-mono)", color: "var(--neon-cyan)", minWidth: 18 }}>{i + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Risk / Opportunities */}
      {(analysis.riskFactors?.length || analysis.opportunities?.length) ? (
        <div className="form-grid form-grid-2" style={{ gap: 16 }}>
          {analysis.riskFactors?.length > 0 && (
            <div className="card">
              <SectionHead label="Risk Factors" accent="var(--neon-pink)" />
              {analysis.riskFactors.map((r, i) => (
                <div key={i} style={{ marginBottom: 12, padding: "8px 12px", background: "var(--bg-input)", borderRadius: "var(--radius)", borderLeft: `3px solid ${SEV_COLOR[r.severity]}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{r.factor}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: SEV_COLOR[r.severity], border: `1px solid ${SEV_COLOR[r.severity]}`, padding: "2px 6px", borderRadius: 2 }}>{r.severity}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{r.description}</p>
                </div>
              ))}
            </div>
          )}
          {analysis.opportunities?.length > 0 && (
            <div className="card">
              <SectionHead label="Opportunities" accent="var(--neon-green)" />
              {analysis.opportunities.map((o, i) => (
                <div key={i} style={{ marginBottom: 12, padding: "8px 12px", background: "var(--bg-input)", borderRadius: "var(--radius)", borderLeft: `3px solid var(--neon-green)` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{o.factor}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--neon-green)", border: "1px solid var(--neon-green)", padding: "2px 6px", borderRadius: 2 }}>{o.impact}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{o.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Negotiation Leverage */}
      {analysis.negotiationLeverage && (
        <div className="card">
          <SectionHead label="Negotiation Leverage" accent="var(--neon-green)" />
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{analysis.negotiationLeverage}</p>
        </div>
      )}

      {/* Recommended Actions */}
      {analysis.recommendedActions?.length > 0 && (
        <div className="card">
          <SectionHead label="Recommended Actions" accent="var(--neon-cyan)" />
          <ol style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {analysis.recommendedActions.map((a, i) => (
              <li key={i} style={{ display: "flex", gap: 12, padding: "10px 14px", background: "var(--bg-input)", borderRadius: "var(--radius)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--neon-cyan)", minWidth: 20 }}>{i + 1}.</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{a}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Data assumptions */}
      {analysis.dataAssumptions && (
        <div style={{ padding: "10px 14px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-muted)", letterSpacing: 1 }}>DATA ASSUMPTIONS: </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{analysis.dataAssumptions}</span>
        </div>
      )}

      {/* Bottom export */}
      <div style={{ display: "flex", justifyContent: "center", paddingBottom: 20 }}>
        <button className="btn-pink" style={{ fontSize: 15, padding: "14px 36px", letterSpacing: 2 }} onClick={handleExport}>
          ⬇ Download PDF Report
        </button>
      </div>
    </div>
  );
}
