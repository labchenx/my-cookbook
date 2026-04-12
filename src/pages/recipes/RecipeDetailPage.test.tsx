import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router-dom';
import { AppRoutes } from '../../app/AppRoutes';
import { RecipeDetailPage } from './RecipeDetailPage';

function renderApp(initialEntries: string[] = ['/recipes/1'], initialIndex?: number) {
  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('RecipeDetailPage', () => {
  it('renders recipe detail content for a valid id', async () => {
    renderApp();

    expect(screen.getByText('正在加载菜谱...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '巧克力慕斯蛋糕' })).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: '配料清单' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '制作步骤' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '小贴士' })).toBeInTheDocument();
    expect(screen.getAllByText('30分钟')[0]).toBeInTheDocument();
  });

  it('renders empty state for an unknown recipe id', async () => {
    renderApp(['/recipes/missing']);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '未找到这个菜谱' })).toBeInTheDocument();
    });
  });

  it('renders error state when recipe loading fails', async () => {
    renderApp(['/recipes/error']);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '加载失败' })).toBeInTheDocument();
    });
  });

  it('navigates back when there is browser history', async () => {
    const user = userEvent.setup();
    renderApp(['/recipes', '/recipes/1'], 1);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '巧克力慕斯蛋糕' })).toBeInTheDocument();
    });

    await user.click(screen.getAllByRole('button')[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '菜谱列表' })).toBeInTheDocument();
    });
  });

  it('navigates to the edit route from the edit action', async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => {
      expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    await user.click(screen.getAllByRole('button')[1]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '编辑菜谱' })).toBeInTheDocument();
    });
  });

  it('triggers the delete placeholder handler', async () => {
    const user = userEvent.setup();
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    renderApp();

    await waitFor(() => {
      expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    await user.click(screen.getAllByRole('button')[2]);

    expect(infoSpy).toHaveBeenCalledWith('Delete recipe placeholder', '1');
    infoSpy.mockRestore();
  });

  it('shows loading again when the route parameter changes', async () => {
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

    expect(screen.getByText('正在加载菜谱...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '未找到这个菜谱' })).toBeInTheDocument();
    });

    await act(async () => {
      await router.navigate('/recipes/1');
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '巧克力慕斯蛋糕' })).toBeInTheDocument();
    });
  });
});
