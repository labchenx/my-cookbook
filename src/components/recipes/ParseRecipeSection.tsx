import linkIcon from '../../assets/create-recipe/link-icon.svg';
import { RecipeSectionCard } from './RecipeSectionCard';
import { recipePrimaryButtonInteractive } from './buttonStyles';

type ParseRecipeSectionProps = {
  url: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  progress: number | null;
  stageLabel: string;
  detailMessage: string;
  isStreaming: boolean;
  onUrlChange: (value: string) => void;
  onSubmit: () => void;
};

export function ParseRecipeSection({
  url,
  status,
  message,
  progress,
  stageLabel,
  detailMessage,
  isStreaming,
  onUrlChange,
  onSubmit,
}: ParseRecipeSectionProps) {
  const isBusy = isStreaming || status === 'loading';
  const isDisabled = !url.trim() || isBusy;
  const normalizedProgress = typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : null;
  const showProgressPanel = status !== 'idle';
  const progressToneClass =
    status === 'error'
      ? 'from-[#F7C7BC] via-[#F1A794] to-[#EA5D38]'
      : 'from-[#F6D9C4] via-[#F0A66E] to-[#EA5D38]';
  const detailToneClass = status === 'error' ? 'text-[#B34F34]' : 'text-[#6F6259]';

  return (
    <RecipeSectionCard className="px-6 py-6 lg:px-[88px] lg:py-8">
      <div className="flex flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEF4ED] lg:h-16 lg:w-16">
          <img src={linkIcon} alt="" className="h-7 w-7 lg:h-8 lg:w-8" />
        </div>
        <h2 className="mt-3 text-[16px] font-semibold leading-6 text-[#2D2520] lg:mt-4 lg:text-[18px] lg:leading-7">
          粘贴视频链接
        </h2>
        <p className="mt-2 text-center text-[14px] leading-5 text-[#827971]">
          使用脚本解析流程，实时展示阶段进度；本轮只输出原始文案，后续可继续接入结构化和 Markdown 生成。
        </p>
      </div>

      <div className="mt-6">
        <input
          type="url"
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="https://example.com/recipe/123"
          className="h-[45px] w-full rounded-xl border border-[rgba(45,37,32,0.1)] bg-[#FAF7F5] px-4 text-[14px] leading-5 text-[#2D2520] outline-none placeholder:text-[rgba(45,37,32,0.5)] focus:border-[#EA5D38] lg:h-[49px] lg:rounded-2xl lg:text-[16px]"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={isDisabled}
          className={`mt-3 flex h-[44px] w-full items-center justify-center rounded-xl text-[14px] font-medium leading-5 text-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.08)] transition lg:mt-4 lg:h-12 lg:rounded-2xl lg:text-[16px] lg:leading-6 ${
            isDisabled
              ? 'cursor-not-allowed bg-[#EA5D38]/50'
              : `bg-[#EA5D38] ${recipePrimaryButtonInteractive}`
          }`}
        >
          {isBusy ? '解析中...' : '解析'}
        </button>

        {showProgressPanel ? (
          <section className="mt-4 overflow-hidden rounded-2xl border border-[rgba(45,37,32,0.08)] bg-[linear-gradient(180deg,rgba(255,250,246,0.96),rgba(255,255,255,0.98))] px-4 py-4 shadow-[0_18px_45px_rgba(66,36,18,0.06)] lg:px-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-[rgba(45,37,32,0.42)]">
                  Parsing Flow
                </p>
                <h3 className="mt-1 text-[15px] font-semibold leading-6 text-[#2D2520] lg:text-[16px]">
                  {stageLabel || (status === 'error' ? '解析失败' : '准备解析')}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[rgba(45,37,32,0.36)]">
                  Progress
                </p>
                <p className="mt-1 text-[18px] font-semibold leading-6 text-[#2D2520]">
                  {normalizedProgress !== null ? `${normalizedProgress}%` : '--'}
                </p>
              </div>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(45,37,32,0.08)]">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${progressToneClass} transition-[width] duration-500 ease-out`}
                style={{ width: `${normalizedProgress ?? 8}%` }}
              />
            </div>

            <div className="mt-4 space-y-2">
              <p className={`text-[13px] leading-5 ${detailToneClass}`}>{detailMessage || message}</p>
              {message && detailMessage && message !== detailMessage ? (
                <p
                  className={`text-[12px] leading-5 ${
                    status === 'error' ? 'text-[#EA5D38]' : 'text-[#8F7F73]'
                  }`}
                >
                  {message}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </RecipeSectionCard>
  );
}
