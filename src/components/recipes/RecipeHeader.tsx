import arrowLeftIcon from '../../assets/recipe-detail/arrow-left.svg';
import clockIcon from '../../assets/recipe-detail/clock.svg';
import editIcon from '../../assets/recipe-detail/edit.svg';
import tagIcon from '../../assets/recipe-detail/tag.svg';
import trashIcon from '../../assets/recipe-detail/trash.svg';
import type { RecipeDetail } from '../../pages/recipes/recipeDetailTypes';

type RecipeHeaderProps = {
  recipe?: RecipeDetail;
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function RecipeHeader({ recipe, onBack, onEdit, onDelete }: RecipeHeaderProps) {
  return (
    <header className="bg-[#FEFDFB]">
      <div className="border-b border-[rgba(45,37,32,0.1)] bg-white">
        <div className="mx-auto flex h-[54px] max-w-[1322px] items-center justify-between px-4 md:h-[74px] md:px-[149px]">
          <button
            type="button"
            onClick={onBack}
            aria-label="返回列表"
            className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-[14px] font-medium leading-5 text-[#827971] transition-colors duration-150 hover:bg-[rgba(45,37,32,0.04)] hover:text-[#2D2520] focus-visible:bg-[rgba(45,37,32,0.04)] focus-visible:text-[#2D2520] focus-visible:outline-none md:gap-2 md:text-[16px] md:leading-6"
          >
            <img src={arrowLeftIcon} alt="" className="h-5 w-5 shrink-0" />
            <span>返回列表</span>
          </button>

          {recipe ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onEdit}
                aria-label="编辑菜谱"
                className="flex h-[29px] w-[41px] items-center justify-center rounded-xl border border-[rgba(45,37,32,0.1)] bg-white text-[#2D2520] transition-colors duration-150 hover:border-[rgba(45,37,32,0.18)] hover:bg-[#FEF8F4] focus-visible:border-[rgba(45,37,32,0.18)] focus-visible:bg-[#FEF8F4] focus-visible:outline-none md:h-[41px] md:w-auto md:min-w-[89px] md:gap-2 md:px-4"
              >
                <img src={editIcon} alt="" className="h-4 w-4 shrink-0" />
                <span className="hidden text-[16px] font-medium leading-6 md:inline">编辑</span>
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label="删除菜谱"
                className="flex h-[29px] w-[41px] items-center justify-center rounded-xl border border-[rgba(220,38,38,0.2)] bg-white text-[#DC2626] transition-colors duration-150 hover:border-[rgba(220,38,38,0.35)] hover:bg-[rgba(220,38,38,0.04)] focus-visible:border-[rgba(220,38,38,0.35)] focus-visible:bg-[rgba(220,38,38,0.04)] focus-visible:outline-none md:h-[41px] md:w-auto md:min-w-[89px] md:gap-2 md:px-4"
              >
                <img src={trashIcon} alt="" className="h-4 w-4 shrink-0" />
                <span className="hidden text-[16px] font-medium leading-6 md:inline">删除</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="h-[240px] w-full bg-[#F5F1EE] md:h-[400px]">
        {recipe ? (
          <img src={recipe.cover} alt={recipe.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[#F5F1EE]" />
        )}
      </div>

      {recipe ? (
        <div className="mx-auto max-w-[1024px] px-4 pt-4 md:px-6 md:pt-8">
          <div className="space-y-3 md:space-y-4">
            <div className="space-y-2 md:space-y-3">
              <h1 className="text-[24px] font-semibold leading-8 text-[#2D2520] md:text-[36px] md:leading-10">
                {recipe.title}
              </h1>
              <p className="text-[16px] leading-6 text-[#827971] md:text-[18px] md:leading-7">
                {recipe.description}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:gap-x-4">
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex h-6 items-center rounded-xl bg-[#FEF4ED] px-2 py-1 text-[12px] leading-4 text-[#2D2520] md:h-8 md:gap-1.5 md:px-3 md:text-[14px] md:leading-5"
                  >
                    <img src={tagIcon} alt="" className="h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" />
                    {tag}
                  </span>
                ))}
              </div>
              <span className="inline-flex items-center gap-1 text-[12px] leading-4 text-[#827971] md:gap-1.5 md:text-[14px] md:leading-5">
                <img src={clockIcon} alt="" className="h-[14px] w-[14px] shrink-0 md:h-4 md:w-4" />
                {recipe.createdAt}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
