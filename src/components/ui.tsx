// ============================================================
// Shared UI primitives: Reveal, Notice, Stepper, Countdown,
// Lightbox — all styled by the class vocabulary in index.css.
// ============================================================

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Info, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, X, Minus, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Photo } from '@/lib/config';

// ---------- scroll reveal ----------
let observer: IntersectionObserver | null = null;
function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (es) => es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('show');
          observer?.unobserve(e.target);
        }
      }),
      { threshold: 0.12 },
    );
  }
  return observer;
}

export function Reveal({ children, className, style, as: Tag = 'div' }: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: 'div' | 'section' | 'article';
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    getObserver().observe(el);
    return () => getObserver().unobserve(el);
  }, []);
  return (
    <Tag ref={ref as never} className={cn('reveal', className)} style={style}>
      {children}
    </Tag>
  );
}

// ---------- notice ----------
export function Notice({ kind = 'info', children, className }: { kind?: 'info' | 'warn' | 'amber' | 'ok'; children: ReactNode; className?: string }) {
  const Icon = kind === 'warn' ? AlertTriangle : kind === 'ok' ? CheckCircle2 : Info;
  return (
    <div className={cn('notice', kind !== 'info' && kind, className)} role="status">
      <Icon size={17} />
      <div>{children}</div>
    </div>
  );
}

// ---------- qty stepper ----------
export function Stepper({ value, onChange, min = 1, max = 10 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="Decrease" onClick={() => onChange(Math.max(min, value - 1))}><Minus size={16} /></button>
      <output>{value}</output>
      <button type="button" aria-label="Increase" onClick={() => onChange(Math.min(max, value + 1))}><Plus size={16} /></button>
    </div>
  );
}

// ---------- countdown ----------
export function Countdown({ target, label }: { target: Date; label: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = target.getTime() - now;
  if (diff <= 0) {
    return (
      <div className="cd-box">
        <p>{label}</p>
        <div className="cd-live"><strong>🎉 WE’RE LIVE</strong><span className="muted">Happy New Year from B-Ceylon!</span></div>
      </div>
    );
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor(diff / 3600000) % 24;
  const m = Math.floor(diff / 60000) % 60;
  const s = Math.floor(diff / 1000) % 60;
  const cell = (v: string, u: string) => (
    <div><strong>{v}</strong><span>{u}</span></div>
  );
  return (
    <div className="cd-box">
      <p>{label}</p>
      <div className="cd-grid">
        {cell(String(d), 'days')}
        {cell(String(h).padStart(2, '0'), 'hours')}
        {cell(String(m).padStart(2, '0'), 'mins')}
        {cell(String(s).padStart(2, '0'), 'secs')}
      </div>
    </div>
  );
}

// ---------- lightbox ----------
export function Lightbox({ photos, index, onIndex, onClose }: {
  photos: Photo[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex((index + 1) % photos.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + photos.length) % photos.length);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, photos.length, onClose, onIndex]);

  const p = photos[index];
  if (!p) return null;
  return (
    <div className="lb open" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <button className="lb-x" aria-label="Close" onClick={onClose}><X size={20} /></button>
      <button className="lb-p" aria-label="Previous" onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + photos.length) % photos.length); }}><ChevronLeft size={22} /></button>
      <figure>
        <img src={p.src} alt={p.cap} />
        <figcaption>{p.cap}</figcaption>
      </figure>
      <button className="lb-n" aria-label="Next" onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % photos.length); }}><ChevronRight size={22} /></button>
    </div>
  );
}
