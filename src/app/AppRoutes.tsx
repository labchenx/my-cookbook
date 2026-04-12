import { Navigate, Route, Routes } from 'react-router-dom';
import { CreateRecipePage } from '../pages/recipes/CreateRecipePage';
import { RecipeDetailPage } from '../pages/recipes/RecipeDetailPage';
import { RecipesPage } from '../pages/recipes/RecipesPage';
import { PlaceholderPage } from '../pages/shared/PlaceholderPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/recipes" replace />} />
      <Route path="/login" element={<Navigate to="/recipes" replace />} />
      <Route path="/recipes" element={<RecipesPage />} />
      <Route path="/recipes/new" element={<CreateRecipePage />} />
      <Route path="/recipes/:id" element={<RecipeDetailPage />} />
      <Route
        path="/recipes/:id/edit"
        element={<PlaceholderPage title="编辑菜谱" description="这里将提供菜谱编辑功能。" />}
      />
      <Route path="*" element={<Navigate to="/recipes" replace />} />
    </Routes>
  );
}
