import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppRoutes } from '../../app/AppRoutes';

function renderApp(initialEntries: string[] = ['/login']) {
  const router = createMemoryRouter([{ path: '*', element: <AppRoutes /> }], {
    initialEntries,
  });

  return {
    router,
    ...render(<RouterProvider router={router} />),
  };
}

describe('Auth routes disabled in phase one', () => {
  it('redirects /login to /recipes', async () => {
    const { router } = renderApp();

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/recipes');
    });

    expect(screen.getByRole('heading', { name: '菜谱列表' })).toBeInTheDocument();
  });

  it('redirects unknown routes to /recipes', async () => {
    const { router } = renderApp(['/unknown']);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/recipes');
    });

    expect(screen.getByRole('heading', { name: '菜谱列表' })).toBeInTheDocument();
  });
});
