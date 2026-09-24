// ============================================================
// Demo-grade local auth + request signing (SECURITY.md).
//  - 60,000-round iterated SHA-256 password hashing (no plaintext ever)
//  - brute-force lockout: 5 fails → 5 min, persisted across reloads
//  - expiring sessions: 2 h default, 14 d with "remember me"
//  - security log (sign-ins, failures, password changes, bookings)
//  - signRequest(): canonical-string SHA-256 sig + nonce + ts for Sheet calls
// Honest limit (per SECURITY.md): browser-bound, deters casual abuse only.
// ============================================================

import { sha256Hex } from '@/utils/sha256';
import { randomHex, uuid, cleanText } from '@/utils/format';

const ROUNDS = 60_000;
const USERS_KEY = 'bc_users_v1';
const SESSION_KEY = 'bc_session_v1';
const LOG_KEY = 'bc_seclog_v1';
const LOCK_PREFIX = 'bc_lock_';
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60_000;

export interface StoredUser {
  name: string;
  email: string;
  salt: string;
  hash: string;
  created: number;
}
export interface Session {
  token: string;
  email: string;
  name: string;
  exp: number;
}
export interface LogEntry {
  ts: number;
  type: 'signin' | 'signin-fail' | 'register' | 'password' | 'booking' | 'cancel' | 'lockout' | 'session';
  msg: string;
}

// ---------- storage helpers ----------
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- hashing ----------
export function hashPassword(password: string, salt: string): string {
  let h = sha256Hex(salt + '::' + password);
  for (let i = 0; i < ROUNDS; i++) h = sha256Hex(h);
  return h;
}

// ---------- password policy ----------
export interface PwCheck {
  len: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
}
export function passwordChecks(pw: string): PwCheck {
  return {
    len: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /\d/.test(pw),
  };
}
export function passwordScore(pw: string): number {
  const c = passwordChecks(pw);
  let s = Number(c.len) + Number(c.upper) + Number(c.lower) + Number(c.digit);
  if (pw.length >= 12) s += 1;
  return s; // 0..5
}
export function passwordOk(pw: string): boolean {
  const c = passwordChecks(pw);
  return c.len && c.upper && c.lower && c.digit;
}

// ---------- security log ----------
export function logEvent(type: LogEntry['type'], msg: string): void {
  const log = readJSON<LogEntry[]>(LOG_KEY, []);
  log.unshift({ ts: Date.now(), type, msg: cleanText(msg, 140) });
  writeJSON(LOG_KEY, log.slice(0, 100));
}
export function getLog(): LogEntry[] {
  return readJSON<LogEntry[]>(LOG_KEY, []);
}

// ---------- lockout ----------
export interface LockState {
  fails: number;
  until: number; // 0 = not locked
}
export function readLock(email: string): LockState {
  const l = readJSON<LockState>(LOCK_PREFIX + email.toLowerCase(), { fails: 0, until: 0 });
  if (l.until && Date.now() >= l.until) {
    localStorage.removeItem(LOCK_PREFIX + email.toLowerCase());
    return { fails: 0, until: 0 };
  }
  return l;
}
function recordFail(email: string): LockState {
  const key = LOCK_PREFIX + email.toLowerCase();
  const l = readLock(email);
  const fails = l.fails + 1;
  const next: LockState = fails >= MAX_FAILS ? { fails: 0, until: Date.now() + LOCK_MS } : { fails, until: 0 };
  writeJSON(key, next);
  if (next.until) logEvent('lockout', 'Account locked 5 min after 5 failed sign-ins');
  return next;
}
function clearLock(email: string): void {
  localStorage.removeItem(LOCK_PREFIX + email.toLowerCase());
}

// ---------- users ----------
function users(): StoredUser[] {
  return readJSON<StoredUser[]>(USERS_KEY, []);
}
function findUser(email: string): StoredUser | undefined {
  return users().find((u) => u.email === email.toLowerCase());
}

export interface AuthResult {
  ok: boolean;
  error?: string;
  lockedUntil?: number;
  user?: { name: string; email: string };
}

export function registerUser(name: string, email: string, password: string): AuthResult {
  const em = cleanText(email, 80).toLowerCase();
  if (!isValidEmailLite(em)) return { ok: false, error: 'Enter a valid email address.' };
  if (!passwordOk(password)) return { ok: false, error: 'Password does not meet the rules below.' };
  if (findUser(em)) return { ok: false, error: 'Incorrect email or password.' }; // generic on purpose
  const salt = randomHex(16);
  const u: StoredUser = { name: cleanText(name, 60), email: em, salt, hash: hashPassword(password, salt), created: Date.now() };
  writeJSON(USERS_KEY, [...users(), u]);
  logEvent('register', 'Account created for ' + em);
  return startSession(u, true);
}

export function signIn(email: string, password: string, remember: boolean): AuthResult {
  const em = cleanText(email, 80).toLowerCase();
  const lock = readLock(em);
  if (lock.until) return { ok: false, error: 'Too many attempts.', lockedUntil: lock.until };
  const u = findUser(em);
  // Generic message — never reveal whether the email exists.
  if (!u) {
    const l2 = recordFail(em);
    return { ok: false, error: 'Incorrect email or password.', lockedUntil: l2.until || undefined };
  }
  const h = hashPassword(password, u.salt);
  if (h !== u.hash) {
    const l2 = recordFail(em);
    logEvent('signin-fail', 'Failed sign-in for ' + em);
    return {
      ok: false,
      error: l2.until ? 'Too many attempts — locked for 5 minutes.' : 'Incorrect email or password.',
      lockedUntil: l2.until || undefined,
    };
  }
  clearLock(em);
  return startSession(u, remember);
}

export function changePassword(email: string, current: string, next: string): AuthResult {
  const u = findUser(email);
  if (!u) return { ok: false, error: 'Session expired — sign in again.' };
  if (hashPassword(current, u.salt) !== u.hash) return { ok: false, error: 'Current password is incorrect.' };
  if (!passwordOk(next)) return { ok: false, error: 'New password does not meet the rules.' };
  const salt = randomHex(16);
  u.salt = salt;
  u.hash = hashPassword(next, salt);
  writeJSON(USERS_KEY, users().map((x) => (x.email === u.email ? u : x)));
  logEvent('password', 'Password changed — all sessions stay valid on this device');
  return { ok: true };
}

function isValidEmailLite(em: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(em);
}

// ---------- sessions ----------
function startSession(u: StoredUser, remember: boolean): AuthResult {
  const s: Session = {
    token: randomHex(16), // 128-bit
    email: u.email,
    name: u.name,
    exp: Date.now() + (remember ? 14 * 86400_000 : 2 * 3600_000),
  };
  writeJSON(SESSION_KEY, s);
  logEvent('signin', 'Signed in (' + (remember ? '14-day' : '2-hour') + ' session)');
  return { ok: true, user: { name: u.name, email: u.email } };
}

export function getSession(): Session | null {
  const s = readJSON<Session | null>(SESSION_KEY, null);
  if (!s) return null;
  if (Date.now() >= s.exp) {
    localStorage.removeItem(SESSION_KEY);
    logEvent('session', 'Session expired — signed out automatically');
    return null;
  }
  return s;
}

export function signOut(): void {
  logEvent('session', 'Signed out');
  localStorage.removeItem(SESSION_KEY);
}

// ---------- signed Sheet requests ----------
// canonical string = sorted key=value pairs + nonce + ts, then
// sig = SHA-256(canonical + '|' + key). Code.gs can recompute the same
// string to reject tampered or replayed calls (nonce+ts window).
export function signRequest(body: Record<string, string>, key: string): Record<string, string> {
  const nonce = randomHex(8);
  const ts = String(Date.now());
  const canonical = Object.keys(body)
    .sort()
    .map((k) => k + '=' + body[k])
    .join('&') + '&nonce=' + nonce + '&ts=' + ts;
  return { ...body, nonce, ts, sig: sha256Hex(canonical + '|' + key) };
}

export function bookingId(): string {
  return 'BC-' + Date.now().toString(36).toUpperCase() + '-' + uuid().slice(0, 4).toUpperCase();
}
