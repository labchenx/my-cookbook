import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppRoutes } from '../../app/AppRoutes';
import { recipeCategories } from './recipesTypes';

const soupTag = '\u6c64\u7c7b';
const nextPageLabel = '\u4e0b\u4e00\u9875';
const secondPageLabel = '\u8f6c\u5230\u7b2c 2 \u9875';
const refreshingLabel = '\u6b63\u5728\u66f4\u65b0\u83dc\u8c31...';

const recipeApiItems = [
  {
    id: 'chocolate-mousse-cake',
    title: 'Chocolate Mousse Cake',
    description: 'Silky chocolate mousse with a smooth finish.',
    coverImage: '/assets/recipes/cover-chocolate-mousse.png',
    tags: ['\u751c\u54c1', 'easy'],
    createdAt: '2026-04-12T10:00:00+08:00',
    status: 'published',
  },
  {
    id: 'corn-soup',
    title: 'Corn Soup',
    description: 'Warm and comforting sweet corn soup.',
    coverImage: '/assets/recipes/cover-corn-soup.png',
    tags: [soupTag, 'nutrition'],
    createdAt: '2026-04-12T07:00:00+08:00',
    status: 'published',
  },
  {
    id: 'pumpkin-soup',
    title: 'Pumpkin Soup',
    description: 'A sweet pumpkin soup for cooler evenings.',
    coverImage: '/assets/recipes/cover-pumpkin-soup.png',
    tags: [soupTag, 'nutrition'],
    createdAt: '2026-04-08T10:00:00+08:00',
    status: 'published',
  },
  {
    id: 'salmon-asparagus',
    title: 'Salmon with Asparagus',
    description: 'Lean protein with roasted asparagus.',
    coverImage: '/assets/recipes/cover-salmon-asparagus.png',
    tags: ['\u51cf\u8102', 'protein'],
    createdAt: '2026-04-07T10:00:00+08:00',
    status: 'published',
  },
  {
    id: 'mushroom-pasta',
    title: 'Creamy Mushroom Pasta',
    description: 'Mushroom pasta with a velvety cream sauce.',
    coverImage: '/assets/recipes/cover-mushroom-pasta.png',
    tags: ['\u5bb6\u5e38\u83dc', 'quick'],
    createdAt: '2026-04-06T11:00:00+08:00',
    status: 'published',
  },
  {
    id: 'teriyaki-chicken-rice',
    title: 'Teriyaki Chicken Rice',
    description: 'Sticky teriyaki glaze over juicy chicken.',
    coverImage: '/assets/recipes/cover-teriyaki-chicken.png',
    tags: ['\u5bb6\u5e38\u83dc', 'rice'],
    createdAt: '2026-04-05T18:00:00+08:00',
    status: 'published',
  },
  {
    id: 'roasted-vegetable-salad',
    title: 'Roasted Vegetable Salad',
    description: 'A crisp and balanced salad.',
    coverImage: '/assets/recipes/cover-salad.png',
    tags: ['\u51cf\u8102', 'light'],
    createdAt: '2026-04-05T11:00:00+08:00',
    status: 'published',
  },
  {
    id: 'turkish-cabbage-rolls',
    title: 'Turkish Cabbage Rolls',
    description: 'Savory cabbage rolls with deep flavor.',
    coverImage: '/assets/recipes/cover-cabbage-rolls.png',
    tags: ['\u5bb6\u5e38\u83dc', 'classic'],
    createdAt: '2026-04-04T20:00:00+08:00',
    status: 'published',
  },
  {
    id: 'eggplant-risotto',
    title: 'Tomato Cheese Risotto',
    description: 'Tomato and cheese in a creamy baked rice.',
    coverImage: '/assets/recipes/cover-eggplant-risotto.png',
    tags: ['\u5bb6\u5e38\u83dc', 'easy'],
    createdAt: '2026-04-04T12:00:00+08:00',
    status: 'published',
  },
  {
    id: 'tomato-bruschetta',
    title: 'Tomato Bruschetta',
    description: 'A bright starter for sharing.',
    coverImage: '/assets/recipes/cover-salad.png',
    tags: ['\u5bb6\u5e38\u83dc', 'light'],
    createdAt: '2026-04-03T19:00:00+08:00',
    status: 'published',
  },
  {
    id: 'berry-yogurt-cup',
    title: 'Berry Yogurt Cup',
    description: 'A quick breakfast dessert.',
    coverImage: '/assets/recipes/cover-chocolate-mousse.png',
    tags: ['\u751c\u54c1', 'quick'],
    createdAt: '2026-04-03T10:00:00+08:00',
    status: 'published',
  },
  {
    id: 'miso-tofu-soup',
    title: 'Miso Tofu Soup',
    description: 'A fast soup with mellow umami.',
    coverImage: '/assets/recipes/cover-corn-soup.png',
    tags: [soupTag, 'quick'],
    createdAt: '2026-04-02T09:00:00+08:00',
    status: 'published',
  },
];

const fetchMock = vi.fn();

function createRecipesResponse(items = recipeApiItems, page = 1, pageSize = 9, total = items.length) {
  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: total > 0 ? Math.ceil(total / pageSize) : 0,
    },
  };
}

function filterRecipesByUrl(url: string) {
  const queryString = url.split('?')[1] ?? '';
  const query = new URLSearchParams(queryString);
  const keyword = query.get('keyword')?.trim().toLowerCase() ?? '';
  const tag = query.get('tag');
  const sort = query.get('sort') ?? 'latest';
  const page = Number.parseInt(query.get('page') ?? '1', 10) || 1;
  const pageSize = Number.parseInt(query.get('pageSize') ?? '9', 10) || 9;

  const filteredItems = recipeApiItems
    .filter((recipe) => (keyword ? recipe.title.toLowerCase().includes(keyword) : true))
    .filter((recipe) => (tag ? recipe.tags.includes(tag) : true))
    .sort((left, right) => {
      const diff = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return sort === 'oldest' ? diff : -diff;
    });

  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  return createRecipesResponse(pagedItems, page, pageSize, filteredItems.length);
}

function createDeferredResponse() {
  let resolvePromise:
    | ((value: { ok: boolean; json: () => Promise<ReturnType<typeof filterRecipesByUrl>> }) => void)
    | null = null;
  const promise = new Promise<{ ok: boolean; json: () => Promise<ReturnType<typeof filterRecipesByUrl>> }>(
    (resolve) => {
      resolvePromise = resolve;
    },
  );

  return {
    promise,
    resolve(url: string) {
      resolvePromise?.({
        ok: true,
        json: async () => filterRecipesByUrl(url),
      });
    },
  };
}

function renderApp(
  initialEntries: Array<string | { pathname: string; state?: unknown }> = ['/recipes'],
) {
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

function getPaginationButton(name: string) {
  return screen.getAllByRole('button', { name })[0];
}

describe('RecipesPage', () => {
  beforeEach(() => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => ({
      ok: true,
      json: async () => filterRecipesByUrl(String(input)),
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('shows a one-time success message from route state', async () => {
    const { router } = renderApp([
      {
        pathname: '/recipes',
        state: {
          flashMessage: {
            type: 'success',
            text: '\u83dc\u8c31\u5df2\u5220\u9664\u3002',
          },
        },
      },
    ]);

    expect(await screen.findByText('Chocolate Mousse Cake')).toBeInTheDocument();
    expect(screen.getByText('\u83dc\u8c31\u5df2\u5220\u9664\u3002')).toBeInTheDocument();

    await waitFor(() => {
      expect(router.state.location.state).toBeNull();
    });
  });

  it('renders the recipes page on /recipes with pagination controls', async () => {
    renderApp();

    expect(screen.getByRole('heading', { level: 1, hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(await screen.findByText('Chocolate Mousse Cake')).toBeInTheDocument();
    expect(screen.getByText('Tomato Cheese Risotto')).toBeInTheDocument();
    expect(screen.queryByText('Tomato Bruschetta')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: secondPageLabel })).toBeInTheDocument();
  });

  it('navigates to the next page and requests page 2', async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByText('Chocolate Mousse Cake');
    await user.click(getPaginationButton(nextPageLabel));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/recipes?page=2&pageSize=9&sort=latest',
        expect.any(Object),
      );
    });

    expect(await screen.findByText('Tomato Bruschetta')).toBeInTheDocument();
    expect(screen.getByText('Miso Tofu Soup')).toBeInTheDocument();
    expect(screen.queryByText('Chocolate Mousse Cake')).not.toBeInTheDocument();
  });

  it('resets to page 1 when category changes after paging', async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByText('Chocolate Mousse Cake');
    await user.click(getPaginationButton(nextPageLabel));
    await screen.findByText('Tomato Bruschetta');
    await user.click(screen.getByRole('button', { name: recipeCategories[4] }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/recipes?page=1&pageSize=9&sort=latest&tag=%E6%B1%A4%E7%B1%BB',
        expect.any(Object),
      );
    });

    expect(await screen.findByText('Corn Soup')).toBeInTheDocument();
    expect(screen.getByText('Pumpkin Soup')).toBeInTheDocument();
  });

  it('resets to page 1 when search changes', async () => {
    const user = userEvent.setup();
    renderApp();

    await screen.findByText('Chocolate Mousse Cake');
    await user.click(getPaginationButton(nextPageLabel));
    await screen.findByText('Tomato Bruschetta');
    await user.type(screen.getByRole('searchbox'), 'pumpkin');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenLastCalledWith(
        '/api/recipes?page=1&pageSize=9&sort=latest&keyword=pumpkin',
        expect.any(Object),
      );
    });

    expect(await screen.findByText('Pumpkin Soup')).toBeInTheDocument();
    expect(screen.queryByText('Tomato Bruschetta')).not.toBeInTheDocument();
  });

  it('keeps the current cards visible while refreshing filtered results', async () => {
    const user = userEvent.setup();
    const deferredResponse = createDeferredResponse();

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('tag=%E6%B1%A4%E7%B1%BB')) {
        return deferredResponse.promise;
      }

      return {
        ok: true,
        json: async () => filterRecipesByUrl(url),
      };
    });

    renderApp();

    await screen.findByText('Chocolate Mousse Cake');
    await user.click(screen.getByRole('button', { name: recipeCategories[4] }));

    expect(screen.getByText('Chocolate Mousse Cake')).toBeInTheDocument();
    expect(screen.getByText(refreshingLabel)).toBeInTheDocument();

    deferredResponse.resolve('/api/recipes?page=1&pageSize=9&sort=latest&tag=%E6%B1%A4%E7%B1%BB');

    expect(await screen.findByText('Corn Soup')).toBeInTheDocument();
    expect(screen.queryByText('Chocolate Mousse Cake')).not.toBeInTheDocument();
  });

  it('navigates to the recipe detail page when a card is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderApp();

    await screen.findByText('Chocolate Mousse Cake');

    const targetCard = getRecipeCardButtons().find(
      (button) => button.querySelector('h2')?.textContent === 'Chocolate Mousse Cake',
    );

    expect(targetCard).toBeDefined();

    await user.click(targetCard as HTMLElement);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/recipes/chocolate-mousse-cake');
    });
  });
});
