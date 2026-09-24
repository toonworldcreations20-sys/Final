// ============================================================
// Google Sheet client (Code.gs V5+).
//  - 9 s AbortController timeout on every call
//  - response shape validation before anything is trusted
//  - signed writes (sig/nonce/ts via lib/security.signRequest)
//  - client-side rate limit: 1 booking per 20 s
// ============================================================

import { SHEET_API, SHEET_KEY } from './config';
import { signRequest } from './security';

export interface SectionCount {
  limit: number;
  sold: number;
  left: number;
}
export interface LiveCounts {
  ok: true;
  total: number;
  sections: Record<'normal' | 'vip' | 'vvip', SectionCount>;
}
export interface BookReply extends LiveCounts {
  bookingId: string;
  seats: number;
  left: number;
}
export interface SheetReply {
  ok: boolean;
  error?: string;
  bookingId?: string;
  seats?: number;
  left?: number;
  total?: number;
  sections?: LiveCounts['sections'];
}

export class RateLimited extends Error {
  waitSec: number;
  constructor(waitSec: number) {
    super('Rate limited');
    this.waitSec = waitSec;
  }
}

const RATE_KEY = 'bc_last_book_ts';

function num(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Shape-check the server payload before trusting it (SECURITY.md). */
function validCounts(d: unknown): d is LiveCounts {
  const x = d as LiveCounts;
  return (
    !!x && x.ok === true && num(x.total) && !!x.sections &&
    (['normal', 'vip', 'vvip'] as const).every(
      (c) => !!x.sections[c] && num(x.sections[c].limit) && num(x.sections[c].sold) && num(x.sections[c].left),
    )
  );
}

async function call(params: Record<string, string>, timeoutMs = 9000): Promise<SheetReply> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(SHEET_API + '?' + new URLSearchParams(params).toString(), {
      signal: ctrl.signal,
      redirect: 'follow',
    });
    return (await res.json()) as SheetReply;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCounts(): Promise<LiveCounts | null> {
  if (!SHEET_API) return null;
  try {
    const d = await call({ action: 'counts' });
    return validCounts(d) ? d : null;
  } catch {
    return null;
  }
}

export interface BookPayload {
  name: string;
  phone: string;
  email: string;
  event: string;
  category: string;
  tier: string;
  units: string;
  seatsEach: string;
  total: string;
  paymentRef?: string;
  paymentProvider?: string;
  idem: string;
}

export async function apiBook(p: BookPayload): Promise<SheetReply> {
  // 1 booking attempt per 20 s (SECURITY.md rate limiting)
  const last = Number(localStorage.getItem(RATE_KEY) || 0);
  const wait = Math.ceil((last + 20_000 - Date.now()) / 1000);
  if (last && wait > 0) throw new RateLimited(wait);

  const body: Record<string, string> = {
    action: 'book',
    name: p.name, phone: p.phone, email: p.email, event: p.event,
    category: p.category, tier: p.tier, units: p.units, seatsEach: p.seatsEach,
    total: p.total, idem: p.idem,
    paymentRef: p.paymentRef ?? '', paymentProvider: p.paymentProvider ?? '',
  };
  const reply = await call(signRequest(body, SHEET_KEY), 12_000);
  // Stamp the window only once a reply actually came back, so a failed attempt
  // (offline, timeout, 500, HTML error page) never locks the customer out.
  localStorage.setItem(RATE_KEY, String(Date.now()));
  return reply;
}

export async function apiCancel(bookingId: string): Promise<SheetReply> {
  return call(signRequest({ action: 'cancel', id: bookingId }, SHEET_KEY), 12_000);
}