import type { ReactNode } from 'react';

export function PageShell({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return <section className="page-card rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7">
    {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
    <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
    <div className="leading-relaxed text-slate-600">{children}</div>
  </section>;
}
