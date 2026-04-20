import {
  recipePrimaryButtonInteractive,
  recipeSecondaryButtonInteractive,
} from './buttonStyles';

type ActionBarProps = {
  onCancel: () => void;
  onPublish: () => void;
  isSubmitting?: boolean;
};

const secondaryButtonClass =
  `h-[41px] rounded-xl border border-[rgba(45,37,32,0.1)] bg-white px-4 text-[14px] font-medium leading-5 text-[#2D2520] lg:h-[49px] lg:rounded-2xl lg:px-6 lg:text-[16px] lg:leading-6 ${recipeSecondaryButtonInteractive}`;

export function ActionBar({
  onCancel,
  onPublish,
  isSubmitting = false,
}: ActionBarProps) {
  const publishLabel = isSubmitting ? '发布中...' : '发布';

  return (
    <div className="flex items-center justify-end gap-2 pb-4 lg:gap-3 lg:pb-8">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className={`${secondaryButtonClass} min-w-[61px] disabled:cursor-not-allowed disabled:opacity-60 lg:min-w-[81px]`}
      >
        取消
      </button>
      <button
        type="button"
        onClick={onPublish}
        disabled={isSubmitting}
        className={`h-10 min-w-[60px] rounded-xl bg-[#EA5D38] px-4 text-[14px] font-medium leading-5 text-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.08)] disabled:cursor-not-allowed disabled:opacity-60 lg:h-12 lg:min-w-[80px] lg:rounded-2xl lg:px-6 lg:text-[16px] lg:leading-6 ${recipePrimaryButtonInteractive}`}
      >
        {publishLabel}
      </button>
    </div>
  );
}
