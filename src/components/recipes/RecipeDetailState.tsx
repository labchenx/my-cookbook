import type { RecipeDetailStatus } from '../../pages/recipes/recipeDetailTypes';

type RecipeDetailStateProps = {
  status: Exclude<RecipeDetailStatus, 'success'>;
  onRetry: () => void;
  onBackToList: () => void;
};

const content = {
  loading: {
    title: '正在加载菜谱...',
    description: '稍等片刻，我们正在准备这道菜的详细内容。',
  },
  error: {
    title: '加载失败',
    description: '菜谱详情暂时无法打开，请稍后重试。',
  },
  empty: {
    title: '未找到这个菜谱',
    description: '这个菜谱可能已被删除，或者链接已经失效。',
  },
} as const;

export function RecipeDetailState({
  status,
  onRetry,
  onBackToList,
}: RecipeDetailStateProps) {
  const stateContent = content[status];

  return (
    <section className="mx-auto max-w-[1024px] px-4 py-6 md:px-6 md:py-8">
      <div className="rounded-2xl border border-[rgba(45,37,32,0.1)] bg-white px-6 py-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)] md:px-10 md:py-12">
        <div
          className={`mx-auto h-10 w-10 rounded-full ${
            status === 'loading' ? 'animate-pulse bg-[#FEF4ED]' : 'bg-[#FEF4ED]'
          }`}
        />
        <h2 className="mt-4 text-[24px] font-semibold leading-8 text-[#2D2520]">
          {stateContent.title}
        </h2>
        <p className="mt-2 text-[16px] leading-6 text-[#827971]">
          {stateContent.description}
        </p>
        {status === 'loading' ? null : (
          <div className="mt-6 flex justify-center gap-3">
            {status === 'error' ? (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-2xl bg-[#EA5D38] px-5 py-3 text-[16px] font-medium leading-6 text-white"
              >
                重新加载
              </button>
            ) : null}
            <button
              type="button"
              onClick={onBackToList}
              className="rounded-2xl border border-[rgba(45,37,32,0.1)] px-5 py-3 text-[16px] font-medium leading-6 text-[#2D2520]"
            >
              返回菜谱列表
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
