type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

type PaginationToken = number | 'ellipsis';

function buildPaginationTokens(currentPage: number, totalPages: number): PaginationToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pageSet = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);

  if (currentPage <= 3) {
    pageSet.add(2);
    pageSet.add(3);
    pageSet.add(4);
  }

  if (currentPage >= totalPages - 2) {
    pageSet.add(totalPages - 1);
    pageSet.add(totalPages - 2);
    pageSet.add(totalPages - 3);
  }

  const pages = [...pageSet]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const tokens: PaginationToken[] = [];

  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) {
      tokens.push('ellipsis');
    }

    tokens.push(page);
  });

  return tokens;
}

function getPageButtonClassName(isActive: boolean) {
  return `inline-flex h-10 min-w-10 items-center justify-center rounded-2xl border px-3 text-[14px] font-medium leading-5 transition-colors duration-200 ${
    isActive
      ? 'border-[#EA5D38] bg-[#EA5D38] text-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.08)]'
      : 'border-[rgba(45,37,32,0.1)] bg-white text-[#2D2520] hover:border-[#ffd1b8] hover:bg-[#fff5ef]'
  }`;
}

function getControlClassName(disabled: boolean) {
  return `inline-flex h-10 items-center justify-center rounded-2xl border px-4 text-[14px] font-medium leading-5 transition-colors duration-200 ${
    disabled
      ? 'cursor-not-allowed border-[rgba(45,37,32,0.08)] bg-[#FAF7F5] text-[#B5ADA6]'
      : 'border-[rgba(45,37,32,0.1)] bg-white text-[#2D2520] hover:border-[#ffd1b8] hover:bg-[#fff5ef]'
  }`;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const tokens = buildPaginationTokens(currentPage, totalPages);
  const previousDisabled = disabled || currentPage <= 1;
  const nextDisabled = disabled || currentPage >= totalPages;

  return (
    <nav
      aria-label={'\u83dc\u8c31\u5206\u9875'}
      className="mx-auto flex w-full max-w-[1322px] items-center justify-center"
    >
      <div className="hidden items-center gap-2 rounded-[28px] bg-[#FFF8F4] px-3 py-2 sm:flex">
        <button
          type="button"
          disabled={previousDisabled}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label={'\u4e0a\u4e00\u9875'}
          className={getControlClassName(previousDisabled)}
        >
          {'\u4e0a\u4e00\u9875'}
        </button>

        {tokens.map((token, index) =>
          token === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1 text-[14px] text-[#827971]">
              ...
            </span>
          ) : (
            <button
              key={token}
              type="button"
              disabled={disabled}
              onClick={() => onPageChange(token)}
              aria-label={`\u8f6c\u5230\u7b2c ${token} \u9875`}
              aria-current={token === currentPage ? 'page' : undefined}
              className={getPageButtonClassName(token === currentPage)}
            >
              {token}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={nextDisabled}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label={'\u4e0b\u4e00\u9875'}
          className={getControlClassName(nextDisabled)}
        >
          {'\u4e0b\u4e00\u9875'}
        </button>
      </div>

      <div className="flex w-full items-center justify-between rounded-[24px] bg-[#FFF8F4] px-4 py-3 sm:hidden">
        <button
          type="button"
          disabled={previousDisabled}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label={'\u4e0a\u4e00\u9875'}
          className={getControlClassName(previousDisabled)}
        >
          {'\u4e0a\u4e00\u9875'}
        </button>

        <p className="text-[14px] font-medium leading-5 text-[#2D2520]">
          {`\u7b2c ${currentPage} \u9875 / \u5171 ${totalPages} \u9875`}
        </p>

        <button
          type="button"
          disabled={nextDisabled}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label={'\u4e0b\u4e00\u9875'}
          className={getControlClassName(nextDisabled)}
        >
          {'\u4e0b\u4e00\u9875'}
        </button>
      </div>
    </nav>
  );
}
