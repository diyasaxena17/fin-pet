import { useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SignalsPage } from './signals/SignalsPage';
import { SignalsProvider } from './signals/store';
import { Hud } from './components/Hud';

export function App() {
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
                <Route path="/" element={<SignalsPage section="home" />} />
                <Route path="/lab" element={<SignalsPage section="lab" />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
          <div id="wo-overlay" />
        </div>
      </div>
    </SignalsProvider>
  );
}
