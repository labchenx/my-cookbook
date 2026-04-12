import plusIcon from '../../assets/create-recipe/plus-icon.svg';
import type { IngredientItem } from '../../pages/recipes/createRecipeTypes';
import { DeleteIcon } from './RecipeIcons';
import { RecipeSectionCard } from './RecipeSectionCard';
import {
  recipeDeleteButtonInteractive,
  recipePrimaryButtonInteractive,
} from './buttonStyles';

type IngredientListEditorProps = {
  ingredients: IngredientItem[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onChange: (id: string, field: 'name' | 'amount', value: string) => void;
};

export function IngredientListEditor({
  ingredients,
  onAdd,
  onDelete,
  onChange,
}: IngredientListEditorProps) {
  return (
    <RecipeSectionCard>
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold leading-6 text-[#2D2520] lg:text-[18px] lg:leading-7">
          配料列表
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className={`flex h-7 items-center gap-1 rounded-xl bg-[#EA5D38] px-[10px] text-[12px] font-medium leading-4 text-white lg:h-8 lg:gap-2 lg:px-3 lg:text-[14px] lg:leading-5 ${recipePrimaryButtonInteractive}`}
        >
          <img src={plusIcon} alt="" className="h-[14px] w-[14px] lg:h-4 lg:w-4" />
          添加配料
        </button>
      </div>

      <div className="mt-3 space-y-2 lg:mt-4 lg:space-y-3">
        {ingredients.map((ingredient) => (
          <div key={ingredient.id} className="flex items-start gap-2 lg:gap-3">
            <input
              value={ingredient.name}
              placeholder="配料名称"
              onChange={(event) => onChange(ingredient.id, 'name', event.target.value)}
              className="h-[37px] flex-1 rounded-xl border border-[rgba(45,37,32,0.1)] bg-[#FAF7F5] px-3 text-[14px] leading-5 text-[#2D2520] outline-none placeholder:text-[rgba(45,37,32,0.5)] focus:border-[#EA5D38] lg:h-[45px] lg:rounded-2xl lg:px-4 lg:text-[16px]"
            />
            <input
              value={ingredient.amount}
              placeholder="用量"
              onChange={(event) => onChange(ingredient.id, 'amount', event.target.value)}
              className="h-[37px] w-20 rounded-xl border border-[rgba(45,37,32,0.1)] bg-[#FAF7F5] px-2 text-[14px] leading-5 text-[#2D2520] outline-none placeholder:text-[rgba(45,37,32,0.5)] focus:border-[#EA5D38] lg:h-[45px] lg:w-32 lg:rounded-2xl lg:px-4 lg:text-[16px]"
            />
            <button
              type="button"
              onClick={() => onDelete(ingredient.id)}
              aria-label="删除配料"
              className={`flex h-[37px] w-8 items-center justify-center rounded-xl text-[#827971] lg:h-[45px] lg:w-10 lg:rounded-2xl ${recipeDeleteButtonInteractive}`}
            >
              <DeleteIcon className="h-3 w-3 lg:h-4 lg:w-4" />
            </button>
          </div>
        ))}
      </div>
    </RecipeSectionCard>
  );
}
