import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent-teal text-white hover:brightness-110',
  secondary: 'border border-border-subtle bg-bg-surface text-text-primary hover:bg-bg-surface-raised',
  ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-surface-raised',
  destructive: 'bg-accent-red text-white hover:brightness-110',
};

// Disabled buttons must state why (Spec, Section 11, rule 2): pass the reason via `disabledReason`.
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  disabledReason?: string;
}

export function Button({ variant = 'primary', loading = false, disabledReason, disabled, className = '', children, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT[variant]} ${className}`}
        {...rest}
      >
        {loading ? 'Working…' : children}
      </button>
      {disabled && disabledReason ? (
        <span className="mt-1 text-xs text-text-secondary">{disabledReason}</span>
      ) : null}
    </span>
  );
}
