import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-card border border-border-subtle bg-bg-surface p-4 ${className}`}
    >
      {children}
    </section>
  );
}
