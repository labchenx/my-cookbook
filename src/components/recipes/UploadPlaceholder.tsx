import uploadLargeIcon from '../../assets/create-recipe/upload-large.svg';
import uploadSmallIcon from '../../assets/create-recipe/upload-small.svg';
import { recipeUploadInteractive } from './buttonStyles';

type UploadPlaceholderProps = {
  id: string;
  onSelect: (fileName: string) => void;
  variant: 'cover' | 'step';
  fileName?: string;
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

export function UploadPlaceholder({ id, onSelect, variant, fileName }: UploadPlaceholderProps) {
  const config = variantConfig[variant];

  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-[rgba(45,37,32,0.1)] bg-white text-center ${config.wrapper} ${recipeUploadInteractive}`}
    >
      <img src={config.icon} alt="" className={config.iconSize} />
      <span className="text-[12px] leading-4 text-[#827971]">
        {fileName ? '已选择图片' : '上传图片'}
      </span>
      <input
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onSelect(file.name);
          }
        }}
      />
    </label>
  );
}
