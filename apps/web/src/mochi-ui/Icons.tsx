import type { ReactNode, SVGProps } from 'react';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'>;
type IconName =
  | 'Sparkles' | 'Volume2' | 'CheckCircle2' | 'AlertCircle' | 'TrendingUp'
  | 'ShieldCheck' | 'Award' | 'BookOpen' | 'Sliders' | 'TreePine' | 'BarChart3'
  | 'Bot' | 'ChevronRight' | 'X' | 'Zap' | 'Moon' | 'Clock' | 'Heart' | 'Edit3'
  | 'Check' | 'RefreshCw' | 'ArrowUpRight' | 'Coins' | 'GraduationCap' | 'Landmark' | 'Wallet';

const drawings: Record<IconName, ReactNode> = {
  Sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z"/></>,
  Volume2: <><path d="m11 5-6 5H2v4h3l6 5V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></>,
  CheckCircle2: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
  AlertCircle: <><circle cx="12" cy="12" r="9"/><path d="M12 8v5m0 3h.01"/></>,
  TrendingUp: <><path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/></>,
  ShieldCheck: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
  Award: <><circle cx="12" cy="8" r="6"/><path d="m8.2 13-1 8 4.8-2.5 4.8 2.5-1-8"/></>,
  BookOpen: <><path d="M12 7v14m0-14C9 4 5 4 2 5v14c3-1 7-1 10 2m0-14c3-3 7-3 10-2v14c-3-1-7-1-10 2"/></>,
  Sliders: <><path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M2 14h4m4-6h4m4 8h4"/></>,
  TreePine: <><path d="m12 2 7 8h-4l6 7h-7v5h-4v-5H3l6-7H5l7-8Z"/></>,
  BarChart3: <><path d="M3 3v18h18"/><path d="M8 16V9m5 7V5m5 11v-4"/></>,
  Bot: <><rect x="3" y="7" width="18" height="14" rx="3"/><path d="M12 3v4m-5 5h.01M17 12h.01M8 17h8"/><path d="M7 7V5m10 2V5"/></>,
  ChevronRight: <path d="m9 18 6-6-6-6"/>,
  X: <path d="m18 6-12 12M6 6l12 12"/>,
  Zap: <path d="m13 2-3 9h7l-6 11 1-9H5l8-11Z"/>,
  Moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>,
  Clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  Heart: <path d="M20.8 8.6c0 5.5-8.8 11-8.8 11s-8.8-5.5-8.8-11A4.6 4.6 0 0 1 12 6.3a4.6 4.6 0 0 1 8.8 2.3Z"/>,
  Edit3: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
  Check: <path d="m5 12 4 4L19 6"/>,
  RefreshCw: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2"/></>,
  ArrowUpRight: <><path d="M7 17 17 7M7 7h10v10"/></>,
  Coins: <><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v5c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 11v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5"/></>,
  GraduationCap: <><path d="m2 10 10-5 10 5-10 5-10-5Z"/><path d="M6 12v5c4 3 8 3 12 0v-5m4-2v6"/></>,
  Landmark: <><path d="m3 10 9-7 9 7M4 10h16M5 10v9m4-9v9m6-9v9m4-9v9M3 21h18"/></>,
  Wallet: <><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H21v16H5.5A2.5 2.5 0 0 1 3 17.5v-11Z"/><path d="M3 7h18m-5 5h5m-5 0a2 2 0 1 0 0 4h5v-4h-5Z"/></>,
};

function Icon({ name, ...props }: IconProps & { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{drawings[name]}</svg>;
}

export const Sparkles = (props: IconProps) => <Icon name="Sparkles" {...props} />;
export const Volume2 = (props: IconProps) => <Icon name="Volume2" {...props} />;
export const CheckCircle2 = (props: IconProps) => <Icon name="CheckCircle2" {...props} />;
export const AlertCircle = (props: IconProps) => <Icon name="AlertCircle" {...props} />;
export const TrendingUp = (props: IconProps) => <Icon name="TrendingUp" {...props} />;
export const ShieldCheck = (props: IconProps) => <Icon name="ShieldCheck" {...props} />;
export const Award = (props: IconProps) => <Icon name="Award" {...props} />;
export const BookOpen = (props: IconProps) => <Icon name="BookOpen" {...props} />;
export const Sliders = (props: IconProps) => <Icon name="Sliders" {...props} />;
export const TreePine = (props: IconProps) => <Icon name="TreePine" {...props} />;
export const BarChart3 = (props: IconProps) => <Icon name="BarChart3" {...props} />;
export const Bot = (props: IconProps) => <Icon name="Bot" {...props} />;
export const ChevronRight = (props: IconProps) => <Icon name="ChevronRight" {...props} />;
export const X = (props: IconProps) => <Icon name="X" {...props} />;
export const Zap = (props: IconProps) => <Icon name="Zap" {...props} />;
export const Moon = (props: IconProps) => <Icon name="Moon" {...props} />;
export const Clock = (props: IconProps) => <Icon name="Clock" {...props} />;
export const Heart = (props: IconProps) => <Icon name="Heart" {...props} />;
export const Edit3 = (props: IconProps) => <Icon name="Edit3" {...props} />;
export const Check = (props: IconProps) => <Icon name="Check" {...props} />;
export const RefreshCw = (props: IconProps) => <Icon name="RefreshCw" {...props} />;
export const ArrowUpRight = (props: IconProps) => <Icon name="ArrowUpRight" {...props} />;
export const Coins = (props: IconProps) => <Icon name="Coins" {...props} />;
export const GraduationCap = (props: IconProps) => <Icon name="GraduationCap" {...props} />;
export const Landmark = (props: IconProps) => <Icon name="Landmark" {...props} />;
export const Wallet = (props: IconProps) => <Icon name="Wallet" {...props} />;
