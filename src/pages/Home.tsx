// ============================================================
// HOME — hero, OG Sambavam recap gallery, sponsors, teaser.
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Play, Sparkles, Music, Users, ShieldCheck, CalendarDays } from 'lucide-react';
import { GALLERY, STATS, SPONSORS, DJS, EVENT, NEXT_EVENT, type Photo } from '@/lib/config';
import { Reveal, Lightbox, Countdown } from '@/components/ui';

export function Home() {
  const [lb, setLb] = useState<number | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);

  // hero parallax: copy + orbs + rings drift at different depths (desktop only)
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const copy = hero.querySelector<HTMLElement>('.hero-copy');
    const orbs = Array.from(hero.querySelectorAll<HTMLElement>('.orb'));
    const rings = Array.from(hero.querySelectorAll<HTMLElement>('.hero-ring'));
    const onMove = (e: PointerEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      if (copy) copy.style.transform = `translate3d(${x * 16}px, ${y * 12}px, 0)`;
      orbs.forEach((o, i) => { const d = (i + 1) * 18; o.style.translate = `${-x * d}px ${-y * d}px`; });
      rings.forEach((g, i) => { const d = (i + 1) * 8; g.style.translate = `${x * d}px ${y * d}px`; });
    };
    const onLeave = () => {
      if (copy) copy.style.transform = '';
      orbs.forEach((o) => { o.style.translate = ''; });
      rings.forEach((g) => { g.style.translate = ''; });
    };
    const onScroll = () => {
      hero.style.setProperty('--hero-scroll', Math.min(window.scrollY, window.innerHeight) * 0.18 + 'px');
    };
    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="hero" ref={heroRef}>
        <div className="hero-grid" />
        <div className="hero-ring hero-ring-one" />
        <div className="hero-ring hero-ring-two" />
        <div className="hero-noise" />
        <div className="orb o1" />
        <div className="orb o2" />
        <div className="orb o3" />
        <div className="wrap hero-copy">
          <span className="eyebrow"><Sparkles size={14} /> 31 DEC 2026 • NYE • 21+ • BADULLA</span>
          <h1>B-CEYLON<br />Entertainment</h1>
          <p>{EVENT.tagline} Four DJs, immersive LED walls, premium tables — OG Sambavam was just the warm-up.</p>
          <div className="actions">
            <Link to="/select" className="btn primary"><Ticket size={17} /> Book Next Event</Link>
            <a className="btn ghost" href="https://www.youtube.com/@BCeylonEntertainment" target="_blank" rel="noopener noreferrer">
              <Play size={17} /> Watch Aftermovie
            </a>
          </div>
          <div className="hero-card">
            <div className="stage" data-tilt>
              <div className="stage-bg" style={{ backgroundImage: 'url(photos/hero-crowd.jpg)' }} />
              <div className="stage-inner">
                <div className="stage-title">OG SAMBAVAM<br />WAS THE WARM-UP</div>
                <div className="stage-meta">
                  <span>05 SEP 2026 • ALORA RESORT</span>
                  <span>VOL. 2 → NEW YEAR’S EVE 🎆</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="section" style={{ paddingTop: 30 }}>
        <div className="wrap">
          <Reveal className="stats-row">
            {STATS.map((s) => (
              <div key={s.l}><strong>{s.n}</strong><span>{s.l}</span></div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ============ COUNTDOWN ============ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal>
            <Countdown target={NEXT_EVENT} label="Countdown to Vol. 2 — New Year’s Eve" />
          </Reveal>
        </div>
      </section>

      {/* ============ RECAP GALLERY ============ */}
      <section className="section" id="gallery">
        <div className="wrap">
          <Reveal>
            <h2>OG SAMBAVAM</h2>
            <p className="lead">
              Saturday night, 05 September 2026 — the crew’s first full-house Tamil DJ party.
              Relive the night that started it all. Tap any photo for fullscreen.
            </p>
          </Reveal>
          <div className="g-grid">
            {GALLERY.map((p: Photo, i) => (
              <Reveal key={p.src} as="div">
                <button className="g-item" onClick={() => setLb(i)} aria-label={'Open photo: ' + p.cap}>
                  <img src={p.src} alt={p.cap} loading="lazy" />
                  <figcaption>{p.cap}</figcaption>
                </button>
              </Reveal>
            ))}
          </div>
          <Reveal className="sp-chips">
            {SPONSORS.map((s) => <span key={s}>💎 {s}</span>)}
          </Reveal>
        </div>
      </section>

      {/* ============ WHAT TO EXPECT ============ */}
      <section className="section">
        <div className="wrap">
          <Reveal>
            <h2>WHAT’S COMING</h2>
            <p className="lead">Vol. 2 is the finale experience — everything OG Sambavam proved, turned up.</p>
          </Reveal>
          <div className="grid3">
            <Reveal className="card" >
              <div className="iconbox"><Music size={22} /></div>
              <h3>{DJS.length} DJs, back-to-back</h3>
              <p className="muted">{DJS.join(' • ')} — Tamil hits, kuthu beats and club edits till the countdown hits zero.</p>
            </Reveal>
            <Reveal className="card">
              <div className="iconbox"><Users size={22} /></div>
              <h3>300-capacity floor</h3>
              <p className="muted">One night, three sections — Main Floor, VIP Deck and Royal Deck. When it’s sold out, it’s sold out.</p>
            </Reveal>
            <Reveal className="card">
              <div className="iconbox"><ShieldCheck size={22} /></div>
              <h3>Grown-up crowd only</h3>
              <p className="muted">21+ with valid ID. BYOB 🍾, redeemable bar credit on every ticket, crew-run security all night.</p>
            </Reveal>
          </div>
          <Reveal className="event-grid">
            <div className="card event" style={{ ['--cover' as string]: 'url(photos/poster-main.jpg)' }} data-tilt>
              <span className="pill"><CalendarDays size={13} /> 31 DEC 2026</span>
              <h3>THE NYE FINALE</h3>
              <p className="muted">Secret venue reveal 48h before gates — ticket holders first.</p>
              <div className="actions" style={{ justifyContent: 'flex-start' }}>
                <Link to="/event" className="btn primary small">Explore event</Link>
                <Link to="/select" className="btn ghost small">🎟️ Book Tickets</Link>
              </div>
            </div>
            <div className="card" data-tilt>
              <div className="iconbox"><Sparkles size={22} /></div>
              <h3>Why book early?</h3>
              <p className="muted">Phase One is the cheapest way in — Rs. 3,000 with Rs. 1,500 redeemable at the bar. OG Sambavam’s Phase One sold out in 9 days.</p>
              <Link to="/select" className="btn primary small wfull" style={{ marginTop: 10 }}>Secure Phase One</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {lb !== null && (
        <Lightbox photos={GALLERY} index={lb} onIndex={setLb} onClose={() => setLb(null)} />
      )}
    </>
  );
}
