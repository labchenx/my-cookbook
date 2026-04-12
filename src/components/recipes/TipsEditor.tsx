import { RecipeField } from './RecipeField';
import { RecipeSectionCard } from './RecipeSectionCard';

type TipsEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function TipsEditor({ value, onChange }: TipsEditorProps) {
  return (
    <RecipeSectionCard>
      <h2 className="text-[16px] font-semibold leading-6 text-[#2D2520] lg:text-[18px] lg:leading-7">
        小贴士
      </h2>
      <div className="mt-3 lg:mt-4">
        <RecipeField
          id="recipe-tips"
          multiline
          value={value}
          placeholder="分享一些制作技巧或注意事项..."
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </RecipeSectionCard>
  );
}
