// ============================================================
// ACCOUNT — profile, session, password change, security log.
// ============================================================

import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { LogOut, KeyRound, Activity, Ticket, ShieldCheck } from 'lucide-react';
import { getSession, signOut, changePassword, getLog, passwordOk } from '@/lib/security';
import { timeAgo } from '@/utils/format';
import { Notice, Reveal } from '@/components/ui';
import { emitAuthChange } from '@/components/chrome';

export function Account() {
  const session = getSession();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tick, setTick] = useState(0);

  if (!session) return <Navigate to="/login" replace />;

  const log = getLog();
  void tick;

  const submitPw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordOk(next)) { setMsg({ ok: false, text: 'New password must be 8+ chars with upper, lower and a digit.' }); return; }
    const r = changePassword(session.email, cur, next);
    setMsg(r.ok ? { ok: true, text: 'Password changed ✅' } : { ok: false, text: r.error ?? 'Failed.' });
    if (r.ok) { setCur(''); setNext(''); }
    setTick((t) => t + 1);
  };

  return (
    <section className="section">
      <div className="wrap form-wrap" style={{ maxWidth: 860 }}>
        <Reveal>
          <h2 style={{ textAlign: 'center' }}>MY ACCOUNT</h2>
          <p className="lead">Signed in as <b>{session.name}</b> • session expires {new Date(session.exp).toLocaleTimeString()} </p>
        </Reveal>

        <Reveal className="card" style={{ marginBottom: 14 }}>
          <div className="toolbar">
            <div>
              <span className="pill green"><ShieldCheck size={13} /> Verified locally</span>
              <h3 style={{ margin: '9px 0 0' }}>{session.name}</h3>
              <div className="muted">{session.email}</div>
            </div>
            <button className="btn danger small" onClick={() => { signOut(); emitAuthChange(); }}>
              <LogOut size={14} /> Sign out
            </button>
          </div>
          <div className="actions-row">
            <Link to="/reservations" className="btn primary small"><Ticket size={14} /> My reservations</Link>
          </div>
        </Reveal>

        <Reveal className="card" style={{ marginBottom: 14 }}>
          <h3><KeyRound size={16} style={{ verticalAlign: '-2px' }} /> Change password</h3>
          <form className="form" onSubmit={submitPw} noValidate>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="p-cur">Current password</label>
                <input id="p-cur" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
              </div>
              <div className="field">
                <label htmlFor="p-next">New password</label>
                <input id="p-next" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
              </div>
            </div>
            {msg && <div className="error" style={{ color: msg.ok ? 'var(--green)' : undefined }}>{msg.text}</div>}
            <button type="submit" className="btn ghost small">Update password</button>
          </form>
        </Reveal>

        <Reveal className="card">
          <h3><Activity size={16} style={{ verticalAlign: '-2px' }} /> Security log</h3>
          {log.length === 0 && <Notice>No security events yet on this device.</Notice>}
          <div className="seclog">
            {log.map((l, i) => (
              <div className="row" key={i}>
                <span><b>{l.type}</b> — {l.msg}</span>
                <time>{timeAgo(l.ts)}</time>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
