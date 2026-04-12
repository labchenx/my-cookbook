import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from '../../app/AppRoutes';

function renderApp(initialEntries: string[] = ['/login']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe('AuthPage', () => {
  it('renders login mode by default on /login', () => {
    renderApp();

    expect(screen.getByRole('heading', { name: '我的菜谱库' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '登录', selected: true })).toBeInTheDocument();
    expect(screen.getByLabelText('账号')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
  });

  it('switches to register mode when register tab is clicked', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('tab', { name: '注册' }));

    expect(screen.getByRole('tab', { name: '注册', selected: true })).toBeInTheDocument();
    expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    expect(screen.getByLabelText('邮箱')).toBeInTheDocument();
    expect(screen.getByLabelText('确认密码')).toBeInTheDocument();
  });

  it('shows validation errors for empty login fields', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(screen.getByText('请输入邮箱或用户名')).toBeInTheDocument();
    expect(screen.getByText('请输入密码')).toBeInTheDocument();
  });

  it('prevents register submit when passwords do not match', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('tab', { name: '注册' }));
    await user.type(screen.getByLabelText('用户名'), 'chef');
    await user.type(screen.getByLabelText('邮箱'), 'chef@example.com');
    await user.type(screen.getByLabelText('密码'), 'secret123');
    await user.type(screen.getByLabelText('确认密码'), 'secret321');
    await user.click(screen.getByRole('button', { name: '注册' }));

    expect(screen.getByText('两次输入的密码不一致')).toBeInTheDocument();
  });

  it('navigates to recipes after successful login submit', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByLabelText('账号'), 'cookbook');
    await user.type(screen.getByLabelText('密码'), 'secret123');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '菜谱列表' })).toBeInTheDocument();
    });
  });
});
