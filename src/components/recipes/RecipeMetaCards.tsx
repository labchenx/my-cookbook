type RecipeMetaCardsProps = {
  prepTime: string;
  cookTime: string;
  servings: string;
};

const metaItems = [
  { key: 'prepTime', label: '准备时间' },
  { key: 'cookTime', label: '烹饪时间' },
  { key: 'servings', label: '份量' },
] as const;

export function RecipeMetaCards({ prepTime, cookTime, servings }: RecipeMetaCardsProps) {
  const values = { prepTime, cookTime, servings };

  return (
    <section className="grid grid-cols-3 gap-3 md:gap-4">
      {metaItems.map((item) => (
        <article
          key={item.key}
          className="rounded-xl border border-[rgba(45,37,32,0.1)] bg-white px-3 pt-3 pb-3 md:min-h-[93px] md:rounded-2xl md:px-5 md:pt-5"
        >
          <p className="text-[12px] leading-4 text-[#827971] md:text-[14px] md:leading-5">
            {item.label}
          </p>
          <p className="mt-1 text-[16px] font-semibold leading-6 text-[#2D2520] md:text-[20px] md:leading-7">
            {values[item.key]}
          </p>
        </article>
      ))}
    </section>
  );
}
