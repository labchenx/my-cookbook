import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { AppRoutes } from '../../app/AppRoutes';
import { RecipeDetailPage } from './RecipeDetailPage';

const fetchMock = vi.fn();
const confirmMock = vi.fn(() => true);

function createRecipeDetailResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'chocolate-mousse-cake',
    title: 'Chocolate Mousse Cake',
    description: 'Silky chocolate mousse with a smooth finish.',
    coverImage: '/assets/recipes/cover-chocolate-mousse.png',
    category: 'dessert',
    tags: ['\u751c\u54c1', '\u7b80\u5355', '\u70d8\u7119'],
    ingredientsJson: {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Dark chocolate - 200g' }],
                },
              ],
            },
          ],
        },
      ],
    },
    ingredientsHtml: '<ul><li>Dark chocolate - 200g</li></ul>',
    ingredientsText: '- \u9ed1\u5de7\u514b\u529b - 200g\n- \u6de1\u5976\u6cb9 - 300ml\n- \u9e21\u86cb - 3\u4e2a',
    stepsJson: {
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Melt the chocolate.' }],
                },
              ],
            },
          ],
        },
      ],
    },
    stepsHtml: '<ol><li>Melt the chocolate.</li></ol>',
    stepsText:
      '1. \u5c06\u9ed1\u5de7\u514b\u529b\u9694\u6c34\u878d\u5316\u3002\n2. \u6de1\u5976\u6cb9\u6253\u53d1\u81f3\u516d\u6210\u3002\n3. \u51b7\u85cf 4 \u5c0f\u65f6\u4ee5\u4e0a\u3002',
    sourceUrl: null,
    sourceType: 'manual',
    parseStatus: 'success',
    status: 'published',
    createdAt: '2026-04-12T10:00:00+08:00',
    updatedAt: '2026-04-12T12:00:00+08:00',
    ...overrides,
  };
}

function createRecipesListResponse() {
  return {
    items: [
      {
        id: 'corn-soup',
        title: 'Corn Soup',
        description: 'Warm and comforting sweet corn soup.',
        coverImage: '/assets/recipes/cover-corn-soup.png',
        tags: ['\u6c64\u7c7b', 'nutrition'],
        createdAt: '2026-04-12T07:00:00+08:00',
        status: 'published',
      },
    ],
    pagination: {
      page: 1,
      pageSize: 9,
      total: 1,
      totalPages: 1,
    },
  };
}

function createFetchResponse(body?: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function renderApp(
  initialEntries: string[] = ['/recipes/chocolate-mousse-cake'],
  initialIndex?: number,
) {
  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('RecipeDetailPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', confirmMock);
    confirmMock.mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    confirmMock.mockReset();
  });

  it('renders the recipe detail structure from the API', async () => {
    fetchMock.mockResolvedValue(createFetchResponse(createRecipeDetailResponse()));
    renderApp();

    expect(screen.getByText('\u6b63\u5728\u52a0\u8f7d\u83dc\u8c31...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Chocolate Mousse Cake' })).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/recipes/chocolate-mousse-cake',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByRole('heading', { name: '\u914d\u6599\u6e05\u5355' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '\u5236\u4f5c\u6b65\u9aa4' })).toBeInTheDocument();
    expect(screen.getByTestId('desktop-ingredients-card')).toHaveClass('lg:sticky', 'lg:top-8');
    expect(screen.getByText('\u9ed1\u5de7\u514b\u529b')).toBeInTheDocument();
    expect(screen.getByText('200g')).toBeInTheDocument();

    const stepsContent = screen.getByTestId('recipe-steps-content');
    expect(stepsContent).toHaveTextContent('Melt the chocolate.');
    expect(stepsContent.querySelector('ol')).not.toBeNull();
    expect(screen.getByText('2\u5c0f\u65f6\u524d')).toBeInTheDocument();
  });

  it('shows the mobile ingredients panel as a floating dropdown', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(createFetchResponse(createRecipeDetailResponse()));
    renderApp();

    await screen.findByRole('heading', { name: 'Chocolate Mousse Cake' });

    const toggleButton = screen.getByRole('button', { name: /\u914d\u6599\u6e05\u5355/ });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: '\u79fb\u52a8\u7aef\u914d\u6599\u6e05\u5355' })).not.toBeInTheDocument();

    await user.click(toggleButton);

    const floatingPanel = screen.getByRole('region', { name: '\u79fb\u52a8\u7aef\u914d\u6599\u6e05\u5355' });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(floatingPanel).toHaveClass('absolute', 'top-full', 'z-40');
    expect(floatingPanel).toHaveTextContent('\u5171 3 \u9879');

    await user.click(within(floatingPanel).getByRole('button', { name: '\u6536\u8d77' }));

    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: '\u79fb\u52a8\u7aef\u914d\u6599\u6e05\u5355' })).not.toBeInTheDocument();
  });

  it('falls back gracefully when structured text fields are empty', async () => {
    fetchMock.mockResolvedValue(
      createFetchResponse(
        createRecipeDetailResponse({
          ingredientsJson: null,
          ingredientsText: null,
          stepsHtml: null,
          stepsJson: null,
          stepsText: null,
        }),
      ),
    );
    renderApp();

    expect(await screen.findByRole('heading', { name: 'Chocolate Mousse Cake' })).toBeInTheDocument();
    expect(screen.getByText('\u6682\u65e0\u914d\u6599\u4fe1\u606f')).toBeInTheDocument();
    expect(screen.getByText('\u6682\u65e0\u6b65\u9aa4\u5185\u5bb9')).toBeInTheDocument();
  });

  it('renders empty state when the API returns 404', async () => {
    fetchMock.mockResolvedValue(createFetchResponse(undefined, 404));
    renderApp(['/recipes/missing']);

    expect(await screen.findByRole('heading', { name: '\u672a\u627e\u5230\u8fd9\u4e2a\u83dc\u8c31' })).toBeInTheDocument();
  });

  it('renders error state when recipe loading fails', async () => {
    fetchMock.mockRejectedValue(new Error('boom'));
    renderApp(['/recipes/error']);

    expect(await screen.findByRole('heading', { name: '\u52a0\u8f7d\u5931\u8d25' })).toBeInTheDocument();
  });

  it('navigates back when there is browser history', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith('/api/recipes?')) {
        return createFetchResponse(createRecipesListResponse());
      }

      return createFetchResponse(createRecipeDetailResponse());
    });

    renderApp(['/recipes', '/recipes/chocolate-mousse-cake'], 1);

    expect(await screen.findByRole('heading', { name: 'Chocolate Mousse Cake' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '\u8fd4\u56de\u5217\u8868' }));

    expect(await screen.findByRole('heading', { name: '\u83dc\u8c31\u5217\u8868', hidden: true })).toBeInTheDocument();
  });

  it('does not render the edit action in the detail header', async () => {
    fetchMock.mockResolvedValue(createFetchResponse(createRecipeDetailResponse()));
    renderApp();

    await screen.findByRole('heading', { name: 'Chocolate Mousse Cake' });
    expect(screen.queryByRole('button', { name: '\u7f16\u8f91\u83dc\u8c31' })).not.toBeInTheDocument();
  });

  it('does not delete when the user cancels the confirmation', async () => {
    const user = userEvent.setup();
    confirmMock.mockReturnValue(false);
    fetchMock.mockResolvedValue(createFetchResponse(createRecipeDetailResponse()));
    renderApp();

    await screen.findByRole('heading', { name: 'Chocolate Mousse Cake' });
    await user.click(screen.getByRole('button', { name: '\u5220\u9664\u83dc\u8c31' }));

    expect(confirmMock).toHaveBeenCalledWith(
      '\u786e\u8ba4\u5220\u9664\u8fd9\u9053\u83dc\u8c31\u5417\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u6062\u590d\u3002',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('deletes the recipe and navigates back to the list with a success message', async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/recipes/chocolate-mousse-cake' && init?.method === 'DELETE') {
        return createFetchResponse({ success: true });
      }

      if (url.startsWith('/api/recipes?')) {
        return createFetchResponse(createRecipesListResponse());
      }

      return createFetchResponse(createRecipeDetailResponse());
    });

    renderApp();

    await screen.findByRole('heading', { name: 'Chocolate Mousse Cake' });
    await user.click(screen.getByRole('button', { name: '\u5220\u9664\u83dc\u8c31' }));

    expect(await screen.findByRole('heading', { name: '\u83dc\u8c31\u5217\u8868', hidden: true })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/recipes/chocolate-mousse-cake',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(screen.getByText('\u83dc\u8c31\u5df2\u5220\u9664\u3002')).toBeInTheDocument();
  });

  it('navigates back to the list when the recipe is already missing', async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/recipes/chocolate-mousse-cake' && init?.method === 'DELETE') {
        return createFetchResponse(undefined, 404);
      }

      if (url.startsWith('/api/recipes?')) {
        return createFetchResponse(createRecipesListResponse());
      }

      return createFetchResponse(createRecipeDetailResponse());
    });

    renderApp();

    await screen.findByRole('heading', { name: 'Chocolate Mousse Cake' });
    await user.click(screen.getByRole('button', { name: '\u5220\u9664\u83dc\u8c31' }));

    expect(await screen.findByRole('heading', { name: '\u83dc\u8c31\u5217\u8868', hidden: true })).toBeInTheDocument();
    expect(screen.getByText('\u83dc\u8c31\u5df2\u4e0d\u5b58\u5728\uff0c\u5df2\u8fd4\u56de\u5217\u8868\u3002')).toBeInTheDocument();
  });

  it('keeps the user on the detail page and shows an error when delete fails', async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/recipes/chocolate-mousse-cake' && init?.method === 'DELETE') {
        return createFetchResponse(undefined, 500);
      }

      return createFetchResponse(createRecipeDetailResponse());
    });

    renderApp();

    await screen.findByRole('heading', { name: 'Chocolate Mousse Cake' });
    await user.click(screen.getByRole('button', { name: '\u5220\u9664\u83dc\u8c31' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '\u5220\u9664\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
    );
    expect(screen.getByRole('heading', { name: 'Chocolate Mousse Cake' })).toBeInTheDocument();
  });

  it('disables the delete action while the delete request is in flight', async () => {
    const user = userEvent.setup();
    let resolveDelete: ((value: ReturnType<typeof createFetchResponse>) => void) | undefined;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/recipes/chocolate-mousse-cake' && init?.method === 'DELETE') {
        return new Promise((resolve) => {
          resolveDelete = resolve;
        });
      }

      if (url.startsWith('/api/recipes?')) {
        return Promise.resolve(createFetchResponse(createRecipesListResponse()));
      }

      return Promise.resolve(createFetchResponse(createRecipeDetailResponse()));
    });

    renderApp();

    await screen.findByRole('heading', { name: 'Chocolate Mousse Cake' });
    const deleteButton = screen.getByRole('button', { name: '\u5220\u9664\u83dc\u8c31' });

    await user.click(deleteButton);

    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute('aria-busy', 'true');

    resolveDelete?.(createFetchResponse({ success: true }));
    expect(await screen.findByRole('heading', { name: '\u83dc\u8c31\u5217\u8868', hidden: true })).toBeInTheDocument();
  });

  it('shows loading again when the route parameter changes', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const id = String(input).split('/').pop();

      if (id === 'missing') {
        return createFetchResponse(undefined, 404);
      }

      return createFetchResponse(
        createRecipeDetailResponse({
          id,
          title: id === 'corn-soup' ? 'Corn Soup' : 'Chocolate Mousse Cake',
          createdAt: '2026-04-12T07:00:00+08:00',
        }),
      );
    });

    const router = createMemoryRouter(
      [
        {
          path: '/recipes/:id',
          element: <RecipeDetailPage />,
        },
      ],
      {
        initialEntries: ['/recipes/missing'],
      },
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByText('\u6b63\u5728\u52a0\u8f7d\u83dc\u8c31...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '\u672a\u627e\u5230\u8fd9\u4e2a\u83dc\u8c31' })).toBeInTheDocument();

    await act(async () => {
      await router.navigate('/recipes/corn-soup');
    });

    expect(await screen.findByRole('heading', { name: 'Corn Soup' })).toBeInTheDocument();
    expect(screen.getByText('5\u5c0f\u65f6\u524d')).toBeInTheDocument();
  });

  it('redirects the legacy edit route back to recipe detail', async () => {
    fetchMock.mockResolvedValue(createFetchResponse(createRecipeDetailResponse()));
    renderApp(['/recipes/chocolate-mousse-cake/edit']);

    expect(await screen.findByRole('heading', { name: 'Chocolate Mousse Cake' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '\u7f16\u8f91\u83dc\u8c31' })).not.toBeInTheDocument();
  });
});
