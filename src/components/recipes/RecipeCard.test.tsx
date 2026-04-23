import { fireEvent, render, screen } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import fallbackCover from '../../assets/recipes/cover-fallback-kitchen.svg';
import { RecipeCard, __resetRecipeCardImageCacheForTests } from './RecipeCard';

const recipe = {
  id: 'recipe-1',
  title: 'Chocolate Mousse Cake',
  description: 'Silky chocolate mousse with a smooth finish.',
  tags: ['Dessert', 'Easy'],
  createdAt: '2026-04-12T10:00:00+08:00',
  status: 'published',
};

describe('RecipeCard', () => {
  beforeEach(() => {
    __resetRecipeCardImageCacheForTests();
  });

  it('renders the fallback cover when coverImage is missing', () => {
    render(<RecipeCard recipe={recipe} relativeTime="2 hours ago" onClick={() => undefined} />);

    expect((screen.getByAltText(recipe.title) as HTMLImageElement).getAttribute('src')).toBe(
      fallbackCover,
    );
  });

  it('switches to the fallback cover when the primary image fails', async () => {
    render(
      <RecipeCard
        recipe={{ ...recipe, coverImage: '/assets/recipes/not-found.png' }}
        relativeTime="2 hours ago"
        onClick={() => undefined}
      />,
    );

    fireEvent.error(screen.getByAltText(recipe.title));

    await waitFor(() => {
      expect((screen.getByAltText(recipe.title) as HTMLImageElement).getAttribute('src')).toBe(
        fallbackCover,
      );
    });
  });

  it('reuses the cached fallback when the same broken source renders again', async () => {
    const { rerender } = render(
      <RecipeCard
        recipe={{ ...recipe, coverImage: '/assets/recipes/not-found.png' }}
        relativeTime="2 hours ago"
        onClick={() => undefined}
      />,
    );

    fireEvent.error(screen.getByAltText(recipe.title));
    await waitFor(() => {
      expect((screen.getByAltText(recipe.title) as HTMLImageElement).getAttribute('src')).toBe(
        fallbackCover,
      );
    });

    rerender(
      <RecipeCard
        recipe={{ ...recipe, coverImage: '/assets/recipes/not-found.png' }}
        relativeTime="2 hours ago"
        onClick={() => undefined}
      />,
    );

    expect((screen.getByAltText(recipe.title) as HTMLImageElement).getAttribute('src')).toBe(
      fallbackCover,
    );
  });

  it('limits visible tags and shows a remaining count', () => {
    render(
      <RecipeCard
        recipe={{
          ...recipe,
          tags: ['快手菜', '下饭菜', '五花肉', '鸡蛋', '青椒', '焦香风味'],
        }}
        relativeTime="2 hours ago"
        onClick={() => undefined}
      />,
    );

    expect(screen.getByText('快手菜')).toBeInTheDocument();
    expect(screen.getByText('下饭菜')).toBeInTheDocument();
    expect(screen.getByText('五花肉')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.queryByText('鸡蛋')).not.toBeInTheDocument();
  });
});
