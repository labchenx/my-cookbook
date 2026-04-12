import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppRoutes } from '../../app/AppRoutes';
import { recipeCategories, recipeMockData } from './mockRecipes';

function renderApp(initialEntries: string[] = ['/recipes']) {
  const router = createMemoryRouter([{ path: '*', element: <AppRoutes /> }], {
    initialEntries,
  });

  return {
    router,
    ...render(<RouterProvider router={router} />),
  };
}

function getRecipeCardButtons() {
  return screen
    .getAllByRole('button')
    .filter((button) => button.querySelector('h2') !== null);
}

describe('RecipesPage', () => {
  const chocolateRecipe = recipeMockData.find((recipe) => recipe.id === 'chocolate-mousse-cake')!;
  const pumpkinRecipe = recipeMockData.find((recipe) => recipe.id === 'pumpkin-soup')!;
  const cornRecipe = recipeMockData.find((recipe) => recipe.id === 'corn-soup')!;
  const mushroomRecipe = recipeMockData.find((recipe) => recipe.id === 'mushroom-pasta')!;
  const salmonRecipe = recipeMockData.find((recipe) => recipe.id === 'salmon-asparagus')!;

  it('renders the recipes page on /recipes', () => {
    renderApp();

    expect(screen.getByRole('heading', { level: 1, hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByText(chocolateRecipe.title)).toBeInTheDocument();
    expect(screen.getByText(salmonRecipe.title)).toBeInTheDocument();
  });

  it('filters recipes by title search', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByRole('searchbox'), pumpkinRecipe.title);

    expect(screen.getByText(pumpkinRecipe.title)).toBeInTheDocument();
    expect(screen.queryByText(chocolateRecipe.title)).not.toBeInTheDocument();
  });

  it('filters recipes by category', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: recipeCategories[4] }));

    expect(screen.getByText(cornRecipe.title)).toBeInTheDocument();
    expect(screen.getByText(pumpkinRecipe.title)).toBeInTheDocument();
    expect(screen.queryByText(mushroomRecipe.title)).not.toBeInTheDocument();
  });

  it('sorts recipes by oldest first', async () => {
    const user = userEvent.setup();
    renderApp();

    const filterSection = screen
      .getByRole('button', { name: recipeCategories[0] })
      .closest('section');

    expect(filterSection).not.toBeNull();

    const filterButtons = within(filterSection as HTMLElement).getAllByRole('button');
    const oldestButton = filterButtons[filterButtons.length - 1];

    await user.click(oldestButton);

    const cards = getRecipeCardButtons();
    expect(cards[0]).toHaveAccessibleName(expect.stringContaining(salmonRecipe.title));
  });

  it('navigates to the recipe detail page when a card is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderApp();

    const targetCard = getRecipeCardButtons().find(
      (button) => button.querySelector('h2')?.textContent === chocolateRecipe.title,
    );

    expect(targetCard).toBeDefined();

    await user.click(targetCard as HTMLElement);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/recipes/chocolate-mousse-cake');
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: chocolateRecipe.title })).toBeInTheDocument();
    });
  });

  it('navigates to the new recipe placeholder when the floating button is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderApp();

    const createButton = screen
      .getAllByRole('button')
      .find((button) => button.className.includes('fixed'));

    expect(createButton).toBeDefined();

    await user.click(createButton as HTMLElement);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/recipes/new');
    });

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
