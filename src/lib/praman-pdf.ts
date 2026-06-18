import jsPDF from "jspdf";
import QRCode from "qrcode";

export type PramanReceipt = {
  sealed_at: string;
  fileName: string;
  size: number;
  sha256: string;
  blockHeight: number | string;
  txid: string;
  mode: "AI_GEN" | "VERIFY";
  verified: boolean;
  issuer?: string;
  spec?: string;
};

const NAVY: [number, number, number] = [10, 14, 26];
const NAVY_DEEP: [number, number, number] = [6, 9, 18];
const GOLD: [number, number, number] = [212, 175, 55];
const GOLD_SOFT: [number, number, number] = [240, 215, 140];
const EMERALD: [number, number, number] = [52, 211, 153];
const PAPER: [number, number, number] = [245, 242, 232];
const MUTED: [number, number, number] = [140, 145, 165];
const LINE: [number, number, number] = [35, 42, 60];

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function setFill(doc: jsPDF, rgb: [number, number, number]) {
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
}
function setDraw(doc: jsPDF, rgb: [number, number, number]) {
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}
function setText(doc: jsPDF, rgb: [number, number, number]) {
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

export async function generatePramanPDF(r: PramanReceipt): Promise<Blob> {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // === BACKGROUND ===
  setFill(doc, NAVY_DEEP);
  doc.rect(0, 0, W, H, "F");

  // Subtle radial-ish bands using overlay rects
  setFill(doc, NAVY);
  doc.rect(0, 0, W, H * 0.55, "F");

  // Top gold rule
  setFill(doc, GOLD);
  doc.rect(0, 0, W, 6, "F");
  setFill(doc, GOLD_SOFT);
  doc.rect(0, 6, W, 1.5, "F");

  // Bottom gold rule
  setFill(doc, GOLD);
  doc.rect(0, H - 6, W, 6, "F");

  // Side ornament rails
  setFill(doc, [22, 28, 44]);
  doc.rect(28, 28, 4, H - 56, "F");
  doc.rect(W - 32, 28, 4, H - 56, "F");

  // === HEADER ===
  setText(doc, GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("APEX · PSI", 56, 48, { charSpace: 4 });

  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("PROOF OF STATEFUL INTEGRITY", 56, 62, { charSpace: 2 });

  setText(doc, EMERALD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(r.verified ? "● VERIFIED" : "◇ AI-GEN", W - 56, 48, { align: "right" });
  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(r.spec || "PRAMAN-SPEC-v1", W - 56, 62, { align: "right" });

  // === TITLE BLOCK ===
  setText(doc, PAPER);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("CERTIFICATE OF TRUTH", W / 2, 130, { align: "center", charSpace: 2 });

  setText(doc, GOLD);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("APEX PRAMAAN  ·  प्रमाण  ·  CRYPTOGRAPHIC ATTESTATION", W / 2, 152, {
    align: "center",
    charSpace: 3,
  });

  // Decorative gold underline
  setDraw(doc, GOLD);
  doc.setLineWidth(0.8);
  doc.line(W / 2 - 60, 162, W / 2 + 60, 162);
  setFill(doc, GOLD);
  doc.circle(W / 2, 162, 1.8, "F");

  // === SEAL (vector medallion, left) ===
  const sealCX = 110;
  const sealCY = 240;
  const sealR = 50;

  // outer ring
  setDraw(doc, GOLD);
  doc.setLineWidth(2);
  doc.circle(sealCX, sealCY, sealR);

  // inner dashed ring
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.circle(sealCX, sealCY, sealR - 6);
  doc.setLineDashPattern([], 0);

  // inner filled disc
  setFill(doc, NAVY);
  doc.circle(sealCX, sealCY, sealR - 12, "F");

  // shield mark (Λ)
  setDraw(doc, GOLD);
  doc.setLineWidth(2.4);
  doc.line(sealCX - 14, sealCY + 6, sealCX, sealCY - 14);
  doc.line(sealCX, sealCY - 14, sealCX + 14, sealCY + 6);
  doc.line(sealCX - 8, sealCY + 2, sealCX + 8, sealCY + 2);

  setText(doc, GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("APEX VERIFIED", sealCX, sealCY + 22, { align: "center", charSpace: 1.5 });

  setText(doc, MUTED);
  doc.setFontSize(5.5);
  doc.text("SEALED · ANCHORED · IMMUTABLE", sealCX, sealCY + 31, { align: "center", charSpace: 0.8 });

  // === RIGHT META BLOCK ===
  const metaX = 200;
  let y = 200;
  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("SEALED AT (UTC)", metaX, y, { charSpace: 1.5 });
  setText(doc, PAPER);
  doc.setFont("courier", "normal");
  doc.setFontSize(11);
  y += 14;
  doc.text(new Date(r.sealed_at).toISOString().replace("T", "  ").replace("Z", " Z"), metaX, y);

  y += 22;
  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("ARTIFACT", metaX, y, { charSpace: 1.5 });
  setText(doc, PAPER);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  y += 14;
  const nm = r.fileName.length > 48 ? r.fileName.slice(0, 45) + "…" : r.fileName;
  doc.text(nm, metaX, y);

  y += 16;
  setText(doc, GOLD);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${fmtBytes(r.size)}  ·  MODE ${r.mode}`, metaX, y);

  // === HASH BLOCK ===
  const hashY = 320;
  setFill(doc, [16, 22, 36]);
  doc.roundedRect(48, hashY, W - 96, 96, 6, 6, "F");
  setDraw(doc, LINE);
  doc.setLineWidth(0.6);
  doc.roundedRect(48, hashY, W - 96, 96, 6, 6, "S");

  // gold corner ticks
  setDraw(doc, GOLD);
  doc.setLineWidth(1.2);
  [[48, hashY], [W - 48, hashY], [48, hashY + 96], [W - 48, hashY + 96]].forEach(([cx, cy], i) => {
    const dx = i % 2 === 0 ? 1 : -1;
    const dy = i < 2 ? 1 : -1;
    doc.line(cx, cy, cx + dx * 10, cy);
    doc.line(cx, cy, cx, cy + dy * 10);
  });

  setText(doc, MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("SHA-256  ·  CONTENT FINGERPRINT", 62, hashY + 18, { charSpace: 2 });

  setText(doc, GOLD_SOFT);
  doc.setFont("courier", "bold");
  doc.setFontSize(12);
  const half = r.sha256.length / 2;
  doc.text(r.sha256.slice(0, half), 62, hashY + 46);
  doc.text(r.sha256.slice(half), 62, hashY + 66);

  setText(doc, EMERALD);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Re-hash the source file. Bit-for-bit match = identical truth.", 62, hashY + 86, { charSpace: 1 });

  // === ANCHOR + QR ROW ===
  const anchorY = 440;

  // anchor box
  setFill(doc, [16, 22, 36]);
  doc.roundedRect(48, anchorY, 320, 130, 6, 6, "F");
  setDraw(doc, LINE);
  doc.roundedRect(48, anchorY, 320, 130, 6, 6, "S");

  setText(doc, MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("BLOCKCHAIN ANCHOR", 62, anchorY + 18, { charSpace: 2 });

  setText(doc, PAPER);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Bitcoin  ·  OpenTimestamps", 62, anchorY + 36);

  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("BLOCK HEIGHT", 62, anchorY + 58);
  setText(doc, GOLD);
  doc.setFont("courier", "bold");
  doc.setFontSize(18);
  doc.text(`#${r.blockHeight.toLocaleString?.() ?? r.blockHeight}`, 62, anchorY + 78);

  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("TXID PREVIEW", 62, anchorY + 96);
  setText(doc, EMERALD);
  doc.setFont("courier", "normal");
  doc.setFontSize(10);
  doc.text(r.txid, 62, anchorY + 112);

  // QR box
  const qrBoxX = 388;
  const qrBoxW = W - 48 - qrBoxX;
  setFill(doc, [16, 22, 36]);
  doc.roundedRect(qrBoxX, anchorY, qrBoxW, 130, 6, 6, "F");
  setDraw(doc, LINE);
  doc.roundedRect(qrBoxX, anchorY, qrBoxW, 130, 6, 6, "S");

  setText(doc, MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("VERIFY", qrBoxX + 12, anchorY + 18, { charSpace: 2 });

  const verifyUrl = `https://apex-psi.lovable.app/verify?h=${r.sha256}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 0,
    width: 400,
    color: { dark: "#D4AF37", light: "#10162400" },
  });
  doc.addImage(qrDataUrl, "PNG", qrBoxX + 12, anchorY + 26, 90, 90);

  setText(doc, PAPER);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Scan to verify on", qrBoxX + 110, anchorY + 50);
  setText(doc, GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("apex-psi.lovable.app", qrBoxX + 110, anchorY + 64);
  doc.text("/verify", qrBoxX + 110, anchorY + 76);

  // === FOOTER LEDGER STRIP ===
  const footY = H - 90;
  setFill(doc, [16, 22, 36]);
  doc.rect(48, footY, W - 96, 50, "F");
  setDraw(doc, GOLD);
  doc.setLineWidth(0.6);
  doc.line(48, footY, W - 48, footY);
  doc.line(48, footY + 50, W - 48, footY + 50);

  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("ISSUER", 62, footY + 14, { charSpace: 1.5 });
  setText(doc, PAPER);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(r.issuer || "apex.psi.pramaan", 62, footY + 28);
  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Ed25519 · JCS RFC 8785 · IETF draft-singh-psi-00", 62, footY + 40);

  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("STANDARD", W - 62, footY + 14, { align: "right", charSpace: 1.5 });
  setText(doc, GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("APEX PRAMAAN · v1", W - 62, footY + 28, { align: "right" });
  setText(doc, MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("This receipt is portable, offline-verifiable, and free forever.", W - 62, footY + 40, { align: "right" });

  // bottom microcopy
  setText(doc, [90, 95, 115]);
  doc.setFont("courier", "normal");
  doc.setFontSize(5.5);
  doc.text(
    `praman://${r.sha256.slice(0, 16)}…${r.sha256.slice(-8)}  ·  sealed ${new Date(r.sealed_at).toISOString()}`,
    W / 2,
    H - 16,
    { align: "center", charSpace: 1 }
  );

  return doc.output("blob");
}
