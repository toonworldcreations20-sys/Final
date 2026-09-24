# PAYMENTS — Going Live

The payment layer (`src/lib/payments.ts`) is provider-agnostic. Checkout talks to a
`PaymentProvider` interface; to go live you implement (or enable) a provider without
touching the checkout UI.

## 0. What works today

**Sandbox Gateway** (default) — the full production UX with zero risk:

| Test card              | Result                              |
| ---------------------- | ----------------------------------- |
| `4242 4242 4242 4242`  | Approved instantly                  |
| `4000 0000 0000 3220`  | 3-D Secure step, then approved      |
| `4000 0000 0000 0002`  | Declined (do not honor)             |
| `4000 0000 0000 9995`  | Declined (insufficient funds)       |
| any other Luhn-valid   | Approved                            |

Client-side it already does: Luhn check, brand detection, expiry/CVC validation,
decline cooldown (3 fails → 60 s pause), idempotent order IDs, signed payloads.

## 1. Pick your provider

**PayHere (recommended for LKR)** — Sri Lankan cards, bank transfer, eZ Cash.
Hosted checkout → card data never touches your site (PCI scope stays with PayHere).

**Stripe** — international cards, Apple/Google Pay. Needs a server mint for
PaymentIntents.

## 2. PayHere — step by step

1. Sign up at https://www.payhere.lk → get `merchant_id` + `merchant_secret`.
2. Put the id in `.env` (`VITE_PAYHERE_MERCHANT_ID=…`). **Never** put the secret
   in the browser bundle.
3. Add a hash endpoint to your existing Apps Script project and note its URL as
   `hashEndpoint` in `src/lib/config.ts`:

```javascript
// Code.gs  (add alongside your V5 endpoints)
function doPost(e) {
  const p = JSON.parse(e.postData.contents);
  if (p.action === 'payhereHash') {
    const secret = 'YOUR_MERCHANT_SECRET';
    const md5sec = md5(secret).toUpperCase();
    const hash = md5(
      MERCHANT_ID + p.orderId + Number(p.amount).toFixed(2) + 'LKR' + md5sec
    ).toUpperCase();
    return json({ ok: true, hash });
  }
  if (p.action === 'payhereWebhook') {          // called BY PayHere servers
    const expected = md5(
      p.merchant_id + p.order_id + p.payhere_amount + p.payhere_currency +
      p.status_code + md5(MERCHANT_SECRET).toUpperCase()
    ).toUpperCase();
    if (expected === p.md5sig && p.status_code === '2') {
      markBookingPaid(p.order_id, p.payment_id); // your Sheet logic here
    }
    return json({ ok: true });
  }
}
function md5(s){ /* paste a small MD5 util or use Utilities.computeDigest */ }
```

4. In `payhereProvider.pay()` (marked `--- attach point ---`) call the endpoint,
   then auto-submit PayHere's hosted checkout form (`https://payhere.lk/pay/checkout`,
   or `sandbox.payhere.lk` while testing). Uncomment the scaffold in the provider.

## 3. Return / notify URLs PayHere will ask for

* `return_url`  → `https://<your-site>/#/payments/return`
* `cancel_url`  → `https://<your-site>/#/checkout`
* `notify_url`  → your Apps Script `?action=payhereWebhook` URL

Treat **only the webhook** as truth; `return_url` is for UX only.

## 4. Stripe — step by step

1. Get keys at https://dashboard.stripe.com → `pk_…` goes in `.env`
   (`VITE_STRIPE_PK`). The `sk_…` stays on your server, always.
2. Server: create a PaymentIntent for `{ amount, currency: 'lkr' }`, return its
   `client_secret` (Apps Script can call Stripe via `UrlFetchApp`).
3. Frontend: `npm i @stripe/stripe-js @stripe/react-stripe-js`, then in
   `stripeProvider.pay()` confirm the payment with the card collected by
   Stripe Elements (drop-in UI — do **not** send card fields to your server).
4. Webhook `payment_intent.succeeded` flips the booking to `paid` in the Sheet.

## 5. Marking bookings paid

Every booking already carries `paymentRef` / `paymentProvider` into
`apiBook()` → your existing Sheet row. The successful UX path:

gateway webhook (server) → mark row `PAID` + store provider ref →
`?action=counts`/`?action=book` keep working unchanged.

Golden rules: **amounts are recomputed server-side**, never trust the total
from the browser; **webhooks are the only source of truth**; verify signatures
on every webhook before touching the Sheet.
