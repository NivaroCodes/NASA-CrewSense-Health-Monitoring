import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-card border border-border-subtle bg-bg-surface p-5 shadow-card ${className}`}
    >
      {children}
    </section>
  );
}
