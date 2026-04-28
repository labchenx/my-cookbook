import { ParsingError } from './parseDouyinText';
import type { ParsingSourcePlatform } from '../types';

export type DetectedParsingPlatform = {
  platform: ParsingSourcePlatform;
  normalizedUrl: string;
};

const douyinHostPatterns = [/(^|\.)douyin\.com$/i, /(^|\.)iesdouyin\.com$/i];
const xiaohongshuHostPatterns = [/(^|\.)xiaohongshu\.com$/i, /(^|\.)xhslink\.com$/i];

function matchesAnyPattern(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

function extractFirstUrl(value: string): string {
  const directValue = value.trim();
  const urlMatch = directValue.match(/https?:\/\/[^\s<>"']+/i);
  const candidate = urlMatch?.[0] ?? directValue;

  return candidate.replace(/[，。！？!?)\]}>,；;：:]+$/u, '');
}

export function detectParsingPlatform(input: string): DetectedParsingPlatform {
  if (typeof input !== 'string') {
    throw new ParsingError('Parsing url is required.', 400);
  }

  const trimmedUrl = input.trim();

  if (!trimmedUrl) {
    throw new ParsingError('Parsing url is required.', 400);
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(extractFirstUrl(trimmedUrl));
  } catch (error) {
    throw new ParsingError('Please enter a valid Douyin or Xiaohongshu URL.', 400, error);
  }

  if (!/^https?:$/i.test(parsedUrl.protocol)) {
    throw new ParsingError('Please use an http or https parsing URL.', 400);
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (matchesAnyPattern(hostname, douyinHostPatterns)) {
    return {
      platform: 'douyin',
      normalizedUrl: parsedUrl.toString(),
    };
  }

  if (matchesAnyPattern(hostname, xiaohongshuHostPatterns)) {
    return {
      platform: 'xiaohongshu',
      normalizedUrl: parsedUrl.toString(),
    };
  }

  throw new ParsingError(
    'Unsupported parsing link. Currently supported platforms: Douyin and Xiaohongshu.',
    400,
  );
}
