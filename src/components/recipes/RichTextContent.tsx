import { createRichTextMarkup } from './richTextUtils';

type RichTextContentProps = {
  title: string;
  html: string;
};

export function RichTextContent({ title, html }: RichTextContentProps) {
  return (
    <section className="rounded-2xl border border-[rgba(45,37,32,0.1)] bg-white p-4 md:p-6">
      <h2 className="text-[18px] font-semibold leading-7 text-[#2D2520]">{title}</h2>
      <div
        className="recipe-rich-text mt-4 text-[15px] leading-7 text-[#2D2520] [&_li]:ml-5 [&_li]:mb-2 [&_ol]:list-decimal [&_ol]:pl-2 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_p[style*='text-align:center']]:text-center [&_strong]:font-semibold [&_u]:underline [&_ul]:list-disc [&_ul]:pl-2"
        dangerouslySetInnerHTML={createRichTextMarkup(html)}
      />
    </section>
  );
}
