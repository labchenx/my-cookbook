import uploadLargeIcon from '../../assets/create-recipe/upload-large.svg';
import uploadSmallIcon from '../../assets/create-recipe/upload-small.svg';
import { recipeUploadInteractive } from './buttonStyles';

type UploadPlaceholderProps = {
  id: string;
  onSelect: (file: File) => void | Promise<void>;
  variant: 'cover' | 'step';
  fileName?: string;
  previewUrl?: string | null;
  alt?: string;
  isUploading?: boolean;
};

const variantConfig = {
  cover: {
    wrapper: 'h-[128px] w-[128px] rounded-xl border-[1.5px] lg:h-[160px] lg:w-[160px] lg:rounded-2xl',
    icon: uploadLargeIcon,
    iconSize: 'h-7 w-7 lg:h-8 lg:w-8',
  },
  step: {
    wrapper: 'h-[112px] w-[112px] rounded-xl border-[1.5px] lg:h-[128px] lg:w-[128px] lg:rounded-2xl',
    icon: uploadSmallIcon,
    iconSize: 'h-5 w-5 lg:h-6 lg:w-6',
  },
} as const;

export function UploadPlaceholder({
  id,
  onSelect,
  variant,
  fileName,
  previewUrl = null,
  alt = '',
  isUploading = false,
}: UploadPlaceholderProps) {
  const config = variantConfig[variant];
  const hasPreview = typeof previewUrl === 'string' && previewUrl.trim().length > 0;
  const statusLabel = isUploading ? '上传中...' : fileName ? '已上传图片' : hasPreview ? '已选择图片' : '上传图片';

  return (
    <label
      htmlFor={id}
      className={`relative flex cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden border border-dashed border-[rgba(45,37,32,0.1)] bg-white text-center ${config.wrapper} ${recipeUploadInteractive} ${
        isUploading ? 'pointer-events-none opacity-70' : ''
      }`}
    >
      {hasPreview ? (
        <>
          <img
            src={previewUrl}
            alt={alt}
            className="absolute inset-0 h-full w-full object-cover"
            data-testid={`${id}-preview`}
          />
          <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(45,37,32,0)_0%,rgba(45,37,32,0.75)_100%)] px-2 py-2 text-white">
            <span className="block text-[12px] leading-4">{statusLabel}</span>
          </div>
        </>
      ) : (
        <>
          <img src={config.icon} alt="" className={config.iconSize} />
          <span className="text-[12px] leading-4 text-[#827971]">{statusLabel}</span>
        </>
      )}
      <input
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={isUploading}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void onSelect(file);
          }

          event.currentTarget.value = '';
        }}
      />
    </label>
  );
}
