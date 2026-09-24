// ============================================================
// TICKET — standalone ticket view (?id=…).
// ============================================================

import { Link, useSearchParams } from 'react-router-dom';
import { getReservation } from '@/lib/store';
import { TicketView, TicketActions } from '@/components/TicketView';
import { Notice, Reveal } from '@/components/ui';

export function Ticket() {
  const [params] = useSearchParams();
  const r = getReservation(params.get('id') ?? '');

  if (!r) {
    return (
      <section className="section">
        <div className="wrap form-wrap">
          <div className="empty">Ticket not found. <Link to="/reservations" style={{ color: 'var(--cyan)' }}>My reservations</Link></div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="wrap form-wrap" style={{ maxWidth: 900 }}>
        {r.tampered && (
          <Notice kind="warn">⚠️ Integrity check failed on this record — it was edited outside the app. Cancellation is locked; the crew can verify on WhatsApp.</Notice>
        )}
        <Reveal><TicketView r={r} /></Reveal>
        <TicketActions r={r} />
      </div>
    </section>
  );
}
