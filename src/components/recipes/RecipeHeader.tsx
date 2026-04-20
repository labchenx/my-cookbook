import arrowLeftIcon from '../../assets/recipe-detail/arrow-left.svg';
import clockIcon from '../../assets/recipe-detail/clock.svg';
import tagIcon from '../../assets/recipe-detail/tag.svg';
import trashIcon from '../../assets/recipe-detail/trash.svg';
import type { RecipeDetail } from '../../pages/recipes/recipeDetailTypes';

type RecipeHeaderProps = {
  recipe?: RecipeDetail;
  createdAtLabel?: string;
  onBack: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  deleteDisabled?: boolean;
};

export function RecipeHeader({
  recipe,
  createdAtLabel,
  onBack,
  onDelete,
  isDeleting = false,
  deleteDisabled = false,
}: RecipeHeaderProps) {
  const hasTags = Boolean(recipe && recipe.tags.length > 0);
  const timeLabel = createdAtLabel ?? recipe?.createdAt ?? '';

  return (
    <header className="bg-[#FEFDFB]">
      <div className="border-b border-[rgba(45,37,32,0.1)] bg-white">
        <div className="mx-auto flex h-[54px] max-w-[1322px] items-center justify-between px-4 md:h-[74px] md:px-[173px]">
          <button
            type="button"
            onClick={onBack}
            aria-label={'\u8fd4\u56de\u5217\u8868'}
            className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-[14px] font-medium leading-5 text-[#827971] transition-colors duration-150 hover:bg-[rgba(45,37,32,0.04)] hover:text-[#2D2520] focus-visible:bg-[rgba(45,37,32,0.04)] focus-visible:text-[#2D2520] focus-visible:outline-none md:gap-2 md:text-[16px] md:leading-6"
          >
            <img src={arrowLeftIcon} alt="" className="h-5 w-5 shrink-0" />
            <span>{'\u8fd4\u56de\u5217\u8868'}</span>
          </button>

          {recipe ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDelete}
                disabled={deleteDisabled}
                aria-label={'\u5220\u9664\u83dc\u8c31'}
                aria-busy={isDeleting}
                className="flex h-[29px] w-[41px] items-center justify-center rounded-xl border border-[rgba(220,38,38,0.2)] bg-white text-[#DC2626] transition-colors duration-150 hover:border-[rgba(220,38,38,0.35)] hover:bg-[rgba(220,38,38,0.04)] focus-visible:border-[rgba(220,38,38,0.35)] focus-visible:bg-[rgba(220,38,38,0.04)] focus-visible:outline-none disabled:cursor-not-allowed disabled:border-[rgba(220,38,38,0.12)] disabled:bg-[rgba(220,38,38,0.03)] disabled:text-[rgba(220,38,38,0.55)] md:h-[41px] md:w-auto md:min-w-[89px] md:gap-2 md:px-4"
              >
                <img src={trashIcon} alt="" className="h-4 w-4 shrink-0" />
                <span className="hidden text-[16px] font-medium leading-6 md:inline">
                  {isDeleting ? '\u5220\u9664\u4e2d...' : '\u5220\u9664'}
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="h-[136px] w-full bg-[#F5F1EE] md:h-[400px]">
        {recipe?.coverImage ? (
          <img src={recipe.coverImage} alt={recipe.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[#F5F1EE]" />
        )}
      </div>

      {recipe ? (
        <div className="mx-auto max-w-[1024px] px-4 pt-6 md:px-6 md:pt-8">
          <div className="space-y-4 md:space-y-4">
            <div className="space-y-2 md:space-y-3">
              <h1 className="text-[24px] font-semibold leading-8 text-[#2D2520] md:text-[36px] md:leading-10">
                {recipe.title}
              </h1>
              {recipe.description ? (
                <p className="text-[16px] leading-6 text-[#827971] md:text-[18px] md:leading-7">
                  {recipe.description}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:gap-x-4">
              {hasTags ? (
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#FEF4ED] px-3 text-[14px] leading-5 text-[#2D2520]"
                    >
                      <img src={tagIcon} alt="" className="h-3.5 w-3.5 shrink-0" />
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              {timeLabel ? (
                <span className="inline-flex items-center gap-1.5 text-[14px] leading-5 text-[#827971]">
                  <img src={clockIcon} alt="" className="h-4 w-4 shrink-0" />
                  {timeLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
