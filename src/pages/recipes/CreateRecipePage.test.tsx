import { render, screen, waitFor, within } from '@testing-library/react';
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
  it('renders manual mode with rich text editors by default', () => {
    renderApp();

    expect(screen.getByRole('heading', { name: '创建菜谱' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '手动编辑' })).toBeInTheDocument();
    expect(screen.getByText('基本信息')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '菜谱标题' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '配料列表' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '制作步骤' })).toBeInTheDocument();
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

  it('updates the rich text draft and preserves formatting commands', async () => {
    const user = userEvent.setup();
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    renderApp();

    const ingredientSection = screen.getByRole('heading', { name: '配料列表' }).closest('section');
    const stepSection = screen.getByRole('heading', { name: '制作步骤' }).closest('section');

    if (!ingredientSection || !stepSection) {
      throw new Error('Expected rich text sections');
    }

    const ingredientEditor = within(ingredientSection).getByRole('textbox', { name: '配料列表' });
    const stepEditor = within(stepSection).getByRole('textbox', { name: '制作步骤' });

    await user.click(within(ingredientSection).getByRole('button', { name: '加粗' }));
    await user.click(ingredientEditor);
    await user.type(ingredientEditor, 'egg - 2');
    await user.click(stepEditor);
    await user.type(stepEditor, 'step 1');

    await user.click(screen.getByRole('button', { name: '发布' }));

    expect(infoSpy).toHaveBeenCalledWith(
      'publish recipe',
      expect.objectContaining({
        ingredientsRichText: expect.stringMatching(/^<p><strong>.+<\/strong><\/p>$/),
        stepsRichText: expect.stringMatching(/^<p>.+<\/p>$/),
      }),
    );
    infoSpy.mockRestore();
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
