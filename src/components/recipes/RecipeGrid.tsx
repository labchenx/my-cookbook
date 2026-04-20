import type { Recipe } from '../../pages/recipes/recipesTypes';
import { RecipeCard } from './RecipeCard';

type RecipeGridProps = {
  recipes: Recipe[];
  getRelativeTimeLabel: (createdAt: string) => string;
  onRecipeClick: (recipe: Recipe) => void;
  isRefreshing?: boolean;
};

export function RecipeGrid({
  recipes,
  getRelativeTimeLabel,
  onRecipeClick,
  isRefreshing = false,
}: RecipeGridProps) {
  return (
    <section
      className={`grid grid-cols-1 gap-4 transition-opacity duration-200 md:grid-cols-2 md:gap-6 lg:grid-cols-3 ${
        isRefreshing ? 'opacity-80' : 'opacity-100'
      }`}
      aria-busy={isRefreshing}
    >
      {recipes.map((recipe, index) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          relativeTime={getRelativeTimeLabel(recipe.createdAt)}
          onClick={() => onRecipeClick(recipe)}
          priority={index < 3}
        />
      ))}
    </section>
  );
}
