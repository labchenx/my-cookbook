import { Route, Routes } from 'react-router-dom';
import { AuthPage } from '../pages/auth/AuthPage';
import { RecipeDetailPage } from '../pages/recipes/RecipeDetailPage';
import { RecipesPage } from '../pages/recipes/RecipesPage';
import { PlaceholderPage } from '../pages/shared/PlaceholderPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/recipes" element={<RecipesPage />} />
      <Route
        path="/recipes/new"
        element={<PlaceholderPage title="创建菜谱" description="这里将支持链接解析和手动编辑。" />}
      />
      <Route path="/recipes/:id" element={<RecipeDetailPage />} />
      <Route
        path="/recipes/:id/edit"
        element={<PlaceholderPage title="编辑菜谱" description="这里将提供菜谱编辑功能。" />}
      />
      <Route path="*" element={<AuthPage />} />
    </Routes>
  );
}
