import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionBar } from '../../components/recipes/ActionBar';
import { CreateRecipeHeader } from '../../components/recipes/CreateRecipeHeader';
import { CreateRecipeTabs } from '../../components/recipes/CreateRecipeTabs';
import { ParseRecipeSection } from '../../components/recipes/ParseRecipeSection';
import { RecipeBasicInfoForm } from '../../components/recipes/RecipeBasicInfoForm';
import { RichTextEditor } from '../../components/recipes/RichTextEditor';
import {
  createListRichTextDocument,
  createEmptyRichTextDocument,
  deriveRichTextValue,
  type RichTextDerivedValue,
} from '../../components/recipes/richTextUtils';
import type {
  CreateParsingSessionResponse,
  ParsingDoneEvent,
  ParsingErrorEvent,
  ParsingParseErrorEvent,
  ParsingProgressEvent,
  ParsingResultEvent,
  ParsingStage,
  ParsingStageEvent,
} from '../../features/parsing/types';
import type { StructuredRecipeDraft } from '../../features/recipeStructuring/types';
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

type ParseSessionState = {
  sessionId: string | null;
  stage: ParsingStage | null;
  progress: number | null;
  stageLabel: string;
  detailMessage: string;
  resultText: string;
  recipeDraft: StructuredRecipeDraft | null;
};

const parseRequestErrorMessage = '链接解析失败，请稍后重试。';
const createParseSessionErrorMessage = '解析任务创建失败，请稍后重试。';
const parseStreamDisconnectedMessage = '解析连接已中断，请重新发起解析。';
const parsePreparingMessage = '正在准备解析任务...';
const parseSuccessMessage = '解析成功，结果已输出到控制台。';
const parseErrorMessage = '链接解析失败，请检查链接格式后重试。';
const titleRequiredMessage = '请输入菜谱标题。';
const createRecipeErrorMessage = '创建菜谱失败，请稍后重试。';
const uploadImageErrorMessage = '图片上传失败，请稍后重试。';
const parsingStageLabels: Record<ParsingStage, string> = {
  parse_link: '解析链接',
  fetch_media: '获取视频',
  extract_audio: '提取音频',
  transcribe: '识别文案',
  structure: '结构化处理中',
  write_markdown: '生成 Markdown',
  completed: '解析完成',
  failed: '解析失败',
};
const parsingStageProgressDefaults: Record<Exclude<ParsingStage, 'failed'>, number> = {
  parse_link: 6,
  fetch_media: 18,
  extract_audio: 54,
  transcribe: 62,
  write_markdown: 78,
  structure: 80,
  completed: 100,
};

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

function createInitialParseSessionState(): ParseSessionState {
  return {
    sessionId: null,
    stage: null,
    progress: null,
    stageLabel: '',
    detailMessage: '',
    resultText: '',
    recipeDraft: null,
  };
}

function createDraftFromStructuredRecipe(recipeDraft: StructuredRecipeDraft): RecipeDraft {
  const ingredients = deriveRichTextValue(createListRichTextDocument(recipeDraft.ingredients, false));
  const steps = deriveRichTextValue(createListRichTextDocument(recipeDraft.steps, true));

  return {
    title: recipeDraft.title,
    coverImageName: recipeDraft.coverImageName ?? '',
    coverImage: recipeDraft.coverImage,
    category: recipeDraft.category,
    tagInput: '',
    tags: recipeDraft.tags,
    ingredientsJson: ingredients.json,
    ingredientsHtml: ingredients.html,
    ingredientsText: ingredients.text,
    stepsJson: steps.json,
    stepsHtml: steps.html,
    stepsText: steps.text,
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

function resolveParsingStageLabel(stage: ParsingStage | null): string {
  return stage ? parsingStageLabels[stage] : '';
}

function resolveParsingProgress(stage: ParsingStage | null, progress?: number): number | null {
  if (typeof progress === 'number') {
    return Math.max(0, Math.min(100, Math.round(progress)));
  }

  if (!stage || stage === 'failed') {
    return null;
  }

  return parsingStageProgressDefaults[stage];
}

function parseEventPayload<T>(event: Event): T | null {
  const data = (event as MessageEvent<string>).data;

  if (typeof data !== 'string') {
    return null;
  }

  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
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

async function createDouyinParseSession(
  url: string,
  signal?: AbortSignal,
): Promise<CreateParsingSessionResponse> {
  const response = await fetch('/api/parsing/douyin/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
    signal,
  });

  const responseBody = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(
      typeof responseBody?.message === 'string' && responseBody.message.trim().length > 0
        ? responseBody.message
        : createParseSessionErrorMessage,
    );
  }

  if (
    !responseBody ||
    typeof responseBody !== 'object' ||
    typeof (responseBody as { sessionId?: unknown }).sessionId !== 'string'
  ) {
    throw new Error(createParseSessionErrorMessage);
  }

  return responseBody as CreateParsingSessionResponse;
}

export function CreateRecipePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<CreateRecipeMode>('manual');
  const [parseUrl, setParseUrl] = useState('');
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle');
  const [parseMessage, setParseMessage] = useState('');
  const [parseSession, setParseSession] = useState<ParseSessionState>(createInitialParseSessionState);
  const [draft, setDraft] = useState<RecipeDraft>(createInitialDraft);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const activeCoverPreviewUrlRef = useRef<string | null>(null);
  const parseEventSourceRef = useRef<EventSource | null>(null);
  const parseSessionCompletedRef = useRef(false);
  const lastParseErrorMessageRef = useRef('');

  useEffect(() => {
    return () => {
      if (activeCoverPreviewUrlRef.current) {
        URL.revokeObjectURL(activeCoverPreviewUrlRef.current);
      }

      parseEventSourceRef.current?.close();
    };
  }, []);

  const closeParseStream = () => {
    parseEventSourceRef.current?.close();
    parseEventSourceRef.current = null;
  };

  const resetParseState = () => {
    closeParseStream();
    parseSessionCompletedRef.current = false;
    lastParseErrorMessageRef.current = '';
    setParseStatus('idle');
    setParseMessage('');
    setParseSession(createInitialParseSessionState());
  };

  const setParseStage = (stage: ParsingStage, detailMessage: string, progress?: number) => {
    setParseSession((current) => ({
      ...current,
      stage,
      stageLabel: resolveParsingStageLabel(stage),
      detailMessage,
      progress: resolveParsingProgress(stage, progress),
    }));
  };

  const handleParseFailure = (message: string) => {
    const nextMessage = message || parseErrorMessage;

    lastParseErrorMessageRef.current = nextMessage;
    parseSessionCompletedRef.current = true;
    closeParseStream();
    setParseStatus('error');
    setParseMessage(nextMessage);
    setParseSession((current) => ({
      ...current,
      stage: 'failed',
      stageLabel: resolveParsingStageLabel('failed'),
      detailMessage: nextMessage,
      progress: null,
    }));
  };

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
    const url = parseUrl.trim();

    if (!url) {
      return;
    }

    closeParseStream();
    parseSessionCompletedRef.current = false;
    lastParseErrorMessageRef.current = '';
    setParseStatus('loading');
    setParseMessage('');
    setParseSession({
      sessionId: null,
      stage: 'parse_link',
      stageLabel: resolveParsingStageLabel('parse_link'),
      detailMessage: parsePreparingMessage,
      progress: resolveParsingProgress('parse_link', 4),
      resultText: '',
      recipeDraft: null,
    });

    try {
      const { sessionId } = await createDouyinParseSession(url);
      const eventSource = new EventSource(
        `/api/parsing/douyin/sessions/${encodeURIComponent(sessionId)}/events`,
      );
      parseEventSourceRef.current = eventSource;

      setParseSession((current) => ({
        ...current,
        sessionId,
      }));

      eventSource.addEventListener('stage', (event) => {
        const payload = parseEventPayload<ParsingStageEvent>(event);

        if (!payload) {
          return;
        }

        setParseStage(payload.stage, payload.message, payload.progress);

        if (payload.stage === 'failed') {
          setParseStatus('error');
          setParseMessage(payload.message);
          lastParseErrorMessageRef.current = payload.message;
        }
      });

      eventSource.addEventListener('progress', (event) => {
        const payload = parseEventPayload<ParsingProgressEvent>(event);

        if (!payload) {
          return;
        }

        setParseStatus('loading');
        setParseStage(payload.stage, payload.message, payload.progress);
      });

      eventSource.addEventListener('result', (event) => {
        const payload = parseEventPayload<ParsingResultEvent>(event);

        if (!payload) {
          return;
        }

        console.log('[douyin-parse]', payload.text);
        setParseSession((current) => ({
          ...current,
          resultText: payload.text,
          recipeDraft: payload.recipeDraft ?? current.recipeDraft,
        }));
      });

      eventSource.addEventListener('parse_error', (event) => {
        const payload = parseEventPayload<ParsingParseErrorEvent>(event);

        if (payload) {
          handleParseFailure(payload.message);
        }
      });

      eventSource.addEventListener('error', (event) => {
        const payload = parseEventPayload<ParsingErrorEvent>(event);

        if (payload) {
          handleParseFailure(payload.message);
        }
      });

      eventSource.addEventListener('done', (event) => {
        const payload = parseEventPayload<ParsingDoneEvent>(event);

        if (!payload) {
          return;
        }

        parseSessionCompletedRef.current = true;
        closeParseStream();

        if (payload.status === 'completed') {
          setParseStage('completed', parseSuccessMessage, 100);
          setParseStatus('success');
          setParseMessage(parseSuccessMessage);
          return;
        }

        handleParseFailure(lastParseErrorMessageRef.current || parseErrorMessage);
      });

      eventSource.onerror = () => {
        if (parseSessionCompletedRef.current) {
          return;
        }

        handleParseFailure(parseStreamDisconnectedMessage);
      };
    } catch (error) {
      handleParseFailure(error instanceof Error ? error.message : parseRequestErrorMessage);
    }
  };

  const handleConfirmParseResult = () => {
    if (!parseSession.recipeDraft) {
      return;
    }

    clearSubmitError();

    if (activeCoverPreviewUrlRef.current) {
      URL.revokeObjectURL(activeCoverPreviewUrlRef.current);
      activeCoverPreviewUrlRef.current = null;
    }

    setDraft(createDraftFromStructuredRecipe(parseSession.recipeDraft));
    setCoverPreviewUrl(parseSession.recipeDraft.coverImage);
    setMode('manual');
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
  const isParseResultModalOpen =
    mode === 'parse' && parseStatus === 'success' && Boolean(parseSession.recipeDraft);

  return (
    <>
    <main
      className="min-h-screen bg-[#FEFDFB]"
      inert={isParseResultModalOpen ? true : undefined}
      aria-hidden={isParseResultModalOpen ? true : undefined}
    >
      <CreateRecipeHeader onBack={handleCancel} />
      <div className="mx-auto w-full max-w-[848px] px-4 pb-8 pt-[72px] lg:pb-0 lg:pt-[101px]">
        <CreateRecipeTabs mode={mode} onChange={setMode} />

        <div className="mt-4 lg:mt-8">
          {mode === 'parse' ? (
            <ParseRecipeSection
              url={parseUrl}
              status={parseStatus}
              message={parseMessage}
              progress={parseSession.progress}
              stageLabel={parseSession.stageLabel}
              detailMessage={parseSession.detailMessage}
              isStreaming={parseStatus === 'loading'}
              onUrlChange={(value) => {
                setParseUrl(value);
                if (parseStatus !== 'idle' || parseSession.sessionId) {
                  resetParseState();
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
                label="配料列表"
                helperText="使用列表格式输入配料，例如：鸡蛋 - 2个"
                value={draft.ingredientsJson}
                variant="ingredients"
                onChange={(value) => updateRichTextDraft('ingredients', value)}
              />
              <RichTextEditor
                label="制作步骤"
                helperText="使用有序列表详细描述每一步的操作过程"
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
      {isParseResultModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(34,28,24,0.46)] px-4 py-6 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="parse-result-dialog-title"
            className="w-full max-w-[420px] rounded-[18px] bg-[#FFFDFC] px-6 py-6 text-center shadow-[0_28px_80px_rgba(45,37,32,0.22)]"
          >
            <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-[rgba(45,37,32,0.42)]">
              Parse Complete
            </p>
            <h2
              id="parse-result-dialog-title"
              className="mt-3 text-[20px] font-semibold leading-7 text-[#2D2520]"
            >
              菜谱已结构化完成
            </h2>
            <p className="mt-3 text-[14px] leading-6 text-[#6F6259]">
              已生成标题、配料、步骤、分类、标签和封面信息。
            </p>
            <button
              type="button"
              onClick={handleConfirmParseResult}
              autoFocus
              className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-[#EA5D38] text-[15px] font-medium leading-5 text-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:bg-[#D94E2D] hover:shadow-[0_12px_26px_rgba(234,93,56,0.22)] focus:outline-none focus:ring-2 focus:ring-[#EA5D38]/30 active:translate-y-0"
            >
              进入手动编辑
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
