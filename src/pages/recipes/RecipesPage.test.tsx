import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../app/AppRoutes';

function renderApp(initialEntries: string[] = ['/recipes']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('RecipesPage', () => {
  it('renders the recipes page on /recipes', () => {
    renderApp();

    expect(screen.getByRole('heading', { name: '菜谱列表' })).toBeInTheDocument();
    expect(screen.getByLabelText('搜索菜谱')).toBeInTheDocument();
    expect(screen.getByText('巧克力慕斯蛋糕')).toBeInTheDocument();
    expect(screen.getByText('烤三文鱼配芦笋')).toBeInTheDocument();
  });

  it('filters recipes by title search', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByLabelText('搜索菜谱'), '南瓜');

    expect(screen.getByText('南瓜浓汤')).toBeInTheDocument();
    expect(screen.queryByText('巧克力慕斯蛋糕')).not.toBeInTheDocument();
  });

  it('filters recipes by category', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: '汤类' }));

    expect(screen.getByText('香草玉米浓汤')).toBeInTheDocument();
    expect(screen.getByText('南瓜浓汤')).toBeInTheDocument();
    expect(screen.queryByText('奶油蘑菇意面')).not.toBeInTheDocument();
  });

  it('sorts recipes by oldest first', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: '最早' }));

    const cards = screen.getAllByRole('button', { name: /查看菜谱：/ });
    expect(cards[0]).toHaveAccessibleName('查看菜谱：烤三文鱼配芦笋');
  });

  it('navigates to the recipe detail placeholder when a card is clicked', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: '查看菜谱：巧克力慕斯蛋糕' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '菜谱详情' })).toBeInTheDocument();
    });
  });

  it('navigates to the new recipe placeholder when the floating button is clicked', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: '新建菜谱' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '创建菜谱' })).toBeInTheDocument();
    });
  });
});
