import { createParseDouyinText } from './parseDouyinText';
import { DouyinCliClientError } from '../providers/douyinCliClient';

describe('createParseDouyinText', () => {
  it('passes the trimmed url and resolved configuration to the provider', async () => {
    const parseWithProvider = vi.fn().mockResolvedValue('parsed text');
    const parseText = createParseDouyinText({
      env: {
        API_KEY: 'siliconflow-key',
        DOUYIN_CLI_PROJECT_ROOT: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
        DOUYIN_CLI_OUTPUT_DIR: 'D:/codex_code/my_cookbook/.douyin-output',
        DOUYIN_CLI_UV_COMMAND: 'uv',
        DOUYIN_CLI_PYTHON_COMMAND: 'python',
        FFMPEG_COMMAND: 'ffmpeg',
      },
      parseWithProvider,
      cwd: 'D:/codex_code/my_cookbook',
    });

    await expect(parseText('  https://v.douyin.com/example/  ')).resolves.toBe('parsed text');
    expect(parseWithProvider).toHaveBeenCalledWith('https://v.douyin.com/example/', {
      apiKey: 'siliconflow-key',
      projectRoot: 'C:\\Users\\CHEN\\Desktop\\douyin-mcp-server',
      outputDir: 'D:\\codex_code\\my_cookbook\\.douyin-output',
      uvCommand: 'uv',
      pythonCommand: 'python',
      timeoutMs: undefined,
      ffmpegCommand: 'ffmpeg',
    });
  });

  it('uses API_KEY as the SiliconFlow CLI key', async () => {
    const parseWithProvider = vi.fn().mockResolvedValue('parsed text');
    const parseText = createParseDouyinText({
      env: {
        API_KEY: 'siliconflow-key',
        DOUYIN_CLI_PROJECT_ROOT: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
      },
      parseWithProvider,
    });

    await parseText('https://v.douyin.com/example/');

    expect(parseWithProvider).toHaveBeenCalledWith(
      'https://v.douyin.com/example/',
      expect.objectContaining({ apiKey: 'siliconflow-key' }),
    );
  });

  it('rejects an empty url', async () => {
    const parseText = createParseDouyinText({
      env: {
        API_KEY: 'siliconflow-key',
        DOUYIN_CLI_PROJECT_ROOT: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
      },
    });

    await expect(parseText('   ')).rejects.toMatchObject({
      message: 'Douyin url is required.',
      statusCode: 400,
    });
  });

  it('rejects when the CLI project root is missing', async () => {
    const parseText = createParseDouyinText({
      env: {
        API_KEY: 'siliconflow-key',
        DOUYIN_CLI_PROJECT_ROOT: 'D:/missing-douyin-mcp-server',
      },
      cwd: 'D:/missing-cookbook',
    });

    await expect(parseText('https://v.douyin.com/example/')).rejects.toMatchObject({
      message:
        'Douyin CLI project root is not configured. Set DOUYIN_CLI_PROJECT_ROOT to the douyin-mcp-server repo.',
      statusCode: 500,
    });
  });

  it('rejects when the parser api key is missing', async () => {
    const parseText = createParseDouyinText({
      env: {
        DOUYIN_CLI_PROJECT_ROOT: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
      },
    });

    await expect(parseText('https://v.douyin.com/example/')).rejects.toMatchObject({
      message: 'Douyin parser requires API_KEY for the SiliconFlow CLI script.',
      statusCode: 500,
    });
  });

  it('passes the SSE event callback through to the CLI provider', async () => {
    const parseWithProvider = vi.fn().mockResolvedValue('parsed text');
    const onEvent = vi.fn();
    const parseText = createParseDouyinText({
      env: {
        API_KEY: 'siliconflow-key',
        DOUYIN_CLI_PROJECT_ROOT: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
      },
      parseWithProvider,
    });

    await parseText('https://v.douyin.com/example/', { onEvent });

    expect(parseWithProvider).toHaveBeenCalledWith(
      'https://v.douyin.com/example/',
      expect.objectContaining({ onEvent }),
    );
  });

  it('maps provider startup errors to a stable server message', async () => {
    const parseText = createParseDouyinText({
      env: {
        API_KEY: 'siliconflow-key',
        DOUYIN_CLI_PROJECT_ROOT: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
      },
      parseWithProvider: vi.fn().mockRejectedValue(
        new DouyinCliClientError('spawn failed', 'startup'),
      ),
    });

    await expect(parseText('https://v.douyin.com/example/')).rejects.toMatchObject({
      message: 'spawn failed',
      statusCode: 500,
    });
  });

  it('maps provider timeout errors to a gateway timeout response', async () => {
    const parseText = createParseDouyinText({
      env: {
        API_KEY: 'siliconflow-key',
        DOUYIN_CLI_PROJECT_ROOT: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
      },
      parseWithProvider: vi.fn().mockRejectedValue(
        new DouyinCliClientError('request timed out', 'timeout'),
      ),
    });

    await expect(parseText('https://v.douyin.com/example/')).rejects.toMatchObject({
      message: 'request timed out',
      statusCode: 504,
    });
  });

  it('maps provider tool errors to a bad gateway response', async () => {
    const parseText = createParseDouyinText({
      env: {
        API_KEY: 'siliconflow-key',
        DOUYIN_CLI_PROJECT_ROOT: 'C:/Users/CHEN/Desktop/douyin-mcp-server',
      },
      parseWithProvider: vi.fn().mockRejectedValue(
        new DouyinCliClientError('tool failed', 'tool'),
      ),
    });

    await expect(parseText('https://v.douyin.com/example/')).rejects.toMatchObject({
      message: 'tool failed',
      statusCode: 502,
    });
  });
});
