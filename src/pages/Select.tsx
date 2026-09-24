// ============================================================
// SELECT — tier picker, qty, buyer details, live availability.
// Validates strictly, saves the checkout draft, hands off.
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Phone, Mail, CheckCircle2, Ticket } from 'lucide-react';
import { LIVE, SERVICE_FEE, TIERS, tierById, type Tier } from '@/lib/config';
import { fetchCounts, type LiveCounts } from '@/lib/sheet';
import { saveDraft } from '@/lib/store';
import { cleanText, clampQty, isValidEmail, isValidName, isValidPhone, money, normalizePhone, uuid } from '@/utils/format';
import { Notice, Reveal, Stepper } from '@/components/ui';
import { cn } from '@/utils/cn';

export function Select() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initial = params.get('tier') ?? 'Phase One';

  const [tier, setTier] = useState<Tier>(() => tierById(initial));
  const [qty, setQty] = useState(2);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [counts, setCounts] = useState<LiveCounts | null>(null);

  useEffect(() => {
    let alive = true;
    fetchCounts().then((c) => { if (alive && c) setCounts(c); });
    return () => { alive = false; };
  }, []);

  const sub = tier.price * qty;
  const fee = Math.round(sub * SERVICE_FEE);
  const grand = sub + fee;

  const hint = useMemo(() => {
    const cat = tier.sheetCat;
    if (!LIVE) {
      return { kind: 'amber' as const, html: <>🟡 <b>Demo mode</b> — bookings save on this device until the crew Sheet is connected. Section <b>{cat.toUpperCase()}</b> • you need <b>{qty}</b> seat(s).</> };
    }
    if (!counts) return { kind: 'info' as const, html: <>⏳ Checking live availability…</> };
    const left = counts.sections[cat].left;
    return qty > left
      ? { kind: 'warn' as const, html: <>⚠️ Section <b>{cat.toUpperCase()}</b>: only <b>{left}</b> left — you need {qty}. Lower quantity or pick another tier.</> }
      : { kind: 'ok' as const, html: <>Section <b>{cat.toUpperCase()}</b> • <b>{left}</b> seats left • you need <b>{qty}</b> ✅</> };
  }, [tier, qty, counts]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidName(name)) { setError('Please enter the attendee’s real name (letters only).'); return; }
    if (!isValidPhone(phone)) { setError('Enter a valid Sri Lankan mobile — 07X XXX XXXX or +94 7X ….'); return; }
    if (email && !isValidEmail(email)) { setError('That email address looks invalid.'); return; }
    const left = counts?.sections[tier.sheetCat].left;
    if (LIVE && counts && qty > (left ?? 0)) { setError(`Only ${left} seat(s) left in ${tier.sheetCat.toUpperCase()}.`); return; }
    setError('');
    saveDraft({
      tier: tier.id,
      qty: clampQty(qty),
      name: cleanText(name, 60),
      email: cleanText(email, 80),
      phone: normalizePhone(phone),
      idem: uuid(),
    });
    navigate('/checkout');
  };

  return (
    <section className="section">
      <div className="wrap form-wrap">
        <Reveal>
          <h2 style={{ textAlign: 'center' }}>CHOOSE YOUR TICKETS</h2>
          <p className="lead">Live seat counts per section. Max 10 tickets per order.</p>
        </Reveal>
        <Reveal className="card form" as="div">
          <form className="form" onSubmit={submit} noValidate>
            <div className="tier-pick" role="radiogroup" aria-label="Ticket tier">
              {TIERS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={t.id === tier.id}
                  className={cn('tier-opt', t.id === tier.id && 'on')}
                  onClick={() => setTier(t)}
                >
                  <span className="tp-check"><CheckCircle2 size={18} /></span>
                  <span className="tp-name">{t.cls === 'vip' ? '♛ ' : ''}{t.id}</span>
                  <div className="tp-price">{money(t.price)}</div>
                  <div className="tp-desc">{t.section} • {t.desc}</div>
                </button>
              ))}
            </div>

            <div className="form-grid">
              <div className="field">
                <label htmlFor="f-name"><User size={13} /> Attendee name *</label>
                <div className="inwrap">
                  <input id="f-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" maxLength={60} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="f-qty">Quantity (max 10)</label>
                <Stepper value={qty} onChange={setQty} />
              </div>
              <div className="field">
                <label htmlFor="f-phone"><Phone size={13} /> Mobile (WhatsApp) *</label>
                <div className="inwrap">
                  <input id="f-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07X XXX XXXX" autoComplete="tel" inputMode="tel" />
                </div>
                {phone && isValidPhone(phone) && <span className="hint">Saved as {normalizePhone(phone)}</span>}
              </div>
              <div className="field">
                <label htmlFor="f-email"><Mail size={13} /> Email (optional)</label>
                <div className="inwrap">
                  <input id="f-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" type="email" />
                </div>
              </div>
            </div>

            <Notice kind={hint.kind}>{hint.html}</Notice>

            <div>
              <div className="summary"><span>{tier.id} × {qty}</span><b>{money(sub)}</b></div>
              <div className="summary"><span>Service fee (2%)</span><b>{money(fee)}</b></div>
              <div className="summary"><span>Total</span><span className="total">{money(grand)}</span></div>
            </div>

            {error && <div className="error">⚠️ {error}</div>}

            <button type="submit" className="btn primary wfull"><Ticket size={16} /> Continue to checkout</button>
          </form>
        </Reveal>
      </div>
    </section>
  );
}
