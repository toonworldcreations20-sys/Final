// ============================================================
// CHECKOUT — payment method pick, sandbox card fields,
// processing overlay, live-or-local booking, idempotency.
// ============================================================

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { CreditCard, Landmark, Wallet, Check, Lock } from 'lucide-react';
import { EVENT, SERVICE_FEE, SHEET_API, tierById } from '@/lib/config';
import { apiBook, apiCancel, RateLimited } from '@/lib/sheet';
import { addReservation, clearDraft, loadDraft } from '@/lib/store';
import { logEvent } from '@/lib/security';
import {
  PROVIDERS, providerById, detectBrand, expiryOk, cvcOk, luhnOk,
  formatCardNumber, declineCooldownSec, DEFAULT_PROVIDER_ID, type PayStep,
} from '@/lib/payments';
import { money, sleep } from '@/utils/format';
import { Notice, Reveal } from '@/components/ui';
import { cn } from '@/utils/cn';
import { bookingId } from '@/lib/security';

const STEP_LABEL: Record<PayStep, string> = {
  validate: 'Validating card',
  encrypt: 'Encrypting card details',
  issuer: 'Contacting your bank',
  '3ds': '3-D Secure check',
  approve: 'Approving payment',
};
const STEP_ORDER: PayStep[] = ['validate', 'encrypt', 'issuer', '3ds', 'approve'];

export function Checkout() {
  const navigate = useNavigate();
  const draft = useMemo(() => loadDraft(), []);

  const [provId, setProvId] = useState(DEFAULT_PROVIDER_ID);
  const [cardNo, setCardNo] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<PayStep[]>([]);
  // 'hold' = reserving seats in the Sheet, 'pay' = charging the card
  const [phase, setPhase] = useState<'hold' | 'pay'>('pay');

  if (!draft) {
    return (
      <section className="section">
        <div className="wrap form-wrap">
          <div className="empty">Your booking session is empty. <Link to="/select" style={{ color: 'var(--cyan)' }}>Choose tickets</Link>.</div>
        </div>
      </section>
    );
  }

  const t = tierById(draft.tier);
  const sub = t.price * draft.qty;
  const fee = Math.round(sub * SERVICE_FEE);
  const total = sub + fee;
  const provider = providerById(provId);
  const digits = cardNo.replace(/\D/g, '');
  const brand = detectBrand(digits);
  const cool = declineCooldownSec();

  const markStep = (s: PayStep) => setSteps((prev) => (prev.includes(s) ? prev : [...prev, s]));

  /** Give held seats back when the payment leg fails. */
  const releaseHold = async (id: string) => {
    try { await apiCancel(id); } catch { /* crew can void it in the Sheet */ }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;                       // guard against a double-click race
    setError('');
    if (!agree) { setError('Please accept the booking terms before continuing.'); return; }
    if (provider.needsCard) {
      if (cool > 0) { setError(`Card entry paused after 3 declines — try again in ${cool}s.`); return; }
      if (!luhnOk(digits)) { setError('That card number is invalid.'); return; }
      if (!expiryOk(expiry)) { setError('Expiry must be a future MM/YY date.'); return; }
      if (!cvcOk(cvc, brand)) { setError('CVC looks wrong for a ' + brand + ' card.'); return; }
    }
    setBusy(true);

    // ---------- 1. HOLD the seats first (live Sheet only) ----------
    // Nothing is charged until we know the seats exist. If this leg fails,
    // we stop here and no money moves.
    let remote = false;
    let id = bookingId();                   // demo-mode id; replaced by the Sheet's
    if (SHEET_API) {
      setPhase('hold');
      setSteps([]);
      try {
        const d = await apiBook({
          name: draft.name, phone: draft.phone, email: draft.email, event: EVENT.name,
          category: t.sheetCat, tier: t.id, units: String(draft.qty), seatsEach: '1',
          total: String(total), paymentRef: '', paymentProvider: provider.id, idem: draft.idem,
        });
        if (d.ok && d.bookingId) {
          remote = true;
          id = d.bookingId;
        } else {
          setBusy(false);
          setError('⚠️ ' + (d.error || 'Could not hold your seats — nothing was charged. Try again.'));
          return;
        }
      } catch (err) {
        setBusy(false);
        setError(err instanceof RateLimited
          ? `⚠️ Too fast — one booking attempt per 20 s. Try again in ${err.waitSec}s.`
          : '⚠️ Could not reach the booking server — nothing was charged. Check your connection and try again.');
        return;
      }
    }

    // ---------- 2. TAKE PAYMENT ----------
    setPhase('pay');
    setSteps(['validate']);
    await sleep(250);
    const res = await provider.pay(
      { orderId: draft.idem, amountLKR: total, name: draft.name, email: draft.email, card: { number: digits, expiry, cvc } },
      markStep,
    );
    if (!res.ok) {
      if (remote) await releaseHold(id);    // never leave seats held for unpaid orders
      setBusy(false);
      setSteps([]);
      setError('⚠️ ' + (res.error || 'Payment failed.') + (remote ? ' Your seats were released.' : ''));
      return;
    }

    // ---------- 3. RECORD IT LOCALLY ----------
    addReservation({
      id, name: draft.name, email: draft.email, phone: draft.phone,
      tier: t.id, qty: draft.qty, section: t.section, fee, total,
      status: 'confirmed', payment: provider.name, paymentRef: res.ref, paymentProvider: provider.id,
      created: new Date().toISOString(), remote,
    });
    logEvent('booking', `${t.id} x${draft.qty} — ${money(total)} (${provider.id}${remote ? '' : ', device-only'})`);
    clearDraft();
    navigate('/confirmation?id=' + encodeURIComponent(id));
  };

  const PM_ICON: Record<string, ReactNode> = { sandbox: <CreditCard size={19} />, manual: <Wallet size={19} />, payhere: <Landmark size={19} />, stripe: <CreditCard size={19} /> };

  return (
    <section className="section">
      <div className="wrap form-wrap">
        <Reveal>
          <h2 style={{ textAlign: 'center' }}>CHECKOUT</h2>
          <p className="lead">One idempotent order — double-clicks can’t double-book.</p>
        </Reveal>

        <Reveal className="card form">
          <div className="summary"><span>Attendee</span><b>{draft.name}</b></div>
          <div className="summary"><span>Ticket</span><b>{t.id} • {t.section}</b></div>
          <div className="summary"><span>Quantity</span><b>{draft.qty}</b></div>
          <div className="summary"><span>Subtotal</span><b>{money(sub)}</b></div>
          <div className="summary"><span>Service fee (2%)</span><b>{money(fee)}</b></div>
          <div className="summary"><span>Total</span><span className="total">{money(total)}</span></div>

          <form className="form" onSubmit={submit} noValidate style={{ marginTop: 8 }}>
            <div className="pmethods">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={cn('pmethod', provId === p.id && 'on')}
                  disabled={!p.available}
                  onClick={() => setProvId(p.id)}
                >
                  <span className="pm-ic">{PM_ICON[p.id]}</span>
                  <span style={{ flex: 1 }}>
                    <span className="pm-name">
                      {p.name}
                      <span className={cn('pm-tag', p.tag === 'live' ? 'tag-live' : p.tag === 'test' ? 'tag-test' : 'tag-soon')}>
                        {p.tag}
                      </span>
                    </span>
                    <span className="pm-desc" style={{ display: 'block' }}>{p.desc}</span>
                  </span>
                </button>
              ))}
            </div>

            {provider.needsCard && (
              <div className="cardfields">
                <div className="field">
                  <label htmlFor="c-no"><CreditCard size={13} /> Card number</label>
                  <div className="cardno-wrap">
                    <input id="c-no" value={cardNo} inputMode="numeric" autoComplete="cc-number"
                      onChange={(e) => setCardNo(formatCardNumber(e.target.value))} placeholder="4242 4242 4242 4242" />
                    {digits.length > 3 && <span className="cardbrand">{brand}</span>}
                  </div>
                </div>
                <div className="cols">
                  <div className="field">
                    <label htmlFor="c-exp">Expiry (MM/YY)</label>
                    <input id="c-exp" value={expiry} inputMode="numeric" autoComplete="cc-exp"
                      onChange={(e) => {
                        let v = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
                        if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
                        setExpiry(v);
                      }} placeholder="12/28" />
                  </div>
                  <div className="field">
                    <label htmlFor="c-cvc">CVC</label>
                    <input id="c-cvc" value={cvc} inputMode="numeric" autoComplete="cc-csc"
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" />
                  </div>
                </div>
                <Notice kind="amber">Sandbox gateway — test money only. 4242… approves • 4000…0002 declines • 4000…3220 triggers 3-D Secure.</Notice>
              </div>
            )}

            {provider.id === 'manual' && (
              <Notice>Reserve now and pay by bank transfer or cash at the gate. The crew confirms on WhatsApp with your Booking ID.</Notice>
            )}

            <label className="agree">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>I accept the booking terms: 21+ entry with valid ID, tickets are transferable but not resellable above face value, refunds per the crew’s published policy.</span>
            </label>

            {error && <div className="error">⚠️ {error.replace(/^⚠️\s*/, '')}</div>}

            <button type="submit" className="btn primary wfull" disabled={busy}>
              <Lock size={15} /> {busy ? 'Processing…' : 'Confirm reservation — ' + money(total)}
            </button>
          </form>
        </Reveal>
      </div>

      {busy && (
        <div className="poverlay" role="dialog" aria-modal="true">
          <div className="pmodal">
            <div className="spin" />
            <h3>{phase === 'hold' ? 'Holding your seats…' : provider.needsCard ? 'Processing payment' : 'Confirming your reservation'}</h3>
            <p className="muted" style={{ margin: 0 }}>{money(total)} • {draft.qty} × {t.id}</p>
            {phase === 'hold' ? (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>Nothing is charged until your seats are held.</p>
            ) : (
            <div className="steps">
              {STEP_ORDER.filter((s) => s !== '3ds' || digits === '4000000000003220').map((s) => (
                <span key={s} className={cn(steps.includes(s) && 'done')}>
                  {steps.includes(s) ? <Check size={14} /> : <span style={{ width: 14 }} />} {STEP_LABEL[s]}
                </span>
              ))}
            </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}