// ============================================================
// CONFIRMATION — success state + ticket + actions.
// ============================================================

import { Link, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { getReservation } from '@/lib/store';
import { TicketView, TicketActions } from '@/components/TicketView';
import { Notice, Reveal } from '@/components/ui';

export function Confirmation() {
  const [params] = useSearchParams();
  const r = getReservation(params.get('id') ?? '');

  if (!r) {
    return (
      <section className="section">
        <div className="wrap form-wrap">
          <div className="empty">Reservation not found. <Link to="/reservations" style={{ color: 'var(--cyan)' }}>My reservations</Link></div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="wrap form-wrap" style={{ maxWidth: 900 }}>
        <Reveal className="success">
          <div className="big"><Check size={40} /></div>
          <h1>Reservation confirmed</h1>
          <p className="muted">
            Your booking <b>{r.id}</b> is safely stored {r.remote ? 'in the B-Ceylon Entertainment system' : 'on this device'}.
          </p>
        </Reveal>
        <div style={{ height: 20 }} />
        {!r.remote && (
          <Notice kind="amber" className="noprint">
            🟡 <b>Device-only booking</b> — saved in this browser, NOT synced to the crew Sheet. Connect VITE_SHEET_API for live bookings.
          </Notice>
        )}
        {r.tampered && (
          <Notice kind="warn">⚠️ This record was edited outside the app — integrity check failed. Show it to the crew on WhatsApp; cancellation is locked.</Notice>
        )}
        <div style={{ height: 16 }} />
        <Reveal><TicketView r={r} /></Reveal>
        <TicketActions r={r} />
        <Notice className="noprint" >
          <span><b>Download PDF</b> saves the themed ticket instantly — re-download anytime. Tap <b>Confirm on WhatsApp</b> so the crew locks in your payment + entry.</span>
        </Notice>
      </div>
    </section>
  );
}
