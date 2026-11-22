import type { Explainer } from '../types';
import { CheckIcon } from './icons';
import { PrimaryButton } from './PrimaryButton';
import { Sheet, SheetHeader } from './Sheet';

interface StripProps {
  explainers: Explainer[];
  onOpen: (explainer: Explainer) => void;
}

export function QuickReads({ explainers, onOpen }: StripProps) {
  return (
    <section aria-labelledby="quick-reads-heading" className="pb-6 pt-4">
      <h2 id="quick-reads-heading" className="px-4 text-sm font-extrabold uppercase tracking-[0.12em] text-[#4B5A4F]">
        Quick Reads
      </h2>
      <ul className="m-0 mt-3 flex list-none snap-x scroll-pl-4 gap-3 overflow-x-auto px-4 pb-2">
        {explainers.map((e) => (
          <li key={e.id} className="w-[13.5rem] flex-none snap-start">
            <button
              type="button"
              onClick={() => onOpen(e)}
              aria-haspopup="dialog"
              className="h-full w-full flex-col items-start justify-start rounded-2xl border border-[#E0D7C2] bg-[#FFFDF8] p-4 text-left text-[#1F3B2D] shadow-none transition hover:-translate-y-0.5 hover:border-[#C77D2E] hover:bg-[#FFFDF8] hover:shadow-md"
            >
              <span className="block text-sm font-extrabold">{e.title}</span>
              <span className="mt-1 block text-xs font-normal leading-relaxed text-[#5F6E63]">{e.summary}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface SheetProps {
  explainer: Explainer;
  relatedQuestTitle?: string;
  onClose: () => void;
  onStartRelated?: () => void;
}

export function ExplainerSheet({ explainer, relatedQuestTitle, onClose, onStartRelated }: SheetProps) {
  return (
    <Sheet label={explainer.title} onClose={onClose}>
      <SheetHeader tag="Quick read" title={explainer.title} onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#E4DBC8] px-5 py-5">
        <h3 className="mb-3 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-[#6B7A6F]">Key takeaways</h3>
        <ul className="m-0 grid list-none gap-3 p-0">
          {explainer.takeaways.map((t) => (
            <li key={t} className="flex gap-3 text-sm leading-relaxed text-[#33463A]">
              <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-[#DDE6D9] text-[#2F4A3B]">
                <CheckIcon className="h-3 w-3" />
              </span>
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-5 rounded-2xl bg-[#EFE9DC] p-4 text-sm leading-relaxed text-[#33463A]">
          <p className="mb-1 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-[#8A4B1F]">In real life</p>
          {explainer.example}
        </div>
      </div>
      <div className="grid gap-3 border-t border-[#E4DBC8] px-5 py-4">
        {onStartRelated && relatedQuestTitle ? <PrimaryButton onClick={onStartRelated}>Try the lesson</PrimaryButton> : null}
        <PrimaryButton tone="soft" onClick={onClose}>Close</PrimaryButton>
      </div>
    </Sheet>
  );
}
