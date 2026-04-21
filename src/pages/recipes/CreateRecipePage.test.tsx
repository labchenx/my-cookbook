import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppRoutes } from '../../app/AppRoutes';

const fetchMock = vi.fn();
const createObjectUrlMock = vi.fn();
const revokeObjectUrlMock = vi.fn();
const consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => undefined);
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const originalEventSource = globalThis.EventSource;

class MockEventSource {
  static instances: MockEventSource[] = [];

  readonly url: string;
  readonly listeners = new Map<string, Set<(event: Event) => void>>();
  onerror: ((event: Event) => void) | null = null;
  readyState = 1;

  constructor(url: string | URL) {
    this.url = String(url);
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: (event: Event) => void) {
    const current = this.listeners.get(type) ?? new Set<(event: Event) => void>();
    current.add(listener);
    this.listeners.set(type, current);
  }

  removeEventListener(type: string, listener: (event: Event) => void) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.readyState = 2;
  }

  emit(type: string, payload: unknown) {
    const event = {
      type,
      data: JSON.stringify(payload),
    } as MessageEvent<string>;

    this.listeners.get(type)?.forEach((listener) => listener(event));
  }

  emitTransportError() {
    const event = { type: 'error' } as Event;
    this.onerror?.(event);
  }

  static reset() {
    MockEventSource.instances = [];
  }

  static last() {
    const instance = MockEventSource.instances[MockEventSource.instances.length - 1];

    if (!instance) {
      throw new Error('Expected an active EventSource instance.');
    }

    return instance;
  }
}

function createFetchResponse(body?: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function createRecipeResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'created-recipe',
    title: 'Created Recipe',
    description: null,
    coverImage: '/assets/recipes/cover-salad.png',
    category: '瀹跺父鑿?',
    tags: ['瀹跺父鑿?'],
    ingredientsJson: { type: 'doc', content: [] },
    ingredientsHtml: '<p>ingredient</p>',
    ingredientsText: 'ingredient',
    stepsJson: { type: 'doc', content: [] },
    stepsHtml: '<p>step</p>',
    stepsText: 'step',
    sourceUrl: null,
    sourceType: 'manual',
    parseStatus: 'none',
    status: 'published',
    createdAt: '2026-04-20T10:00:00.000Z',
    updatedAt: '2026-04-20T10:00:00.000Z',
    ...overrides,
  };
}

function createRecipesResponse() {
  return {
    items: [],
    pagination: {
      page: 1,
      pageSize: 9,
      total: 0,
      totalPages: 0,
    },
  };
}

function createDeferredResponse() {
  let resolvePromise:
    | ((value: { ok: boolean; status: number; json: () => Promise<unknown> }) => void)
    | null = null;

  const promise = new Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>(
    (resolve) => {
      resolvePromise = resolve;
    },
  );

  return {
    promise,
    resolve(body?: unknown, status = 200) {
      resolvePromise?.({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
      });
    },
  };
}

function createDefaultFetchImplementation() {
  return async (input: string, init?: RequestInit) => {
    if (input === '/api/uploads/recipe-image' && init?.method === 'POST') {
      const payload = JSON.parse(String(init.body ?? '{}')) as Record<string, unknown>;

      return createFetchResponse(
        {
          fileName: 'uploaded-cover.png',
          url: '/assets/recipes/uploaded-cover.png',
          originalFileName: payload.fileName,
        },
        201,
      );
    }

    if (input === '/api/recipes' && init?.method === 'POST') {
      const payload = JSON.parse(String(init.body ?? '{}')) as Record<string, unknown>;
      const id = payload.status === 'published' ? 'published-created-recipe' : 'draft-created-recipe';

      return createFetchResponse(
        createRecipeResponse({
          id,
          title: payload.title,
          coverImage: payload.coverImage ?? null,
          category: payload.category,
          tags: payload.tags,
          ingredientsJson: payload.ingredientsJson,
          ingredientsHtml: payload.ingredientsHtml,
          ingredientsText: payload.ingredientsText,
          stepsJson: payload.stepsJson,
          stepsHtml: payload.stepsHtml,
          stepsText: payload.stepsText,
          status: payload.status,
        }),
      );
    }

    if (input === '/api/parsing/douyin/sessions' && init?.method === 'POST') {
      return createFetchResponse({ sessionId: 'parse-session-1' }, 201);
    }

    if (input.startsWith('/api/recipes/')) {
      const id = input.split('/').pop() ?? 'draft-created-recipe';

      return createFetchResponse(
        createRecipeResponse({
          id,
          title: 'Draft Created Recipe',
          status: 'draft',
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
                        content: [{ type: 'text', text: 'step 1' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          stepsText: null,
        }),
      );
    }

    if (input.startsWith('/api/recipes?')) {
      return createFetchResponse(createRecipesResponse());
    }

    throw new Error(`Unexpected fetch call: ${input}`);
  };
}

function renderApp(initialEntries: string[] = ['/recipes/new']) {
  const router = createMemoryRouter([{ path: '*', element: <AppRoutes /> }], {
    initialEntries,
  });

  return {
    router,
    ...render(<RouterProvider router={router} />),
  };
}

function getJsonRequestBody(url: string) {
  const requestCall = fetchMock.mock.calls.find(([input]) => input === url);

  if (!requestCall) {
    throw new Error(`Expected ${url} call`);
  }

  return JSON.parse(String((requestCall[1] as RequestInit).body ?? '{}')) as Record<string, unknown>;
}

async function openParseSection(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '链接解析' }));

  const parseInput = await screen.findByPlaceholderText('https://example.com/recipe/123');
  const parseSection = parseInput.closest('section');

  if (!parseSection) {
    throw new Error('Expected parse section to be available.');
  }

  const parseSectionQueries = within(parseSection);
  await user.type(parseInput, 'https://example.com/recipe/123');

  return parseSectionQueries;
}

function emitSuccessfulParseFlow() {
  const stream = MockEventSource.last();

  stream.emit('stage', {
    type: 'stage',
    stage: 'parse_link',
    message: '正在解析抖音分享链接...',
    progress: 8,
    createdAt: '2026-04-21T10:00:00.000Z',
  });
  stream.emit('progress', {
    type: 'progress',
    stage: 'transcribe',
    message: '正在识别视频文案...',
    progress: 82,
    createdAt: '2026-04-21T10:00:02.000Z',
  });
  stream.emit('result', {
    type: 'result',
    text: '鎶栭煶瑙嗛瑙ｆ瀽鍚庣殑鍘熷鏂囨',
    createdAt: '2026-04-21T10:00:03.000Z',
  });
  stream.emit('done', {
    type: 'done',
    status: 'completed',
    createdAt: '2026-04-21T10:00:04.000Z',
  });
}

describe('CreateRecipePage', () => {
  beforeEach(() => {
    fetchMock.mockImplementation(createDefaultFetchImplementation());
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('EventSource', MockEventSource as unknown as typeof EventSource);
    createObjectUrlMock.mockReset();
    revokeObjectUrlMock.mockReset();
    consoleLogMock.mockClear();
    MockEventSource.reset();
    createObjectUrlMock.mockImplementation((file: File) => `blob:${file.name}`);
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectUrlMock,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: originalCreateObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: originalRevokeObjectURL,
    });

    if (originalEventSource) {
      Object.defineProperty(globalThis, 'EventSource', {
        configurable: true,
        writable: true,
        value: originalEventSource,
      });
    }
  });

  afterAll(() => {
    consoleLogMock.mockRestore();
  });

  it('renders manual mode with rich text editors by default', () => {
    renderApp();

    expect(screen.getByRole('heading', { name: '创建菜谱' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '手动编辑' })).toBeInTheDocument();
    expect(screen.getByText('基本信息')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '菜谱标题' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '配料列表' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '制作步骤' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '保存草稿' })).not.toBeInTheDocument();
  });

  it('switches to parse mode and shows parse success feedback from the SSE stream', async () => {
    const user = userEvent.setup();
    renderApp();

    const parseSection = await openParseSection(user);
    await user.click(parseSection.getByRole('button', { name: '解析' }));
    emitSuccessfulParseFlow();

    await waitFor(() => {
      expect(screen.getByText('解析成功，结果已输出到控制台。')).toBeInTheDocument();
    });
    expect(screen.getByText('解析完成')).toBeInTheDocument();
  });

  it('posts the Douyin url, opens the SSE stream, and logs the parsed text', async () => {
    const user = userEvent.setup();
    renderApp();

    const parseSection = await openParseSection(user);
    await user.click(parseSection.getByRole('button', { name: '解析' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/parsing/douyin/sessions',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(getJsonRequestBody('/api/parsing/douyin/sessions')).toEqual({
      url: 'https://example.com/recipe/123',
    });
    expect(MockEventSource.last().url).toBe('/api/parsing/douyin/sessions/parse-session-1/events');

    emitSuccessfulParseFlow();

    await waitFor(() => {
      expect(consoleLogMock).toHaveBeenCalledWith('[douyin-parse]', '鎶栭煶瑙嗛瑙ｆ瀽鍚庣殑鍘熷鏂囨');
    });
  });

  it('shows the API error message when session creation fails', async () => {
    const user = userEvent.setup();

    fetchMock.mockImplementation(async (input: string, init?: RequestInit) => {
      if (input === '/api/parsing/douyin/sessions' && init?.method === 'POST') {
        return createFetchResponse({ message: 'Douyin parser API key is not configured.' }, 500);
      }

      return createDefaultFetchImplementation()(input, init);
    });

    renderApp();

    const parseSection = await openParseSection(user);
    await user.click(parseSection.getByRole('button', { name: '解析' }));

    expect(await screen.findByText('Douyin parser API key is not configured.')).toBeInTheDocument();
    expect(consoleLogMock).not.toHaveBeenCalled();
  });

  it('shows streamed error events when parsing fails', async () => {
    const user = userEvent.setup();
    renderApp();

    const parseSection = await openParseSection(user);
    await user.click(parseSection.getByRole('button', { name: '解析' }));

    MockEventSource.last().emit('error', {
      type: 'error',
      stage: 'failed',
      message: 'SSL failure',
      createdAt: '2026-04-21T10:00:03.000Z',
    });

    expect(await screen.findByText('SSL failure')).toBeInTheDocument();
    expect(consoleLogMock).not.toHaveBeenCalled();
  });

  it('shows parse_error events and does not hide the failure after done', async () => {
    const user = userEvent.setup();
    renderApp();

    const parseSection = await openParseSection(user);
    await user.click(parseSection.getByRole('button', { name: '解析' }));

    MockEventSource.last().emit('parse_error', {
      type: 'parse_error',
      stage: 'failed',
      message: '读取音频失败，请检查 FFmpeg。',
      createdAt: '2026-04-21T10:00:03.000Z',
    });
    MockEventSource.last().emit('done', {
      type: 'done',
      status: 'failed',
      createdAt: '2026-04-21T10:00:04.000Z',
    });

    expect(await screen.findByText('读取音频失败，请检查 FFmpeg。')).toBeInTheDocument();
    expect(consoleLogMock).not.toHaveBeenCalled();
  });

  it('disables parsing while the stream is active and resets progress when the url changes', async () => {
    const user = userEvent.setup();
    renderApp();

    const parseSection = await openParseSection(user);
    const parseButton = parseSection.getByRole('button', { name: '解析' });
    const parseInput = parseSection.getByPlaceholderText('https://example.com/recipe/123');

    await user.click(parseButton);

    MockEventSource.last().emit('progress', {
      type: 'progress',
      stage: 'transcribe',
      message: '正在识别视频文案...',
      progress: 82,
      createdAt: '2026-04-21T10:00:02.000Z',
    });

    expect(await screen.findByText('识别文案')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '解析中...' })).toBeDisabled();

    await user.clear(parseInput);
    await user.type(parseInput, 'https://example.com/recipe/456');

    await waitFor(() => {
      expect(screen.queryByText('识别文案')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '解析' })).toBeEnabled();
  });

  it('uploads a cover image before submitting the recipe', async () => {
    const user = userEvent.setup();
    renderApp();

    const fileInput = screen.getByLabelText('上传图片', { selector: 'input' });
    const imageFile = new File(['image-bytes'], 'my-cover.png', { type: 'image/png' });

    await user.upload(fileInput, imageFile);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/uploads/recipe-image',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    const uploadPayload = getJsonRequestBody('/api/uploads/recipe-image');

    expect(uploadPayload).toEqual(
      expect.objectContaining({
        fileName: 'my-cover.png',
        mimeType: 'image/png',
        dataBase64: expect.any(String),
      }),
    );
    expect(createObjectUrlMock).toHaveBeenCalledWith(imageFile);
    expect(screen.getByTestId('recipe-cover-upload-preview')).toHaveAttribute('src', 'blob:my-cover.png');
    expect(screen.getByText('已上传图片')).toBeInTheDocument();
  });

  it('shows the cover preview immediately before the upload request resolves', async () => {
    const user = userEvent.setup();
    const deferredUpload = createDeferredResponse();

    fetchMock.mockImplementation((input: string, init?: RequestInit) => {
      if (input === '/api/uploads/recipe-image' && init?.method === 'POST') {
        return deferredUpload.promise;
      }

      return createDefaultFetchImplementation()(input, init);
    });

    renderApp();

    const fileInput = screen.getByLabelText('上传图片', { selector: 'input' });
    const imageFile = new File(['preview-bytes'], 'preview.png', { type: 'image/png' });

    await user.upload(fileInput, imageFile);

    expect(screen.getByTestId('recipe-cover-upload-preview')).toHaveAttribute('src', 'blob:preview.png');
    expect(screen.getByText('上传中...')).toBeInTheDocument();

    deferredUpload.resolve(
      {
        fileName: 'uploaded-preview.png',
        url: '/assets/recipes/uploaded-preview.png',
      },
      201,
    );

    await waitFor(() => {
      expect(screen.getByText('已上传图片')).toBeInTheDocument();
    });
    expect(screen.getByTestId('recipe-cover-upload-preview')).toHaveAttribute('src', 'blob:preview.png');
  });

  it('includes the uploaded cover image url in the create payload', async () => {
    const user = userEvent.setup();
    renderApp();

    const fileInput = screen.getByLabelText('上传图片', { selector: 'input' });
    const imageFile = new File(['cover-bytes'], 'cover.png', { type: 'image/png' });

    await user.upload(fileInput, imageFile);
    await waitFor(() => {
      expect(screen.getByText('已上传图片')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('textbox', { name: '菜谱标题' }), 'Image Recipe');
    await user.click(screen.getByRole('button', { name: '发布' }));

    const payload = getJsonRequestBody('/api/recipes');

    expect(payload).toEqual(
      expect.objectContaining({
        coverImage: '/assets/recipes/uploaded-cover.png',
        coverImageName: 'uploaded-cover.png',
      }),
    );
  });

  it('keeps the cover preview visible when image upload fails', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (input: string, init?: RequestInit) => {
      if (input === '/api/uploads/recipe-image' && init?.method === 'POST') {
        return createFetchResponse({ message: 'Failed to upload recipe image.' }, 500);
      }

      return createDefaultFetchImplementation()(input, init);
    });

    renderApp();

    const fileInput = screen.getByLabelText('上传图片', { selector: 'input' });
    const imageFile = new File(['broken-cover'], 'broken-cover.png', { type: 'image/png' });

    await user.upload(fileInput, imageFile);

    expect(await screen.findByText('Failed to upload recipe image.')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-cover-upload-preview')).toHaveAttribute('src', 'blob:broken-cover.png');
  });

  it('replaces the previous cover preview when selecting a new image', async () => {
    const user = userEvent.setup();
    createObjectUrlMock
      .mockImplementationOnce(() => 'blob:first-cover.png')
      .mockImplementationOnce(() => 'blob:second-cover.png');

    renderApp();

    const fileInput = screen.getByLabelText('上传图片', { selector: 'input' });
    const firstImage = new File(['first-cover'], 'first-cover.png', { type: 'image/png' });
    const secondImage = new File(['second-cover'], 'second-cover.png', { type: 'image/png' });

    await user.upload(fileInput, firstImage);
    await waitFor(() => {
      expect(screen.getByTestId('recipe-cover-upload-preview')).toHaveAttribute('src', 'blob:first-cover.png');
    });

    await user.upload(fileInput, secondImage);

    await waitFor(() => {
      expect(screen.getByTestId('recipe-cover-upload-preview')).toHaveAttribute('src', 'blob:second-cover.png');
    });
    expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:first-cover.png');
  });

  it('submits a published payload and navigates back to recipes list', async () => {
    const user = userEvent.setup();
    const { router } = renderApp();

    await user.type(screen.getByRole('textbox', { name: '菜谱标题' }), 'Sheet Pan Fish');
    await user.click(screen.getByRole('button', { name: '发布' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/recipes');
    });

    const payload = getJsonRequestBody('/api/recipes');

    expect(payload).toEqual(
      expect.objectContaining({
        title: 'Sheet Pan Fish',
        description: null,
        category: null,
        status: 'published',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\/api\/recipes\?/),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('shows a local validation error when title is empty and does not submit', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: '发布' }));

    expect(screen.getByText('请输入菜谱标题。')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the API error message when submission fails', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (input: string, init?: RequestInit) => {
      if (input === '/api/recipes' && init?.method === 'POST') {
        return createFetchResponse({ message: 'Invalid recipe payload.' }, 400);
      }

      return createDefaultFetchImplementation()(input, init);
    });

    renderApp();

    await user.type(screen.getByRole('textbox', { name: '菜谱标题' }), 'Error Recipe');
    await user.click(screen.getByRole('button', { name: '发布' }));

    expect(await screen.findByText('Invalid recipe payload.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '发布' })).toBeEnabled();
  });

  it('disables actions while submitting to avoid duplicate requests', async () => {
    const user = userEvent.setup();
    const deferredResponse = createDeferredResponse();

    fetchMock.mockImplementation((input: string, init?: RequestInit) => {
      if (input === '/api/recipes' && init?.method === 'POST') {
        return deferredResponse.promise;
      }

      return createDefaultFetchImplementation()(input, init);
    });

    renderApp();

    await user.type(screen.getByRole('textbox', { name: '菜谱标题' }), 'Submitting Recipe');
    await user.click(screen.getByRole('button', { name: '发布' }));

    expect(screen.getByRole('button', { name: '发布中...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '淇濆瓨鑽夌' })).not.toBeInTheDocument();

    deferredResponse.resolve(
      createRecipeResponse({
        id: 'published-created-recipe',
        title: 'Submitting Recipe',
        status: 'published',
      }),
    );

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '发布中...' })).not.toBeInTheDocument();
    });
  });

  it('navigates back to recipes when cancel is clicked', async () => {
    const user = userEvent.setup();
    const { router } = renderApp();

    await user.click(screen.getByRole('button', { name: '取消' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/recipes');
    });
  });
});
