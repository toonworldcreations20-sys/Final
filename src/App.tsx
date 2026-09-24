import { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import { Shell } from '@/components/chrome';
import { Home } from '@/pages/Home';
import { EventPage } from '@/pages/Event';
import { Select } from '@/pages/Select';
import { Checkout } from '@/pages/Checkout';
import { Confirmation } from '@/pages/Confirmation';
import { Reservations } from '@/pages/Reservations';
import { Ticket } from '@/pages/Ticket';
import { Login } from '@/pages/Login';
import { Account } from '@/pages/Account';
import { PaymentsReturn } from '@/pages/PaymentsReturn';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="empty">
          <h2 style={{ font: '400 3rem Anton, sans-serif', margin: '0 0 8px' }}>404</h2>
          This deck doesn’t exist.{' '}
          <Link to="/" style={{ color: 'var(--cyan)' }}>Back to the party</Link>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Shell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/event" element={<EventPage />} />
          <Route path="/select" element={<Select />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/ticket" element={<Ticket />} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<Account />} />
          <Route path="/payments/return" element={<PaymentsReturn />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Shell>
    </HashRouter>
  );
}
