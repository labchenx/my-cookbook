import type { PropsWithChildren } from 'react';
import { AuthBrandHeader } from './AuthBrandHeader';

export function AuthCard({ children }: PropsWithChildren) {
  return (
    <section className="min-h-[690px] w-[min(448px,_calc(100vw-32px))] rounded-2xl bg-white px-6 pt-6 pb-6 shadow-[0_10px_15px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.08)] sm:min-h-[733px] sm:px-8 sm:pt-8">
      <AuthBrandHeader />
      <div className="mt-6 space-y-6 sm:mt-8 sm:space-y-6">{children}</div>
    </section>
  );
}
