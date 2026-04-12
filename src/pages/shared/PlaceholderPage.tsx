type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(119deg,#FEF4ED_0%,#FEFDFB_100%)] px-4 py-8">
      <section className="w-full max-w-[448px] rounded-2xl bg-white px-6 py-10 text-center shadow-[0_10px_15px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.08)] sm:px-8">
        <h1 className="text-[28px] font-semibold leading-[36px] text-[#2D2520]">{title}</h1>
        <p className="mt-3 text-[16px] leading-[24px] text-[#827971]">{description}</p>
      </section>
    </main>
  );
}
