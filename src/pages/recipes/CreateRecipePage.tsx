import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionBar } from '../../components/recipes/ActionBar';
import { CreateRecipeHeader } from '../../components/recipes/CreateRecipeHeader';
import { CreateRecipeTabs } from '../../components/recipes/CreateRecipeTabs';
import { ParseRecipeSection } from '../../components/recipes/ParseRecipeSection';
import { RecipeBasicInfoForm } from '../../components/recipes/RecipeBasicInfoForm';
import { RichTextEditor } from '../../components/recipes/RichTextEditor';
import {
  createEmptyRichTextDocument,
  type RichTextDerivedValue,
} from '../../components/recipes/richTextUtils';
import type {
  CreateRecipeMode,
  CreateRecipePayload,
  CreateRecipeResponse,
  ParseStatus,
  RecipeDraft,
} from './createRecipeTypes';

type UploadRecipeImageResponse = {
  fileName: string;
  url: string;
};

const parseSuccessMessage =
  '链接解析成功，后续可在这里填充自动识别结果。';
const parseErrorMessage =
  '链接解析失败，请检查链接格式后重试。';
const titleRequiredMessage = '请输入菜谱标题。';
const createRecipeErrorMessage = '创建菜谱失败，请稍后重试。';
const uploadImageErrorMessage = '图片上传失败，请稍后重试。';

function createInitialDraft(): RecipeDraft {
  return {
    title: '',
    coverImageName: '',
    coverImage: null,
    category: '',
    tagInput: '',
    tags: [],
    ingredientsJson: createEmptyRichTextDocument(),
    ingredientsHtml: '',
    ingredientsText: '',
    stepsJson: createEmptyRichTextDocument(),
    stepsHtml: '',
    stepsText: '',
  };
}

function buildCreateRecipePayload(
  draft: RecipeDraft,
  status: 'published',
): CreateRecipePayload {
  const trimmedCoverImageName = draft.coverImageName.trim();
  const trimmedCategory = draft.category.trim();

  return {
    title: draft.title.trim(),
    coverImageName: trimmedCoverImageName.length > 0 ? trimmedCoverImageName : undefined,
    coverImage: draft.coverImage ?? undefined,
    description: null,
    category: trimmedCategory.length > 0 ? trimmedCategory : null,
    tags: draft.tags,
    ingredientsJson: draft.ingredientsJson,
    ingredientsHtml: draft.ingredientsHtml || null,
    ingredientsText: draft.ingredientsText || null,
    stepsJson: draft.stepsJson,
    stepsHtml: draft.stepsHtml || null,
    stepsText: draft.stepsText || null,
    status,
  };
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== 'string') {
        reject(new Error(uploadImageErrorMessage));
        return;
      }

      const [, dataBase64 = ''] = result.split(',', 2);

      if (!dataBase64) {
        reject(new Error(uploadImageErrorMessage));
        return;
      }

      resolve(dataBase64);
    };

    reader.onerror = () => {
      reject(new Error(uploadImageErrorMessage));
    };

    reader.readAsDataURL(file);
  });
}

async function uploadRecipeImage(
  file: File,
  signal?: AbortSignal,
): Promise<UploadRecipeImageResponse> {
  const dataBase64 = await readFileAsBase64(file);
  const response = await fetch('/api/uploads/recipe-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      dataBase64,
    }),
    signal,
  });

  const responseBody = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(
      typeof responseBody?.message === 'string' && responseBody.message.trim().length > 0
        ? responseBody.message
        : uploadImageErrorMessage,
    );
  }

  if (
    !responseBody ||
    typeof responseBody !== 'object' ||
    typeof (responseBody as { fileName?: unknown }).fileName !== 'string' ||
    typeof (responseBody as { url?: unknown }).url !== 'string'
  ) {
    throw new Error(uploadImageErrorMessage);
  }

  return responseBody as UploadRecipeImageResponse;
}

async function createRecipe(
  payload: CreateRecipePayload,
  signal?: AbortSignal,
): Promise<CreateRecipeResponse> {
  const response = await fetch('/api/recipes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  const responseBody = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(
      typeof responseBody?.message === 'string' && responseBody.message.trim().length > 0
        ? responseBody.message
        : createRecipeErrorMessage,
    );
  }

  if (
    !responseBody ||
    typeof responseBody !== 'object' ||
    typeof (responseBody as { id?: unknown }).id !== 'string'
  ) {
    throw new Error(createRecipeErrorMessage);
  }

  return responseBody as CreateRecipeResponse;
}

export function CreateRecipePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<CreateRecipeMode>('manual');
  const [parseUrl, setParseUrl] = useState('https://example.com/recipe/123');
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle');
  const [parseMessage, setParseMessage] = useState('');
  const [draft, setDraft] = useState<RecipeDraft>(createInitialDraft);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const activeCoverPreviewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (activeCoverPreviewUrlRef.current) {
        URL.revokeObjectURL(activeCoverPreviewUrlRef.current);
      }
    };
  }, []);

  const clearSubmitError = () => {
    if (submitError) {
      setSubmitError('');
    }
  };

  const updateDraft = <K extends keyof RecipeDraft>(field: K, value: RecipeDraft[K]) => {
    clearSubmitError();
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const updateRichTextDraft = (field: 'ingredients' | 'steps', value: RichTextDerivedValue) => {
    clearSubmitError();

    if (field === 'ingredients') {
      setDraft((current) => ({
        ...current,
        ingredientsJson: value.json,
        ingredientsHtml: value.html,
        ingredientsText: value.text,
      }));
      return;
    }

    setDraft((current) => ({
      ...current,
      stepsJson: value.json,
      stepsHtml: value.html,
      stepsText: value.text,
    }));
  };

  const handleAddTag = () => {
    const tag = draft.tagInput.trim();

    if (!tag || draft.tags.includes(tag)) {
      return;
    }

    clearSubmitError();
    setDraft((current) => ({
      ...current,
      tags: [...current.tags, tag],
      tagInput: '',
    }));
  };

  const handleRemoveTag = (tag: string) => {
    clearSubmitError();
    setDraft((current) => ({
      ...current,
      tags: current.tags.filter((item) => item !== tag),
    }));
  };

  const handleCoverSelect = async (file: File) => {
    if (isCoverUploading || isSubmitting) {
      return;
    }

    clearSubmitError();
    const nextPreviewUrl = URL.createObjectURL(file);

    if (activeCoverPreviewUrlRef.current) {
      URL.revokeObjectURL(activeCoverPreviewUrlRef.current);
    }

    activeCoverPreviewUrlRef.current = nextPreviewUrl;
    setCoverPreviewUrl(nextPreviewUrl);
    setIsCoverUploading(true);

    try {
      const uploadedImage = await uploadRecipeImage(file);

      setDraft((current) => ({
        ...current,
        coverImageName: uploadedImage.fileName,
        coverImage: uploadedImage.url,
      }));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : uploadImageErrorMessage);
    } finally {
      setIsCoverUploading(false);
    }
  };

  const handleParse = async () => {
    if (!parseUrl.trim()) {
      return;
    }

    setParseStatus('loading');
    setParseMessage('');

    await new Promise((resolve) => window.setTimeout(resolve, 800));

    if (parseUrl.includes('http')) {
      setParseStatus('success');
      setParseMessage(parseSuccessMessage);
      return;
    }

    setParseStatus('error');
    setParseMessage(parseErrorMessage);
  };

  const handleCancel = () => navigate('/recipes');

  const handlePublish = async () => {
    if (isSubmitting || isCoverUploading) {
      return;
    }

    if (!draft.title.trim()) {
      setSubmitError(titleRequiredMessage);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await createRecipe(buildCreateRecipePayload(draft, 'published'));

      setIsSubmitting(false);
      navigate('/recipes');
    } catch (error) {
      setIsSubmitting(false);
      setSubmitError(error instanceof Error ? error.message : createRecipeErrorMessage);
    }
  };

  const isBusy = isSubmitting || isCoverUploading;

  return (
    <main className="min-h-screen bg-[#FEFDFB]">
      <CreateRecipeHeader onBack={handleCancel} />
      <div className="mx-auto w-full max-w-[848px] px-4 pb-8 pt-[72px] lg:pb-0 lg:pt-[101px]">
        <CreateRecipeTabs mode={mode} onChange={setMode} />

        <div className="mt-4 lg:mt-8">
          {mode === 'parse' ? (
            <ParseRecipeSection
              url={parseUrl}
              status={parseStatus}
              message={parseMessage}
              onUrlChange={(value) => {
                setParseUrl(value);
                if (parseStatus !== 'idle') {
                  setParseStatus('idle');
                  setParseMessage('');
                }
              }}
              onSubmit={handleParse}
            />
          ) : (
            <div className="space-y-4 lg:space-y-6">
              <RecipeBasicInfoForm
                title={draft.title}
                coverImageName={draft.coverImageName}
                coverPreviewUrl={coverPreviewUrl}
                category={draft.category}
                tagInput={draft.tagInput}
                tags={draft.tags}
                isCoverUploading={isCoverUploading}
                onTitleChange={(value) => updateDraft('title', value)}
                onCoverSelect={handleCoverSelect}
                onCategoryChange={(value) => updateDraft('category', value)}
                onTagInputChange={(value) => updateDraft('tagInput', value)}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
              />
              <RichTextEditor
                label={'配料列表'}
                helperText={'使用列表格式输入配料，例如：鸡蛋 - 2个'}
                value={draft.ingredientsJson}
                variant="ingredients"
                onChange={(value) => updateRichTextDraft('ingredients', value)}
              />
              <RichTextEditor
                label={'制作步骤'}
                helperText={'使用有序列表详细描述每一步的操作过程'}
                value={draft.stepsJson}
                variant="steps"
                onChange={(value) => updateRichTextDraft('steps', value)}
              />
              {submitError ? (
                <section className="rounded-2xl border border-[rgba(234,93,56,0.12)] bg-white px-4 py-3 text-[14px] leading-5 text-[#9A5D46]">
                  {submitError}
                </section>
              ) : null}
              <ActionBar
                onCancel={handleCancel}
                onPublish={handlePublish}
                isSubmitting={isBusy}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
