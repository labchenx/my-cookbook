import chefHatIcon from '../../assets/chef-hat.svg';
import searchIcon from '../../assets/recipes/icon-search.svg';

type NavbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
};

export function Navbar({ searchValue, onSearchChange }: NavbarProps) {
  return (
    <header className="border-b border-[rgba(45,37,32,0.1)] bg-white px-4 py-3 sm:px-[45px] sm:py-4">
      <div className="mx-auto flex max-w-[1322px] items-center gap-3 sm:gap-6">
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EA5D38] sm:h-10 sm:w-10 sm:rounded-2xl">
            <img src={chefHatIcon} alt="" className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <p className="hidden text-[20px] font-semibold leading-7 text-[#2D2520] sm:block">
            我的菜谱库
          </p>
        </div>

        <label className="relative min-w-0 flex-1 sm:mx-auto sm:max-w-[672px]">
          <img
            src={searchIcon}
            alt=""
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 sm:left-4 sm:h-5 sm:w-5"
          />
          <input
            type="search"
            value={searchValue}
            aria-label="搜索菜谱"
            placeholder="搜索菜谱..."
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-[37px] w-full rounded-xl border border-[rgba(45,37,32,0.1)] bg-[#FAF7F5] pl-10 pr-3 text-[14px] text-[#2D2520] outline-none transition placeholder:text-[rgba(45,37,32,0.5)] focus:border-[#EA5D38] sm:h-[45px] sm:rounded-2xl sm:pl-12 sm:pr-4 sm:text-[16px]"
          />
        </label>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#EA5D38_0%,#FF8904_100%)] text-[14px] font-medium leading-5 text-white sm:h-10 sm:w-10 sm:text-[16px] sm:leading-6">
          A
        </div>
      </div>
    </header>
  );
}
