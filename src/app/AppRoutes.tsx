import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { CreateRecipePage } from '../pages/recipes/CreateRecipePage';
import { RecipeDetailPage } from '../pages/recipes/RecipeDetailPage';
import { RecipesPage } from '../pages/recipes/RecipesPage';

function RedirectLegacyRecipeEditRoute() {
  const { id = '' } = useParams();
  return <Navigate to={id ? `/recipes/${id}` : '/recipes'} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/recipes" replace />} />
      <Route path="/login" element={<Navigate to="/recipes" replace />} />
      <Route path="/recipes" element={<RecipesPage />} />
      <Route path="/recipes/new" element={<CreateRecipePage />} />
      <Route path="/recipes/:id" element={<RecipeDetailPage />} />
      <Route path="/recipes/:id/edit" element={<RedirectLegacyRecipeEditRoute />} />
      <Route path="*" element={<Navigate to="/recipes" replace />} />
    </Routes>
  );
}
