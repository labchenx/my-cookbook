import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FilterBar } from '../../components/recipes/FilterBar';
import { FloatingActionButton } from '../../components/recipes/FloatingActionButton';
import { Navbar } from '../../components/recipes/Navbar';
import { Pagination } from '../../components/recipes/Pagination';
import { RecipeGrid } from '../../components/recipes/RecipeGrid';
import { recipeCategories } from './recipesTypes';
import type { Recipe, RecipeCategory, SortOrder } from './recipesTypes';

type RecipesApiResponse = {
  items: Recipe[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type RecipesPageLocationState = {
  flashMessage?: {
    type: 'success';
    text: string;
  };
} | null;

const defaultPagination = {
  page: 1,
  pageSize: 9,
  total: 0,
  totalPages: 0,
};

const referenceNow = new Date('2026-04-12T12:00:00+08:00').getTime();
const allCategory = '\u5168\u90e8';

function formatRelativeTime(createdAt: string) {
  const diff = referenceNow - new Date(createdAt).getTime();
  const hours = Math.max(Math.floor(diff / (1000 * 60 * 60)), 0);

  if (hours < 24) {
    return `${hours}\u5c0f\u65f6\u524d`;
  }

  return `${Math.floor(hours / 24)}\u5929\u524d`;
}

async function loadRecipes(
  searchValue: string,
  activeCategory: RecipeCategory,
  sortOrder: SortOrder,
  page: number,
  signal: AbortSignal,
): Promise<RecipesApiResponse> {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: '9',
    sort: sortOrder,
  });

  const normalizedSearch = searchValue.trim();

  if (normalizedSearch.length > 0) {
    query.set('keyword', normalizedSearch);
  }

  if (activeCategory !== allCategory) {
    query.set('tag', activeCategory);
  }

  const response = await fetch(`/api/recipes?${query.toString()}`, { signal });

  if (!response.ok) {
    throw new Error('Failed to load recipes');
  }

  return (await response.json()) as RecipesApiResponse;
}

export function RecipesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchValue, setSearchValue] = useState('');
  const [activeCategory, setActiveCategory] = useState<RecipeCategory>(allCategory);
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');
  const [page, setPage] = useState(1);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pagination, setPagination] = useState(defaultPagination);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [flashMessage, setFlashMessage] = useState('');
  const deferredSearchValue = useDeferredValue(searchValue);

  useEffect(() => {
    const locationState = location.state as RecipesPageLocationState;
    const nextFlashMessage = locationState?.flashMessage?.text;

    if (!nextFlashMessage) {
      return;
    }

    setFlashMessage(nextFlashMessage);
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    const abortController = new AbortController();
    const isFirstLoad = !hasLoadedOnce;
    const hadRecipes = recipes.length > 0;

    if (isFirstLoad) {
      setIsInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }

    loadRecipes(deferredSearchValue, activeCategory, sortOrder, page, abortController.signal)
      .then((data) => {
        if (abortController.signal.aborted) {
          return;
        }

        if (data.pagination.totalPages > 0 && page > data.pagination.totalPages) {
          setPage(1);
          return;
        }

        startTransition(() => {
          setRecipes(data.items);
          setPagination(data.pagination);
          setErrorMessage('');
          setHasLoadedOnce(true);
          setIsInitialLoading(false);
          setIsRefreshing(false);
        });
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return;
        }

        startTransition(() => {
          if (!hasLoadedOnce) {
            setRecipes([]);
            setPagination(defaultPagination);
            setIsInitialLoading(false);
          }

          setIsRefreshing(false);
          setHasLoadedOnce(true);
          setErrorMessage(
            hadRecipes
              ? '\u6682\u65f6\u65e0\u6cd5\u5237\u65b0\u83dc\u8c31\uff0c\u5df2\u4fdd\u7559\u5f53\u524d\u7ed3\u679c\u3002'
              : error instanceof Error
                ? error.message
                : 'Failed to load recipes',
          );
        });
      });

    return () => {
      abortController.abort();
    };
  }, [activeCategory, deferredSearchValue, page, sortOrder]);

  const hasRecipes = recipes.length > 0;
  const showEmptyState = !isInitialLoading && !hasRecipes && !errorMessage;
  const showFullErrorState = !isInitialLoading && !hasRecipes && Boolean(errorMessage);

  const refreshStatus = useMemo(() => {
    if (!isRefreshing || !hasRecipes) {
      return null;
    }

    return (
      <div className="space-y-3">
        <div
          aria-live="polite"
          className="rounded-2xl border border-[rgba(234,93,56,0.08)] bg-[#FFF8F4] px-4 py-3 text-[14px] leading-5 text-[#9A5D46]"
        >
          {'\u6b63\u5728\u66f4\u65b0\u83dc\u8c31...'}
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[#F4DED3]">
          <div className="h-full w-24 animate-pulse rounded-full bg-[#EA5D38]" />
        </div>
      </div>
    );
  }, [hasRecipes, isRefreshing]);

  return (
    <main className="min-h-screen bg-[#FEFDFB]">
      <h1 className="sr-only">{'\u83dc\u8c31\u5217\u8868'}</h1>

      <Navbar
        searchValue={searchValue}
        onSearchChange={(value) => {
          setSearchValue(value);
          setPage(1);
        }}
      />

      <div className="mx-auto flex max-w-[1322px] flex-col gap-4 px-4 pb-20 pt-4 sm:gap-8 sm:px-[45px] sm:pb-24 sm:pt-8">
        <FilterBar
          categories={recipeCategories}
          activeCategory={activeCategory}
          sortOrder={sortOrder}
          onCategoryChange={(category) => {
            setActiveCategory(category);
            setPage(1);
          }}
          onSortChange={(sort) => {
            setSortOrder(sort);
            setPage(1);
          }}
        />

        {flashMessage ? (
          <section
            aria-live="polite"
            className="rounded-2xl border border-[rgba(34,197,94,0.16)] bg-white px-4 py-3 text-[14px] leading-5 text-[#2F6F44]"
          >
            {flashMessage}
          </section>
        ) : null}

        {errorMessage && hasRecipes ? (
          <section className="rounded-2xl border border-[rgba(234,93,56,0.12)] bg-white px-4 py-3 text-[14px] leading-5 text-[#9A5D46]">
            {errorMessage}
          </section>
        ) : null}

        {isInitialLoading ? (
          <section className="rounded-2xl border border-[rgba(45,37,32,0.08)] bg-white px-6 py-12 text-center text-[14px] leading-5 text-[#827971] sm:px-8 sm:py-16 sm:text-[16px] sm:leading-6">
            {'\u6b63\u5728\u52a0\u8f7d\u83dc\u8c31...'}
          </section>
        ) : showFullErrorState ? (
          <section className="rounded-2xl border border-[rgba(234,93,56,0.12)] bg-white px-6 py-12 text-center text-[14px] leading-5 text-[#827971] sm:px-8 sm:py-16 sm:text-[16px] sm:leading-6">
            {'\u83dc\u8c31\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'}
          </section>
        ) : showEmptyState ? (
          <section className="rounded-2xl border border-[rgba(45,37,32,0.08)] bg-white px-6 py-12 text-center text-[14px] leading-5 text-[#827971] sm:px-8 sm:py-16 sm:text-[16px] sm:leading-6">
            {'\u6ca1\u6709\u627e\u5230\u5339\u914d\u7684\u83dc\u8c31\u3002'}
          </section>
        ) : (
          <>
            {refreshStatus}
            <RecipeGrid
              recipes={recipes}
              getRelativeTimeLabel={formatRelativeTime}
              onRecipeClick={(recipe: Recipe) => navigate(`/recipes/${recipe.id}`)}
              isRefreshing={isRefreshing}
            />
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={(nextPage) => {
                if (nextPage === page || nextPage < 1 || nextPage > pagination.totalPages) {
                  return;
                }

                setPage(nextPage);
              }}
              disabled={isRefreshing}
            />
          </>
        )}
      </div>

      <FloatingActionButton onClick={() => navigate('/recipes/new')} />
    </main>
  );
}
