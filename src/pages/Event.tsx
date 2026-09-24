// ============================================================
// EVENT — Vol. 2 details: countdown, lineup, rules, tiers, posters.
// ============================================================

import { Link, useNavigate } from 'react-router-dom';
import { Music, MapPin, Clock, ShieldCheck, Ticket, Beer, IdCard } from 'lucide-react';
import { EVENT, NEXT_EVENT, TIERS, DJS, SPONSORS, type Tier } from '@/lib/config';
import { money } from '@/utils/format';
import { Reveal, Countdown } from '@/components/ui';

export function EventPage() {
  const navigate = useNavigate();
  const pick = (t: Tier) => navigate('/select?tier=' + encodeURIComponent(t.id));

  return (
    <>
      <section className="section">
        <div className="wrap">
          <Reveal>
            <h2>VOL. 2 — THE FINALE</h2>
            <p className="lead">New Year’s Eve, Badulla style. One secret venue, four DJs, 300 of your people — and a countdown you’ll feel in your chest.</p>
          </Reveal>
          <Reveal>
            <Countdown target={NEXT_EVENT} label="Gates in" />
          </Reveal>

          <Reveal className="event-grid">
            <div className="card event" style={{ ['--cover' as string]: 'url(photos/poster-main.jpg)' }} data-tilt>
              <span className="pill">31 DEC 2026 • NYE • 21+</span>
              <h3>{EVENT.name}</h3>
              <div className="date">{EVENT.date} • {EVENT.time}</div>
              <p className="muted">{EVENT.venue} — revealed to ticket holders 48h before gates.</p>
              <div className="actions" style={{ justifyContent: 'flex-start' }}>
                <Link to="/select" className="btn primary"><Ticket size={16} /> Book Tickets</Link>
                <Link to="/" className="btn ghost">See OG Sambavam recap</Link>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div className="card">
                <div className="iconbox"><Music size={20} /></div>
                <h3>The lineup</h3>
                <p className="muted">{DJS.join(' • ')} — back-to-back till the ball drops.</p>
              </div>
              <div className="card">
                <div className="iconbox"><MapPin size={20} /></div>
                <h3>Venue &amp; gates</h3>
                <p className="muted">{EVENT.venue}. Gates {EVENT.gates}, first drop {EVENT.time}.</p>
              </div>
              <div className="card">
                <div className="iconbox"><Beer size={20} /></div>
                <h3>BYOB 🍾</h3>
                <p className="muted">Bring your own bottle. Every ticket carries redeemable bar credit — no outside food or beverages.</p>
              </div>
              <div className="card">
                <div className="iconbox"><IdCard size={20} /></div>
                <h3>21+ only</h3>
                <p className="muted">Valid ID at the gate, QR ticket in hand. Crew-run security all night.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal>
            <h2>PICK YOUR NIGHT</h2>
            <p className="lead">Four ways in. Phase One goes first — OG Sambavam’s sold out in 9 days.</p>
          </Reveal>
          <div className="grid3" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {TIERS.map((t) => (
              <Reveal key={t.id} className="card" >
                <div className="toolbar" style={{ marginBottom: 8 }}>
                  <span className="pill">{t.section}</span>
                  {t.cls === 'vip' && <span className="crown">♛ Royal deck</span>}
                </div>
                <h3>{t.id}</h3>
                <div className="total" style={{ fontSize: 26 }}>{money(t.price)}</div>
                <p className="muted">{t.desc}</p>
                <button className="btn primary small wfull" onClick={() => pick(t)}>Select {t.id}</button>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal className="event-grid">
            <div className="card" data-tilt>
              <img src="photos/poster-tickets.jpg" alt="Ticket availability poster" style={{ borderRadius: 14, width: '100%' }} />
            </div>
            <div className="card" data-tilt>
              <img src="photos/poster-sponsor.jpg" alt="Sponsor thank-you poster" style={{ borderRadius: 14, width: '100%' }} />
              <div className="sp-chips" style={{ marginTop: 14 }}>
                {SPONSORS.slice(0, 4).map((s) => <span key={s}>🤝 {s.split(' — ')[0]}</span>)}
              </div>
            </div>
          </Reveal>
          <Reveal style={{ marginTop: 18 }}>
            <div className="notice">
              <ShieldCheck size={17} />
              <div>
                House rules: {EVENT.instructions}
              </div>
            </div>
          </Reveal>
          <Reveal style={{ marginTop: 8 }}>
            <div className="notice amber">
              <Clock size={17} />
              <div>Venue address drops 48h before gates — WhatsApp +94 70 174 2032 for anything urgent.</div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
