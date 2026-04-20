import type { RecipeCategory, SortOrder } from '../../pages/recipes/recipesTypes';

type FilterBarProps = {
  categories: RecipeCategory[];
  activeCategory: RecipeCategory;
  sortOrder: SortOrder;
  onCategoryChange: (category: RecipeCategory) => void;
  onSortChange: (sort: SortOrder) => void;
};

export function FilterBar({
  categories,
  activeCategory,
  sortOrder,
  onCategoryChange,
  onSortChange,
}: FilterBarProps) {
  return (
    <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
        <div className="flex min-w-max items-center gap-2">
          {categories.map((category) => {
            const isActive = category === activeCategory;

            return (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryChange(category)}
                className={`h-[33px] rounded-xl border px-4 text-[14px] font-medium leading-5 transition-[color,background-color,box-shadow] duration-200 sm:h-[41px] sm:rounded-2xl sm:text-[16px] sm:leading-6 ${
                  isActive
                    ? 'border-[#EA5D38] bg-[#EA5D38] text-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.08)]'
                    : 'border-[rgba(45,37,32,0.1)] bg-white text-[#2D2520] hover:border-[#ffd1b8] hover:bg-[#fff5ef]'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onSortChange('latest')}
          className={`h-8 rounded-xl px-4 text-[14px] font-medium leading-5 transition-[color,background-color] duration-200 sm:h-10 sm:rounded-2xl sm:text-[16px] sm:leading-6 ${
            sortOrder === 'latest'
              ? 'bg-[#FEF4ED] text-[#2D2520]'
              : 'text-[#827971] hover:bg-[#fff5ef] hover:text-[#2D2520]'
          }`}
        >
          {'\u6700\u65b0'}
        </button>
        <button
          type="button"
          onClick={() => onSortChange('oldest')}
          className={`h-8 rounded-xl px-4 text-[14px] font-medium leading-5 transition-[color,background-color] duration-200 sm:h-10 sm:rounded-2xl sm:text-[16px] sm:leading-6 ${
            sortOrder === 'oldest'
              ? 'bg-[#FEF4ED] text-[#2D2520]'
              : 'text-[#827971] hover:bg-[#fff5ef] hover:text-[#2D2520]'
          }`}
        >
          {'\u6700\u65e9'}
        </button>
      </div>
    </section>
  );
}
