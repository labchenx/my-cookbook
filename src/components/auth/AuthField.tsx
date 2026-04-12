import type { InputHTMLAttributes } from 'react';

type AuthFieldProps = {
  id: string;
  label: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function AuthField({ id, label, error, className = '', ...inputProps }: AuthFieldProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="block text-[14px] font-medium leading-5 text-[#2D2520]">{label}</span>
      <input
        id={id}
        className={`mt-2 h-[49px] w-full rounded-2xl border bg-[#FAF7F5] px-4 text-[16px] leading-[19px] text-[#2D2520] outline-none transition focus:border-[#EA5D38] focus:ring-0 ${
          error ? 'border-[#EA5D38]' : 'border-[rgba(45,37,32,0.1)]'
        } ${className}`}
        {...inputProps}
      />
      {error ? <span className="mt-2 block text-[13px] leading-5 text-[#EA5D38]">{error}</span> : null}
    </label>
  );
}
