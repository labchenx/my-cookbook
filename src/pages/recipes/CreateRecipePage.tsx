import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionBar } from '../../components/recipes/ActionBar';
import { CreateRecipeHeader } from '../../components/recipes/CreateRecipeHeader';
import { CreateRecipeTabs } from '../../components/recipes/CreateRecipeTabs';
import { ParseRecipeSection } from '../../components/recipes/ParseRecipeSection';
import { RecipeBasicInfoForm } from '../../components/recipes/RecipeBasicInfoForm';
import { RichTextEditor } from '../../components/recipes/RichTextEditor';
import type { CreateRecipeMode, ParseStatus, RecipeDraft } from './createRecipeTypes';

export function CreateRecipePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<CreateRecipeMode>('manual');
  const [parseUrl, setParseUrl] = useState('https://example.com/recipe/123');
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle');
  const [parseMessage, setParseMessage] = useState('');
  const [draft, setDraft] = useState<RecipeDraft>({
    title: '',
    coverImageName: '',
    category: '',
    tagInput: '',
    tags: [],
    ingredientsRichText: '',
    stepsRichText: '',
  });

  const updateDraft = <K extends keyof RecipeDraft>(field: K, value: RecipeDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleAddTag = () => {
    const tag = draft.tagInput.trim();

    if (!tag || draft.tags.includes(tag)) {
      return;
    }

    setDraft((current) => ({
      ...current,
      tags: [...current.tags, tag],
      tagInput: '',
    }));
  };

  const handleRemoveTag = (tag: string) => {
    setDraft((current) => ({
      ...current,
      tags: current.tags.filter((item) => item !== tag),
    }));
  };

  const handleParse = async () => {
    if (!parseUrl.trim()) {
      return;
    }

    setParseStatus('loading');
    setParseMessage('');

    await new Promise((resolve) => window.setTimeout(resolve, 800));

    if (parseUrl.includes('http')) {
      setParseStatus('success');
      setParseMessage('链接解析成功，后续可在这里填充自动识别结果。');
    } else {
      setParseStatus('error');
      setParseMessage('链接解析失败，请检查链接格式后重试。');
    }
  };

  const handleCancel = () => navigate('/recipes');

  const handleSaveDraft = () => {
    window.console.info('save draft', draft);
  };

  const handlePublish = () => {
    window.console.info('publish recipe', draft);
  };

  return (
    <main className="min-h-screen bg-[#FEFDFB]">
      <CreateRecipeHeader onBack={handleCancel} />
      <div className="mx-auto w-full max-w-[848px] px-4 pt-[72px] pb-8 lg:pt-[101px] lg:pb-0">
        <CreateRecipeTabs mode={mode} onChange={setMode} />

        <div className="mt-4 lg:mt-8">
          {mode === 'parse' ? (
            <ParseRecipeSection
              url={parseUrl}
              status={parseStatus}
              message={parseMessage}
              onUrlChange={(value) => {
                setParseUrl(value);
                if (parseStatus !== 'idle') {
                  setParseStatus('idle');
                  setParseMessage('');
                }
              }}
              onSubmit={handleParse}
            />
          ) : (
            <div className="space-y-4 lg:space-y-6">
              <RecipeBasicInfoForm
                title={draft.title}
                coverImageName={draft.coverImageName}
                category={draft.category}
                tagInput={draft.tagInput}
                tags={draft.tags}
                onTitleChange={(value) => updateDraft('title', value)}
                onCoverSelect={(fileName) => updateDraft('coverImageName', fileName)}
                onCategoryChange={(value) => updateDraft('category', value)}
                onTagInputChange={(value) => updateDraft('tagInput', value)}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
              />
              <RichTextEditor
                label="配料列表"
                helperText="使用列表格式输入配料，例如：鸡蛋 - 2个"
                value={draft.ingredientsRichText}
                variant="ingredients"
                onChange={(value) => updateDraft('ingredientsRichText', value)}
              />
              <RichTextEditor
                label="制作步骤"
                helperText="使用有序列表详细描述每一步的操作过程"
                value={draft.stepsRichText}
                variant="steps"
                onChange={(value) => updateDraft('stepsRichText', value)}
              />
              <ActionBar
                onCancel={handleCancel}
                onSaveDraft={handleSaveDraft}
                onPublish={handlePublish}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
