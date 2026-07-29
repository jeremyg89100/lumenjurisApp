// Construit un PDF sobre à partir du texte final d'une négociation/complétion,
// pour l'envoyer au module Signature (même paramétrage que l'éditeur).
import { jsPDF } from "jspdf";

export function buildPdfFromText(title: string, text: string): jsPDF {
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56;
  const maxW = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageH = pdf.internal.pageSize.getHeight();
  let y = margin;

  const write = (txt: string, size: number, bold: boolean) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    for (const line of pdf.splitTextToSize(txt || " ", maxW) as string[]) {
      if (y + size + 2 > pageH - margin) { pdf.addPage(); y = margin; }
      pdf.text(line, margin, y);
      y += size + 2;
    }
  };

  write(title, 16, true);
  y += 10;
  for (const para of text.split(/\n{2,}/)) {
    write(para.trim(), 10.5, false);
    y += 6;
  }
  return pdf;
}
