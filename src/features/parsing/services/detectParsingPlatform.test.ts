import { detectParsingPlatform } from './detectParsingPlatform';

describe('detectParsingPlatform', () => {
  it('detects Douyin long and short links', () => {
    expect(detectParsingPlatform('https://www.douyin.com/video/123')).toMatchObject({
      platform: 'douyin',
      normalizedUrl: 'https://www.douyin.com/video/123',
    });
    expect(detectParsingPlatform('https://v.douyin.com/example/')).toMatchObject({
      platform: 'douyin',
      normalizedUrl: 'https://v.douyin.com/example/',
    });
    expect(detectParsingPlatform('https://www.iesdouyin.com/share/video/123')).toMatchObject({
      platform: 'douyin',
      normalizedUrl: 'https://www.iesdouyin.com/share/video/123',
    });
  });

  it('detects Xiaohongshu full and short links', () => {
    expect(
      detectParsingPlatform('https://www.xiaohongshu.com/explore/abc?xsec_token=token'),
    ).toMatchObject({
      platform: 'xiaohongshu',
      normalizedUrl: 'https://www.xiaohongshu.com/explore/abc?xsec_token=token',
    });
    expect(detectParsingPlatform('https://xhslink.com/a/abc')).toMatchObject({
      platform: 'xiaohongshu',
      normalizedUrl: 'https://xhslink.com/a/abc',
    });
  });

  it('extracts the first supported url from copied share text', () => {
    expect(
      detectParsingPlatform(
        '（建议先收藏）🦀️江南花雕熟醉虾蟹/附配方 http://xhslink.com/o/3j7YUMeJQuE 复制一下，然后打开【小红书】就能看到啦！',
      ),
    ).toMatchObject({
      platform: 'xiaohongshu',
      normalizedUrl: 'http://xhslink.com/o/3j7YUMeJQuE',
    });
  });

  it('rejects empty, invalid, and unsupported links', () => {
    expect(() => detectParsingPlatform('')).toThrow('Parsing url is required.');
    expect(() => detectParsingPlatform('not a url')).toThrow(
      'Please enter a valid Douyin or Xiaohongshu URL.',
    );
    expect(() => detectParsingPlatform('https://example.com/recipe')).toThrow(
      'Unsupported parsing link.',
    );
  });
});
