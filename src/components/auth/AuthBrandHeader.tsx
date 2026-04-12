import chefHatIcon from '../../assets/chef-hat.svg';

export function AuthBrandHeader() {
  return (
    <header className="flex flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EA5D38] sm:h-16 sm:w-16">
        <img src={chefHatIcon} alt="" className="h-7 w-7 sm:h-8 sm:w-8" />
      </div>
      <h1 className="mt-3 text-[20px] font-semibold leading-[28px] tracking-[-0.01em] text-[#2D2520] sm:mt-4 sm:text-[24px] sm:leading-[32px]">
        我的菜谱库
      </h1>
      <p className="mt-1 text-[14px] leading-[20px] text-[#827971] sm:text-[16px] sm:leading-[24px]">
        记录和分享你的美食时光
      </p>
    </header>
  );
}
