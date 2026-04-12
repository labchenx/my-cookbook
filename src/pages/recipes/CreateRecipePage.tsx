import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionBar } from '../../components/recipes/ActionBar';
import { CreateRecipeHeader } from '../../components/recipes/CreateRecipeHeader';
import { CreateRecipeTabs } from '../../components/recipes/CreateRecipeTabs';
import { IngredientListEditor } from '../../components/recipes/IngredientListEditor';
import { ParseRecipeSection } from '../../components/recipes/ParseRecipeSection';
import { RecipeBasicInfoForm } from '../../components/recipes/RecipeBasicInfoForm';
import { StepListEditor } from '../../components/recipes/StepListEditor';
import { TipsEditor } from '../../components/recipes/TipsEditor';
import type {
  CreateRecipeMode,
  IngredientItem,
  ParseStatus,
  RecipeDraft,
  StepItem,
} from './createRecipeTypes';

function createIngredient(id: string): IngredientItem {
  return { id, name: '', amount: '' };
}

function createStep(id: string): StepItem {
  return { id, description: '', imageName: '' };
}

export function CreateRecipePage() {
  const navigate = useNavigate();
  const idCounter = useRef(2);
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
    ingredients: [createIngredient('ingredient-1')],
    steps: [createStep('step-1')],
    tips: '',
  });

  const nextId = (prefix: 'ingredient' | 'step') => {
    const id = `${prefix}-${idCounter.current}`;
    idCounter.current += 1;
    return id;
  };

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

  const handleAddIngredient = () => {
    setDraft((current) => ({
      ...current,
      ingredients: [...current.ingredients, createIngredient(nextId('ingredient'))],
    }));
  };

  const handleChangeIngredient = (id: string, field: 'name' | 'amount', value: string) => {
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const handleDeleteIngredient = (id: string) => {
    setDraft((current) => ({
      ...current,
      ingredients:
        current.ingredients.length === 1
          ? current.ingredients
          : current.ingredients.filter((item) => item.id !== id),
    }));
  };

  const handleAddStep = () => {
    setDraft((current) => ({
      ...current,
      steps: [...current.steps, createStep(nextId('step'))],
    }));
  };

  const handleChangeStep = (id: string, value: string) => {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((item) =>
        item.id === id ? { ...item, description: value } : item,
      ),
    }));
  };

  const handleSelectStepImage = (id: string, fileName: string) => {
    setDraft((current) => ({
      ...current,
      steps: current.steps.map((item) =>
        item.id === id ? { ...item, imageName: fileName } : item,
      ),
    }));
  };

  const handleDeleteStep = (id: string) => {
    setDraft((current) => ({
      ...current,
      steps:
        current.steps.length === 1 ? current.steps : current.steps.filter((item) => item.id !== id),
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
              <IngredientListEditor
                ingredients={draft.ingredients}
                onAdd={handleAddIngredient}
                onDelete={handleDeleteIngredient}
                onChange={handleChangeIngredient}
              />
              <StepListEditor
                steps={draft.steps}
                onAdd={handleAddStep}
                onDelete={handleDeleteStep}
                onChangeDescription={handleChangeStep}
                onSelectImage={handleSelectStepImage}
              />
              <TipsEditor value={draft.tips} onChange={(value) => updateDraft('tips', value)} />
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
