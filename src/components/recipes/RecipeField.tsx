import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

type BaseRecipeFieldProps = {
  id: string;
  label?: string;
  className?: string;
};

type InputRecipeFieldProps = BaseRecipeFieldProps &
  InputHTMLAttributes<HTMLInputElement> & {
    multiline?: false;
  };

type TextareaRecipeFieldProps = BaseRecipeFieldProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    multiline: true;
  };

type RecipeFieldProps = InputRecipeFieldProps | TextareaRecipeFieldProps;

const baseFieldClass =
  'w-full rounded-xl border border-[rgba(45,37,32,0.1)] bg-[#FAF7F5] text-[#2D2520] outline-none transition placeholder:text-[rgba(45,37,32,0.5)] focus:border-[#EA5D38]';

export function RecipeField(props: RecipeFieldProps) {
  const { id, label, className = '' } = props;

  return (
    <label htmlFor={id} className="block w-full">
      {label ? (
        <span className="mb-2 block text-[14px] font-medium leading-5 text-[#2D2520]">
          {label}
        </span>
      ) : null}
      {'multiline' in props && props.multiline ? (
        <textarea
          {...props}
          id={id}
          className={`${baseFieldClass} min-h-[81px] px-3 py-[10px] text-[14px] leading-5 lg:min-h-[97px] lg:rounded-2xl lg:px-4 lg:py-3 lg:text-[16px] lg:leading-6 ${className}`}
        />
      ) : (
        <input
          {...props}
          id={id}
          className={`${baseFieldClass} h-[41px] px-3 py-[10px] text-[14px] leading-5 lg:h-[49px] lg:rounded-2xl lg:px-4 lg:py-3 lg:text-[16px] lg:leading-6 ${className}`}
        />
      )}
    </label>
  );
}
