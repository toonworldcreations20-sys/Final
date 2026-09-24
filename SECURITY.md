# SECURITY — What was hardened, and the production checklist

## Implemented in this build

### Accounts & sessions
- **Salted, iterated hashing (60,000-round SHA-256)** — plaintext passwords are
  never stored, logged, or transmitted (`lib/security.ts → hashPassword`).
- **Brute-force lockout** — 5 failed sign-ins lock the account for 5 minutes,
  persisted across page reloads, with a visible countdown (`readLock/recordFail`).
- **Generic failure messages** — "Incorrect email or password" never reveals
  which part was wrong (user-enumeration resistance).
- **Expiring sessions** — random 128-bit tokens; 2 h default, 14 d with
  "remember me"; automatic client-side sweep + auto-logout.
- **Security log** — sign-ins, failures, password changes, booking events are
  recorded locally and visible in *My Account → Security log*.
- **Password rules enforced** — 8+ chars, upper/lower/digit, live strength meter.

### Booking & API transport
- **Strict input validation** — SL phone normalisation (`07X/+94`), real-name
  check, email RFC-lite, qty clamped to 1…10, text clamped & stripped of
  control characters.
- **XSS-by-construction** — everything renders through React's escaping; no
  `dangerouslySetInnerHTML`, no string-concatenated HTML anywhere.
- **Signed requests** — every write to the Sheet carries `sig`, `nonce` and
  `ts`; Code.gs can verify the same canonical-string SHA-256 to reject replayed
  or tampered calls (`signRequest` — algorithm documented in the file).
- **Idempotency keys** — one UUID per checkout session; a double-click or retry
  cannot double-book server seats.
- **Timeouts + validated responses** — 9 s `AbortController` timeout, and every
  server payload is shape-checked before it is trusted.
- **Rate limiting** — 1 booking attempt per 20 s; 3 card declines pause card
  entry for 60 s.
- **Tamper-evident local records** — each reservation stored on the device has
  an integrity checksum; edited records are flagged **TAMPERED** and locked out
  of cancel actions.
- **Config hygiene** — keys centralized in `lib/config.ts` + `.env`; a startup
  check warns loudly if the Sheet key looks like a URL paste mistake.

### Platform headers
- Content-Security-Policy, `nosniff`, referrer policy, `frame-ancestors 'none'`
  in `index.html`.

## Honest limitations (read this)

- Anything in the browser — including `SHEET_KEY` and request signatures — is
  readable by a determined user. It deters **casual** abuse only.
- Local demo auth is cryptographically reasonable but browser-bound. A real
  audience needs a server identity provider.
- **Deploy-time checklist** (your host, ~15 min):
  1. Move CSP to HTTP headers with nonces; drop `'unsafe-inline'` for scripts.
  2. Keep inventory checks + rate limits in Code.gs; never trust browser counts.
  3. Verify webhook signatures on every payment callback before writing to the Sheet.
  4. Rotate your Sheet SECRET (your current key is a URL string — change it in
     Code.gs and `.env`, then redeploy).
  5. Serve HTTPS-only + HSTS (Netlify/Cloudflare do this for free).
