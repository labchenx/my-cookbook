import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppRoutes } from '../../app/AppRoutes';

const fetchMock = vi.fn();

function createFetchResponse(body?: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function createDefaultFetchImplementation() {
  return async (input: string) => {
    if (input.startsWith('/api/recipes?')) {
      return createFetchResponse({
        items: [],
        pagination: {
          page: 1,
          pageSize: 9,
          total: 0,
          totalPages: 0,
        },
      });
    }

    if (input === '/api/parsing/xhs-downloader/detail') {
      return createFetchResponse({
        ok: true,
        message: 'XHS Downloader returned note data successfully.',
        data: {
          url: 'https://www.xiaohongshu.com/explore/abc123?xsec_token=token-123',
          upstreamBaseUrl: 'http://127.0.0.1:5556',
          status: 'ready',
          service: {
            apiBaseUrl: 'http://127.0.0.1:5556',
            available: true,
            source: 'managed',
            projectRootConfigured: true,
            projectRoot: 'D:/external/XHS-Downloader',
            message: 'Started XHS Downloader automatically for local development.',
            updatedAt: '2026-04-23T00:00:00.000Z',
          },
          summary: {
            title: 'Braised Chicken',
            author: 'Kitchen Cat',
            contentText: 'Step one\nStep two',
            images: ['https://cdn.example.com/cover-1.jpg'],
            videos: ['https://cdn.example.com/video.mp4'],
            noteId: 'abc123',
            noteType: 'normal',
            publishedAt: '2026-04-23T12:00:00+08:00',
          },
          raw: {
            title: 'Braised Chicken',
            desc: 'Step one\nStep two',
          },
        },
      });
    }

    if (input === '/api/parsing/xhs-downloader/structure') {
      return createFetchResponse({
        ok: true,
        message: 'Bailian structured the Xiaohongshu content into a recipe draft.',
        data: {
          sourceUrl: 'https://www.xiaohongshu.com/explore/abc123?xsec_token=token-123',
          sourceExcerpt: '标题：Braised Chicken',
          model: 'qwen-plus',
          recipeDraft: {
            title: 'Braised Chicken',
            ingredients: ['Chicken thigh 500g', 'Soy sauce 2 tbsp'],
            steps: ['Cut the chicken', 'Braise with sauce'],
            category: 'Home Cooking',
            tags: ['Dinner', 'Chicken', 'Braised'],
            imagePrompt: '',
            coverImageName: null,
            coverImage: null,
            rawText: '标题：Braised Chicken',
          },
          recipePayload: {
            title: 'Braised Chicken',
            description: null,
            category: 'Home Cooking',
            tags: ['Dinner', 'Chicken', 'Braised'],
            ingredientsJson: { type: 'doc', content: [] },
            ingredientsHtml: '<ul><li><p>Chicken thigh 500g</p></li></ul>',
            ingredientsText: 'Chicken thigh 500g\nSoy sauce 2 tbsp',
            stepsJson: { type: 'doc', content: [] },
            stepsHtml: '<ol><li><p>Cut the chicken</p></li></ol>',
            stepsText: '1. Cut the chicken\n2. Braise with sauce',
            status: 'draft',
          },
        },
      });
    }

    throw new Error(`Unexpected fetch call: ${input}`);
  };
}

function renderApp(initialEntries: string[]) {
  const router = createMemoryRouter([{ path: '*', element: <AppRoutes /> }], {
    initialEntries,
  });

  return render(<RouterProvider router={router} />);
}

describe('XhsDownloaderTestPage', () => {
  beforeEach(() => {
    fetchMock.mockImplementation(createDefaultFetchImplementation());
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('renders the isolated downloader dev route', () => {
    renderApp(['/dev/xhs-downloader']);

    expect(screen.getByRole('heading', { name: 'XHS Downloader Test' })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        'https://www.xiaohongshu.com/explore/...?...&xsec_token=...',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fetch Note Detail' })).toBeDisabled();
  });

  it('posts the note url and renders normalized and service state data', async () => {
    const user = userEvent.setup();
    renderApp(['/dev/xhs-downloader']);

    await user.type(
      screen.getByLabelText('Xiaohongshu note URL'),
      'https://www.xiaohongshu.com/explore/abc123?xsec_token=token-123',
    );
    await user.click(screen.getByRole('button', { name: 'Fetch Note Detail' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/parsing/xhs-downloader/detail',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: 'https://www.xiaohongshu.com/explore/abc123?xsec_token=token-123',
          }),
        }),
      );
    });

    expect(screen.getByText('Braised Chicken')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Cat')).toBeInTheDocument();
    expect(screen.getByText('https://cdn.example.com/cover-1.jpg')).toBeInTheDocument();
    expect(screen.getByText('https://cdn.example.com/video.mp4')).toBeInTheDocument();
    expect(screen.getByText(/"desc": "Step one\\nStep two"/)).toBeInTheDocument();
    expect(screen.getByText('http://127.0.0.1:5556')).toBeInTheDocument();
    expect(screen.getByText('managed')).toBeInTheDocument();
    expect(screen.getByText('Started XHS Downloader automatically for local development.')).toBeInTheDocument();
  });

  it('structures the fetched XHS detail into a recipe draft payload', async () => {
    const user = userEvent.setup();
    renderApp(['/dev/xhs-downloader']);

    await user.type(
      screen.getByLabelText('Xiaohongshu note URL'),
      'https://www.xiaohongshu.com/explore/abc123?xsec_token=token-123',
    );
    await user.click(screen.getByRole('button', { name: 'Fetch Note Detail' }));
    await user.click(await screen.findByRole('button', { name: 'Structure Recipe Draft' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/parsing/xhs-downloader/structure',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    expect(screen.getAllByText('Braised Chicken').length).toBeGreaterThan(1);
    expect(screen.getByText('Chicken thigh 500g')).toBeInTheDocument();
    expect(screen.getByText('Braise with sauce')).toBeInTheDocument();
    expect(screen.getByText('qwen-plus')).toBeInTheDocument();
    expect(screen.getByText(/"status": "draft"/)).toBeInTheDocument();
  });

  it('keeps the /recipes route separate from the downloader dev page', async () => {
    renderApp(['/recipes']);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/api\/recipes\?/),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    expect(screen.queryByRole('heading', { name: 'XHS Downloader Test' })).not.toBeInTheDocument();
  });

  it('keeps service status and raw payload visible when the proxy returns an error payload', async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (input: string) => {
      if (input.startsWith('/api/recipes?')) {
        return createFetchResponse({
          items: [],
          pagination: {
            page: 1,
            pageSize: 9,
            total: 0,
            totalPages: 0,
          },
        });
      }

      if (input === '/api/parsing/xhs-downloader/detail') {
        return createFetchResponse(
          {
            ok: false,
            message: 'XHS Downloader upstream /xhs/detail returned HTTP 500: Cookie expired',
            data: {
              url: 'https://www.xiaohongshu.com/explore/abc123?xsec_token=token-123',
              upstreamBaseUrl: 'http://127.0.0.1:5556',
              status: 'upstream_failed',
              service: {
                apiBaseUrl: 'http://127.0.0.1:5556',
                available: true,
                source: 'existing',
                projectRootConfigured: true,
                projectRoot: 'D:/external/XHS-Downloader',
                message: 'Reusing the already running XHS Downloader API service.',
                updatedAt: '2026-04-24T00:00:00.000Z',
              },
              summary: {
                title: null,
                author: null,
                contentText:
                  'XHS Downloader upstream /xhs/detail returned HTTP 500: Cookie expired',
                images: [],
                videos: [],
                noteId: null,
                noteType: null,
                publishedAt: null,
              },
              raw: {
                upstreamStatusCode: 500,
                body: {
                  detail: 'Cookie expired',
                },
              },
              error: {
                kind: 'upstream',
                statusCode: 502,
                upstreamStatusCode: 500,
                details: 'XHS Downloader upstream /xhs/detail returned HTTP 500: Cookie expired',
              },
            },
          },
          502,
        );
      }

      throw new Error(`Unexpected fetch call: ${input}`);
    });
    renderApp(['/dev/xhs-downloader']);

    await user.type(
      screen.getByLabelText('Xiaohongshu note URL'),
      'https://www.xiaohongshu.com/explore/abc123?xsec_token=token-123',
    );
    await user.click(screen.getByRole('button', { name: 'Fetch Note Detail' }));

    expect(
      await screen.findAllByText(
        'XHS Downloader upstream /xhs/detail returned HTTP 500: Cookie expired',
      ),
    ).toHaveLength(3);
    expect(screen.getByText('existing')).toBeInTheDocument();
    expect(
      screen.getByText('Reusing the already running XHS Downloader API service.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/"upstreamStatusCode": 500/)).toBeInTheDocument();
    expect(screen.getByText(/"detail": "Cookie expired"/)).toBeInTheDocument();
  });
});
