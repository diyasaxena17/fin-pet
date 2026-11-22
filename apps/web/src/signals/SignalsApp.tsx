import { useEffect, useRef } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { SignalsPage } from './SignalsPage';
import { SignalsProvider } from './store';
import { Hud } from '../components/Hud';

const tabs = [
  { to: '/signals', label: 'Passive', icon: '📡', end: true }, { to: '/intent', label: 'Intent', icon: '🛑' },
  { to: '/check-ins', label: 'Check-ins', icon: '🧠' }, { to: '/lab', label: 'Test lab', icon: '🧪' },
] as const;

export function SignalsApp() {
  const { pathname } = useLocation();
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; }, [pathname]);
  return (
    <SignalsProvider>
      <div className="wo-stage">
        <div className="wo-phone">
          <Hud />
          <div className="wo-scroll" ref={scroller}>
            <main className="wo-main">
              <Routes>
                <Route path="/" element={<SignalsPage section="passive" />} />
                <Route path="/signals" element={<SignalsPage section="passive" />} />
                <Route path="/intent" element={<SignalsPage section="intent" />} />
                <Route path="/check-ins" element={<SignalsPage section="checkins" />} />
                <Route path="/lab" element={<SignalsPage section="lab" />} />
                <Route path="*" element={<p>Page not found.</p>} />
              </Routes>
            </main>
          </div>
          <nav aria-label="Main navigation" className="wo-nav">
            {tabs.map((t) => <NavLink key={t.to} to={t.to} end={'end' in t}><span aria-hidden="true">{t.icon}</span><small>{t.label}</small></NavLink>)}
          </nav>
          <div id="wo-overlay" />
        </div>
      </div>
    </SignalsProvider>
  );
}
