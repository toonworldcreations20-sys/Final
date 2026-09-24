// ============================================================
// Device-side reservation store with tamper evidence.
// Every record carries an integrity checksum over its fields +
// a per-device secret; hand-edited records are flagged TAMPERED
// and locked out of cancel actions (SECURITY.md).
// ============================================================

import { sha256Hex } from '@/utils/sha256';
import { randomHex } from '@/utils/format';

const STORE_KEY = 'bc_reservations_v2';
const SALT_KEY = 'bc_device_salt_v1';
const DRAFT_KEY = 'bc_checkout_draft_v1';

export type ReservationStatus = 'confirmed' | 'cancelled';

export interface Reservation {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: string;
  qty: number;
  section: string;
  fee: number;
  total: number;
  status: ReservationStatus;
  payment: string;
  paymentRef?: string;
  paymentProvider?: string;
  created: string;
  remote: boolean; // true = reserved server-side in the crew Sheet
  checksum: string;
}

export type StoredReservation = Reservation & { tampered: boolean };

function deviceSalt(): string {
  let s = localStorage.getItem(SALT_KEY);
  if (!s) {
    s = randomHex(16);
    localStorage.setItem(SALT_KEY, s);
  }
  return s;
}

function canon(r: Omit<Reservation, 'checksum'>): string {
  return [
    r.id, r.name, r.phone, r.email, r.tier, String(r.qty), r.section,
    String(r.fee), String(r.total), r.status, r.payment,
    r.paymentRef ?? '', r.paymentProvider ?? '', r.created, String(r.remote),
  ].join('|');
}

export function checksumOf(r: Omit<Reservation, 'checksum'>): string {
  return sha256Hex(canon(r) + '|' + deviceSalt());
}

export function readReservations(): StoredReservation[] {
  let list: Reservation[] = [];
  try {
    list = JSON.parse(localStorage.getItem(STORE_KEY) || '[]') as Reservation[];
  } catch {
    list = [];
  }
  return list.map((r) => ({ ...r, tampered: checksumOf(r) !== r.checksum }));
}

function write(list: Reservation[]): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
}

export function addReservation(input: Omit<Reservation, 'checksum'>): Reservation {
  const r: Reservation = { ...input, checksum: checksumOf(input) };
  const list = readReservations();
  write([r, ...list.map(stripTamperFlag)].slice(0, 200));
  return r;
}

/** Official status change (cancel) — recomputes checksum so it stays valid. */
export function setReservationStatus(id: string, status: ReservationStatus): StoredReservation | null {
  const list = readReservations();
  let out: StoredReservation | null = null;
  const next = list.map((r) => {
    if (r.id !== id) return stripTamperFlag(r);
    const base = { ...r, status, tampered: false } as unknown as Omit<Reservation, 'checksum'>;
    const fixed: Reservation = { ...base, checksum: checksumOf(base) };
    out = { ...fixed, tampered: false };
    return fixed;
  });
  write(next);
  return out;
}

function stripTamperFlag(r: StoredReservation): Reservation {
  const { tampered: _t, ...rest } = r;
  void _t;
  return rest;
}

export function getReservation(id: string): StoredReservation | null {
  return readReservations().find((r) => r.id === id) ?? null;
}

// ---------- checkout draft (select → checkout) ----------
export interface Draft {
  tier: string;
  qty: number;
  name: string;
  email: string;
  phone: string;
  idem: string; // idempotency key: retries cannot double-book
}

export function saveDraft(d: Draft): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
}
export function loadDraft(): Draft | null {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') as Draft | null;
  } catch {
    return null;
  }
}
export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}
