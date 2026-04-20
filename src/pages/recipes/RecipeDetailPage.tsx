import type { JSONContent } from '@tiptap/core';
import { startTransition, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RecipeDetailState } from '../../components/recipes/RecipeDetailState';
import { RecipeHeader } from '../../components/recipes/RecipeHeader';
import {
  createRichTextMarkup,
  richTextJsonToHtml,
  richTextJsonToText,
} from '../../components/recipes/richTextUtils';
import type { RecipeDetail, RecipeDetailStatus } from './recipeDetailTypes';

type IngredientItem = {
  amount: string;
  name: string;
};

type StepsContent =
  | {
      kind: 'html';
      value: string;
    }
  | {
      kind: 'text';
      value: string;
    }
  | {
      kind: 'empty';
      value: '';
    };

type StepsContentCardProps = {
  content: StepsContent;
};

type FlashMessageState = {
  flashMessage: {
    type: 'success';
    text: string;
  };
};

type IngredientCardProps = {
  emptyMessage?: string;
  ingredientItems: IngredientItem[];
  showTitle?: boolean;
};

const referenceNow = new Date('2026-04-12T12:00:00+08:00').getTime();
const listPrefixPattern = /^\s*(?:[-*•]\s*|\d+[.)、]\s*)/u;
const emptyStepsContent: StepsContent = { kind: 'empty', value: '' };

function formatRelativeTime(createdAt: string) {
  const createdAtTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdAtTime)) {
    return createdAt;
  }

  const diff = referenceNow - createdAtTime;
  const hours = Math.max(Math.floor(diff / (1000 * 60 * 60)), 0);

  if (hours < 24) {
    return `${hours}小时前`;
  }

  return `${Math.floor(hours / 24)}天前`;
}

function getStructuredText(text: string | null, json: JSONContent | null) {
  const trimmedText = text?.trim();

  if (trimmedText) {
    return trimmedText;
  }

  const fallbackText = richTextJsonToText(json).trim();
  return fallbackText.length > 0 ? fallbackText : '';
}

function splitContentLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function stripHtmlText(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseIngredientItems(
  ingredientsText: string | null,
  ingredientsJson: JSONContent | null,
): IngredientItem[] {
  const value = getStructuredText(ingredientsText, ingredientsJson);

  if (!value) {
    return [];
  }

  return splitContentLines(value)
    .map((line) => line.replace(listPrefixPattern, '').trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const separatorIndex = line.lastIndexOf(' - ');

      if (separatorIndex < 0) {
        return {
          amount: '',
          name: line,
        };
      }

      return {
        amount: line.slice(separatorIndex + 3).trim(),
        name: line.slice(0, separatorIndex).trim(),
      };
    })
    .filter((item) => item.name.length > 0 || item.amount.length > 0);
}

function getStepsContent(
  stepsHtml: string | null,
  stepsText: string | null,
  stepsJson: JSONContent | null,
): StepsContent {
  const trimmedHtml = stepsHtml?.trim();

  if (trimmedHtml && stripHtmlText(trimmedHtml)) {
    return {
      kind: 'html',
      value: trimmedHtml,
    };
  }

  const jsonText = richTextJsonToText(stepsJson).trim();

  if (jsonText) {
    return {
      kind: 'html',
      value: richTextJsonToHtml(stepsJson),
    };
  }

  const trimmedText = stepsText?.trim();

  if (trimmedText) {
    return {
      kind: 'text',
      value: trimmedText,
    };
  }

  return {
    kind: 'empty',
    value: '',
  };
}

async function loadRecipeDetail(id: string, signal: AbortSignal): Promise<RecipeDetail | null> {
  const response = await fetch(`/api/recipes/${encodeURIComponent(id)}`, { signal });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to load recipe detail');
  }

  return (await response.json()) as RecipeDetail;
}

async function deleteRecipe(id: string, signal?: AbortSignal): Promise<'deleted' | 'missing'> {
  const response = await fetch(`/api/recipes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    signal,
  });

  if (response.status === 404) {
    return 'missing';
  }

  if (!response.ok) {
    throw new Error('Failed to delete recipe');
  }

  return 'deleted';
}

function IngredientCard({
  ingredientItems,
  emptyMessage = '暂无配料信息',
  showTitle = true,
}: IngredientCardProps) {
  return (
    <>
      {showTitle ? (
        <h2 className="text-[18px] font-semibold leading-7 text-[#2D2520] md:text-[20px] md:leading-7">
          配料清单
        </h2>
      ) : null}
      <div className={showTitle ? 'mt-4 space-y-0' : 'space-y-0'}>
        {ingredientItems.length > 0 ? (
          ingredientItems.map((item, index) => (
            <div
              key={`${item.name}-${item.amount}-${index}`}
              className={`flex items-center justify-between gap-4 py-3 ${
                index < ingredientItems.length - 1 ? 'border-b border-[rgba(45,37,32,0.1)]' : ''
              }`}
            >
              <span className="text-[15px] leading-6 text-[#2D2520] md:text-[16px]">{item.name}</span>
              {item.amount ? (
                <span className="shrink-0 text-[15px] font-medium leading-6 text-[#827971] md:text-[16px]">
                  {item.amount}
                </span>
              ) : null}
            </div>
          ))
        ) : (
          <p className="py-3 text-[15px] leading-6 text-[#827971]">{emptyMessage}</p>
        )}
      </div>
    </>
  );
}

function StepsContentCard({ content }: StepsContentCardProps) {
  if (content.kind === 'empty') {
    return (
      <div className="rounded-2xl border border-[rgba(45,37,32,0.1)] bg-white px-4 py-5 md:px-6">
        <p className="text-[15px] leading-6 text-[#827971]">暂无步骤内容</p>
      </div>
    );
  }

  if (content.kind === 'text') {
    return (
      <div
        data-testid="recipe-steps-content"
        className="rounded-2xl border border-[rgba(45,37,32,0.1)] bg-white px-4 py-5 md:px-6 md:py-6"
      >
        <p className="whitespace-pre-line text-[15px] leading-[26px] text-[#2D2520] md:text-[16px]">
          {content.value}
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="recipe-steps-content"
      className="rounded-2xl border border-[rgba(45,37,32,0.1)] bg-white px-4 py-5 md:px-6 md:py-6"
    >
      <div
        className="text-[15px] leading-[26px] text-[#2D2520] md:text-[16px] [&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:pl-6 [&_p]:my-0 [&_p+ol]:mt-4 [&_p+p]:mt-4 [&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:pl-6"
        dangerouslySetInnerHTML={createRichTextMarkup(content.value)}
      />
    </div>
  );
}

export function RecipeDetailPage() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [status, setStatus] = useState<RecipeDetailStatus>('loading');
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [isIngredientsExpanded, setIsIngredientsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');

  useEffect(() => {
    const abortController = new AbortController();
    let active = true;

    setStatus('loading');
    setRecipe(null);
    setIsIngredientsExpanded(false);
    setIsDeleting(false);
    setDeleteErrorMessage('');

    if (!id) {
      setStatus('empty');
      return () => {
        active = false;
        abortController.abort();
      };
    }

    loadRecipeDetail(id, abortController.signal)
      .then((data) => {
        if (!active) {
          return;
        }

        startTransition(() => {
          if (data) {
            setRecipe(data);
            setStatus('success');
            return;
          }

          setStatus('empty');
        });
      })
      .catch(() => {
        if (!active || abortController.signal.aborted) {
          return;
        }

        startTransition(() => {
          setStatus('error');
        });
      });

    return () => {
      active = false;
      abortController.abort();
    };
  }, [id, reloadKey]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/recipes');
  };

  const handleDelete = async () => {
    if (!recipe || isDeleting) {
      return;
    }

    const confirmed = window.confirm(
      '\u786e\u8ba4\u5220\u9664\u8fd9\u9053\u83dc\u8c31\u5417\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u6062\u590d\u3002',
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setDeleteErrorMessage('');

    try {
      const result = await deleteRecipe(recipe.id);
      const successMessage =
        result === 'missing'
          ? '\u83dc\u8c31\u5df2\u4e0d\u5b58\u5728\uff0c\u5df2\u8fd4\u56de\u5217\u8868\u3002'
          : '\u83dc\u8c31\u5df2\u5220\u9664\u3002';

      navigate('/recipes', {
        replace: true,
        state: {
          flashMessage: {
            type: 'success',
            text: successMessage,
          },
        } satisfies FlashMessageState,
      });
    } catch {
      setDeleteErrorMessage('\u5220\u9664\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002');
      setIsDeleting(false);
    }
  };

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  const handleBackToList = () => {
    navigate('/recipes');
  };

  const isSuccess = status === 'success' && recipe;
  const stateStatus: Exclude<RecipeDetailStatus, 'success'> =
    status === 'success' ? 'loading' : status;
  const ingredientItems = useMemo(
    () => (recipe ? parseIngredientItems(recipe.ingredientsText, recipe.ingredientsJson) : []),
    [recipe],
  );
  const stepsContent = useMemo(
    () => (recipe ? getStepsContent(recipe.stepsHtml, recipe.stepsText, recipe.stepsJson) : emptyStepsContent),
    [recipe],
  );
  const createdAtLabel = recipe ? formatRelativeTime(recipe.createdAt) : '';

  return (
    <main className="min-h-screen bg-[#FEFDFB]">
      <RecipeHeader
        recipe={isSuccess ? recipe : undefined}
        createdAtLabel={isSuccess ? createdAtLabel : undefined}
        onBack={handleBack}
        onDelete={handleDelete}
        isDeleting={isDeleting}
        deleteDisabled={isDeleting}
      />

      {deleteErrorMessage ? (
        <section className="mx-auto max-w-[1024px] px-4 pt-4 md:px-6">
          <div
            role="alert"
            className="rounded-2xl border border-[rgba(234,93,56,0.12)] bg-white px-4 py-3 text-[14px] leading-5 text-[#9A5D46]"
          >
            {deleteErrorMessage}
          </div>
        </section>
      ) : null}

      {isSuccess ? (
        <div className="mx-auto max-w-[1024px] px-4 pb-10 pt-6 md:px-6 md:pb-14 md:pt-8">
          <div className="grid gap-6 lg:grid-cols-[304px_minmax(0,640px)] lg:items-start lg:gap-8">
            <aside
              data-testid="desktop-ingredients-card"
              className="hidden rounded-2xl border border-[rgba(45,37,32,0.1)] bg-white px-5 py-5 lg:sticky lg:top-8 lg:block md:px-6 md:py-6"
            >
              <IngredientCard ingredientItems={ingredientItems} />
            </aside>

            <section>
              <div className="sticky top-2 z-30 -mx-1 rounded-2xl bg-[#FEFDFB] px-1 pb-3 lg:hidden">
                <button
                  type="button"
                  aria-controls="mobile-ingredients-panel"
                  aria-expanded={isIngredientsExpanded}
                  className="flex w-full items-center justify-between rounded-2xl border border-[rgba(45,37,32,0.1)] bg-white px-4 py-3 text-left shadow-[0_6px_18px_rgba(45,37,32,0.06)]"
                  onClick={() => setIsIngredientsExpanded((current) => !current)}
                >
                  <div>
                    <p className="text-[15px] font-semibold leading-6 text-[#2D2520]">配料清单</p>
                    <p className="text-[13px] leading-5 text-[#827971]">共 {ingredientItems.length} 项</p>
                  </div>
                  <span className="text-[14px] font-medium leading-5 text-[#EA5D38]">
                    {isIngredientsExpanded ? '收起' : '展开'}
                  </span>
                </button>

                {isIngredientsExpanded ? (
                  <div
                    id="mobile-ingredients-panel"
                    aria-label="移动端配料清单"
                    className="absolute left-1 right-1 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-[rgba(45,37,32,0.1)] bg-white shadow-[0_18px_40px_rgba(45,37,32,0.18)]"
                    role="region"
                  >
                    <div className="flex items-center justify-between border-b border-[rgba(45,37,32,0.08)] px-5 py-4">
                      <div>
                        <p className="text-[16px] font-semibold leading-6 text-[#2D2520]">配料清单</p>
                        <p className="text-[13px] leading-5 text-[#827971]">共 {ingredientItems.length} 项</p>
                      </div>
                      <button
                        type="button"
                        className="rounded-xl px-3 py-2 text-[14px] font-medium leading-5 text-[#EA5D38]"
                        onClick={() => setIsIngredientsExpanded(false)}
                      >
                        收起
                      </button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto px-5 py-5">
                      <IngredientCard ingredientItems={ingredientItems} showTitle={false} />
                    </div>
                  </div>
                ) : null}
              </div>

              <h2 className="text-[18px] font-semibold leading-7 text-[#2D2520] md:text-[20px] md:leading-7">
                制作步骤
              </h2>
              <div className="mt-4 md:mt-6">
                <StepsContentCard content={stepsContent} />
              </div>
            </section>
          </div>
        </div>
      ) : (
        <RecipeDetailState
          status={stateStatus}
          onRetry={handleRetry}
          onBackToList={handleBackToList}
        />
      )}
    </main>
  );
}
