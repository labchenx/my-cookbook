import linkIcon from '../../assets/create-recipe/link-icon.svg';
import { RecipeSectionCard } from './RecipeSectionCard';
import { recipePrimaryButtonInteractive } from './buttonStyles';

type ParseRecipeSectionProps = {
  url: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  onUrlChange: (value: string) => void;
  onSubmit: () => void;
};

export function ParseRecipeSection({
  url,
  status,
  message,
  onUrlChange,
  onSubmit,
}: ParseRecipeSectionProps) {
  const isBusy = status === 'loading';
  const isDisabled = !url.trim() || isBusy;

  return (
    <RecipeSectionCard className="px-6 py-6 lg:px-[88px] lg:py-8">
      <div className="flex flex-col items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEF4ED] lg:h-16 lg:w-16">
          <img src={linkIcon} alt="" className="h-7 w-7 lg:h-8 lg:w-8" />
        </div>
        <h2 className="mt-3 text-[16px] font-semibold leading-6 text-[#2D2520] lg:mt-4 lg:text-[18px] lg:leading-7">
          粘贴菜谱链接
        </h2>
        <p className="mt-2 text-[14px] leading-5 text-[#827971]">
          支持小红书、抖音等图文和视频内容的 mock 解析
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
        {status !== 'idle' ? (
          <p
            className={`mt-3 text-[13px] leading-5 ${
              status === 'error' ? 'text-[#EA5D38]' : 'text-[#827971]'
            }`}
          >
            {message}
          </p>
        ) : null}
      </div>
    </RecipeSectionCard>
  );
}
