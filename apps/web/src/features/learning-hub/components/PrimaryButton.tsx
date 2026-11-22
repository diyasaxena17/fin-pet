import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tone?: 'amber' | 'forest' | 'soft';
}

const tones = {
  amber:
    'bg-[#C77D2E] text-white shadow-[0_3px_0_#8F5719] hover:bg-[#B97024] active:translate-y-[2px] active:shadow-[0_1px_0_#8F5719]',
  forest:
    'bg-[#234535] text-white shadow-[0_3px_0_#14291F] hover:bg-[#1C392C] active:translate-y-[2px] active:shadow-[0_1px_0_#14291F]',
  soft: 'bg-[#EDE6D6] text-[#2F4A3B] shadow-none hover:bg-[#E4DBC6] active:translate-y-px',
} as const;

/** Tactile CTA. Utility classes deliberately override the host app's base button styles. */
export function PrimaryButton({ tone = 'amber', className = '', children, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border-0 px-5 py-3.5 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none disabled:active:translate-y-0 ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
