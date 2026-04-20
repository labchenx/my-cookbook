import { useEffect, useState } from 'react';
import clockIcon from '../../assets/recipes/icon-clock.svg';
import fallbackCover from '../../assets/recipes/cover-fallback-kitchen.svg';
import tagIcon from '../../assets/recipes/icon-tag.svg';
import type { Recipe } from '../../pages/recipes/recipesTypes';

type RecipeCardProps = {
  recipe: Recipe;
  relativeTime: string;
  onClick: () => void;
  priority?: boolean;
};

const imageStatusCache = new Map<string, 'loaded' | 'failed'>();

function normalizeCoverImage(coverImage?: string) {
  if (!coverImage) {
    return '';
  }

  return coverImage.trim();
}

function resolveDisplaySource(primarySource: string) {
  if (!primarySource) {
    return fallbackCover;
  }

  return imageStatusCache.get(primarySource) === 'failed' ? fallbackCover : primarySource;
}

function isCachedAsLoaded(source: string) {
  return imageStatusCache.get(source) === 'loaded';
}

export function __resetRecipeCardImageCacheForTests() {
  imageStatusCache.clear();
}

export function RecipeCard({ recipe, relativeTime, onClick, priority = false }: RecipeCardProps) {
  const primarySource = normalizeCoverImage(recipe.coverImage ?? recipe.cover);
  const [currentSource, setCurrentSource] = useState(() => resolveDisplaySource(primarySource));
  const [imageReady, setImageReady] = useState(() => isCachedAsLoaded(resolveDisplaySource(primarySource)));

  useEffect(() => {
    const nextSource = resolveDisplaySource(primarySource);
    setCurrentSource(nextSource);
    setImageReady(isCachedAsLoaded(nextSource));
  }, [primarySource]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`\u67e5\u770b\u83dc\u8c31\uff1a${recipe.title}`}
      className="group cursor-pointer overflow-hidden rounded-2xl bg-white text-left shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(45,37,32,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#EA5D38]"
    >
      <div
        data-testid="recipe-card-cover"
        className="relative overflow-hidden bg-[#F5F1EE]"
        style={{
          backgroundImage: `url(${fallbackCover})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      >
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-[linear-gradient(135deg,#F5F1EE_0%,#EEE4DD_100%)] transition-opacity duration-300 ${
            imageReady && currentSource !== fallbackCover ? 'opacity-0' : 'opacity-20'
          }`}
        />
        <img
          key={currentSource}
          src={currentSource}
          alt={recipe.title}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => {
            imageStatusCache.set(currentSource, 'loaded');
            setImageReady(true);
          }}
          onError={() => {
            imageStatusCache.set(currentSource, 'failed');

            if (currentSource !== fallbackCover) {
              setCurrentSource(fallbackCover);
              setImageReady(isCachedAsLoaded(fallbackCover));
              return;
            }

            setImageReady(true);
          }}
          className={`aspect-[16/9] w-full object-cover object-center transition-[opacity,transform] duration-500 group-hover:scale-[1.02] ${
            imageReady ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <h2 className="text-[16px] font-semibold leading-6 text-[#2D2520] sm:text-[18px] sm:leading-7">
          {recipe.title}
        </h2>
        <p className="mt-[2px] overflow-hidden text-ellipsis whitespace-nowrap text-[14px] leading-5 text-[#827971]">
          {recipe.description}
        </p>

        <div className="mt-3 flex items-center justify-between gap-3 sm:mt-3">
          <div className="flex items-center gap-2">
            {recipe.tags.map((tag) => (
              <span
                key={`${recipe.id}-${tag}`}
                className="inline-flex h-5 items-center gap-[4px] rounded-[10px] bg-[#FEF4ED] px-2 text-[12px] leading-4 text-[#2D2520] sm:h-6 sm:gap-[6px] sm:rounded-xl sm:px-[10px]"
              >
                <img src={tagIcon} alt="" className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>

          <span className="inline-flex shrink-0 items-center gap-1 text-[12px] leading-4 text-[#827971]">
            <img src={clockIcon} alt="" className="h-[14px] w-[14px]" />
            {relativeTime}
          </span>
        </div>
      </div>
    </button>
  );
}
