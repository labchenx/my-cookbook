import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { RequestHandler } from 'express';

export type UploadRecipeImageRequestBody = {
  fileName: string;
  mimeType: string;
  dataBase64: string;
};

export type UploadRecipeImageResponse = {
  fileName: string;
  url: string;
};

type UploadOptions = {
  outputDirectory?: string;
  now?: () => number;
  createId?: () => string;
};

class InvalidUploadPayloadError extends Error {
  constructor(message = 'Invalid image upload payload.') {
    super(message);
    this.name = 'InvalidUploadPayloadError';
  }
}

const DEFAULT_OUTPUT_DIRECTORY = path.resolve('src/assets/recipes');
const mimeTypeToExtension = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['image/svg+xml', 'svg'],
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getNonEmptyString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new InvalidUploadPayloadError();
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new InvalidUploadPayloadError();
  }

  return trimmedValue;
}

function sanitizeBaseName(fileName: string) {
  const parsed = path.parse(fileName);
  const baseName = parsed.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return baseName || 'recipe-image';
}

function inferExtension(fileName: string, mimeType: string) {
  const fromMimeType = mimeTypeToExtension.get(mimeType.toLowerCase());

  if (fromMimeType) {
    return fromMimeType;
  }

  const normalizedExtension = path.extname(fileName).replace(/^\./, '').toLowerCase();

  if (normalizedExtension) {
    return normalizedExtension;
  }

  throw new InvalidUploadPayloadError();
}

function decodeBase64Image(dataBase64: string) {
  const normalized = dataBase64.replace(/\s+/g, '');

  if (!/^[A-Za-z0-9+/]+=*$/.test(normalized) || normalized.length % 4 !== 0) {
    throw new InvalidUploadPayloadError();
  }

  const buffer = Buffer.from(normalized, 'base64');

  if (buffer.length === 0) {
    throw new InvalidUploadPayloadError();
  }

  return buffer;
}

function normalizeUploadPayload(body: unknown): UploadRecipeImageRequestBody {
  if (!isPlainObject(body)) {
    throw new InvalidUploadPayloadError();
  }

  const fileName = getNonEmptyString(body.fileName);
  const mimeType = getNonEmptyString(body.mimeType);
  const dataBase64 = getNonEmptyString(body.dataBase64);

  if (!mimeType.toLowerCase().startsWith('image/')) {
    throw new InvalidUploadPayloadError();
  }

  return {
    fileName,
    mimeType,
    dataBase64,
  };
}

export async function uploadRecipeImage(
  body: unknown,
  {
    outputDirectory = DEFAULT_OUTPUT_DIRECTORY,
    now = () => Date.now(),
    createId = () => randomUUID().slice(0, 8),
  }: UploadOptions = {},
): Promise<UploadRecipeImageResponse> {
  const payload = normalizeUploadPayload(body);
  const extension = inferExtension(payload.fileName, payload.mimeType);
  const imageBuffer = decodeBase64Image(payload.dataBase64);
  const outputFileName = `${sanitizeBaseName(payload.fileName)}-${now()}-${createId()}.${extension}`;

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, outputFileName), imageBuffer);

  return {
    fileName: outputFileName,
    url: `/assets/recipes/${outputFileName}`,
  };
}

export const uploadRecipeImageHandler: RequestHandler = async (request, response) => {
  try {
    const upload = await uploadRecipeImage(request.body);
    response.status(201).json(upload);
  } catch (error) {
    if (error instanceof InvalidUploadPayloadError) {
      response.status(400).json({ message: error.message });
      return;
    }

    console.error('Failed to upload recipe image', error);
    response.status(500).json({ message: 'Failed to upload recipe image.' });
  }
};
