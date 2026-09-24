// ============================================================
// Themed A5-landscape PDF ticket (jsPDF) with embedded hi-res
// QR + scannable CODE128 strip. Unlimited re-downloads.
// ============================================================

import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { EVENT, tierById } from './config';
import { money } from '@/utils/format';
import type { Reservation } from './store';

/** PDF fonts are Latin-only — strip emoji/symbols so nothing renders as garbage. */
function clean(s: string): string {
  return String(s ?? '').replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '').trim();
}

function fitText(doc: jsPDF, text: string, maxW: number, startSize: number): void {
  let size = startSize;
  doc.setFontSize(size);
  while (size > 7 && doc.getTextWidth(text) > maxW) {
    size -= 0.5;
    doc.setFontSize(size);
  }
}

async function qrDataURL(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, { width: 512, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } });
  } catch {
    return null;
  }
}

function barcodeDataURL(text: string): { url: string; w: number; h: number } | null {
  try {
    const cv = document.createElement('canvas');
    JsBarcode(cv, text, { format: 'CODE128', width: 1.5, height: 60, displayValue: false, margin: 4, background: '#ffffff', lineColor: '#000000' });
    return { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
  } catch {
    return null;
  }
}

export async function downloadTicketPdf(r: Reservation): Promise<void> {
  const t = tierById(r.tier);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' }); // 210 × 148
  const W = 210, H = 148;
  const INK: [number, number, number] = [11, 11, 22];
  const WHITE: [number, number, number] = [255, 255, 255];
  const GREY: [number, number, number] = [156, 163, 181];
  const PURPLE: [number, number, number] = [168, 85, 247];
  const PINK: [number, number, number] = [251, 91, 213];
  const CYAN: [number, number, number] = [34, 211, 238];
  const GREEN: [number, number, number] = [52, 211, 153];
  const GOLD: [number, number, number] = [245, 196, 81];
  const RED: [number, number, number] = [251, 113, 133];
  const accent = { vip: GOLD, premium: CYAN, standard: PURPLE, economy: PINK }[t.cls] ?? PURPLE;

  // backdrop + neon frame
  doc.setFillColor(...INK); doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(...PURPLE); doc.rect(0, 0, 9, H, 'F');
  doc.setFillColor(...PINK); doc.rect(0, H - 4, W, 4, 'F');

  // header
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...GREY); doc.setFontSize(9);
  doc.text('B-CEYLON ENTERTAINMENT', 16, 16);
  doc.setTextColor(...WHITE); doc.setFontSize(25);
  doc.text(clean(EVENT.name), 16, 27);

  // category pill + status
  const pillText = clean(t.id + ' - ' + r.section).toUpperCase();
  doc.setFillColor(...accent); doc.roundedRect(16, 31, 62, 9, 2, 2, 'F');
  doc.setFontSize(8.5); doc.setTextColor(...INK);
  fitText(doc, pillText, 58, 8.5);
  doc.text(pillText, 47, 37.2, { align: 'center' });
  const cancelled = r.status === 'cancelled';
  doc.setFillColor(...(cancelled ? RED : GREEN)); doc.circle(84, 35.4, 1.8, 'F');
  doc.setFontSize(10); doc.setTextColor(...(cancelled ? RED : GREEN));
  doc.text(cancelled ? 'CANCELLED' : 'CONFIRMED', 88, 37.2);

  // details grid
  const rows: [string, string, string, string][] = [
    ['ATTENDEE', clean(r.name), 'SECTION', clean(r.section)],
    ['DATE', EVENT.date, 'QUANTITY', String(r.qty)],
    ['TIME', EVENT.time, 'TICKET', money(t.price) + ' x ' + r.qty],
    ['VENUE', clean(EVENT.venue), 'TOTAL PAID', money(r.total)],
  ];
  let y = 50;
  rows.forEach((row) => {
    ([[row[0], row[1], 16], [row[2], row[3], 82]] as [string, string, number][]).forEach((col) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...GREY);
      doc.text(col[0], col[2], y);
      doc.setTextColor(...(col[0] === 'TOTAL PAID' ? CYAN : WHITE));
      fitText(doc, col[1], 56, col[0] === 'TOTAL PAID' ? 12 : 10.5);
      doc.text(col[1], col[2], y + 6.5);
    });
    y += 15;
  });

  // footer notes
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GREY);
  const notes = doc.splitTextToSize(
    'Entry: ticket QR + valid ID (21+)  |  Gates 6:30 PM  |  BYOB  |  Support: WhatsApp +94 70 174 2032 (quote your Booking ID)',
    118,
  );
  doc.text(notes, 16, 118);

  // perforation
  doc.setDrawColor(90, 90, 110); doc.setLineWidth(0.6); doc.setLineDashPattern([3, 2.4], 0);
  doc.line(140, 10, 140, 132);
  doc.setLineDashPattern([], 0);

  // stub
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...GREY);
  doc.text('SCAN AT ENTRY', 175, 20, { align: 'center' });
  doc.setFillColor(...WHITE); doc.roundedRect(151, 25, 48, 48, 3, 3, 'F');
  const qr = await qrDataURL(r.id);
  if (qr) {
    try { doc.addImage(qr, 'PNG', 153, 27, 44, 44); } catch { /* skip */ }
  } else {
    doc.setFontSize(7); doc.setTextColor(...INK);
    doc.text('QR unavailable -', 175, 46, { align: 'center' });
    doc.text('show Booking ID', 175, 51, { align: 'center' });
  }
  doc.setFont('courier', 'bold'); doc.setTextColor(...WHITE);
  fitText(doc, r.id, 54, 8.2);
  doc.text(r.id, 175, 81, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GREY);
  doc.text('31 DEC 2026  |  7:00 PM', 175, 88, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...CYAN);
  fitText(doc, money(r.total), 54, 11);
  doc.text(money(r.total), 175, 96, { align: 'center' });
  doc.setFontSize(7.5); doc.setTextColor(...GREY);
  doc.text(clean(r.qty + ' x ' + r.tier), 175, 102, { align: 'center' });

  const bc = barcodeDataURL(r.id);
  if (bc) {
    try {
      doc.setFillColor(...WHITE); doc.roundedRect(151, 105, 48, 15, 2, 2, 'F');
      const sc = Math.min(44 / bc.w, 12 / bc.h);
      const dw = bc.w * sc, dh = bc.h * sc;
      doc.addImage(bc.url, 'PNG', 175 - dw / 2, 112.5 - dh / 2, dw, dh);
    } catch { /* skip strip */ }
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GREY);
  doc.text('BADULLA - 21+', 175, 126, { align: 'center' });

  doc.save('B-Ceylon-VOL2-' + r.id + '.pdf');
}
