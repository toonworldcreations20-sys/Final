// ============================================================
// /#/payments/return — PayHere return_url landing (PAYMENTS.md §3).
// UX only: the server webhook is the only source of truth.
// ============================================================

import { Link, useSearchParams } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { Notice, Reveal } from '@/components/ui';

export function PaymentsReturn() {
  const [params] = useSearchParams();
  const order = params.get('order_id') ?? params.get('orderId') ?? '';
  const status = params.get('status') ?? '';

  return (
    <section className="section">
      <div className="wrap form-wrap">
        <Reveal className="card">
          <div className="iconbox"><Landmark size={22} /></div>
          <h3>Payment return</h3>
          <p className="muted">
            {order ? <>Order <b>{order}</b>{status ? ` • gateway status ${status}` : ''}.</> : 'You came back from the payment gateway.'}
          </p>
          <Notice kind="amber">
            This page is for looks only — your booking flips to <b>PAID</b> when the signed server webhook arrives
            (PAYMENTS.md §3). If the webhook already landed, your ticket works right now.
          </Notice>
          <div className="actions-row" style={{ marginTop: 14 }}>
            <Link to="/reservations" className="btn primary small">My reservations</Link>
            <Link to="/" className="btn ghost small">Back home</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
