// ============================================================
// LOGIN — local demo accounts (SECURITY.md): salted 60k-round
// hashing, lockout countdown, strength meter, generic errors.
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import {
  signIn, registerUser, getSession, passwordChecks, passwordScore, readLock,
} from '@/lib/security';
import { isValidEmail } from '@/utils/format';
import { Notice, Reveal } from '@/components/ui';
import { emitAuthChange } from '@/components/chrome';
import { cn } from '@/utils/cn';

export function Login() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const lock = readLock(email.trim().toLowerCase());
  useEffect(() => {
    if (!lock.until) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lock.until]);

  // already signed in? go straight to the account
  useEffect(() => {
    if (getSession()) navigate('/account', { replace: true });
  }, [navigate]);

  const checks = passwordChecks(pw);
  const score = passwordScore(pw);
  const meterColor = score <= 2 ? 'var(--red)' : score <= 3 ? 'var(--gold)' : 'var(--green)';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) { setError('Enter a valid email address.'); return; }
    setBusy(true);
    // let the UI paint before the synchronous 60k-round hash
    await new Promise((r) => setTimeout(r, 30));
    const res = tab === 'in'
      ? signIn(email.trim(), pw, remember)
      : registerUser(name, email.trim(), pw);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Something went wrong.');
      return;
    }
    emitAuthChange();
    navigate('/account');
  };

  const lockSec = lock.until ? Math.max(0, Math.ceil((lock.until - now) / 1000)) : 0;

  return (
    <section className="section">
      <div className="wrap auth-shell">
        <Reveal className="card">
          <div className="auth-tabs">
            <button className={cn(tab === 'in' && 'on')} onClick={() => { setTab('in'); setError(''); }}><LogIn size={15} /> Sign in</button>
            <button className={cn(tab === 'up' && 'on')} onClick={() => { setTab('up'); setError(''); }}><UserPlus size={15} /> Create account</button>
          </div>

          {lockSec > 0 && (
            <div className="lockbox" style={{ marginBottom: 16 }}>
              <div className="lockt">{Math.floor(lockSec / 60)}:{String(lockSec % 60).padStart(2, '0')}</div>
              <p className="muted" style={{ margin: 0 }}>Too many failed attempts. Account unlocks in this countdown.</p>
            </div>
          )}

          <form className="form" onSubmit={(e) => { void submit(e); }} noValidate>
            {tab === 'up' && (
              <div className="field">
                <label htmlFor="a-name"><UserRound size={13} /> Your name</label>
                <div className="inwrap">
                  <input id="a-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={60} />
                </div>
              </div>
            )}
            <div className="field">
              <label htmlFor="a-gmail"><Mail size={13} /> Email</label>
              <div className="inwrap">
                <input id="a-gmail" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" autoComplete="email" type="email" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="a-pw"><Lock size={13} /> Password</label>
              <div className="inwrap">
                <input id="a-pw" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoComplete={tab === 'in' ? 'current-password' : 'new-password'} type={show ? 'text' : 'password'} />
                <button type="button" className="eyebtn" aria-label="Toggle password visibility" onClick={() => setShow((v) => !v)}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {tab === 'up' && (
              <>
                <div className="meter"><div style={{ width: (score / 5) * 100 + '%', background: meterColor }} /></div>
                <div className="pwrules">
                  <span className={cn(checks.len && 'ok')}>• 8+ characters</span>
                  <span className={cn(checks.upper && 'ok')}>• One uppercase letter</span>
                  <span className={cn(checks.lower && 'ok')}>• One lowercase letter</span>
                  <span className={cn(checks.digit && 'ok')}>• One digit</span>
                </div>
              </>
            )}

            <label className="agree">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Remember me for 14 days (otherwise sessions expire after 2 h)</span>
            </label>

            {error && <div className="error">⚠️ {error}</div>}

            <button type="submit" className="btn primary wfull" disabled={busy || lockSec > 0}>
              <ShieldCheck size={16} /> {busy ? 'Hashing…' : tab === 'in' ? 'Sign in' : 'Create account'}
            </button>

            {/* added space here */}
            <div style={{ height: 16 }}></div>
          </form>

          <Notice className="noprint" >
            Demo accounts live only in this browser (salted + 60,000-round hashed — never plaintext). A real deployment plugs in a server identity provider (SECURITY.md).
          </Notice>
        </Reveal>
      </div>
    </section>
  );
}
