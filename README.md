# B-CEYLON NEXT — Vol. 2 (React 19 + Vite 7 + Tailwind 4)

Tamil DJ party crew site: landing → event → ticket select → checkout (sandbox card
gateway) → QR/CODE128 ticket + themed PDF → reservations → local crew accounts.
Google-Sheet live mode is a drop-in via `.env` (see below).

## Run it

```bash
npm install        # once
npm run dev        # http://localhost:5173
npm run build      # dist/index.html (single file) + dist/photos/
npm run preview    # serve the production build
```

Deploy (Vercel/Netlify): push the whole folder. No build config needed — Vercel
auto-detects Vite. `dist/` output is a single HTML file + `photos/` (public assets
are NOT inlined; upload them with the site).

## Structure

```
src/
├── main.tsx / App.tsx        entry + HashRouter routes (/#/… keeps PAYMENTS.md return URLs working)
├── chrome.tsx                nav, footer, toasts, scroll progress, tilt, spotlight
├── TicketView.tsx            ticket + REAL QR (qrcode) + REAL CODE128 barcode (jsbarcode) + actions
├── ui.tsx                    Reveal / Notice / Stepper / Countdown / Lightbox
├── lib/
│   ├── config.ts             event facts, tiers, socials, gallery, env keys (+ startup key hygiene check)
│   ├── security.ts           60k-round SHA-256 hashing, lockout, sessions, sec-log, signRequest
│   ├── store.ts              tamper-evident local reservations + checkout draft + idempotency keys
│   ├── sheet.ts              Google Sheet client (9s timeouts, shape validation, 20s rate limit)
│   ├── payments.ts           PaymentProvider interface + SANDBOX gateway + PayHere/Stripe attach points
│   └── pdf.ts                themed A5 PDF ticket (jsPDF) with embedded QR + barcode
├── pages/                    Home, Event, Select, Checkout, Confirmation, Reservations, Ticket,
│                             Login, Account, PaymentsReturn
└── utils/                    sha256 (verified vs node crypto), cn, format/validate
```

## Go live (Google Sheet + payments)

Copy `.env.example` → `.env`:

* `VITE_SHEET_API` — your Apps Script `/exec` URL (Code.gs V5+). Enables live seat
  counts, server bookings/cancels. Leave empty = demo mode (device-only bookings).
* `VITE_SHEET_KEY` — shared secret (a string, NOT a URL — the app warns if you paste one).
* `VITE_PAYHERE_MERCHANT_ID`, `VITE_PAYHERE_HASH_ENDPOINT`, `VITE_STRIPE_PK` — see PAYMENTS.md.

Sandbox test cards: `4242 4242 4242 4242` approves • `4000 0000 0000 3220` 3-D Secure •
`4000 0000 0000 0002` / `…9995` decline • 3 declines pause card entry 60 s.

## Rebuilt-from-scratch notes

The `src/` tree + `vite.config.ts` + env files were reconstructed from the design
system (`src/index.css`), `PAYMENTS.md` and `SECURITY.md` after being lost. Two
dependency facts discovered while rebuilding:

1. **lucide-react v1 removed brand icons** (Facebook/Instagram/Youtube…) — socials
   now use small inline SVGs in `chrome.tsx`.
2. **jsbarcode + @types/jsbarcode were added** to `package.json` (real, scannable
   CODE128 barcodes on screen, in print and inside the PDF). Run `npm install`
   after pulling this folder to update your lockfile.

Verified end-to-end in headless Chromium: home/gallery/lightbox, select→checkout→
confirmation with QR + 59-rect barcode, PDF download (`%PDF-` magic, 862 KB),
reservations list, account create/sign-in + security log, declined-card path,
0 console errors. `tsc --noEmit` clean under strict + noUnusedLocals.
