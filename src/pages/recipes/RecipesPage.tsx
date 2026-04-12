import { useNavigate } from 'react-router-dom';
import { FilterBar } from '../../components/recipes/FilterBar';
import { FloatingActionButton } from '../../components/recipes/FloatingActionButton';
import { Navbar } from '../../components/recipes/Navbar';
import { RecipeGrid } from '../../components/recipes/RecipeGrid';
import { recipeCategories, recipeMockData } from './mockRecipes';
import type { Recipe, RecipeCategory, SortOrder } from './recipesTypes';
import { useState } from 'react';

const referenceNow = new Date('2026-04-12T12:00:00+08:00').getTime();

function formatRelativeTime(createdAt: string) {
  const diff = referenceNow - new Date(createdAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 24) {
    return `${hours}小时前`;
  }

  return `${Math.floor(hours / 24)}天前`;
}

export function RecipesPage() {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [activeCategory, setActiveCategory] = useState<RecipeCategory>('全部');
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');

  const normalizedSearch = searchValue.trim().toLowerCase();

  const visibleRecipes = recipeMockData
    .filter((recipe) => {
      const matchesSearch =
        normalizedSearch.length === 0 || recipe.title.toLowerCase().includes(normalizedSearch);
      const matchesCategory =
        activeCategory === '全部' ? true : recipe.category === activeCategory;

      return matchesSearch && matchesCategory;
    })
    .sort((left, right) => {
      const diff = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return sortOrder === 'latest' ? -diff : diff;
    });

  return (
    <main className="min-h-screen bg-[#FEFDFB]">
      <h1 className="sr-only">菜谱列表</h1>

      <Navbar searchValue={searchValue} onSearchChange={setSearchValue} />

      <div className="mx-auto flex max-w-[1322px] flex-col gap-4 px-4 pb-20 pt-4 sm:gap-8 sm:px-[45px] sm:pb-24 sm:pt-8">
        <FilterBar
          categories={recipeCategories}
          activeCategory={activeCategory}
          sortOrder={sortOrder}
          onCategoryChange={setActiveCategory}
          onSortChange={setSortOrder}
        />

        {visibleRecipes.length > 0 ? (
          <RecipeGrid
            recipes={visibleRecipes}
            getRelativeTimeLabel={formatRelativeTime}
            onRecipeClick={(recipe: Recipe) => navigate(`/recipes/${recipe.id}`)}
          />
        ) : (
          <section className="rounded-2xl border border-[rgba(45,37,32,0.08)] bg-white px-6 py-12 text-center text-[14px] leading-5 text-[#827971] sm:px-8 sm:py-16 sm:text-[16px] sm:leading-6">
            没有找到匹配的菜谱
          </section>
        )}
      </div>

      <FloatingActionButton onClick={() => navigate('/recipes/new')} />
    </main>
  );
}
