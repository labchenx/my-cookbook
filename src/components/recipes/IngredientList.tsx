import type { RecipeIngredient } from '../../pages/recipes/recipeDetailTypes';

type IngredientListProps = {
  ingredients: RecipeIngredient[];
};

export function IngredientList({ ingredients }: IngredientListProps) {
  return (
    <section className="rounded-2xl border border-[rgba(45,37,32,0.1)] bg-white px-4 pt-4 pb-3 md:px-6 md:pt-6 md:pb-4">
      <h2 className="text-[18px] font-semibold leading-7 text-[#2D2520] md:text-[20px] md:leading-7">
        配料清单
      </h2>
      <ul className="mt-3 md:mt-4">
        {ingredients.map((ingredient, index) => {
          const isLast = index === ingredients.length - 1;

          return (
            <li
              key={`${ingredient.name}-${ingredient.amount}`}
              className={`flex items-center justify-between py-2 text-[14px] leading-5 md:py-2.5 md:text-[16px] md:leading-6 ${
                isLast ? '' : 'border-b border-[rgba(45,37,32,0.1)]'
              }`}
            >
              <span className="text-[#2D2520]">{ingredient.name}</span>
              <span className="font-medium text-[#827971]">{ingredient.amount}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
