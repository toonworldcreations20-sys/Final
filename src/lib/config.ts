// ============================================================
// B-CEYLON NEXT — central config (SECURITY.md: keys live here + .env)
// Everything the pages share: event facts, tiers, socials, gallery.
// ============================================================

const env = import.meta.env as Record<string, string | undefined>;

export const SHEET_API = (env.VITE_SHEET_API ?? '').trim();
export const SHEET_KEY = (env.VITE_SHEET_KEY ?? '').trim();
export const PAYHERE_MERCHANT_ID = (env.VITE_PAYHERE_MERCHANT_ID ?? '').trim();
export const PAYHERE_HASH_ENDPOINT = (env.VITE_PAYHERE_HASH_ENDPOINT ?? '').trim();
export const STRIPE_PK = (env.VITE_STRIPE_PK ?? '').trim();

// Startup hygiene: a Sheet "key" that is actually a pasted URL is a classic
// mistake — warn loudly instead of failing silently later.
if (SHEET_KEY && /^https?:\/\//i.test(SHEET_KEY)) {
  console.error('[config] VITE_SHEET_KEY looks like a URL — that is a paste mistake. Use the shared secret string, not the /exec URL.');
}

export const LIVE = SHEET_API.length > 0;

export const WA_NUMBER = '94701742032'; // +94 70 174 2032
export const WA_DISPLAY = '+94 70 174 2032';
export const CREW_EMAIL = 'bceylonentertainment@gmail.com';
export const NEXT_EVENT = new Date('2026-12-31T19:00:00+05:30'); // Vol. 2 — NYE

export const EVENT = {
  name: 'B-CEYLON VOL. 2',
  tagline: 'The New Year’s Eve finale. Tamil DJ party, Badulla style.',
  venue: 'Secret Venue • Badulla, Sri Lanka',
  date: '31 December 2026',
  time: '7:00 PM',
  gates: '6:30 PM',
  instructions:
    'Bring your ticket QR code and a valid ID (21+). Gates 6:30 PM. BYOB 🍾 — no outside food or beverages. Follow venue/security instructions on arrival.',
};

export type TierId = 'Phase One' | 'At Gate' | 'VIP' | 'Royal Access';
export type TicketClass = 'standard' | 'economy' | 'premium' | 'vip';
export type SheetCat = 'normal' | 'vip' | 'vvip';

export interface Tier {
  id: TierId;
  cls: TicketClass;
  sheetCat: SheetCat;
  section: string;
  price: number;
  desc: string;
}

export const TIERS: Tier[] = [
  { id: 'Phase One', cls: 'standard', sheetCat: 'normal', section: 'Main Floor', price: 3000, desc: 'Early-bird • Rs. 1,500 redeemable at the bar 🍾' },
  { id: 'At Gate', cls: 'economy', sheetCat: 'normal', section: 'Main Floor', price: 3500, desc: 'Entrance rate • Rs. 1,500 redeemable' },
  { id: 'VIP', cls: 'premium', sheetCat: 'vip', section: 'VIP Deck', price: 35000, desc: 'VIP deck + seating • up to Rs. 10,000 redeemable' },
  { id: 'Royal Access', cls: 'vip', sheetCat: 'vvip', section: 'Royal Deck', price: 50000, desc: 'Royal deck • priority entry • meet the DJs' },
];

export const tierById = (id: string): Tier => TIERS.find((t) => t.id === id) ?? TIERS[0];

export const SERVICE_FEE = 0.02; // 2% platform fee shown at checkout

export const DJS = ['DJ Mins', 'Rythamo Cracy', 'Kevin', 'DJ Buddy'];

export const SPONSORS = [
  'Vetro Code — Creative Partner',
  'Venus Studio — Media Coverage',
  'Alora Resort — Venue',
  'Dharma’s Recycling Pvt LTD',
  'Loyal Guardian',
  'Praveenaa Jewellers',
];

export const SOCIALS = [
  { id: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/share/19R7tM9ejt/' },
  { id: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/bceylonentertainment' },
  { id: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@b.ceylon.events' },
  { id: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/@BCeylonEntertainment' },
  { id: 'whatsapp', label: 'WhatsApp', href: 'https://wa.me/94701742032' },
  { id: 'mail', label: 'Email', href: 'mailto:' + CREW_EMAIL },
] as const;

export interface Photo {
  src: string;
  cap: string;
}

/** OG Sambavam recap — the crew’s real night, 05 Sep 2026. */
export const GALLERY: Photo[] = [
  { src: 'photos/hero-crowd.jpg', cap: 'The floor at peak — OG Sambavam' },
  { src: 'photos/crowd-blue.jpg', cap: 'Blue hour energy on the main floor' },
  { src: 'photos/dj-led.jpg', cap: 'Back-to-back under the LED wall' },
  { src: 'photos/dj-portrait.jpg', cap: 'Rythamo Cracy in the mix' },
  { src: 'photos/dj-mic.jpg', cap: 'Hype mic between drops' },
  { src: 'photos/dj-handup.jpg', cap: 'Hands up — countdown to the drop' },
  { src: 'photos/decks-hands.jpg', cap: 'Four decks, zero mercy' },
  { src: 'photos/decks-close.jpg', cap: 'The cockpit up close' },
  { src: 'photos/djs-duo.jpg', cap: 'B2B session till closing' },
  { src: 'photos/dj-setup.jpg', cap: 'Rig check before gates' },
  { src: 'photos/team.jpg', cap: 'The full B-Ceylon crew' },
  { src: 'photos/poster-main.jpg', cap: 'OG Sambavam — official poster' },
];

export const STATS = [
  { n: '300+', l: 'Ravers packed the floor' },
  { n: '4', l: 'DJs back-to-back' },
  { n: '6.5', l: 'Hours non-stop sets' },
  { n: '21+', l: 'Grown-up crowd only' },
];
