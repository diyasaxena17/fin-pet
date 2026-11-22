import type { ReactElement, SVGProps } from 'react';
import type { TopicIconKey } from '../types';

type IconProps = SVGProps<SVGSVGElement>;

const stroke = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

/** The Golden Nut: the hub's currency. Inline colours so it never depends on app CSS. */
export const NutIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <ellipse cx="12" cy="15" rx="6" ry="7" fill="#C98A3F" stroke="#7A4A22" strokeWidth="1.4" />
    <path d="M5.5 12.5Q12 3.5 18.5 12.5Z" fill="#7A4A22" />
    <path d="M12 6V2.5" stroke="#7A4A22" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M9.5 15.5q.4 3 2 4" fill="none" stroke="#E8B56F" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

export const SparkleIcon = (p: IconProps) => (
  <svg {...stroke} {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.2 2.2M15.5 15.5l2.2 2.2M17.7 6.3l-2.2 2.2M8.5 15.5l-2.2 2.2" /></svg>
);
export const LockIcon = (p: IconProps) => (
  <svg {...stroke} {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
export const BookIcon = (p: IconProps) => (
  <svg {...stroke} {...p}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5Z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5Z" /></svg>
);
export const CloseIcon = (p: IconProps) => (
  <svg {...stroke} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const CheckIcon = (p: IconProps) => (
  <svg {...stroke} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const FlameIcon = (p: IconProps) => (
  <svg {...stroke} {...p}><path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4 .2 1.4 1 2 1.8 2C11 8 10.5 5.5 12 3Z" /></svg>
);
export const TargetIcon = (p: IconProps) => (
  <svg {...stroke} {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></svg>
);
export const PulseIcon = (p: IconProps) => (
  <svg {...stroke} {...p}><path d="M3 12h4l2.5-6 4 12 2.5-6H21" /></svg>
);

const topicPaths: Record<TopicIconKey, ReactElement> = {
  wallet: <><path d="M4 7a2 2 0 0 1 2-2h11v4" /><path d="M4 7v10a2 2 0 0 0 2 2h13V9H6a2 2 0 0 1-2-2Z" /><circle cx="15.5" cy="14" r="1" /></>,
  shield: <><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6Z" /><path d="m9 12 2 2 4-4" /></>,
  leaf: <><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14" /><path d="M5 19c3-4 6-7 10-9" /></>,
  cap: <><path d="m3 9 9-4 9 4-9 4Z" /><path d="M7 11v4c1.5 1.5 3 2 5 2s3.5-.5 5-2v-4" /><path d="M21 9v5" /></>,
  trend: <><path d="m4 16 5-5 4 4 7-8" /><path d="M15 7h5v5" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5Z" /></>,
};

export function TopicIcon({ name, ...p }: IconProps & { name: TopicIconKey }) {
  return <svg {...stroke} {...p}>{topicPaths[name]}</svg>;
}
