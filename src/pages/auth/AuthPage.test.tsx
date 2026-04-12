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
    const { container } = renderApp();

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
    expect(container.querySelectorAll('input:not([type="checkbox"])')).toHaveLength(2);
  });

  it('switches to register mode when the second tab is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderApp();

    await user.click(screen.getAllByRole('tab')[1]);

    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true');
    expect(container.querySelectorAll('input:not([type="checkbox"])')).toHaveLength(4);
  });

  it('does not navigate away when the login form is empty', async () => {
    const user = userEvent.setup();
    const { container } = renderApp();
    const submitButton = container.querySelector('form button[type="submit"]');

    if (!(submitButton instanceof HTMLButtonElement)) {
      throw new Error('Expected login submit button');
    }

    await user.click(submitButton);

    await new Promise((resolve) => window.setTimeout(resolve, 300));

    expect(screen.queryByRole('heading', { name: '菜谱列表' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('navigates to recipes after successful login submit', async () => {
    const user = userEvent.setup();
    const { container } = renderApp();
    const textInputs = Array.from(
      container.querySelectorAll<HTMLInputElement>('input:not([type="checkbox"])'),
    );
    const submitButton = container.querySelector('form button[type="submit"]');

    if (textInputs.length !== 2 || !(submitButton instanceof HTMLButtonElement)) {
      throw new Error('Expected login form inputs');
    }

    await user.type(textInputs[0], 'cookbook');
    await user.type(textInputs[1], 'secret123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '菜谱列表' })).toBeInTheDocument();
    });
  });
});
