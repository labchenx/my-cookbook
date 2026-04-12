import { Route, Routes } from 'react-router-dom';
import { AuthPage } from '../pages/auth/AuthPage';
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
      <Route
        path="/recipes/:id"
        element={<PlaceholderPage title="菜谱详情" description="这里将展示菜谱的详细内容。" />}
      />
      <Route path="*" element={<AuthPage />} />
    </Routes>
  );
}
