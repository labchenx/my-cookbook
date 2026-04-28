import { createFetchXhsDownloaderDetail, XhsDownloaderError } from './xhsDownloader';
import * as xhsDownloaderDev from './xhsDownloaderDev';

vi.mock('./xhsDownloaderDev', async () => {
  const actual = await vi.importActual<typeof import('./xhsDownloaderDev')>('./xhsDownloaderDev');

  return {
    ...actual,
    readXhsDownloaderDevStatus: vi.fn(() => null),
  };
});

describe('createFetchXhsDownloaderDetail', () => {
  beforeEach(() => {
    vi.mocked(xhsDownloaderDev.readXhsDownloaderDevStatus).mockReturnValue(null);
  });

  it('requires a non-empty note url', async () => {
    const fetchDetail = createFetchXhsDownloaderDetail();

    await expect(fetchDetail('   ')).rejects.toMatchObject({
      message: 'Xiaohongshu URL is required.',
      statusCode: 400,
    });
  });

  it('forwards the request to /xhs/detail with download disabled and normalizes summary data', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        title: 'Braised Chicken',
        user: {
          nickname: 'Kitchen Cat',
        },
        desc: 'Step one\nStep two',
        images: [
          { url: 'https://cdn.example.com/cover-1.jpg' },
          { url: 'https://cdn.example.com/cover-2.jpg' },
        ],
        video_url: 'https://cdn.example.com/video.mp4',
        note_id: 'abc123',
        note_type: 'normal',
        publish_time: '2026-04-23T12:00:00+08:00',
      }),
    });
    const fetchDetail = createFetchXhsDownloaderDetail({
      env: {
        XHS_DOWNLOADER_API_BASE_URL: 'http://127.0.0.1:5556/',
        XHS_DOWNLOADER_COOKIE: 'cookie=value',
        XHS_DOWNLOADER_PROXY: 'http://127.0.0.1:10808',
        XHS_DOWNLOADER_TIMEOUT_MS: '120000',
      },
      fetcher,
    });

    await expect(
      fetchDetail(' https://www.xiaohongshu.com/explore/abc123?xsec_token=token-123 '),
    ).resolves.toEqual({
      ok: true,
      message: 'XHS Downloader returned note data successfully.',
      data: {
        url: 'https://www.xiaohongshu.com/explore/abc123?xsec_token=token-123',
        upstreamBaseUrl: 'http://127.0.0.1:5556',
        status: 'ready',
        service: {
          apiBaseUrl: 'http://127.0.0.1:5556',
          available: true,
          source: 'unknown',
          projectRootConfigured: false,
          projectRoot: null,
          message: 'XHS Downloader API responded successfully.',
          updatedAt: null,
        },
        summary: {
          title: 'Braised Chicken',
          author: 'Kitchen Cat',
          contentText: 'Step one\nStep two',
          images: [
            'https://cdn.example.com/cover-1.jpg',
            'https://cdn.example.com/cover-2.jpg',
          ],
          videos: ['https://cdn.example.com/video.mp4'],
          noteId: 'abc123',
          noteType: 'normal',
          publishedAt: '2026-04-23T12:00:00+08:00',
        },
        raw: {
          title: 'Braised Chicken',
          user: {
            nickname: 'Kitchen Cat',
          },
          desc: 'Step one\nStep two',
          images: [
            { url: 'https://cdn.example.com/cover-1.jpg' },
            { url: 'https://cdn.example.com/cover-2.jpg' },
          ],
          video_url: 'https://cdn.example.com/video.mp4',
          note_id: 'abc123',
          note_type: 'normal',
          publish_time: '2026-04-23T12:00:00+08:00',
        },
      },
    });

    expect(fetcher).toHaveBeenCalledWith(
      'http://127.0.0.1:5556/xhs/detail',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://www.xiaohongshu.com/explore/abc123?xsec_token=token-123',
          download: false,
          skip: false,
          cookie: 'cookie=value',
          proxy: 'http://127.0.0.1:10808',
        }),
      }),
    );
  });

  it('marks the response as upstream_failed when the downloader returns a failure payload', async () => {
    const fetchDetail = createFetchXhsDownloaderDetail({
      env: {
        XHS_DOWNLOADER_API_BASE_URL: 'http://127.0.0.1:5556',
      },
      fetcher: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          result: '获取失败',
        }),
      }),
    });

    await expect(
      fetchDetail('https://www.xiaohongshu.com/explore/abc123?xsec_token=token-123'),
    ).resolves.toMatchObject({
      message: 'XHS Downloader responded, but the note payload looks incomplete.',
      data: {
        status: 'upstream_failed',
        service: {
          source: 'unknown',
        },
        summary: {
          contentText: '获取失败',
        },
      },
    });
  });

  it('normalizes Chinese-key payloads returned by XHS-Downloader', async () => {
    const fetchDetail = createFetchXhsDownloaderDetail({
      env: {
        XHS_DOWNLOADER_API_BASE_URL: 'http://127.0.0.1:5556',
      },
      fetcher: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          作品标题: '我的一日三餐',
          作者昵称: '布丁_喵喵',
          作品描述: '吃干净而丰富的食物',
          下载地址: ['https://cdn.example.com/image-1.jpg', 'https://cdn.example.com/image-2.jpg'],
          动图地址: ['https://cdn.example.com/video-1.mp4', null],
          作品ID: '69e8a5350000000023005b88',
          作品类型: '图文',
          发布时间: '2026-04-22_18:38:45',
        }),
      }),
    });

    await expect(
      fetchDetail('https://www.xiaohongshu.com/explore/69e8a5350000000023005b88?xsec_token=token-123'),
    ).resolves.toMatchObject({
      data: {
        status: 'ready',
        summary: {
          title: '我的一日三餐',
          author: '布丁_喵喵',
          contentText: '吃干净而丰富的食物',
          images: [
            'https://cdn.example.com/image-1.jpg',
            'https://cdn.example.com/image-2.jpg',
          ],
          videos: ['https://cdn.example.com/video-1.mp4'],
          noteId: '69e8a5350000000023005b88',
          noteType: '图文',
          publishedAt: '2026-04-22_18:38:45',
        },
      },
    });
  });

  it('keeps mp4 urls from XHS-Downloader download addresses in videos, not images', async () => {
    const downloadAddressKey = '\u4e0b\u8f7d\u5730\u5740';
    const gifAddressKey = '\u52a8\u56fe\u5730\u5740';
    const fetchDetail = createFetchXhsDownloaderDetail({
      env: {
        XHS_DOWNLOADER_API_BASE_URL: 'http://127.0.0.1:5556',
      },
      fetcher: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          title: 'Braised Pork Video',
          [downloadAddressKey]: [
            'http://sns-bak-v1.xhscdn.com/stream/1/110/258/demo_258.mp4',
            'https://sns-img-qc.xhscdn.com/image-view-demo',
          ],
          [gifAddressKey]: ['https://cdn.example.com/animated-preview.mp4'],
        }),
      }),
    });

    await expect(
      fetchDetail('https://www.xiaohongshu.com/explore/video123?xsec_token=token-123'),
    ).resolves.toMatchObject({
      data: {
        summary: {
          images: ['https://sns-img-qc.xhscdn.com/image-view-demo'],
          videos: [
            'http://sns-bak-v1.xhscdn.com/stream/1/110/258/demo_258.mp4',
            'https://cdn.example.com/animated-preview.mp4',
          ],
        },
      },
    });
  });

  it('maps upstream network failures to a stable error', async () => {
    const fetchDetail = createFetchXhsDownloaderDetail({
      env: {
        XHS_DOWNLOADER_API_BASE_URL: 'http://127.0.0.1:5556',
      },
      fetcher: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5556')),
    });

    await expect(
      fetchDetail('https://www.xiaohongshu.com/explore/abc123?xsec_token=token-123'),
    ).rejects.toMatchObject({
      message: 'XHS Downloader API is not available.',
      statusCode: 503,
      responseData: {
        status: 'upstream_failed',
        service: {
          source: 'unavailable',
        },
        error: {
          kind: 'network',
          statusCode: 503,
        },
      },
    });
  });

  it('uses dev startup status when the downloader is unavailable', async () => {
    vi.mocked(xhsDownloaderDev.readXhsDownloaderDevStatus).mockReturnValue({
      apiBaseUrl: 'http://127.0.0.1:5556',
      available: false,
      source: 'unavailable',
      code: 'missing_project_root',
      projectRootConfigured: false,
      projectRoot: null,
      message:
        'XHS_DOWNLOADER_PROJECT_ROOT is not configured, so XHS Downloader was not started automatically.',
      managedProcessId: null,
      updatedAt: '2026-04-23T00:00:00.000Z',
    });
    const fetchDetail = createFetchXhsDownloaderDetail({
      env: {
        XHS_DOWNLOADER_API_BASE_URL: 'http://127.0.0.1:5556',
      },
      fetcher: vi.fn().mockRejectedValue(new Error('fetch failed')),
    });

    await expect(
      fetchDetail('https://www.xiaohongshu.com/explore/abc123?xsec_token=token-123'),
    ).rejects.toMatchObject({
      message:
        'XHS_DOWNLOADER_PROJECT_ROOT is not configured, so XHS Downloader was not started automatically.',
      statusCode: 503,
      responseData: {
        service: {
          source: 'unavailable',
          projectRootConfigured: false,
        },
        error: {
          kind: 'network',
          statusCode: 503,
        },
      },
    });
  });

  it('surfaces upstream 500 details and keeps service state in the error payload', async () => {
    const fetchDetail = createFetchXhsDownloaderDetail({
      env: {
        XHS_DOWNLOADER_API_BASE_URL: 'http://127.0.0.1:5556',
      },
      fetcher: vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          detail: 'Cookie expired',
        }),
      }),
    });

    await expect(
      fetchDetail('https://www.xiaohongshu.com/explore/abc123?xsec_token=token-123'),
    ).rejects.toMatchObject({
      message: 'XHS Downloader upstream /xhs/detail returned HTTP 500: Cookie expired',
      statusCode: 502,
      responseData: {
        status: 'upstream_failed',
        service: {
          available: true,
          source: 'unknown',
        },
        summary: {
          contentText: 'XHS Downloader upstream /xhs/detail returned HTTP 500: Cookie expired',
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
        },
      },
    });
  });
});
