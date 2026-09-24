// ============================================================
// App chrome: Nav + Footer + scroll progress + back-to-top +
// mouse spotlight + toast system. Wraps every page.
// ============================================================

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Menu, X, ArrowUp, Mail, MessageCircle,
  UserRound, Ticket, ShieldCheck, CheckCircle2, AlertTriangle,
} from 'lucide-react';

// Brand glyphs (lucide v1 dropped brand icons) — minimal inline SVGs.
const IcFacebook = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.07C24 5.44 18.63.07 12 .07S0 5.44 0 12.07c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08v-3.47h3.05V9.43c0-3 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.96h-1.51c-1.49 0-1.96.92-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.38C19.61 23.02 24 18.06 24 12.07Z"/></svg>
);
const IcInstagram = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
);
const IcTiktok = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .58.05.88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1Z"/></svg>
);
const IcYoutube = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z"/></svg>
);
import { cn } from '@/utils/cn';
import { SOCIALS, WA_DISPLAY, CREW_EMAIL, EVENT } from '@/lib/config';
import { getSession } from '@/lib/security';

// ---------------- toasts ----------------
interface Toast { id: number; msg: string; kind: 'ok' | 'err' }
const ToastCtx = createContext<(msg: string, kind?: 'ok' | 'err') => void>(() => undefined);
export function useToast() {
  return useContext(ToastCtx);
}
let toastSeq = 1;

// ---------------- auth chip state ----------------
function useSessionName(): string | null {
  const [name, setName] = useState<string | null>(() => getSession()?.name ?? null);
  useEffect(() => {
    const refresh = () => setName(getSession()?.name ?? null);
    window.addEventListener('bc:auth', refresh);
    return () => window.removeEventListener('bc:auth', refresh);
  }, []);
  return name;
}
export function emitAuthChange(): void {
  window.dispatchEvent(new Event('bc:auth'));
}

const SOCIAL_ICON: Record<string, ReactNode> = {
  facebook: IcFacebook,
  instagram: IcInstagram,
  tiktok: IcTiktok,
  youtube: IcYoutube,
  whatsapp: <MessageCircle size={17} />,
  mail: <Mail size={17} />,
};

export function Shell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toTop, setToTop] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const sessionName = useSessionName();

  const push = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    const id = toastSeq++;
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  // scroll progress + back-to-top + hero parallax var
  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0);
      setToTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // calm professional 3D tilt on [data-tilt] cards (desktop, motion-safe)
  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let current: HTMLElement | null = null;
    const onMove = (e: PointerEvent) => {
      const t = (e.target as HTMLElement).closest?.('[data-tilt]') as HTMLElement | null;
      if (t !== current) {
        if (current) { current.style.transform = ''; current.style.setProperty('--mx', '50%'); current.style.setProperty('--my', '50%'); }
        current = t;
      }
      if (current) {
        const r = current.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        current.style.transform = `perspective(1100px) rotateX(${(0.5 - y) * 5}deg) rotateY(${(x - 0.5) * 5}deg) translateY(-2px)`;
        current.style.setProperty('--mx', x * 100 + '%');
        current.style.setProperty('--my', y * 100 + '%');
      }
    };
    const onLeaveDoc = () => {
      if (current) { current.style.transform = ''; current = null; }
    };
    document.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('mouseleave', onLeaveDoc);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeaveDoc);
    };
  }, []);

  // mouse spotlight (consumed by body::after)
  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: PointerEvent) => {
      document.documentElement.style.setProperty('--pointer-x', e.clientX + 'px');
      document.documentElement.style.setProperty('--pointer-y', e.clientY + 'px');
    };
    document.addEventListener('pointermove', onMove);
    return () => document.removeEventListener('pointermove', onMove);
  }, []);

  const links = [
    { to: '/', label: 'Discover' },
    { to: '/event', label: 'Vol. 2 — NYE' },
    { to: '/select', label: '🎟️ Book' },
    { to: '/reservations', label: 'My Reservations' },
  ];

  return (
    <ToastCtx.Provider value={push}>
      <div className="progress" style={{ width: progress + '%' }} />
      <nav className="nav">
        <div className="wrap navin">
          <Link to="/" className="logo" onClick={() => setMenuOpen(false)}>
            <img src="photos/logo-cube.jpg" alt="B-Ceylon Entertainment" />
            <span>B-CEYLON ENTERTAINMENT<b>.</b></span>
          </Link>
          <div className={cn('links', menuOpen && 'open')}>
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'} onClick={() => setMenuOpen(false)}>
                {l.label}
              </NavLink>
            ))}
            {sessionName ? (
              <Link to="/account" className="userchip" onClick={() => setMenuOpen(false)}>
                <UserRound size={14} /><span>{sessionName}</span>
              </Link>
            ) : (
              <NavLink to="/login" onClick={() => setMenuOpen(false)}><ShieldCheck size={15} /> Sign in</NavLink>
            )}
            <Link to="/select" className="btn primary small" onClick={() => setMenuOpen(false)}>
              <Ticket size={15} /> Book Tickets
            </Link>
          </div>
          <button className="hamb" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      <main>{children}</main>

      <footer className="footer">
        <div className="wrap fin-grid">
          <div>
            <Link to="/" className="logo">
              <img src="photos/logo-cube.jpg" alt="B-Ceylon" />
              <span>B-CEYLON ENTERTAINMENT<b>.</b></span>
            </Link>
            <p className="muted" style={{ margin: '12px 0' }}>
              A crew of friends throwing unforgettable Tamil DJ nights across Sri Lanka. 🪩
            </p>
            <div className="socials">
              {SOCIALS.map((s) => (
                <a key={s.id} href={s.href} target={s.id === 'mail' ? undefined : '_blank'} rel="noopener noreferrer" aria-label={s.label} title={s.label}>
                  {SOCIAL_ICON[s.id]}
                </a>
              ))}
            </div>
          </div>
          <div className="fin-links">
            <h4>EXPLORE</h4>
            <Link to="/">Discover</Link>
            <Link to="/event">Vol. 2 — NYE</Link>
            <Link to="/reservations">My Reservations</Link>
            <Link to="/account">My Account</Link>
          </div>
          <div className="fin-links">
            <h4>BOOK &amp; CONTACT</h4>
            <Link to="/select">🎟️ Book Tickets</Link>
            <a href="https://wa.me/94701742032" target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> WhatsApp: {WA_DISPLAY}</a>
            <a href={'mailto:' + CREW_EMAIL}><Mail size={15} /> {CREW_EMAIL}</a>
            <span className="muted">Badulla, Sri Lanka • 21+</span>
          </div>
        </div>
        <div className="fin-bottom">© 2026 B-Ceylon Entertainment • Photos: Venus Studio • Vol. 2 — the finale experience 🎧</div>
      </footer>

      <button
        className={cn('to-top', toTop && 'show')}
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
      >
        <ArrowUp size={20} />
      </button>

      <div className="toast-host">
        {toasts.map((t) => (
          <div key={t.id} className={cn('toast', t.kind)}>
            {t.kind === 'ok' ? <CheckCircle2 size={17} style={{ color: 'var(--green)' }} /> : <AlertTriangle size={17} style={{ color: 'var(--red)' }} />}
            {t.msg}
          </div>
        ))}
      </div>

    </ToastCtx.Provider>
  );
}
