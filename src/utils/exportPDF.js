import jsPDF from "jspdf";

const ACCENT = [0, 255, 135]; // #00ff87
const DARK = [10, 10, 20];
const CARD = [18, 18, 35];
const MUTED = [120, 120, 150];
const WHITE = [255, 255, 255];
const GREEN = [52, 211, 153];
const ORANGE = [251, 146, 60];

const INT_COLORS = {
  Low: GREEN,
  Medium: [96, 165, 250],
  High: ORANGE,
  Max: [248, 113, 113],
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

export function exportSessionPDF(session, { players = [], drills = [], categories = [] } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── helpers ──────────────────────────────────────────────────────────────
  const newPage = () => {
    doc.addPage();
    y = margin;
    drawPageFooter();
  };

  const checkSpace = (needed) => {
    if (y + needed > pageH - 20) newPage();
  };

  const setFont = (style = "normal", size = 10, color = WHITE) => {
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
    doc.setFillColor(...DARK);
    doc.rect(0, pageH - 10, pageW, 10, "F");
    setFont("normal", 7, MUTED);
    doc.text("GalGro's Academy", margin, pageH - 4);
    doc.text(`Page ${pageNum}`, pageW - margin, pageH - 4, { align: "right" });
  };

  // ── HEADER ────────────────────────────────────────────────────────────────
  // Dark header band
  fillRect(0, 0, pageW, 42, DARK);
  // Accent left bar
  fillRect(0, 0, 4, 42, ACCENT);

  // Academy name
  setFont("bold", 8, ACCENT);
  doc.text("GALGRO'S ACADEMY", margin + 4, 10);

  // Session name
  setFont("bold", 20, WHITE);
  const nameLines = splitText(doc, session.name, contentW - 8);
  doc.text(nameLines, margin + 4, 22);

  // Status badge
  const isCompleted = session.status === "completed";
  const badgeColor = isCompleted ? GREEN : ACCENT;
  const badgeLabel = isCompleted ? "COMPLETED" : "UPCOMING";
  doc.setFillColor(...badgeColor);
  doc.setDrawColor(...badgeColor);
  const badgeW = 28;
  doc.roundedRect(pageW - margin - badgeW, 6, badgeW, 7, 1.5, 1.5, "F");
  setFont("bold", 7, DARK);
  doc.text(badgeLabel, pageW - margin - badgeW / 2, 11.2, { align: "center" });

  y = 48;

  // ── META ROW ─────────────────────────────────────────────────────────────
  fillRect(margin, y, contentW, 14, CARD);
  const metaItems = [
    ["DATE", formatDate(session.sessionDate)],
    ["DURATION", `${session.totalDuration} / ${session.target} min`],
    ["DRILLS", `${session.blocks.length}`],
  ];
  const colW = contentW / metaItems.length;
  metaItems.forEach(([label, val], i) => {
    const x = margin + i * colW + 4;
    setFont("bold", 6.5, MUTED);
    doc.text(label, x, y + 5);
    setFont("bold", 9, WHITE);
    doc.text(val, x, y + 11);
  });
  y += 20;

  // ── PLAYERS ──────────────────────────────────────────────────────────────
  if (session.playerIds?.length > 0) {
    const attending = session.playerIds
      .map((id) => playerById(players, id))
      .filter(Boolean);
    if (attending.length > 0) {
      setFont("bold", 7.5, ACCENT);
      doc.text("ATTENDING", margin, y);
      y += 5;
      const names = attending.map((p) => `${p.name} (${p.position})`).join("   ·   ");
      setFont("normal", 9, WHITE);
      const nameLines = splitText(doc, names, contentW);
      doc.text(nameLines, margin, y);
      y += nameLines.length * 5 + 6;
    }
  }

  // ── SESSION NOTES ────────────────────────────────────────────────────────
  if (session.sessionNotes) {
    checkSpace(18);
    fillRect(margin, y, contentW, 1, ACCENT);
    y += 4;
    setFont("bold", 7.5, ACCENT);
    doc.text("SESSION NOTES", margin, y);
    y += 5;
    setFont("italic", 9, [200, 200, 220]);
    const noteLines = splitText(doc, session.sessionNotes, contentW);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 8;
  }

  // ── SECTION HEADER ───────────────────────────────────────────────────────
  fillRect(margin, y, contentW, 8, ACCENT);
  setFont("bold", 8, DARK);
  doc.text("DRILL PLAN", margin + 3, y + 5.5);
  y += 12;

  // ── DRILLS ───────────────────────────────────────────────────────────────
  session.blocks.forEach((block, idx) => {
    const drill = drillById(drills, block.drillId);
    if (!drill) return;
    const cat = catById(categories, drill.cat);
    const intColor = INT_COLORS[drill.int] || WHITE;

    // Estimate block height
    const cpLines = splitText(doc, drill.cp, contentW - 40);
    const notesLines = splitText(doc, block.notes, contentW - 40);
    const actualNotesLines = block.actualNotes ? splitText(doc, block.actualNotes, contentW - 40) : [];
    const blockH = 22 + cpLines.length * 4.5 + (block.notes ? notesLines.length * 4.5 + 5 : 0) + (block.actualNotes ? actualNotesLines.length * 4.5 + 5 : 0);

    checkSpace(blockH);

    // Card background
    fillRect(margin, y, contentW, blockH, CARD);
    // Left accent bar coloured by intensity
    fillRect(margin, y, 3, blockH, intColor);

    // Number badge
    doc.setFillColor(...ACCENT);
    doc.circle(margin + 11, y + 8, 5, "F");
    setFont("bold", 8, DARK);
    doc.text(String(idx + 1), margin + 11, y + 10.5, { align: "center" });

    // Drill name
    setFont("bold", 11, WHITE);
    doc.text(drill.name, margin + 20, y + 7);

    // Category + intensity
    setFont("normal", 7.5, MUTED);
    doc.text(`${cat?.label || drill.cat}  ·  ${drill.int} intensity`, margin + 20, y + 13);

    // Duration / rest badges
    const durLabel = `${block.dur} min`;
    const restLabel = `${block.rest} min rest`;
    setFont("bold", 7.5, ACCENT);
    doc.text(durLabel, pageW - margin - 4, y + 7, { align: "right" });
    setFont("normal", 7, MUTED);
    doc.text(restLabel, pageW - margin - 4, y + 13, { align: "right" });

    // Actual duration (if recap done)
    if (block.actualDur !== undefined && block.actualDur !== block.dur) {
      setFont("bold", 7, GREEN);
      doc.text(`actual: ${block.actualDur} min`, pageW - margin - 4, y + 18.5, { align: "right" });
    }

    // Separator
    doc.setDrawColor(...[30, 30, 55]);
    doc.line(margin + 18, y + 16, pageW - margin - 2, y + 16);
    let innerY = y + 21;

    // Coaching points
    if (drill.cp) {
      setFont("bold", 6.5, MUTED);
      doc.text("COACHING POINTS", margin + 6, innerY);
      innerY += 4.5;
      setFont("normal", 8, [200, 210, 220]);
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
      setFont("italic", 8, [180, 200, 235]);
      const lines = splitText(doc, block.notes, contentW - 40);
      doc.text(lines, margin + 6, innerY);
      innerY += lines.length * 4.5;
    }

    // Post-session actual notes
    if (block.actualNotes) {
      innerY += 3;
      setFont("bold", 6.5, GREEN);
      doc.text("RECAP", margin + 6, innerY);
      innerY += 4.5;
      setFont("italic", 8, [150, 230, 190]);
      const lines = splitText(doc, block.actualNotes, contentW - 40);
      doc.text(lines, margin + 6, innerY);
    }

    y += blockH + 3;
  });

  // ── FOOTER ───────────────────────────────────────────────────────────────
  drawPageFooter();

  // ── SAVE ─────────────────────────────────────────────────────────────────
  const safeName = session.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`${safeName}_session.pdf`);
}
