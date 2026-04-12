import type { RecipeStep } from '../../pages/recipes/recipeDetailTypes';
import { StepCard } from './StepCard';

type StepListProps = {
  steps: RecipeStep[];
};

export function StepList({ steps }: StepListProps) {
  return (
    <section>
      <h2 className="text-[18px] font-semibold leading-7 text-[#2D2520] md:text-[20px] md:leading-7">
        制作步骤
      </h2>
      <div className="mt-4 space-y-4 md:mt-6 md:space-y-8">
        {steps.map((step) => (
          <StepCard key={step.id} step={step} />
        ))}
      </div>
    </section>
  );
}
