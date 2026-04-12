import { startTransition, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RecipeDetailState } from '../../components/recipes/RecipeDetailState';
import { RecipeHeader } from '../../components/recipes/RecipeHeader';
import { RecipeMetaCards } from '../../components/recipes/RecipeMetaCards';
import { RichTextContent } from '../../components/recipes/RichTextContent';
import { getRecipeDetailById } from './mockRecipeDetails';
import type { RecipeDetail, RecipeDetailStatus } from './recipeDetailTypes';

export function RecipeDetailPage() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const [status, setStatus] = useState<RecipeDetailStatus>('loading');
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    setStatus('loading');
    setRecipe(null);

    getRecipeDetailById(id)
      .then((data) => {
        if (!active) {
          return;
        }

        startTransition(() => {
          if (data) {
            setRecipe(data);
            setStatus('success');
            return;
          }

          setStatus('empty');
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }

        startTransition(() => {
          setStatus('error');
        });
      });

    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/recipes');
  };

  const handleEdit = () => {
    navigate(`/recipes/${id}/edit`);
  };

  const handleDelete = () => {
    console.info('Delete recipe placeholder', id);
  };

  const handleRetry = () => {
    setReloadKey((current) => current + 1);
  };

  const handleBackToList = () => {
    navigate('/recipes');
  };

  const isSuccess = status === 'success' && recipe;
  const stateStatus: Exclude<RecipeDetailStatus, 'success'> =
    status === 'success' ? 'loading' : status;

  return (
    <main className="min-h-screen bg-[#FEFDFB]">
      <RecipeHeader
        recipe={isSuccess ? recipe : undefined}
        onBack={handleBack}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {isSuccess ? (
        <div className="mx-auto max-w-[1024px] px-4 pt-4 pb-8 md:px-6 md:pt-8 md:pb-10">
          <RecipeMetaCards
            prepTime={recipe.prepTime}
            cookTime={recipe.cookTime}
            servings={recipe.servings}
          />

          <div className="mt-8 space-y-6 md:mt-12">
            <RichTextContent title="配料列表" html={recipe.ingredientsRichText} />
            <RichTextContent title="制作步骤" html={recipe.stepsRichText} />
          </div>
        </div>
      ) : (
        <RecipeDetailState
          status={stateStatus}
          onRetry={handleRetry}
          onBackToList={handleBackToList}
        />
      )}
    </main>
  );
}
