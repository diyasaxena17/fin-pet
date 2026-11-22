import { useEffect, useRef, type ReactNode } from 'react';

interface SheetProps {
  label: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Bottom sheet that slides over its nearest positioned ancestor (the hub root), so it stays
 * inside the phone-sized screen instead of covering the whole browser window.
 * Escape closes it, focus is trapped while open and restored afterwards.
 */
export function Sheet({ label, onClose, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div
      className="absolute inset-0 z-30 flex items-end bg-[#1E2A22]/45 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="flex max-h-[88%] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-[#F9F5EC] shadow-[0_-12px_40px_rgba(0,0,0,0.25)] outline-none"
      >
        {children}
      </div>
    </div>
  );
}

interface SheetHeaderProps {
  tag: string;
  title: string;
  onClose: () => void;
}

export function SheetHeader({ tag, title, onClose }: SheetHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
      <div className="min-w-0">
        <span className="inline-block rounded-full bg-[#DDE6D9] px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-[#2F4A3B]">
          {tag}
        </span>
        <h2 className="mt-2 text-xl font-extrabold leading-tight tracking-tight text-[#1F3B2D]">{title}</h2>
      </div>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="grid h-10 w-10 flex-none place-items-center rounded-full border-0 bg-[#E9E2D2] p-0 text-[#2F4A3B] shadow-none hover:bg-[#DFD6C2]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
