import { useEffect, useMemo, useState } from 'react';
import type {
  XhsDownloaderDetailResponse,
  XhsRecipeStructuringResponse,
} from '../../features/parsing/types';

async function readJsonResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<{ payload: T | null; errorMessage: string | null }> {
  const responseBody = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    return {
      payload: responseBody as T | null,
      errorMessage:
        typeof responseBody?.message === 'string' && responseBody.message.trim().length > 0
          ? responseBody.message
          : fallbackMessage,
    };
  }

  return {
    payload: responseBody as T,
    errorMessage: null,
  };
}

export function XhsDownloaderTestPage() {
  const [noteUrl, setNoteUrl] = useState('');
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [detailErrorMessage, setDetailErrorMessage] = useState('');
  const [detailResult, setDetailResult] = useState<XhsDownloaderDetailResponse | null>(null);
  const [isStructuringRecipe, setIsStructuringRecipe] = useState(false);
  const [recipeErrorMessage, setRecipeErrorMessage] = useState('');
  const [recipeResult, setRecipeResult] = useState<XhsRecipeStructuringResponse | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'XHS Downloader Test';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  const rawPayloadJson = useMemo(() => {
    if (!detailResult?.data) {
      return '';
    }

    return JSON.stringify(detailResult.data.raw, null, 2);
  }, [detailResult]);

  const recipeDraftJson = useMemo(() => {
    if (!recipeResult?.data) {
      return '';
    }

    return JSON.stringify(recipeResult.data.recipeDraft, null, 2);
  }, [recipeResult]);

  const recipePayloadJson = useMemo(() => {
    if (!recipeResult?.data) {
      return '';
    }

    return JSON.stringify(recipeResult.data.recipePayload, null, 2);
  }, [recipeResult]);

  const handleParse = async () => {
    const normalizedUrl = noteUrl.trim();

    if (!normalizedUrl) {
      return;
    }

    setIsFetchingDetail(true);
    setDetailErrorMessage('');
    setRecipeErrorMessage('');
    setRecipeResult(null);

    try {
      const response = await fetch('/api/parsing/xhs-downloader/detail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      const { payload, errorMessage: nextErrorMessage } = await readJsonResponse<XhsDownloaderDetailResponse>(
        response,
        'Failed to fetch XHS Downloader detail.',
      );

      setDetailResult(payload);
      setDetailErrorMessage(nextErrorMessage ?? '');
    } catch (error) {
      setDetailResult(null);
      setDetailErrorMessage(
        error instanceof Error ? error.message : 'Failed to fetch XHS Downloader detail.',
      );
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const handleStructureRecipe = async () => {
    if (!detailResult?.data || detailResult.data.status !== 'ready') {
      return;
    }

    setIsStructuringRecipe(true);
    setRecipeErrorMessage('');

    try {
      const response = await fetch('/api/parsing/xhs-downloader/structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ detail: detailResult.data }),
      });
      const { payload, errorMessage: nextErrorMessage } =
        await readJsonResponse<XhsRecipeStructuringResponse>(
          response,
          'Failed to structure the Xiaohongshu content into a recipe draft.',
        );

      setRecipeResult(payload);
      setRecipeErrorMessage(nextErrorMessage ?? '');
    } catch (error) {
      setRecipeResult(null);
      setRecipeErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to structure the Xiaohongshu content into a recipe draft.',
      );
    } finally {
      setIsStructuringRecipe(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7f3,_#f4ece7_58%,_#ebe3dd)] px-4 py-8 text-[#2D2520]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-[28px] border border-[rgba(45,37,32,0.08)] bg-[rgba(255,253,251,0.88)] px-6 py-8 shadow-[0_24px_80px_rgba(57,39,29,0.08)] backdrop-blur">
          <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-[#C56A47]">
            Hidden Dev Route
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">XHS Downloader Test</h1>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#6F6259]">
            This page proxies the external <code>XHS-Downloader</code> API and always sends
            <code> download: false</code>. We only validate note detail data here before deciding
            whether to add media download or model parsing later.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
          <div className="space-y-6">
            <section className="rounded-[24px] border border-[rgba(45,37,32,0.08)] bg-white/90 p-6 shadow-[0_18px_50px_rgba(57,39,29,0.06)]">
              <h2 className="text-xl font-semibold">Request</h2>
              <p className="mt-2 text-sm leading-6 text-[#6F6259]">
                Paste a full Xiaohongshu note URL. The backend will forward it to
                <code> /xhs/detail</code> with <code>download: false</code>.
              </p>

              <label className="mt-4 block text-sm font-medium" htmlFor="xhs-downloader-note-url">
                Xiaohongshu note URL
              </label>
              <textarea
                id="xhs-downloader-note-url"
                value={noteUrl}
                onChange={(event) => setNoteUrl(event.target.value)}
                placeholder="https://www.xiaohongshu.com/explore/...?...&xsec_token=..."
                className="mt-2 min-h-32 w-full rounded-[22px] border border-[rgba(45,37,32,0.1)] bg-[#FBF8F6] px-4 py-4 text-sm leading-6 outline-none transition placeholder:text-[rgba(45,37,32,0.42)] focus:border-[#EA5D38]"
              />

              <button
                type="button"
                onClick={handleParse}
                disabled={!noteUrl.trim() || isFetchingDetail}
                className="mt-4 rounded-full bg-[#2D2520] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#171210] disabled:cursor-not-allowed disabled:bg-[#2D2520]/45"
              >
                {isFetchingDetail ? 'Requesting...' : 'Fetch Note Detail'}
              </button>

              <button
                type="button"
                onClick={handleStructureRecipe}
                disabled={
                  !detailResult?.data ||
                  detailResult.data.status !== 'ready' ||
                  isFetchingDetail ||
                  isStructuringRecipe
                }
                className="mt-3 rounded-full border border-[#2D2520]/16 bg-white px-5 py-2.5 text-sm font-medium text-[#2D2520] transition hover:border-[#2D2520]/28 hover:bg-[#F7F2EE] disabled:cursor-not-allowed disabled:border-[#2D2520]/10 disabled:text-[#2D2520]/35"
              >
                {isStructuringRecipe ? 'Structuring...' : 'Structure Recipe Draft'}
              </button>

              {detailErrorMessage ? (
                <div className="mt-4 rounded-2xl border border-[rgba(234,93,56,0.18)] bg-[#fff7f4] px-4 py-3 text-sm text-[#A04F38]">
                  {detailErrorMessage}
                </div>
              ) : null}

              {recipeErrorMessage ? (
                <div className="mt-3 rounded-2xl border border-[rgba(234,93,56,0.18)] bg-[#fff7f4] px-4 py-3 text-sm text-[#A04F38]">
                  {recipeErrorMessage}
                </div>
              ) : null}
            </section>

            <section className="rounded-[24px] border border-[rgba(45,37,32,0.08)] bg-white/90 p-6 shadow-[0_18px_50px_rgba(57,39,29,0.06)]">
              <h2 className="text-xl font-semibold">Service Status</h2>
              <p className="mt-2 text-sm leading-6 text-[#6F6259]">
                This shows which XHS Downloader API target the project is using and whether the
                service was reused, auto-started, or is currently unavailable.
              </p>

              {detailResult?.data ? (
                <dl className="mt-4 space-y-3 text-sm leading-6">
                  <div>
                    <dt className="font-medium text-[#6F6259]">Proxy message</dt>
                    <dd>{detailResult.message}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Upstream API</dt>
                    <dd>{detailResult.data.service.apiBaseUrl}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Status</dt>
                    <dd>{detailResult.data.status}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Service source</dt>
                    <dd>{detailResult.data.service.source}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Service available</dt>
                    <dd>{detailResult.data.service.available ? 'true' : 'false'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Project root configured</dt>
                    <dd>{detailResult.data.service.projectRootConfigured ? 'true' : 'false'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Service message</dt>
                    <dd>{detailResult.data.service.message}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[#6F6259]">
                  No response yet. Once the request returns, this panel will show the proxy status
                  and downloader service state.
                </p>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[24px] border border-[rgba(45,37,32,0.08)] bg-white/90 p-6 shadow-[0_18px_50px_rgba(57,39,29,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">Normalized Summary</h2>
                {detailResult?.data ? (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] ${
                      detailResult.data.status === 'ready'
                        ? 'bg-[#FDF0E8] text-[#C56A47]'
                        : 'bg-[#FFF2EE] text-[#B34F34]'
                    }`}
                  >
                    {detailResult.data.status === 'ready' ? 'Ready' : 'Upstream Failed'}
                  </span>
                ) : null}
              </div>

              {detailResult?.data ? (
                <dl className="mt-4 space-y-4 text-sm leading-6">
                  <div>
                    <dt className="font-medium text-[#6F6259]">URL</dt>
                    <dd className="break-all">{detailResult.data.url}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Title</dt>
                    <dd>{detailResult.data.summary.title || 'Unavailable'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Author</dt>
                    <dd>{detailResult.data.summary.author || 'Unavailable'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Content</dt>
                    <dd className="whitespace-pre-wrap">
                      {detailResult.data.summary.contentText || 'Unavailable'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Images</dt>
                    <dd>
                      {detailResult.data.summary.images.length > 0 ? (
                        <ul className="space-y-2">
                          {detailResult.data.summary.images.map((imageUrl) => (
                            <li key={imageUrl} className="break-all text-[#C56A47]">
                              {imageUrl}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        'No image URLs found in the normalized payload.'
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Videos</dt>
                    <dd>
                      {detailResult.data.summary.videos.length > 0 ? (
                        <ul className="space-y-2">
                          {detailResult.data.summary.videos.map((videoUrl) => (
                            <li key={videoUrl} className="break-all text-[#C56A47]">
                              {videoUrl}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        'No video URLs found in the normalized payload.'
                      )}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[#6F6259]">
                  Parse a note to inspect the normalized data we can later feed into a model layer.
                </p>
              )}
            </section>

            <section className="rounded-[24px] border border-[rgba(45,37,32,0.08)] bg-[#201a16] p-6 text-[#F5EEE9] shadow-[0_18px_50px_rgba(21,14,11,0.24)]">
              <h2 className="text-xl font-semibold">Raw Upstream Payload</h2>
              <p className="mt-2 text-sm leading-6 text-[rgba(245,238,233,0.72)]">
                Keep this visible so we can inspect the exact downloader response before building the
                model parsing layer.
              </p>
              <p className="mt-2 text-sm leading-6 text-[rgba(245,238,233,0.72)]">
                Current proxy mode: <code>download: false</code>
              </p>

              <pre className="mt-4 overflow-x-auto rounded-[18px] bg-[rgba(255,255,255,0.06)] p-4 text-xs leading-6">
                {rawPayloadJson || 'No raw payload yet.'}
              </pre>
            </section>

            <section className="rounded-[24px] border border-[rgba(45,37,32,0.08)] bg-white/90 p-6 shadow-[0_18px_50px_rgba(57,39,29,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">Recipe Draft</h2>
                {recipeResult?.data ? (
                  <span className="rounded-full bg-[#EDF7F1] px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-[#2C7A56]">
                    Structured
                  </span>
                ) : null}
              </div>

              {recipeResult?.data ? (
                <dl className="mt-4 space-y-4 text-sm leading-6">
                  <div>
                    <dt className="font-medium text-[#6F6259]">Model</dt>
                    <dd>{recipeResult.data.model}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Title</dt>
                    <dd>{recipeResult.data.recipeDraft.title}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Category</dt>
                    <dd>{recipeResult.data.recipeDraft.category}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Tags</dt>
                    <dd>{recipeResult.data.recipeDraft.tags.join(' / ') || 'None'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Ingredients</dt>
                    <dd>
                      <ul className="space-y-2">
                        {recipeResult.data.recipeDraft.ingredients.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#6F6259]">Steps</dt>
                    <dd>
                      <ol className="space-y-2 pl-5">
                        {recipeResult.data.recipeDraft.steps.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ol>
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-4 text-sm leading-6 text-[#6F6259]">
                  Once the XHS detail succeeds, this area will show the Bailian-structured recipe draft.
                </p>
              )}
            </section>

            <section className="rounded-[24px] border border-[rgba(45,37,32,0.08)] bg-white/90 p-6 shadow-[0_18px_50px_rgba(57,39,29,0.06)]">
              <h2 className="text-xl font-semibold">Project Recipe Payload</h2>
              <p className="mt-2 text-sm leading-6 text-[#6F6259]">
                This is the draft payload shape that already matches the project recipe create contract.
              </p>

              <pre className="mt-4 overflow-x-auto rounded-[18px] bg-[#FBF8F6] p-4 text-xs leading-6 text-[#2D2520]">
                {recipePayloadJson || 'No recipe payload yet.'}
              </pre>
            </section>

            <section className="rounded-[24px] border border-[rgba(45,37,32,0.08)] bg-white/90 p-6 shadow-[0_18px_50px_rgba(57,39,29,0.06)]">
              <h2 className="text-xl font-semibold">Recipe Draft Raw JSON</h2>
              <pre className="mt-4 overflow-x-auto rounded-[18px] bg-[#FBF8F6] p-4 text-xs leading-6 text-[#2D2520]">
                {recipeDraftJson || 'No recipe draft yet.'}
              </pre>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
