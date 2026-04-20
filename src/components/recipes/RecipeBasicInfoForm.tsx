import type { KeyboardEvent } from 'react';
import {
  recipeSecondaryButtonInteractive,
  recipeSoftButtonInteractive,
} from './buttonStyles';
import { RecipeField } from './RecipeField';
import { RecipeSectionCard } from './RecipeSectionCard';
import { UploadPlaceholder } from './UploadPlaceholder';

type RecipeBasicInfoFormProps = {
  title: string;
  coverImageName: string;
  coverPreviewUrl?: string | null;
  category: string;
  tagInput: string;
  tags: string[];
  isCoverUploading?: boolean;
  onTitleChange: (value: string) => void;
  onCoverSelect: (file: File) => void | Promise<void>;
  onCategoryChange: (value: string) => void;
  onTagInputChange: (value: string) => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
};

export function RecipeBasicInfoForm({
  title,
  coverImageName,
  coverPreviewUrl = null,
  category,
  tagInput,
  tags,
  isCoverUploading = false,
  onTitleChange,
  onCoverSelect,
  onCategoryChange,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
}: RecipeBasicInfoFormProps) {
  const handleTagEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onAddTag();
    }
  };

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

        <RecipeField
          id="recipe-category"
          label="分类"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
        />

        <div>
          <span className="mb-2 block text-[14px] font-medium leading-5 text-[#2D2520]">
            标签
          </span>
          {tags.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onRemoveTag(tag)}
                  className={`rounded-xl bg-[#FEF4ED] px-3 py-1 text-[12px] leading-4 text-[#2D2520] ${recipeSoftButtonInteractive}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-start gap-2">
            <input
              id="recipe-tag-input"
              value={tagInput}
              placeholder="输入标签，按回车添加"
              onKeyDown={handleTagEnter}
              onChange={(event) => onTagInputChange(event.target.value)}
              className="h-[37px] flex-1 rounded-xl border border-[rgba(45,37,32,0.1)] bg-[#FAF7F5] px-3 text-[14px] leading-5 text-[#2D2520] outline-none placeholder:text-[rgba(45,37,32,0.5)] focus:border-[#EA5D38] lg:h-[45px] lg:rounded-2xl lg:px-4 lg:text-[16px]"
            />
            <button
              type="button"
              onClick={onAddTag}
              className={`h-[37px] rounded-xl bg-[#FEF4ED] px-3 text-[14px] font-medium leading-5 text-[#2D2520] lg:h-[45px] lg:rounded-2xl lg:px-4 lg:text-[16px] lg:leading-6 ${recipeSecondaryButtonInteractive}`}
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </RecipeSectionCard>
  );
}
