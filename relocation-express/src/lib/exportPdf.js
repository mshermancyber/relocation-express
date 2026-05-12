// src/lib/exportPdf.js
import { jsPDF } from "jspdf";

// ─── Color palette ───────────────────────────────────────────────────────────
const C = {
  black:      [6,   8,   13],
  darkPanel:  [11,  14,  21],
  card:       [15,  20,  32],
  border:     [26,  34,  53],
  cyan:       [0,   230, 200],
  pink:       [255, 45,  126],
  yellow:     [240, 224, 64],
  green:      [0,   230, 130],
  orange:     [255, 140, 0],
  white:      [216, 232, 240],
  muted:      [106, 136, 160],
  veryMuted:  [40,  55,  70],
};

const REC_COLORS = {
  STRONG_RELOCATE: C.green,
  RELOCATE:        C.cyan,
  NEGOTIATE:       C.yellow,
  NEUTRAL:         C.muted,
  DECLINE:         C.pink,
};

const SEV_COLORS = {
  HIGH:    C.pink,
  MEDIUM:  C.yellow,
  LOW:     C.cyan,
  STRONG_MATCH: C.green,
  GOOD_MATCH:   C.cyan,
  PARTIAL_MATCH: C.yellow,
  WEAK_MATCH:   C.orange,
  NO_RESUME:    C.muted,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rgb(doc, color, type = "text") {
  const [r, g, b] = color;
  if (type === "fill") doc.setFillColor(r, g, b);
  else if (type === "draw") doc.setDrawColor(r, g, b);
  else doc.setTextColor(r, g, b);
}

function wrap(doc, text, maxW) {
  return doc.splitTextToSize(String(text || ""), maxW);
}

function checkPage(doc, y, need = 16) {
  if (y + need > 276) { doc.addPage(); return 22; }
  return y;
}

function rule(doc, y, color = C.border) {
  rgb(doc, color, "draw");
  doc.setLineWidth(0.3);
  doc.line(14, y, 196, y);
  return y + 5;
}

function sectionHeader(doc, y, label, accentColor = C.cyan) {
  // Dark bar
  rgb(doc, C.darkPanel, "fill");
  doc.rect(14, y - 4, 182, 9, "F");
  // Accent left stripe
  rgb(doc, accentColor, "fill");
  doc.rect(14, y - 4, 3, 9, "F");
  // Label
  rgb(doc, accentColor);
  doc.setFontSize(7.5);
  doc.setFont("courier", "bold");
  doc.text(label.toUpperCase(), 21, y + 1.2);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.white);
  return y + 12;
}

function badge(doc, x, y, label, color) {
  const [r, g, b] = color;
  doc.setFillColor(r, g, b, 0.15);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.5);
  const w = Math.max(doc.getTextWidth(label) + 10, 24);
  doc.roundedRect(x, y - 5, w, 7, 1, 1, "FD");
  doc.setTextColor(r, g, b);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(label, x + w / 2, y, { align: "center" });
  doc.setFont("helvetica", "normal");
  rgb(doc, C.white);
  return w;
}

function kv(doc, x, y, label, value, valueColor = C.white, maxW = 80) {
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.muted);
  doc.text(label, x, y);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  rgb(doc, valueColor);
  const lines = wrap(doc, value, maxW);
  lines.forEach((line, i) => {
    doc.text(line, x, y + 5 + i * 5);
  });
  rgb(doc, C.white);
  return y + 5 + lines.length * 5;
}

function deltaArrow(val) {
  if (val > 0) return `(+) +$${Math.abs(Math.round(val)).toLocaleString()}`;
  if (val < 0) return `(-) -$${Math.abs(Math.round(val)).toLocaleString()}`;
  return `(=) $0`;
}

function deltaColor(val) {
  if (val > 0)  return C.green;
  if (val < 0)  return C.pink;
  return C.muted;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function exportPdf(situation, target, analysis) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = 182;
  let y = 0;

  const fa = analysis.financialAnalysis || {};
  const col = analysis.costOfLiving || {};
  const rm  = analysis.resumeMatch   || {};
  const recColor = REC_COLORS[analysis.recommendation] || C.muted;

  // ── Cover header ────────────────────────────────────────────────────────────
  rgb(doc, C.black, "fill");
  doc.rect(0, 0, 210, 50, "F");

  // Corner accent lines (cyberpunk frame)
  rgb(doc, C.cyan, "draw");
  doc.setLineWidth(0.8);
  doc.line(14, 8, 30, 8);   doc.line(14, 8, 14, 16);
  doc.line(196, 8, 180, 8); doc.line(196, 8, 196, 16);
  doc.line(14, 46, 30, 46); doc.line(14, 46, 14, 38);

  // Logo
  rgb(doc, C.cyan);
  doc.setFontSize(7);
  doc.setFont("courier", "bold");
  doc.text("[ RELOCATION EXPRESS ]  //  CAREER RELOCATION ANALYSIS SYSTEM", 14, 14);

  // Title — candidate + role
  rgb(doc, C.white);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const title = `${target.newTitle || "Role"} @ ${target.newCompany || "Company"}`;
  doc.text(title, 14, 26);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.muted);
  doc.text(
    `${situation.currentCity || "Current City"}  →  ${target.newCity || "Target City"}  ·  Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    14, 34
  );

  // Recommendation badge — top right
  const [rr, rg, rb] = recColor;
  rgb(doc, recColor, "fill");
  doc.roundedRect(148, 12, 48, 16, 2, 2, "F");
  rgb(doc, C.black);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  const recLabel = (analysis.recommendation || "NEUTRAL").replace("_", " ");
  doc.text(recLabel, 172, 21, { align: "center" });
  doc.setFontSize(6.5);
  doc.setFont("courier", "normal");
  doc.text("RECOMMENDATION", 172, 26, { align: "center" });

  y = 58;

  // ── Executive Summary ───────────────────────────────────────────────────────
  y = sectionHeader(doc, y, "Executive Summary");
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.muted);
  wrap(doc, analysis.executiveSummary, PW).forEach(line => {
    y = checkPage(doc, y);
    doc.text(line, 14, y); y += 5;
  });
  y += 3;

  // Rationale
  if (analysis.recommendationRationale) {
    y = checkPage(doc, y);
    rgb(doc, recColor);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("Verdict:", 14, y); y += 5;
    doc.setFont("helvetica", "normal");
    rgb(doc, C.muted);
    wrap(doc, analysis.recommendationRationale, PW).forEach(line => {
      y = checkPage(doc, y);
      doc.text(line, 14, y); y += 5;
    });
    y += 3;
  }

  // ── Financial Snapshot ──────────────────────────────────────────────────────
  y = checkPage(doc, y, 60);
  y = rule(doc, y, C.border);
  y = sectionHeader(doc, y, "Financial Snapshot", C.cyan);

  // Two-column comparison table
  const colW2 = (PW - 10) / 2;
  const lx = 14, rx = 14 + colW2 + 10;

  // Headers
  rgb(doc, C.darkPanel, "fill");
  doc.roundedRect(lx, y - 3, colW2, 8, 1, 1, "F");
  doc.roundedRect(rx, y - 3, colW2, 8, 1, 1, "F");
  rgb(doc, C.muted);
  doc.setFontSize(7);
  doc.setFont("courier", "bold");
  doc.text(`CURRENT  (${(situation.currentCity || "").toUpperCase()})`, lx + 4, y + 2);
  rgb(doc, C.cyan);
  doc.text(`NEW  (${(target.newCity || "").toUpperCase()})`, rx + 4, y + 2);
  y += 12;

  // Rows — expanded with federal/state/local tax breakdown
  const rows = [
    ["Gross Salary",         `$${(fa.currentGrossSalary||0).toLocaleString()}`,                            `$${(fa.newGrossSalary||0).toLocaleString()}`],
    ["Federal Tax Rate",     `${((fa.currentFederalTaxRate||0)*100).toFixed(1)}%`,                         `${((fa.newFederalTaxRate||0)*100).toFixed(1)}%`],
    ["State Tax Rate",       `${((fa.currentStateTaxRate||0)*100).toFixed(2)}%`,                           `${((fa.newStateTaxRate||0)*100).toFixed(2)}%`],
    ["Local Tax Rate",       `${((fa.currentLocalTaxRate||0)*100).toFixed(2)}%`,                           `${((fa.newLocalTaxRate||0)*100).toFixed(2)}%`],
    ["Effective Total Tax",  `${((fa.currentEffectiveTotalTaxRate||0)*100).toFixed(1)}%`,                  `${((fa.newEffectiveTotalTaxRate||0)*100).toFixed(1)}%`],
    ["Annual Take-Home",     `$${(fa.currentAnnualTakeHome||0).toLocaleString()}`,                         `$${(fa.newAnnualTakeHome||0).toLocaleString()}`],
    ["Monthly Take-Home",    `$${Math.round(fa.currentMonthlyTakeHome||0).toLocaleString()}`,              `$${Math.round(fa.newMonthlyTakeHome||0).toLocaleString()}`],
    ["Monthly Expenses",     `$${Math.round(fa.currentMonthlyExpenses||0).toLocaleString()}`,              `$${Math.round(fa.estimatedNewMonthlyExpenses||0).toLocaleString()}`],
    ["Disposable/Month",     `$${Math.round(fa.currentMonthlyDisposableIncome||0).toLocaleString()}`,      `$${Math.round(fa.estimatedNewMonthlyDisposableIncome||0).toLocaleString()}`],
  ];

  rows.forEach((row, i) => {
    y = checkPage(doc, y, 10);
    const isAlt = i % 2 === 0;
    if (isAlt) {
      rgb(doc, C.card, "fill");
      doc.rect(lx, y - 4, colW2, 8, "F");
      doc.rect(rx, y - 4, colW2, 8, "F");
    }
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    rgb(doc, C.muted);
    doc.text(row[0], lx + 3, y);
    rgb(doc, C.white);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], lx + colW2 - 3, y, { align: "right" });

    // New value — color-coded for expenses (row 7) and disposable (row 8)
    const delta = i === 7
      ? (fa.estimatedNewMonthlyExpenses||0) - (fa.currentMonthlyExpenses||0)
      : i === 8
        ? (fa.disposableIncomeDelta||0)
        : null;
    const vColor = delta !== null ? deltaColor(i === 7 ? -delta : delta) : C.cyan;
    rgb(doc, vColor);
    doc.text(row[2], rx + colW2 - 3, y, { align: "right" });
    rgb(doc, C.muted);
    doc.setFont("helvetica", "normal");
    doc.text(row[0], rx + 3, y);
    y += 9;
  });

  // Delta callout
  y += 3;
  y = checkPage(doc, y, 18);
  rgb(doc, C.darkPanel, "fill");
  doc.roundedRect(14, y - 3, PW, 14, 2, 2, "F");
  rgb(doc, C.cyan, "draw");
  doc.setLineWidth(0.5);
  doc.roundedRect(14, y - 3, PW, 14, 2, 2, "D");

  const diDelta = fa.disposableIncomeDelta || 0;
  const diPct   = fa.disposableIncomeChangePercent || 0;
  const diColor = deltaColor(diDelta);
  const beMonths = fa.breakEvenMonths || 0;

  // Taller box if we have break-even
  const deltaBoxH = beMonths > 0 ? 20 : 14;
  rgb(doc, C.darkPanel, "fill");
  doc.roundedRect(14, y - 3, PW, deltaBoxH, 2, 2, "F");
  rgb(doc, C.cyan, "draw");
  doc.setLineWidth(0.5);
  doc.roundedRect(14, y - 3, PW, deltaBoxH, 2, 2, "D");

  doc.setFontSize(8);
  doc.setFont("courier", "bold");
  rgb(doc, C.muted);
  doc.text("DISPOSABLE INCOME DELTA:", 20, y + 5);
  rgb(doc, diColor);
  doc.setFontSize(11);
  doc.text(deltaArrow(diDelta) + `/mo`, 90, y + 5.5);
  rgb(doc, C.muted);
  doc.setFontSize(8);
  const pctDisplay = isNaN(diPct) ? "n/a" : `${diPct >= 0 ? "+" : ""}${Number(diPct).toFixed(1)}%`;
  doc.text(`(${pctDisplay})`, 155, y + 5);

  if (beMonths > 0 && beMonths < 999) {
    const beColor = beMonths <= 12 ? C.green : beMonths <= 24 ? C.yellow : C.pink;
    doc.setFontSize(7); doc.setFont("courier", "normal"); rgb(doc, C.muted);
    doc.text("YEAR-1 BREAK-EVEN:", 20, y + 13);
    rgb(doc, beColor); doc.setFont("courier", "bold");
    const beLabel = beMonths > 36
      ? `${Math.round(beMonths)} months  !! UNFAVORABLE — negotiate salary`
      : beMonths > 24
        ? `${Math.round(beMonths)} months  — marginal, negotiate`
        : `${Math.round(beMonths)} months`;
    doc.text(beLabel, 75, y + 13);
  }
  y += deltaBoxH + 4;

  // High break-even warning banner
  if (beMonths > 36 && beMonths < 999) {
    y = checkPage(doc, y, 16);
    rgb(doc, C.pink, "fill"); doc.setFillColor(255, 45, 126, 0.12);
    doc.roundedRect(14, y - 3, PW, 12, 1, 1, "F");
    rgb(doc, C.pink, "draw"); doc.setLineWidth(0.5);
    doc.roundedRect(14, y - 3, PW, 12, 1, 1, "D");
    doc.setFontSize(7.5); doc.setFont("courier", "bold"); rgb(doc, C.pink);
    doc.text("!! BREAK-EVEN WARNING:", 18, y + 4);
    doc.setFont("helvetica", "normal"); rgb(doc, C.muted);
    doc.text(`At current offer, year-1 costs take ${Math.round(beMonths)} months to recover. Negotiate salary before committing.`, 80, y + 4);
    y += 16;
  }

  // Tax narrative
  if (fa.taxAnalysisNarrative) {
    y = checkPage(doc, y);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    rgb(doc, C.cyan);
    doc.text("Tax Analysis", 14, y); y += 5;
    doc.setFont("helvetica", "normal");
    rgb(doc, C.muted);
    wrap(doc, fa.taxAnalysisNarrative, PW).forEach(line => {
      y = checkPage(doc, y);
      doc.text(line, 14, y); y += 5;
    });
    y += 3;
  }

  // ── New Expense Breakdown ──────────────────────────────────────────────────
  if (fa.newExpenseBreakdown) {
    y = checkPage(doc, y, 50);
    const neb = fa.newExpenseBreakdown;
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); rgb(doc, C.cyan);
    doc.text("New Location Expense Breakdown", 14, y); y += 6;

    const expRows = [
      ["Rent",           `$${(neb.rent||0).toLocaleString()}/mo`,          rent => rent],
      ["Transportation", `$${(neb.transportation||0).toLocaleString()}/mo`, t => t],
      ["Utilities",      `$${(neb.utilities||0).toLocaleString()}/mo`,      u => u],
      ["Subscriptions",  `$${(neb.subscriptions||0).toLocaleString()}/mo`,  s => s],
      ["Bills",          `$${(neb.bills||0).toLocaleString()}/mo`,          b => b],
    ];
    expRows.forEach(([label, val], i) => {
      y = checkPage(doc, y, 7);
      if (i % 2 === 0) { rgb(doc, C.card, "fill"); doc.rect(14, y-3, PW, 7, "F"); }
      doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); rgb(doc, C.muted);
      doc.text(label, 17, y);
      rgb(doc, C.white); doc.setFont("helvetica", "bold");
      doc.text(val, 194, y, { align: "right" });
      y += 7;
    });

    // Transport note
    if (fa.newExpenseBreakdown?.transportationNote) {
      y = checkPage(doc, y, 6);
      doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); rgb(doc, C.muted);
      wrap(doc, "Transport: " + fa.newExpenseBreakdown.transportationNote, PW).forEach(line => {
        doc.text(line, 14, y); y += 4;
      });
    }

    // Total line
    y = checkPage(doc, y, 9);
    rgb(doc, C.darkPanel, "fill"); doc.rect(14, y-3, PW, 9, "F");
    rgb(doc, C.cyan, "draw"); doc.setLineWidth(0.3); doc.line(14, y-3, 196, y-3);
    doc.setFontSize(8); doc.setFont("courier", "bold"); rgb(doc, C.cyan);
    doc.text("TOTAL NEW MONTHLY EXPENSES", 17, y+2);
    doc.text(`$${Math.round(fa.estimatedNewMonthlyExpenses||0).toLocaleString()}/mo`, 194, y+2, { align: "right" });
    y += 12;

    // Savings capacity callout
    if (fa.savingsTarget) {
      y = checkPage(doc, y, 14);
      rgb(doc, C.darkPanel, "fill"); doc.roundedRect(14, y-3, PW, 12, 1, 1, "F");
      const canSave = fa.canMeetSavingsTarget;
      const savColor = canSave ? C.green : C.pink;
      rgb(doc, savColor, "draw"); doc.setLineWidth(0.5); doc.roundedRect(14, y-3, PW, 12, 1, 1, "D");
      doc.setFontSize(7.5); doc.setFont("courier", "bold"); rgb(doc, C.muted);
      doc.text("SAVINGS TARGET ($" + (fa.savingsTarget||0).toLocaleString() + "/mo):", 20, y+4);
      rgb(doc, savColor);
      doc.text(canSave ? "CAN MEET TARGET" : "CANNOT MEET TARGET", 110, y+4);
      rgb(doc, C.muted); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.text(`Capacity: $${Math.round(fa.newSavingsCapacity||0).toLocaleString()}/mo after expenses`, 140, y+4, { align: "right" });
      y += 16;
    }

    // Year one extraordinary costs
    if (fa.yearOneExtraordinaryCosts && fa.yearOneExtraordinaryCosts.totalYearOne > 0) {
      const y1 = fa.yearOneExtraordinaryCosts;
      y = checkPage(doc, y, 30);
      doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); rgb(doc, C.yellow);
      doc.text("Year 1 One-Time Costs (not included in monthly)", 14, y); y += 6;
      [
        ["Car Purchase",    y1.carPurchase],
        ["Moving Costs",    y1.movingCosts],
        ["Security Deposit",y1.securityDeposit],
      ].filter(([,v]) => v > 0).forEach(([label, val], i) => {
        y = checkPage(doc, y, 7);
        if (i%2===0) { rgb(doc, C.card, "fill"); doc.rect(14, y-3, PW, 7, "F"); }
        doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); rgb(doc, C.muted);
        doc.text(label, 17, y);
        rgb(doc, C.yellow); doc.setFont("helvetica", "bold");
        doc.text(`$${(val||0).toLocaleString()}`, 194, y, { align: "right" });
        y += 7;
      });
      // Total
      y = checkPage(doc, y, 9);
      rgb(doc, C.darkPanel, "fill"); doc.rect(14, y-3, PW, 9, "F");
      doc.setFontSize(8); doc.setFont("courier", "bold"); rgb(doc, C.yellow);
      doc.text("TOTAL YEAR 1 EXTRAORDINARY", 17, y+2);
      doc.text(`$${(y1.totalYearOne||0).toLocaleString()}`, 194, y+2, { align: "right" });
      if (y1.notes) {
        y += 10;
        doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); rgb(doc, C.muted);
        wrap(doc, y1.notes, PW).forEach(line => { doc.text(line, 14, y); y += 4; });
      }
      y += 6;
    }
  }

  // ── Cost of Living ───────────────────────────────────────────────────────────
  y = checkPage(doc, y, 50);
  y = rule(doc, y, C.border);
  y = sectionHeader(doc, y, "Cost of Living Analysis", C.pink);

  // CoL index bar
  const ciC = col.colIndexCurrent || 100;
  const ciN = col.colIndexNew     || 100;
  const maxCI = Math.max(ciC, ciN, 120);

  rgb(doc, C.darkPanel, "fill");
  doc.roundedRect(14, y - 2, PW, 18, 1, 1, "F");
  doc.setFontSize(7);
  doc.setFont("courier", "normal");
  rgb(doc, C.muted);
  doc.text("COST OF LIVING INDEX", 17, y + 3);

  const barX = 14, barY = y + 7, barH = 4, barMaxW = PW;
  const barWc = (ciC / maxCI) * barMaxW;
  const barWn = (ciN / maxCI) * barMaxW;

  rgb(doc, C.cyan, "fill");
  doc.rect(barX, barY, barWc * 0.95, barH, "F");
  rgb(doc, C.pink, "fill");
  doc.rect(barX, barY + 5, barWn * 0.95, barH, "F");

  rgb(doc, C.white);
  doc.setFontSize(6.5);
  doc.text(`Current: ${ciC}`, barX + barWc * 0.95 + 2, barY + 3.5);
  doc.text(`New: ${ciN}`, barX + barWn * 0.95 + 2, barY + 8.5);
  y += 22;

  if (col.colNarrative) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    rgb(doc, C.muted);
    wrap(doc, col.colNarrative, PW).forEach(line => {
      y = checkPage(doc, y);
      doc.text(line, 14, y); y += 5;
    });
    y += 3;
  }

  // Housing table
  if (col.housing) {
    y = checkPage(doc, y, 30);
    rgb(doc, C.darkPanel, "fill");
    doc.roundedRect(14, y - 3, PW, 8, 1, 1, "F");
    doc.setFontSize(7.5);
    doc.setFont("courier", "bold");
    rgb(doc, C.muted);
    doc.text("HOUSING", 17, y + 2);
    y += 10;

    const h = col.housing;

    // Target unit callout — show what the candidate actually needs
    if (h.targetUnitEstimatedRent > 0) {
      y = checkPage(doc, y, 16);
      rgb(doc, C.darkPanel, "fill"); doc.roundedRect(14, y - 4, PW, 14, 1, 1, "F");
      rgb(doc, C.cyan, "draw"); doc.setLineWidth(0.5); doc.roundedRect(14, y - 4, PW, 14, 1, 1, "D");
      doc.setFontSize(7); doc.setFont("courier", "bold"); rgb(doc, C.cyan);
      doc.text("YOUR TARGET UNIT:", 18, y + 2);
      doc.setFontSize(8.5); doc.setFont("helvetica", "bold"); rgb(doc, C.white);
      const unitLabel = (h.targetUnitType || h.candidateHousingNeed || "").toLowerCase();
      doc.text(unitLabel, 70, y + 2);
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); rgb(doc, C.cyan);
      doc.text(`$${(h.targetUnitEstimatedRent||0).toLocaleString()}/mo est.`, 194, y + 2, { align: "right" });
      y += 18;
    }

    const hRows = [
      ["Avg 1BR Apt (Current City)", `$${(h.currentAvgRent1BR||0).toLocaleString()}/mo`, `$${(h.newAvgRent1BR||0).toLocaleString()}/mo`],
      ["Avg 2BR Apt (New City)",     `$${(h.currentAvgRent2BR||0).toLocaleString()}/mo`, `$${(h.newAvgRent2BR||0).toLocaleString()}/mo`],
    ];
    hRows.forEach((row, i) => {
      y = checkPage(doc, y, 8);
      if (i % 2 === 0) { rgb(doc, C.card, "fill"); doc.rect(14, y - 3, PW, 7, "F"); }
      doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
      rgb(doc, C.muted); doc.text(row[0], 17, y);
      rgb(doc, C.white); doc.setFont("helvetica", "bold");
      doc.text(row[1], 100, y, { align: "right" });
      rgb(doc, deltaColor((h.newAvgRent1BR||0) - (h.currentAvgRent1BR||0)));
      doc.text(row[2], 194, y, { align: "right" });
      y += 8;
    });
    if (h.notes) {
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); rgb(doc, C.muted);
      wrap(doc, h.notes, PW).forEach(line => { y = checkPage(doc, y); doc.text(line, 14, y); y += 4; });
    }
    y += 4;
  }

  // Transportation
  if (col.transportation) {
    y = checkPage(doc, y, 30);
    const tr = col.transportation;
    rgb(doc, C.darkPanel, "fill");
    doc.roundedRect(14, y - 3, PW, 8, 1, 1, "F");
    doc.setFontSize(7.5);
    doc.setFont("courier", "bold");
    rgb(doc, C.muted);
    doc.text("TRANSPORTATION", 17, y + 2);
    y += 10;

    const tRows = [
      ["Car Required in New City", tr.carRequired ? "YES" : "NO"],
      ["Avg Used Car Price",        `$${(tr.avgUsedCarPrice||0).toLocaleString()}`],
      ["Avg Car Insurance/mo",      `$${tr.avgCarInsuranceMonthly||0}/mo`],
      ["Avg Gas Price/gal",         `$${(tr.avgGasPricePerGallon||0).toFixed(2)}`],
      ["Public Transit Pass",       `$${tr.publicTransitMonthlyPass||0}/mo`],
    ];
    tRows.forEach((row, i) => {
      y = checkPage(doc, y, 8);
      if (i % 2 === 0) { rgb(doc, C.card, "fill"); doc.rect(14, y - 3, PW, 7, "F"); }
      doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
      rgb(doc, C.muted); doc.text(row[0], 17, y);
      rgb(doc, i === 0 && tr.carRequired ? C.yellow : C.white);
      doc.setFont("helvetica", "bold");
      doc.text(row[1], 194, y, { align: "right" });
      y += 8;
    });
    if (tr.transitionRecommendation) {
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); rgb(doc, C.cyan);
      doc.text("→ ", 14, y);
      rgb(doc, C.muted);
      wrap(doc, tr.transitionRecommendation, PW - 6).forEach((line, i) => {
        y = checkPage(doc, y);
        doc.text(line, 20, y); y += 4;
      });
    }
    y += 4;
  }

  // ── Resume Match ─────────────────────────────────────────────────────────────
  y = checkPage(doc, y, 50);
  y = rule(doc, y, C.border);
  y = sectionHeader(doc, y, "Resume ↔ Job Description Match", C.yellow);

  if (rm.matchTier === "NO_RESUME" || !rm.matchScore) {
    doc.setFontSize(8); rgb(doc, C.muted);
    doc.text("No resume provided — match analysis not available.", 14, y); y += 10;
  } else {
    // Score ring simulation (text-based)
    const score = rm.matchScore || 0;
    const tierColor = SEV_COLORS[rm.matchTier] || C.muted;
    rgb(doc, C.darkPanel, "fill");
    doc.roundedRect(14, y - 3, PW, 22, 2, 2, "F");
    rgb(doc, tierColor, "fill");
    doc.roundedRect(14, y - 3, 60, 22, 2, 2, "F");
    rgb(doc, C.black);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`${score}%`, 44, y + 12, { align: "center" });
    doc.setFontSize(6.5);
    doc.setFont("courier", "normal");
    doc.text("MATCH SCORE", 44, y + 17, { align: "center" });

    rgb(doc, C.white);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text((rm.matchTier || "").replace("_", " "), 82, y + 8);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    rgb(doc, C.muted);
    doc.text(`${(rm.matchedSkills||[]).length} matched skills  ·  ${(rm.gaps||[]).length} gaps identified`, 82, y + 15);
    y += 28;

    // Matched skills
    if (rm.matchedSkills?.length) {
      y = checkPage(doc, y, 12);
      doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); rgb(doc, C.green);
      doc.text("MATCHED SKILLS / EXPERIENCE", 14, y); y += 6;
      const skillCols = 3, skillW = PW / skillCols;
      rm.matchedSkills.forEach((s, i) => {
        const col = i % skillCols, row = Math.floor(i / skillCols);
        if (col === 0 && i > 0) y += 6;
        y = checkPage(doc, y, 6);
        rgb(doc, C.success || C.green); doc.setFontSize(6.5); doc.setFont("courier", "normal");
        doc.text("✓", 14 + col * skillW, y);
        rgb(doc, C.muted); doc.setFont("helvetica", "normal");
        doc.text(String(s).substring(0, 36), 20 + col * skillW, y);
      });
      y += 8;
    }

    // Gaps
    if (rm.gaps?.length) {
      y = checkPage(doc, y, 12);
      doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); rgb(doc, C.pink);
      doc.text("GAPS / MISSING QUALIFICATIONS", 14, y); y += 6;
      rm.gaps.forEach(g => {
        y = checkPage(doc, y, 6);
        rgb(doc, C.pink); doc.setFontSize(6.5); doc.setFont("courier", "bold");
        doc.text("✗", 14, y);
        rgb(doc, C.muted); doc.setFont("helvetica", "normal");
        wrap(doc, String(g), PW - 12).forEach((line, i) => {
          if (i === 0) doc.text(line, 20, y);
          else { y += 5; y = checkPage(doc, y); doc.text(line, 20, y); }
        });
        y += 6;
      });
    }

    // Narrative
    if (rm.narrative) {
      y = checkPage(doc, y, 12);
      doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); rgb(doc, C.yellow);
      doc.text("ANALYST ASSESSMENT", 14, y); y += 5;
      doc.setFont("helvetica", "normal"); rgb(doc, C.muted); doc.setFontSize(8);
      wrap(doc, rm.narrative, PW).forEach(line => {
        y = checkPage(doc, y); doc.text(line, 14, y); y += 5;
      });
      y += 3;
    }
  }

  // ── Risk Factors & Opportunities ─────────────────────────────────────────────
  if ((analysis.riskFactors?.length || analysis.opportunities?.length)) {
    y = checkPage(doc, y, 30);
    y = rule(doc, y, C.border);
    y = sectionHeader(doc, y, "Risk Factors & Opportunities", C.pink);

    const half = Math.ceil(PW / 2);
    let ly = y, ry = y;

    // Risks — left
    (analysis.riskFactors || []).forEach(r => {
      const sc = SEV_COLORS[r.severity] || C.muted;
      ly = checkPage(doc, ly, 14);
      rgb(doc, sc, "fill");
      doc.roundedRect(14, ly - 4, half - 4, 6, 1, 1, "F");
      rgb(doc, C.black); doc.setFontSize(6.5); doc.setFont("courier", "bold");
      doc.text(`[${r.severity}] ${r.factor}`, 17, ly);
      ly += 7;
      rgb(doc, C.muted); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      wrap(doc, r.description, half - 10).forEach(line => {
        ly = checkPage(doc, ly); doc.text(line, 17, ly); ly += 4;
      });
      ly += 3;
    });

    // Opportunities — right
    (analysis.opportunities || []).forEach(o => {
      const sc = SEV_COLORS[o.impact] === C.pink ? C.green : (SEV_COLORS[o.impact] || C.cyan);
      ry = checkPage(doc, ry, 14);
      rgb(doc, sc, "fill");
      doc.roundedRect(14 + half, ry - 4, half - 4, 6, 1, 1, "F");
      rgb(doc, C.black); doc.setFontSize(6.5); doc.setFont("courier", "bold");
      doc.text(`[${o.impact}] ${o.factor}`, 18 + half, ry);
      ry += 7;
      rgb(doc, C.muted); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      wrap(doc, o.description, half - 10).forEach(line => {
        ry = checkPage(doc, ry); doc.text(line, 18 + half, ry); ry += 4;
      });
      ry += 3;
    });
    y = Math.max(ly, ry) + 3;
  }

  // ── Skill Gap Analysis ────────────────────────────────────────────────────
  const sga = rm.skillGapAnalysis;
  if (sga && (sga.missingHardSkills?.length || sga.missingCertifications?.length || sga.missingExperience?.length)) {
    y = checkPage(doc, y, 30);
    y = rule(doc, y, C.border);
    y = sectionHeader(doc, y, "Skill Gap Analysis", C.pink);

    // Gap summary
    if (sga.gapSummary) {
      y = checkPage(doc, y);
      doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); rgb(doc, C.muted);
      wrap(doc, sga.gapSummary, PW).forEach(line => {
        y = checkPage(doc, y); doc.text(line, 14, y); y += 5;
      });
      y += 3;
    }

    const PRIORITY_COLORS = { CRITICAL: C.pink, IMPORTANT: C.yellow, NICE_TO_HAVE: C.muted };

    const renderGapItems = (items, categoryLabel, accentColor) => {
      if (!items?.length) return;
      y = checkPage(doc, y, 14);
      doc.setFontSize(7.5); doc.setFont("courier", "bold"); rgb(doc, accentColor);
      doc.text(categoryLabel, 14, y); y += 7;

      items.forEach(item => {
        const name = item.skill || item.certification || item.experienceArea || "";
        const priority = item.priority || "IMPORTANT";
        const pColor = PRIORITY_COLORS[priority] || C.muted;

        y = checkPage(doc, y, 18);
        // Card background
        rgb(doc, C.card, "fill"); doc.roundedRect(14, y - 4, PW, 6, 1, 1, "F");
        // Priority stripe
        rgb(doc, pColor, "fill"); doc.rect(14, y - 4, 3, 6, "F");

        // Name + priority badge
        doc.setFontSize(8); doc.setFont("helvetica", "bold"); rgb(doc, C.white);
        doc.text(String(name).substring(0, 55), 20, y);
        badge(doc, 160, y + 1, priority, pColor);
        y += 7;

        // JD context
        if (item.jdContext) {
          y = checkPage(doc, y);
          doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); rgb(doc, C.muted);
          wrap(doc, `JD: "${item.jdContext}"`, PW - 10).forEach(line => {
            y = checkPage(doc, y); doc.text(line, 18, y); y += 4;
          });
        }

        // Cert-specific metadata
        const meta = [
          item.provider && `Provider: ${item.provider}`,
          item.estimatedStudyTime && `Study time: ${item.estimatedStudyTime}`,
          item.estimatedCost && `Cost: ${item.estimatedCost}`,
          item.yearsRequired && `Required: ${item.yearsRequired}`,
        ].filter(Boolean).join("  ·  ");
        if (meta) {
          y = checkPage(doc, y);
          doc.setFontSize(6.5); rgb(doc, C.yellow);
          doc.text(meta, 18, y); y += 4;
        }

        // Remediation
        if (item.remediation) {
          y = checkPage(doc, y);
          doc.setFontSize(7); rgb(doc, C.cyan);
          doc.text("→ ", 18, y);
          rgb(doc, C.muted);
          wrap(doc, item.remediation, PW - 16).forEach((line, li) => {
            if (li === 0) doc.text(line, 24, y);
            else { y += 4; y = checkPage(doc, y); doc.text(line, 24, y); }
          });
          y += 5;
        }
        y += 3;
      });
    };

    renderGapItems(sga.missingHardSkills,    "MISSING HARD SKILLS",    C.pink);
    renderGapItems(sga.missingCertifications, "MISSING CERTIFICATIONS", C.yellow);
    renderGapItems(sga.missingExperience,     "MISSING EXPERIENCE",     C.orange);

    // Priority learning path
    if (sga.priorityLearningPath?.length) {
      y = checkPage(doc, y, 20);
      rgb(doc, C.darkPanel, "fill"); doc.roundedRect(14, y - 3, PW, 8, 1, 1, "F");
      rgb(doc, C.cyan, "draw"); doc.setLineWidth(0.3); doc.roundedRect(14, y - 3, PW, 8, 1, 1, "D");
      doc.setFontSize(7); doc.setFont("courier", "bold"); rgb(doc, C.cyan);
      doc.text("PRIORITY LEARNING PATH", 18, y + 2);
      y += 10;
      sga.priorityLearningPath.forEach((step, i) => {
        y = checkPage(doc, y, 8);
        doc.setFontSize(7.5); doc.setFont("courier", "bold"); rgb(doc, C.cyan);
        doc.text(`${i + 1}.`, 14, y);
        doc.setFont("helvetica", "normal"); rgb(doc, C.muted);
        wrap(doc, step, PW - 12).forEach((line, li) => {
          if (li === 0) doc.text(line, 22, y);
          else { y += 5; y = checkPage(doc, y); doc.text(line, 22, y); }
        });
        y += 6;
      });
    }
  }

  // ── Negotiation Leverage ───────────────────────────────────────────────────
  if (analysis.negotiationLeverage) {
    y = checkPage(doc, y, 20);
    y = rule(doc, y, C.border);
    y = sectionHeader(doc, y, "Negotiation Leverage", C.green);
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); rgb(doc, C.muted);
    wrap(doc, analysis.negotiationLeverage, PW).forEach(line => {
      y = checkPage(doc, y); doc.text(line, 14, y); y += 5;
    });
    y += 3;
  }

  // ── Recommended Actions ────────────────────────────────────────────────────
  if (analysis.recommendedActions?.length) {
    y = checkPage(doc, y, 30);
    y = rule(doc, y, C.border);
    y = sectionHeader(doc, y, "Recommended Actions", C.cyan);
    (analysis.recommendedActions).forEach((a, i) => {
      y = checkPage(doc, y, 12);
      rgb(doc, C.cyan); doc.setFontSize(8); doc.setFont("courier", "bold");
      doc.text(`${i + 1}.`, 14, y);
      rgb(doc, C.muted); doc.setFont("helvetica", "normal");
      wrap(doc, a, PW - 12).forEach((line, li) => {
        if (li === 0) doc.text(line, 22, y);
        else { y += 5; y = checkPage(doc, y); doc.text(line, 22, y); }
      });
      y += 7;
    });
  }

  // ── Assumptions ────────────────────────────────────────────────────────────
  if (analysis.dataAssumptions) {
    y = checkPage(doc, y, 16);
    y = rule(doc, y, C.veryMuted);
    doc.setFontSize(6.5); doc.setFont("courier", "normal"); rgb(doc, C.veryMuted);
    doc.text("DATA ASSUMPTIONS & SOURCES", 14, y); y += 5;
    wrap(doc, analysis.dataAssumptions, PW).forEach(line => {
      y = checkPage(doc, y); doc.text(line, 14, y); y += 4;
    });
  }

  // ── Footer on every page ───────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    rgb(doc, C.black, "fill");
    doc.rect(0, 285, 210, 14, "F");
    rgb(doc, C.cyan, "draw");
    doc.setLineWidth(0.3);
    doc.line(14, 285, 196, 285);
    doc.setFontSize(6); doc.setFont("courier", "normal"); rgb(doc, C.veryMuted);
    doc.text("RELOCATION EXPRESS  //  CONFIDENTIAL — FOR CANDIDATE USE ONLY", 14, 292);
    doc.text(`Page ${i} of ${pageCount}`, 196, 292, { align: "right" });
  }

  // Save
  const fname = `Relocation-Express_${(target.newCompany||"Report").replace(/\s+/g,"-")}_${target.newCity?.replace(/\s+/g,"-")||"City"}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fname);
}
