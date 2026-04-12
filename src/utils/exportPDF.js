import jsPDF from "jspdf";

// ── Dark-mode palette ──────────────────────────────────────────────────────
const D = {
  ACCENT: [0, 255, 135],
  BG: [10, 10, 20],
  CARD: [18, 18, 35],
  MUTED: [120, 120, 150],
  TEXT: [255, 255, 255],
  SUB: [200, 200, 220],
  LINE: [30, 30, 55],
  FOOTER_BG: [10, 10, 20],
  FOOTER_TEXT: [120, 120, 150],
  BADGE_TEXT: [10, 10, 20],
  GREEN: [52, 211, 153],
  ORANGE: [251, 146, 60],
};

// ── Light-mode (print-friendly) palette ───────────────────────────────────
const L = {
  ACCENT: [0, 155, 85],      // darker green, prints well
  BG: [255, 255, 255],
  CARD: [245, 246, 250],
  MUTED: [100, 110, 130],
  TEXT: [15, 20, 35],
  SUB: [50, 60, 80],
  LINE: [210, 215, 225],
  FOOTER_BG: [240, 241, 245],
  FOOTER_TEXT: [110, 120, 140],
  BADGE_TEXT: [255, 255, 255],
  GREEN: [22, 163, 74],
  ORANGE: [234, 88, 12],
};

const INT_COLORS_DARK = {
  Low: D.GREEN,
  Medium: [96, 165, 250],
  High: D.ORANGE,
  Max: [248, 113, 113],
};

const INT_COLORS_LIGHT = {
  Low: [22, 163, 74],
  Medium: [37, 99, 235],
  High: [234, 88, 12],
  Max: [220, 38, 38],
};

function drillById(drills, id) {
  return drills.find((d) => d.id === id);
}
function catById(categories, key) {
  return categories.find((c) => c.key === key);
}
function playerById(players, id) {
  return players.find((p) => p.id === id);
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function splitText(doc, text, maxWidth) {
  return doc.splitTextToSize(text || "", maxWidth);
}

export function exportSessionPDF(
  session,
  { players = [], drills = [], categories = [], printMode = false } = {}
) {
  const C = printMode ? L : D;
  const INT_COLORS = printMode ? INT_COLORS_LIGHT : INT_COLORS_DARK;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── helpers ───────────────────────────────────────────────────────────────
  const newPage = () => {
    doc.addPage();
    y = margin;
    drawPageFooter();
  };

  const checkSpace = (needed) => {
    if (y + needed > pageH - 20) newPage();
  };

  const setFont = (style = "normal", size = 10, color = C.TEXT) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const fillRect = (x, ry, w, h, color) => {
    doc.setFillColor(...color);
    doc.rect(x, ry, w, h, "F");
  };

  const drawPageFooter = () => {
    const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
    fillRect(0, pageH - 10, pageW, 10, C.FOOTER_BG);
    drawPdfBrandMark(margin, pageH - 8, 5);
    setFont("normal", 7, C.FOOTER_TEXT);
    doc.text("GalGro's Academy", margin + 7, pageH - 4);
    doc.text(`Page ${pageNum}`, pageW - margin, pageH - 4, { align: "right" });
  };

  const drawPdfBrandMark = (x, markY, size) => {
    const dark = printMode ? [15, 20, 35] : [11, 14, 23];
    const border = printMode ? [210, 215, 225] : [42, 48, 72];
    doc.setFillColor(...dark);
    doc.roundedRect(x, markY, size, size, 1.1, 1.1, "F");
    doc.setDrawColor(...border);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, markY, size, size, 1.1, 1.1, "S");
    doc.setFillColor(...C.ACCENT);
    doc.roundedRect(x + size * 0.18, markY + size * 0.16, size * 0.64, size * 0.7, 0.9, 0.9, "F");
    doc.setDrawColor(...dark);
    doc.setLineWidth(0.45);
    doc.rect(x + size * 0.31, markY + size * 0.36, size * 0.38, size * 0.26, "S");
    doc.line(x + size * 0.31, markY + size * 0.45, x + size * 0.69, markY + size * 0.45);
    doc.line(x + size * 0.5, markY + size * 0.36, x + size * 0.5, markY + size * 0.62);
    doc.circle(x + size * 0.5, markY + size * 0.55, size * 0.08, "F");
  };

  // ── HEADER ────────────────────────────────────────────────────────────────
  fillRect(0, 0, pageW, 42, C.BG);
  fillRect(0, 0, 4, 42, C.ACCENT);

  drawPdfBrandMark(margin + 4, 7, 11);

  setFont("bold", 8, C.ACCENT);
  doc.text("GALGRO'S ACADEMY", margin + 18, 10);

  setFont("bold", 20, C.TEXT);
  const nameLines = splitText(doc, session.name, contentW - 8);
  doc.text(nameLines, margin + 18, 22);

  const isCompleted = session.status === "completed";
  const badgeColor = isCompleted ? C.GREEN : C.ACCENT;
  const badgeLabel = isCompleted ? "COMPLETED" : "UPCOMING";
  doc.setFillColor(...badgeColor);
  const badgeW = 28;
  doc.roundedRect(pageW - margin - badgeW, 6, badgeW, 7, 1.5, 1.5, "F");
  setFont("bold", 7, C.BADGE_TEXT);
  doc.text(badgeLabel, pageW - margin - badgeW / 2, 11.2, { align: "center" });

  y = 48;

  // ── META ROW ──────────────────────────────────────────────────────────────
  fillRect(margin, y, contentW, 14, C.CARD);
  const metaItems = [
    ["DATE", formatDate(session.sessionDate)],
    ["DURATION", `${session.totalDuration} / ${session.target} min`],
    ["DRILLS", `${session.blocks.length}`],
  ];
  const colW = contentW / metaItems.length;
  metaItems.forEach(([label, val], i) => {
    const x = margin + i * colW + 4;
    setFont("bold", 6.5, C.MUTED);
    doc.text(label, x, y + 5);
    setFont("bold", 9, C.TEXT);
    doc.text(val, x, y + 11);
  });
  y += 20;

  // ── PLAYERS ───────────────────────────────────────────────────────────────
  if (session.playerIds?.length > 0) {
    const attending = session.playerIds
      .map((id) => playerById(players, id))
      .filter(Boolean);
    if (attending.length > 0) {
      setFont("bold", 7.5, C.ACCENT);
      doc.text("ATTENDING", margin, y);
      y += 5;
      const names = attending.map((p) => `${p.name} (${p.position})`).join("   ·   ");
      setFont("normal", 9, C.TEXT);
      const attendLines = splitText(doc, names, contentW);
      doc.text(attendLines, margin, y);
      y += attendLines.length * 5 + 6;
    }
  }

  // ── SESSION NOTES ─────────────────────────────────────────────────────────
  if (session.sessionNotes) {
    checkSpace(18);
    fillRect(margin, y, contentW, 1, C.ACCENT);
    y += 4;
    setFont("bold", 7.5, C.ACCENT);
    doc.text("SESSION NOTES", margin, y);
    y += 5;
    setFont("italic", 9, C.SUB);
    const noteLines = splitText(doc, session.sessionNotes, contentW);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 8;
  }

  // ── SECTION HEADER ────────────────────────────────────────────────────────
  fillRect(margin, y, contentW, 8, C.ACCENT);
  setFont("bold", 8, C.BADGE_TEXT);
  doc.text("DRILL PLAN", margin + 3, y + 5.5);
  y += 12;

  // ── DRILLS ────────────────────────────────────────────────────────────────
  session.blocks.forEach((block, idx) => {
    const drill = drillById(drills, block.drillId);
    if (!drill) return;
    const cat = catById(categories, drill.cat);
    const intColor = INT_COLORS[drill.int] || C.TEXT;

    const cpLines = splitText(doc, drill.cp, contentW - 40);
    const notesLines = splitText(doc, block.notes, contentW - 40);
    const actualNotesLines = block.actualNotes
      ? splitText(doc, block.actualNotes, contentW - 40)
      : [];
    const blockH =
      22 +
      cpLines.length * 4.5 +
      (block.notes ? notesLines.length * 4.5 + 5 : 0) +
      (block.actualNotes ? actualNotesLines.length * 4.5 + 5 : 0);

    checkSpace(blockH);

    // Card background
    fillRect(margin, y, contentW, blockH, C.CARD);
    // Left accent bar coloured by intensity
    fillRect(margin, y, 3, blockH, intColor);

    // Number badge
    doc.setFillColor(...C.ACCENT);
    doc.circle(margin + 11, y + 8, 5, "F");
    setFont("bold", 8, C.BADGE_TEXT);
    doc.text(String(idx + 1), margin + 11, y + 10.5, { align: "center" });

    // Drill name
    setFont("bold", 11, C.TEXT);
    doc.text(drill.name, margin + 20, y + 7);

    // Category + intensity
    setFont("normal", 7.5, C.MUTED);
    doc.text(`${cat?.label || drill.cat}  ·  ${drill.int} intensity`, margin + 20, y + 13);

    // Duration / rest
    setFont("bold", 7.5, C.ACCENT);
    doc.text(`${block.dur} min`, pageW - margin - 4, y + 7, { align: "right" });
    setFont("normal", 7, C.MUTED);
    doc.text(`${block.rest} min rest`, pageW - margin - 4, y + 13, { align: "right" });

    // Actual duration (if recap done)
    if (block.actualDur !== undefined && block.actualDur !== block.dur) {
      setFont("bold", 7, C.GREEN);
      doc.text(`actual: ${block.actualDur} min`, pageW - margin - 4, y + 18.5, {
        align: "right",
      });
    }

    // Separator
    doc.setDrawColor(...C.LINE);
    doc.line(margin + 18, y + 16, pageW - margin - 2, y + 16);
    let innerY = y + 21;

    // Coaching points
    if (drill.cp) {
      setFont("bold", 6.5, C.MUTED);
      doc.text("COACHING POINTS", margin + 6, innerY);
      innerY += 4.5;
      setFont("normal", 8, C.SUB);
      const lines = splitText(doc, drill.cp, contentW - 40);
      doc.text(lines, margin + 6, innerY);
      innerY += lines.length * 4.5;
    }

    // Planned notes
    if (block.notes) {
      innerY += 3;
      setFont("bold", 6.5, [150, 200, 255]);
      doc.text("NOTES", margin + 6, innerY);
      innerY += 4.5;
      setFont("italic", 8, printMode ? [60, 100, 180] : [180, 200, 235]);
      const lines = splitText(doc, block.notes, contentW - 40);
      doc.text(lines, margin + 6, innerY);
      innerY += lines.length * 4.5;
    }

    // Post-session actual notes
    if (block.actualNotes) {
      innerY += 3;
      setFont("bold", 6.5, C.GREEN);
      doc.text("RECAP", margin + 6, innerY);
      innerY += 4.5;
      setFont("italic", 8, printMode ? [22, 120, 70] : [150, 230, 190]);
      const lines = splitText(doc, block.actualNotes, contentW - 40);
      doc.text(lines, margin + 6, innerY);
    }

    y += blockH + 3;
  });

  // ── FOOTER ────────────────────────────────────────────────────────────────
  drawPageFooter();

  // ── SAVE ──────────────────────────────────────────────────────────────────
  const safeName = session.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const suffix = printMode ? "_print" : "";
  doc.save(`${safeName}_session${suffix}.pdf`);
}
