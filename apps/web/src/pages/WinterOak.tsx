import { LearningHub } from '../features/learning-hub';

/**
 * Landing page after tapping the NFC chip: the Winter Oak learning tree.
 * `framed` draws the dark phone bezel (used by the standalone app and preview, not inside fin-pet).
 */
export function WinterOak({ framed = false, embedded = false, petName = '' }: { framed?: boolean; embedded?: boolean; petName?: string }) {
  const size = framed
    ? 'h-[min(54rem,calc(100dvh-2rem))] w-full max-w-[24.5rem] rounded-[3rem] border-[10px] border-[#2B2218] max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none max-sm:border-0'
    : embedded
      ? 'h-full min-h-[42rem] w-full max-w-none rounded-none border-0'
      : 'h-[min(54rem,calc(100dvh-8rem))] w-full max-w-[27rem] rounded-[2rem] border border-[#E4DBC8]';
  return (
    <div className={`mx-auto overflow-hidden bg-[#F7F2E8] ${embedded ? '' : 'shadow-2xl'} ${size}`}>
      <LearningHub petName={petName} />
    </div>
  );
}
