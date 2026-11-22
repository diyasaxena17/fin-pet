import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { App as CompanionApp } from './mochi-ui/App';
import { App as LegacyApp } from './LegacyApp';

export function App() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const [legacyMode, setLegacyMode] = useState(() => pathname !== '/' || searchParams.get('legacy') === '1');
  useEffect(() => {
    if (pathname !== '/' || searchParams.get('legacy') === '1') setLegacyMode(true);
  }, [pathname, searchParams]);
  return pathname === '/' && !legacyMode ? <CompanionApp /> : <LegacyApp />;
}
