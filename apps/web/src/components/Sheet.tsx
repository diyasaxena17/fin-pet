import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function NutIcon({ size = 16 }: { size?: number }) {
  return <svg className="wo-nut" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3c-4 0-7 2.2-7 5h14c0-2.8-3-5-7-5Z" fill="#8a5a3b" /><path d="M12 7c-4.2 0-6.5 3-6.5 6.2C5.5 17.2 8.3 21 12 21s6.5-3.8 6.5-7.8C18.5 10 16.2 7 12 7Z" fill="#6b4630" />
    <path d="M9 12c0 3 1 5 3 6" fill="none" stroke="#a9784f" strokeWidth="1.2" strokeLinecap="round" /></svg>;
}
export function RewardBadge({ nuts, label }: { nuts: number; label?: string }) {
  return <span className="wo-reward" aria-label={label ?? `${nuts} Golden Nuts`}>+{nuts} <NutIcon size={14} /></span>;
}

export interface SheetTab { id: string; label: string; icon: string }
interface SheetProps { tag: string; title: string; onClose(): void; tabs?: SheetTab[]; tab?: string; onTab?(id: string): void; children: ReactNode }

/** Bottom sheet rendered into the phone frame's overlay host (falls back to <body>). */
export function Sheet({ tag, title, onClose, tabs, tab, onTab, children }: SheetProps) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previous = useRef<Element | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [tab]);
  useEffect(() => { previous.current = document.activeElement; setHost(document.getElementById('wo-overlay') ?? document.body);
    return () => { if (previous.current instanceof HTMLElement) previous.current.focus(); }; }, []);
  useEffect(() => { if (host) closeRef.current?.focus(); }, [host]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!host) return null;
  const titleId = `wo-sheet-title-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return createPortal(<div className="wo-sheet-layer">
    <div className="wo-backdrop" data-testid="sheet-backdrop" onClick={onClose} />
    <div className="wo-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="wo-sheet-head">
        <div><span className="wo-tag">{tag}</span><h2 id={titleId}>{title}</h2></div>
        <button ref={closeRef} type="button" className="wo-close" aria-label="Close" onClick={onClose}>×</button>
      </div>
      {tabs && tabs.length > 1 ? <div className="wo-tabs-row" role="tablist" aria-label={`${title} views`}>
        {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="wo-pilltab" onClick={() => onTab?.(t.id)}>
          <span aria-hidden="true">{t.icon}</span>{t.label}</button>)}
      </div> : null}
      <div className="wo-sheet-body" ref={bodyRef} role={tabs ? 'tabpanel' : undefined}>{children}</div>
    </div>
  </div>, host);
}
