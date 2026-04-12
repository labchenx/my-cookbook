import type { PropsWithChildren } from 'react';

type RecipeSectionCardProps = PropsWithChildren<{
  className?: string;
}>;

export function RecipeSectionCard({ className = '', children }: RecipeSectionCardProps) {
  return (
    <section
      className={`rounded-2xl border border-[rgba(45,37,32,0.1)] bg-white p-4 lg:p-6 ${className}`}
    >
      {children}
    </section>
  );
}
