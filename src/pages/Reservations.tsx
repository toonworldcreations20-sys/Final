// ============================================================
// RESERVATIONS — device list, view ticket, cancel (Sheet-aware),
// tamper-evident lockout on hand-edited records.
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Ban } from 'lucide-react';
import { LIVE, EVENT } from '@/lib/config';
import { apiCancel } from '@/lib/sheet';
import { readReservations, setReservationStatus, type StoredReservation } from '@/lib/store';
import { logEvent } from '@/lib/security';
import { money } from '@/utils/format';
import { Notice, Reveal } from '@/components/ui';
import { useToast } from '@/components/chrome';

export function Reservations() {
  const toast = useToast();
  const [tick, setTick] = useState(0);
  const list = readReservations();
  void tick;

  const doCancel = async (r: StoredReservation) => {
    if (r.tampered) {
      toast('Record failed its integrity check — cancellation locked. Contact the crew.', 'err');
      return;
    }
    if (!window.confirm('Cancel this reservation? Seats are freed everywhere.')) return;
    if (r.remote && LIVE) {
      try {
        const d = await apiCancel(r.id);
        if (!d.ok) { toast('⚠️ ' + (d.error || 'Cancel failed — booking kept.'), 'err'); return; }
      } catch {
        toast('⚠️ Could not reach the server — booking kept. Try again.', 'err');
        return;
      }
    }
    setReservationStatus(r.id, 'cancelled');
    logEvent('cancel', r.id + ' cancelled');
    toast('Reservation cancelled — seats freed.');
    setTick((t) => t + 1);
  };

  return (
    <section className="section">
      <div className="wrap form-wrap" style={{ maxWidth: 860 }}>
        <Reveal>
          <h2 style={{ textAlign: 'center' }}>MY RESERVATIONS</h2>
          <p className="lead">Stored on this device{LIVE ? ' and mirrored in the crew Sheet' : ' — connect the Sheet to sync the crew'}.</p>
        </Reveal>

        {list.length === 0 && (
          <div className="empty">
            No reservations yet.
            <div style={{ marginTop: 14 }}>
              <Link to="/select" className="btn primary"><Ticket size={16} /> Book your first ticket</Link>
            </div>
          </div>
        )}

        {list.map((r) => (
          <Reveal key={r.id} className="card" style={{ marginBottom: 14 }}>
            <div className="toolbar">
              <div>
                <span className="pill">{r.id}</span>
                <h3 style={{ margin: '9px 0 0' }}>{EVENT.name}</h3>
                <div className="muted">
                  {r.qty} × {r.tier} • {money(r.total)} • {r.payment}
                  {!r.remote && ' • 📱 device-only'}
                </div>
              </div>
              <span className={'status ' + (r.status === 'confirmed' ? 'confirmed' : 'cancelled')}>{r.status}</span>
            </div>
            {r.tampered && (
              <Notice kind="warn">⚠️ TAMPERED — this record was edited outside the app. The crew can verify it on WhatsApp; self-service cancel is locked.</Notice>
            )}
            <div className="actions-row">
              <Link className="btn primary small" to={'/ticket?id=' + encodeURIComponent(r.id)}>View ticket</Link>
              <button
                className="btn ghost small"
                disabled={r.status === 'cancelled'}
                onClick={() => { void doCancel(r); }}
              >
                <Ban size={14} /> Cancel
              </button>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
