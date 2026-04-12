import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../app/AppRoutes';

function renderApp(initialEntries: string[] = ['/recipes/new']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('CreateRecipePage', () => {
  it('renders manual mode by default', () => {
    renderApp();

    expect(screen.getByRole('heading', { name: '创建菜谱' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '手动编辑' })).toBeInTheDocument();
    expect(screen.getByText('基本信息')).toBeInTheDocument();
    expect(screen.getByLabelText('菜谱标题')).toBeInTheDocument();
  });

  it('switches to parse mode and shows parse success message', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: '链接解析' }));
    await user.click(screen.getByRole('button', { name: '解析' }));

    await waitFor(() => {
      expect(screen.getByText('链接解析成功，后续可在这里填充自动识别结果。')).toBeInTheDocument();
    });
  });

  it('supports adding and removing ingredients', async () => {
    const user = userEvent.setup();
    renderApp();

    expect(screen.getAllByPlaceholderText('配料名称')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: '添加配料' }));
    expect(screen.getAllByPlaceholderText('配料名称')).toHaveLength(2);

    await user.click(screen.getAllByLabelText('删除配料')[1]);
    expect(screen.getAllByPlaceholderText('配料名称')).toHaveLength(1);
  });

  it('supports adding and removing steps', async () => {
    const user = userEvent.setup();
    renderApp();

    expect(screen.getAllByPlaceholderText('描述这一步的操作...')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: '添加步骤' }));
    expect(screen.getAllByPlaceholderText('描述这一步的操作...')).toHaveLength(2);

    await user.click(screen.getByLabelText('删除步骤 2'));
    expect(screen.getAllByPlaceholderText('描述这一步的操作...')).toHaveLength(1);
  });

  it('navigates back to recipes when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: '取消' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '菜谱列表' })).toBeInTheDocument();
    });
  });
});
