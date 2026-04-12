import type { RecipeStep } from '../../pages/recipes/recipeDetailTypes';

type StepCardProps = {
  step: RecipeStep;
};

export function StepCard({ step }: StepCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[rgba(45,37,32,0.1)] bg-white p-4 md:p-6">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EA5D38] text-[14px] font-semibold leading-5 text-white md:h-10 md:w-10 md:text-[16px] md:leading-6">
          {step.order}
        </div>
        <p className="pt-1 text-[14px] leading-[22.75px] text-[#2D2520] md:pt-1.5 md:text-[16px] md:leading-[26px]">
          {step.text}
        </p>
      </div>
      {step.image ? (
        <div className="mt-3 overflow-hidden rounded-xl bg-[#F5F1EE] md:mt-4 md:rounded-2xl">
          <img src={step.image} alt={`步骤 ${step.order}`} className="h-48 w-full object-cover md:h-64" />
        </div>
      ) : null}
    </article>
  );
}
