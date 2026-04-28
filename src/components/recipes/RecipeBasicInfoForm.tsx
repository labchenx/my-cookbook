import { fixedRecipeTags, maxRecipeTagCount } from '../../domain/recipeTags';
import { recipeSoftButtonInteractive } from './buttonStyles';
import { RecipeField } from './RecipeField';
import { RecipeSectionCard } from './RecipeSectionCard';
import { UploadPlaceholder } from './UploadPlaceholder';

type RecipeBasicInfoFormProps = {
  title: string;
  coverImageName: string;
  coverPreviewUrl?: string | null;
  tags: string[];
  isCoverUploading?: boolean;
  onTitleChange: (value: string) => void;
  onCoverSelect: (file: File) => void | Promise<void>;
  onTagToggle: (tag: string) => void;
};

export function RecipeBasicInfoForm({
  title,
  coverImageName,
  coverPreviewUrl = null,
  tags,
  isCoverUploading = false,
  onTitleChange,
  onCoverSelect,
  onTagToggle,
}: RecipeBasicInfoFormProps) {
  return (
    <RecipeSectionCard>
      <h2 className="text-[16px] font-semibold leading-6 text-[#2D2520] lg:text-[18px] lg:leading-7">
        基本信息
      </h2>
      <div className="mt-3 space-y-3 lg:mt-4 lg:space-y-4">
        <RecipeField
          id="recipe-title"
          label="菜谱标题"
          value={title}
          placeholder="例如：番茄炒蛋"
          onChange={(event) => onTitleChange(event.target.value)}
        />

        <div>
          <span className="mb-2 block text-[14px] font-medium leading-5 text-[#2D2520]">
            封面图片
          </span>
          <UploadPlaceholder
            id="recipe-cover-upload"
            variant="cover"
            fileName={coverImageName}
            previewUrl={coverPreviewUrl}
            alt={title.trim() ? `${title.trim()} 封面预览` : '菜谱封面预览'}
            isUploading={isCoverUploading}
            onSelect={onCoverSelect}
          />
        </div>

        <div>
          <span className="mb-2 block text-[14px] font-medium leading-5 text-[#2D2520]">
            标签
          </span>
          <div className="flex flex-wrap gap-2">
            {fixedRecipeTags.map((tag) => {
              const isSelected = tags.includes(tag);
              const isDisabled = !isSelected && tags.length >= maxRecipeTagCount;

              return (
                <button
                  key={tag}
                  type="button"
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  onClick={() => onTagToggle(tag)}
                  className={`rounded-xl border px-3 py-1.5 text-[13px] font-medium leading-5 transition-[color,background-color,border-color,opacity] lg:rounded-2xl lg:px-4 lg:text-[14px] ${
                    isSelected
                      ? 'border-[#EA5D38] bg-[#FEF4ED] text-[#2D2520]'
                      : 'border-[rgba(45,37,32,0.1)] bg-[#FAF7F5] text-[#6F6259] hover:border-[#ffd1b8] hover:bg-[#fff5ef]'
                  } ${isDisabled ? 'cursor-not-allowed opacity-45 hover:border-[rgba(45,37,32,0.1)] hover:bg-[#FAF7F5]' : recipeSoftButtonInteractive}`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </RecipeSectionCard>
  );
}
