// ============================================================
// The themed ticket: tier-colored body, REAL QR (qrcode lib)
// and a REAL CODE128 barcode (JsBarcode) encoding the Booking ID.
// Print CSS flips the barcode to black-on-white automatically.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { Crown } from 'lucide-react';
import { EVENT, tierById, type TicketClass } from '@/lib/config';
import { money } from '@/utils/format';
import type { Reservation } from '@/lib/store';

export function TicketView({ r }: { r: Reservation }) {
  const t = tierById(r.tier);
  const [qr, setQr] = useState('');
  const bcRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(r.id, {
      width: 228,
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#0b0b16', light: '#ffffff' },
    })
      .then((u) => { if (alive) setQr(u); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [r.id]);

  useEffect(() => {
    if (!bcRef.current) return;
    try {
      JsBarcode(bcRef.current, r.id, {
        format: 'CODE128',
        width: 1.4,
        height: 34,
        displayValue: false,
        margin: 0,
        background: 'transparent',
        lineColor: '#ffffff',
      });
    } catch {
      /* unreadable id → leave empty strip */
    }
  }, [r.id]);

  const cell = (label: string, value: string) => (
    <div><span>{label}</span><b>{value}</b></div>
  );

  return (
    <article className={'ticket ' + (t.cls as TicketClass)}>
      <div className="ticket-main">
        <div className="ticket-brand">
          <div>
            <div className="pill">B-CEYLON ENTERTAINMENT</div>
            <h1>{EVENT.name}</h1>
            <div className="muted">{EVENT.venue}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {t.cls === 'vip' && <span className="crown"><Crown size={15} /> VIP</span>}
            <div>
              <span className={'status ' + (r.status === 'confirmed' ? 'confirmed' : 'cancelled')}>
                {r.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        <div className="ticket-grid">
          {cell('Attendee', r.name)}
          {cell('Date', EVENT.date)}
          {cell('Time', EVENT.time)}
          {cell('Seat / Section', r.section)}
          {cell('Category', t.id)}
          {cell('Quantity', String(r.qty))}
          {cell('Order', r.id)}
          {cell('Total', money(r.total))}
        </div>
      </div>
      <div className="ticket-side">
        <div className="qr">{qr ? <img src={qr} alt={'QR code for ' + r.id} /> : null}</div>
        <svg ref={bcRef} className="bc-svg" role="img" aria-label={'Barcode ' + r.id} />
        <small className="muted">Scan at entry • {r.id}</small>
      </div>
    </article>
  );
}

// ============================================================
// Shared action row: WhatsApp confirm, PDF, print, share, cal.
// ============================================================

import { Download, Printer, Share2, CalendarPlus, MessageCircle } from 'lucide-react';
import { WA_NUMBER } from '@/lib/config';
import { downloadTicketPdf } from '@/lib/pdf';
import { useToast } from '@/components/chrome';

function waLink(r: Reservation): string {
  const msg = `Hello B-Ceylon! 🎧\n\nMy Vol. 2 booking:\n• Booking ID: ${r.id}\n• Name: ${r.name}\n• Tier: ${r.tier} × ${r.qty}\n• Total: ${money(r.total)}\n\nConfirming my reservation ✅`;
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
}

export function TicketActions({ r }: { r: Reservation }) {
  const toast = useToast();
  const share = async () => {
    const text = `${EVENT.name} — ${r.id}\n${EVENT.date} • ${EVENT.time}\n${r.qty} × ${r.tier}\n${money(r.total)}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'B-Ceylon Reservation', text }); } catch { /* dismissed */ }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      toast('Reservation copied to clipboard.');
    }
  };
  const calendar = () => {
    const start = '20261231T133000Z', end = '20261231T173000Z';
    window.location.href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(EVENT.name)}&dates=${start}/${end}&details=${encodeURIComponent('Reservation ' + r.id + ' • ' + r.section)}&location=${encodeURIComponent(EVENT.venue)}`;
  };
  return (
    <div className="actions-row" style={{ marginTop: 18 }}>
      <a className="btn primary" href={waLink(r)} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Confirm on WhatsApp</a>
      <button className="btn primary" onClick={() => { void downloadTicketPdf(r).then(() => toast('PDF saved — re-download anytime.')); }}>
        <Download size={16} /> Download PDF
      </button>
      <button className="btn ghost" onClick={() => window.print()}><Printer size={16} /> Print</button>
      <button className="btn ghost" onClick={() => { void share(); }}><Share2 size={16} /> Share</button>
      <button className="btn ghost" onClick={calendar}><CalendarPlus size={16} /> Add to calendar</button>
    </div>
  );
}
