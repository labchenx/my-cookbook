import plusIcon from '../../assets/create-recipe/plus-icon.svg';
import type { StepItem } from '../../pages/recipes/createRecipeTypes';
import { DeleteIcon } from './RecipeIcons';
import { RecipeSectionCard } from './RecipeSectionCard';
import { UploadPlaceholder } from './UploadPlaceholder';
import {
  recipeDeleteButtonInteractive,
  recipePrimaryButtonInteractive,
} from './buttonStyles';

type StepListEditorProps = {
  steps: StepItem[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onChangeDescription: (id: string, value: string) => void;
  onSelectImage: (id: string, fileName: string) => void;
};

export function StepListEditor({
  steps,
  onAdd,
  onDelete,
  onChangeDescription,
  onSelectImage,
}: StepListEditorProps) {
  return (
    <RecipeSectionCard>
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold leading-6 text-[#2D2520] lg:text-[18px] lg:leading-7">
          制作步骤
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className={`flex h-7 items-center gap-1 rounded-xl bg-[#EA5D38] px-[10px] text-[12px] font-medium leading-4 text-white lg:h-8 lg:gap-2 lg:px-3 lg:text-[14px] lg:leading-5 ${recipePrimaryButtonInteractive}`}
        >
          <img src={plusIcon} alt="" className="h-[14px] w-[14px] lg:h-4 lg:w-4" />
          添加步骤
        </button>
      </div>

      <div className="mt-3 space-y-4 lg:mt-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3 lg:gap-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EA5D38] text-[14px] font-medium leading-5 text-white lg:h-8 lg:w-8">
              {index + 1}
            </div>
            <div className="flex-1">
              <textarea
                value={step.description}
                placeholder="描述这一步的操作..."
                onChange={(event) => onChangeDescription(step.id, event.target.value)}
                className="min-h-[81px] w-full rounded-xl border border-[rgba(45,37,32,0.1)] bg-[#FAF7F5] px-3 py-[10px] text-[14px] leading-5 text-[#2D2520] outline-none placeholder:text-[rgba(45,37,32,0.5)] focus:border-[#EA5D38] lg:min-h-[97px] lg:rounded-2xl lg:px-4 lg:py-3 lg:text-[16px] lg:leading-6"
              />
              <div className="mt-3">
                <UploadPlaceholder
                  id={`step-upload-${step.id}`}
                  variant="step"
                  fileName={step.imageName}
                  onSelect={(fileName) => onSelectImage(step.id, fileName)}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDelete(step.id)}
              aria-label={`删除步骤 ${index + 1}`}
              className={`flex h-7 w-7 items-center justify-center rounded-xl text-[#827971] lg:h-9 lg:w-9 lg:rounded-2xl ${recipeDeleteButtonInteractive}`}
            >
              <DeleteIcon className="h-3 w-3 lg:h-4 lg:w-4" />
            </button>
          </div>
        ))}
      </div>
    </RecipeSectionCard>
  );
}
