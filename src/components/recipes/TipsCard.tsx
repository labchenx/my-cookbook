type TipsCardProps = {
  tips?: string;
};

export function TipsCard({ tips }: TipsCardProps) {
  if (!tips) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-[#FEE685] bg-[#FFFBEB] px-4 pt-4 pb-4 md:px-6 md:pt-6 md:pb-6">
      <div className="flex items-center gap-2">
        <span className="text-[16px] leading-6 text-[#E17100] md:text-[18px] md:leading-7">💡</span>
        <h2 className="text-[16px] font-semibold leading-6 text-[#2D2520] md:text-[18px] md:leading-7">
          小贴士
        </h2>
      </div>
      <p className="mt-2 text-[14px] leading-[22.75px] text-[#2D2520] md:mt-3 md:text-[16px] md:leading-[26px]">
        {tips}
      </p>
    </section>
  );
}
