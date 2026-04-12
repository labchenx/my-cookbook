import type { CreateRecipeMode } from '../../pages/recipes/createRecipeTypes';
import {
  recipePrimaryButtonInteractive,
  recipeSecondaryButtonInteractive,
} from './buttonStyles';

type CreateRecipeTabsProps = {
  mode: CreateRecipeMode;
  onChange: (mode: CreateRecipeMode) => void;
};

const tabBaseClass =
  'flex h-[36px] flex-1 items-center justify-center rounded-xl text-[14px] font-medium leading-5 lg:h-12 lg:text-[16px] lg:leading-6';

export function CreateRecipeTabs({ mode, onChange }: CreateRecipeTabsProps) {
  return (
    <div className="flex h-[45px] w-full rounded-xl border border-[rgba(45,37,32,0.1)] bg-white p-[4px] lg:h-[61px] lg:rounded-2xl lg:p-[6px]">
      <button
        type="button"
        className={`${tabBaseClass} ${
          mode === 'parse'
            ? `bg-[#EA5D38] text-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.08)] ${recipePrimaryButtonInteractive}`
            : `text-[#827971] hover:bg-[#FEF4ED] hover:text-[#2D2520] ${recipeSecondaryButtonInteractive}`
        }`}
        onClick={() => onChange('parse')}
      >
        链接解析
      </button>
      <button
        type="button"
        className={`${tabBaseClass} ${
          mode === 'manual'
            ? `bg-[#EA5D38] text-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.08)] ${recipePrimaryButtonInteractive}`
            : `text-[#827971] hover:bg-[#FEF4ED] hover:text-[#2D2520] ${recipeSecondaryButtonInteractive}`
        }`}
        onClick={() => onChange('manual')}
      >
        手动编辑
      </button>
    </div>
  );
}
