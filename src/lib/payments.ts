// ============================================================
// Provider-agnostic payment layer (PAYMENTS.md).
// Checkout talks to a PaymentProvider interface. Today the
// SANDBOX gateway is live (full production UX, zero risk);
// PayHere / Stripe are attach points, enabled by .env keys.
//
// Sandbox test cards:
//   4242 4242 4242 4242  â†’ approved instantly
//   4000 0000 0000 3220  â†’ 3-D Secure step, then approved
//   4000 0000 0000 0002  â†’ declined (do not honor)
//   4000 0000 0000 9995  â†’ declined (insufficient funds)
//   any other Luhn-valid â†’ approved
// 3 declines â†’ 60 s cooldown (persisted).
// ============================================================

import { PAYHERE_MERCHANT_ID, STRIPE_PK } from './config';

// ---------- is the demo card gateway allowed here? ----------
// It approves any Luhn-valid number with test money, so it is development-only.
// A production build folds this to `false`, which lets the bundler drop the
// whole gateway out of the shipped file. `VITE_ENABLE_SANDBOX=true npm run
// build` opts back in for a controlled demo — never set it on the real site.
//
// Keep these three properties or the fold breaks and the gateway ships anyway:
// direct import.meta.env access, no String() call, and not exported (rollup
// keeps exported bindings live). Runtime check:
// PROVIDERS.some((p) => p.id === 'sandbox')
const SANDBOX_OPT_IN = import.meta.env.VITE_ENABLE_SANDBOX === 'true';
const SANDBOX_ENABLED = SANDBOX_OPT_IN || !import.meta.env.PROD;
import { sleep, uuid } from '@/utils/format';

export type Brand = 'VISA' | 'MASTERCARD' | 'AMEX' | 'CARD';

export interface CardInput {
  number: string;
  expiry: string; // MM/YY
  cvc: string;
}

export interface PayArgs {
  orderId: string;
  amountLKR: number;
  name: string;
  email: string;
  card?: CardInput;
}

export type PayStep = 'validate' | 'encrypt' | 'issuer' | '3ds' | 'approve';

export interface PayResult {
  ok: boolean;
  provider: string;
  ref?: string;
  error?: string;
  declined?: boolean;
}

// ---------- card utilities ----------
export function luhnOk(digits: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return digits.length >= 12 && digits.length <= 19 && sum % 10 === 0;
}

export function detectBrand(digits: string): Brand {
  if (/^4/.test(digits)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'MASTERCARD';
  if (/^3[47]/.test(digits)) return 'AMEX';
  return 'CARD';
}

export function expiryOk(exp: string): boolean {
  const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(exp.trim());
  if (!m) return false;
  const mm = Number(m[1]);
  if (mm < 1 || mm > 12) return false;
  const yy = 2000 + Number(m[2]);
  const now = new Date();
  return yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1);
}

export function cvcOk(cvc: string, brand: Brand): boolean {
  return /^\d+$/.test(cvc) && (brand === 'AMEX' ? cvc.length === 4 : cvc.length === 3);
}

export function formatCardNumber(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 19);
  return d.replace(/(.{4})/g, '$1 ').trim();
}

// ---------- decline cooldown ----------
const DECLINE_KEY = 'bc_declines_v1';
interface DeclineState { fails: number; until: number }
function declineState(): DeclineState {
  try {
    const s = JSON.parse(localStorage.getItem(DECLINE_KEY) || 'null') as DeclineState | null;
    if (s && s.until && Date.now() >= s.until) {
      localStorage.removeItem(DECLINE_KEY);
      return { fails: 0, until: 0 };
    }
    return s ?? { fails: 0, until: 0 };
  } catch {
    return { fails: 0, until: 0 };
  }
}
export function declineCooldownSec(): number {
  const s = declineState();
  return s.until ? Math.ceil((s.until - Date.now()) / 1000) : 0;
}
function recordDecline(): DeclineState {
  const s = declineState();
  const fails = s.fails + 1;
  const next = fails >= 3 ? { fails: 0, until: Date.now() + 60_000 } : { fails, until: 0 };
  localStorage.setItem(DECLINE_KEY, JSON.stringify(next));
  return next;
}
function resetDeclines(): void {
  localStorage.removeItem(DECLINE_KEY);
}

// ---------- provider interface ----------
export interface PaymentProvider {
  id: string;
  name: string;
  desc: string;
  tag: 'live' | 'test' | 'soon';
  needsCard: boolean;
  available: boolean;
  pay(args: PayArgs, onStep?: (s: PayStep) => void): Promise<PayResult>;
}

// ---------- implementation status ----------
// A provider may only call itself 'live' and offer itself as available when
// its pay() actually does something. An env key alone is NOT enough: setting
// VITE_PAYHERE_MERCHANT_ID used to flip the button to a green "live" badge
// while pay() still returned "wiring pending" (finding B2).
const PAYHERE_WIRED = false; // -> true when hosted checkout is implemented (PAYMENTS.md §2)
const STRIPE_WIRED = false;  // -> true when Elements + PaymentIntent are implemented (§4)

if (PAYHERE_MERCHANT_ID && !PAYHERE_WIRED) {
  console.warn(
    '[payments] VITE_PAYHERE_MERCHANT_ID is set but PAYHERE_WIRED is false — ' +
    'the PayHere option stays disabled until pay() is implemented (PAYMENTS.md §2).',
  );
}

const SOON = 'Coming soon on this deployment.';

// ---------- SANDBOX gateway (demo only) ----------
const sandbox: PaymentProvider = {
  id: 'sandbox',
  name: 'Card — Sandbox Gateway',
  desc: 'Demo card flow with test money — no real charges. Use 4242 4242 4242 4242.',
  tag: 'test',
  needsCard: true,
  available: SANDBOX_ENABLED,
  async pay(args, onStep) {
    const cool = declineCooldownSec();
    if (cool > 0) return { ok: false, provider: 'sandbox', declined: true, error: `Card entry paused — try again in ${cool}s.` };
    const card = args.card;
    if (!card) return { ok: false, provider: 'sandbox', error: 'Card details missing.' };
    const digits = card.number.replace(/\D/g, '');
    const brand = detectBrand(digits);
    if (!luhnOk(digits)) return { ok: false, provider: 'sandbox', error: 'That card number is invalid.' };
    if (!expiryOk(card.expiry)) return { ok: false, provider: 'sandbox', error: 'Expiry date is invalid or in the past.' };
    if (!cvcOk(card.cvc, brand)) return { ok: false, provider: 'sandbox', error: 'CVC is invalid for a ' + brand + ' card.' };

    onStep?.('encrypt'); await sleep(500);
    onStep?.('issuer'); await sleep(700);

    if (digits === '4000000000003220') {
      onStep?.('3ds'); await sleep(1200); // 3-D Secure challenge
    }
    onStep?.('approve'); await sleep(400);

    if (digits === '4000000000000002') {
      const n = recordDecline();
      return { ok: false, provider: 'sandbox', declined: true, error: n.until ? 'Declined (do not honor). 3 declines — card paused 60s.' : 'Declined (do not honor).' };
    }
    if (digits === '4000000000009995') {
      const n = recordDecline();
      return { ok: false, provider: 'sandbox', declined: true, error: n.until ? 'Declined (insufficient funds). 3 declines — card paused 60s.' : 'Declined (insufficient funds).' };
    }
    resetDeclines();
    return { ok: true, provider: 'sandbox', ref: 'SBX-' + uuid().slice(0, 8).toUpperCase() };
  },
};

// ---------- manual (WhatsApp / bank transfer) ----------
const manual: PaymentProvider = {
  id: 'manual',
  name: 'Bank transfer / pay at gate',
  desc: 'Reserve now, pay by transfer or cash at the gate. Crew confirms on WhatsApp.',
  tag: 'live',
  needsCard: false,
  available: true,
  async pay(args) {
    await sleep(300);
    return { ok: true, provider: 'manual', ref: 'MAN-' + args.orderId.slice(-6) };
  },
};

// ---------- PayHere attach point (PAYMENTS.md §2) ----------
// Enable by setting VITE_PAYHERE_MERCHANT_ID **and** flipping PAYHERE_WIRED
// above. The merchant SECRET never comes here — hashing happens in your
// Apps Script hash endpoint.
const payhere: PaymentProvider = {
  id: 'payhere',
  name: 'PayHere — LKR cards & banks',
  desc: PAYHERE_MERCHANT_ID && PAYHERE_WIRED
    ? 'Hosted checkout via PayHere — cards, bank transfer and eZ Cash.'
    : SOON,
  tag: PAYHERE_MERCHANT_ID && PAYHERE_WIRED ? 'live' : 'soon',
  needsCard: false,
  available: !!PAYHERE_MERCHANT_ID && PAYHERE_WIRED,
  async pay() {
    // --- attach point ---
    // 1) POST { action:'payhereHash', orderId, amount } to the hash endpoint
    // 2) auto-submit the hosted form to https://payhere.lk/pay/checkout
    //    (sandbox.payhere.lk while testing) with merchant_id, order_id,
    //    amount, currency=LKR, hash, return/cancel/notify URLs.
    // 3) treat ONLY the server webhook as truth (PAYMENTS.md §3).
    if (!PAYHERE_WIRED || !PAYHERE_MERCHANT_ID) {
      return { ok: false, provider: 'payhere', error: 'PayHere is not enabled on this deployment yet.' };
    }
    return { ok: false, provider: 'payhere', error: 'PayHere hosted checkout wiring pending — use the sandbox card for now.' };
  },
};

// ---------- Stripe attach point (PAYMENTS.md §4) ----------
const stripe: PaymentProvider = {
  id: 'stripe',
  name: 'Stripe — international cards',
  desc: STRIPE_PK && STRIPE_WIRED ? 'Apple/Google Pay + international cards via Stripe.' : SOON,
  tag: STRIPE_PK && STRIPE_WIRED ? 'live' : 'soon',
  needsCard: false,
  available: !!STRIPE_PK && STRIPE_WIRED,
  async pay() {
    return { ok: false, provider: 'stripe', error: 'Stripe is not enabled on this deployment yet.' };
  },
};

// Built so that a production build (SANDBOX_ENABLED = false, inlined at build
// time) never even contains the demo gateway: the branch folds away and the
// object is tree-shaken out of the bundle.
const ALL_PROVIDERS: PaymentProvider[] = [
  ...(SANDBOX_ENABLED ? [sandbox] : []),
  manual,
  payhere,
  stripe,
];

/** What checkout offers: everything, but the demo gateway only when enabled. */
export const PROVIDERS: PaymentProvider[] = ALL_PROVIDERS;

/** First method a customer can actually use. */
export const DEFAULT_PROVIDER_ID: string =
  (PROVIDERS.find((p) => p.available) ?? manual).id;

export function providerById(id: string): PaymentProvider {
  // Never fall back to the demo gateway: an unknown id must land on a method
  // that cannot mint free tickets (finding M14).
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS.find((p) => p.available) ?? manual;
}