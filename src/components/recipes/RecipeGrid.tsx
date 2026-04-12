import type { Recipe } from '../../pages/recipes/recipesTypes';
import { RecipeCard } from './RecipeCard';

type RecipeGridProps = {
  recipes: Recipe[];
  getRelativeTimeLabel: (createdAt: string) => string;
  onRecipeClick: (recipe: Recipe) => void;
};

export function RecipeGrid({ recipes, getRelativeTimeLabel, onRecipeClick }: RecipeGridProps) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
      {recipes.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          relativeTime={getRelativeTimeLabel(recipe.createdAt)}
          onClick={() => onRecipeClick(recipe)}
        />
      ))}
    </section>
  );
}
