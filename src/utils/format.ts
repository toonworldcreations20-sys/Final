// ============================================================
// Shared formatting + strict input validation (SECURITY.md:
// SL phone normalisation, RFC-lite email, real-name check).
// ============================================================

export function money(n: number): string {
  return 'Rs. ' + Number(n || 0).toLocaleString('en-LK');
}

export function clampQty(n: number): number {
  return Math.max(1, Math.min(10, Math.floor(n) || 1));
}

/** Strip control chars + clamp length (SECURITY.md input hardening). */
export function cleanText(s: string, max = 80): string {
  return String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
}

/** Accepts 07X XXX XXXX / +94 7X XXX XXXX / 947X… → normalises to +947XXXXXXX. */
export function normalizePhone(raw: string): string {
  const d = String(raw ?? '').replace(/[\s\-()]/g, '');
  let m = '';
  if (/^07\d{8}$/.test(d)) m = '+94' + d.slice(1);
  else if (/^\+947\d{8}$/.test(d)) m = d;
  else if (/^947\d{8}$/.test(d)) m = '+' + d;
  return m;
}

export function isValidPhone(raw: string): boolean {
  return normalizePhone(raw).length > 0;
}

export function isValidEmail(raw: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(cleanText(raw, 80));
}

/** Real-name check: 2+ chars, letters/spaces/dots/apostrophes only. */
export function isValidName(raw: string): boolean {
  const s = cleanText(raw, 60);
  return s.length >= 2 && /^[\p{L}][\p{L}\p{M}'’. ]{1,59}$/u.test(s);
}

export function randomHex(bytes: number): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return randomHex(16).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
