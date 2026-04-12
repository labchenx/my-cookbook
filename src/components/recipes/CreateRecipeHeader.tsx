import { BackArrowIcon } from './RecipeIcons';
import { recipeIconButtonInteractive } from './buttonStyles';

type CreateRecipeHeaderProps = {
  onBack: () => void;
};

export function CreateRecipeHeader({ onBack }: CreateRecipeHeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-20 border-b border-[rgba(45,37,32,0.1)] bg-white">
      <div className="mx-auto flex h-14 w-full max-w-[848px] items-center px-4 lg:h-[68px] lg:px-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="返回菜谱列表"
          className={`flex h-8 w-8 items-center justify-center rounded-xl text-[#2D2520] lg:h-9 lg:w-9 ${recipeIconButtonInteractive}`}
        >
          <BackArrowIcon className="h-5 w-5" />
        </button>
        <h1 className="ml-3 text-[18px] font-semibold leading-7 text-[#2D2520] lg:ml-4 lg:text-[20px]">
          创建菜谱
        </h1>
      </div>
    </header>
  );
}
