import coverImage from '../../assets/recipe-detail/cover.jpg';
import type { RecipeDetail } from './recipeDetailTypes';

const chocolateIngredientsHtml = `
  <ul>
    <li><strong>黑巧克力</strong> - 200g</li>
    <li><strong>淡奶油</strong> - 300ml</li>
    <li><strong>鸡蛋</strong> - 3个</li>
    <li><strong>细砂糖</strong> - 60g</li>
    <li><strong>可可粉</strong> - 20g</li>
    <li><strong>吉利丁片</strong> - 10g</li>
    <li><strong>牛奶</strong> - 100ml</li>
  </ul>
`;

const chocolateStepsHtml = `
  <ol>
    <li><strong>融化巧克力：</strong>将黑巧克力隔水加热，边加热边搅拌至顺滑。</li>
    <li><strong>打发奶油：</strong>淡奶油打发到六分发，保持流动性和纹路感。</li>
    <li><strong>处理吉利丁：</strong>吉利丁片泡软后加入温热牛奶中，搅拌至完全融化。</li>
    <li><strong>混合慕斯液：</strong>把巧克力、吉利丁牛奶液和淡奶油翻拌均匀。</li>
    <li><strong>冷藏定型：</strong>倒入模具轻震排泡，冷藏 4 小时以上再脱模。</li>
  </ol>
`;

const salmonIngredientsHtml = `
  <ul>
    <li><strong>三文鱼</strong> - 2块</li>
    <li><strong>芦笋</strong> - 1把</li>
    <li><strong>海盐</strong> - 适量</li>
    <li><strong>黑胡椒</strong> - 适量</li>
    <li><strong>橄榄油</strong> - 1汤匙</li>
    <li><strong>柠檬汁</strong> - 1茶匙</li>
  </ul>
`;

const salmonStepsHtml = `
  <ol>
    <li>三文鱼擦干表面水分，均匀撒上海盐和黑胡椒，静置 10 分钟。</li>
    <li>芦笋去掉老根后拌入橄榄油，平铺在烤盘底部。</li>
    <li>把三文鱼放在芦笋上方，表面刷少量橄榄油并滴入柠檬汁。</li>
    <li><u>200°C 预热烤箱</u>，中层烘烤 10 到 12 分钟，出炉后静置 2 分钟再装盘。</li>
  </ol>
`;

const recipeDetail: RecipeDetail = {
  id: '1',
  title: '巧克力慕斯蛋糕',
  description: '丝滑细腻的巧克力慕斯，入口即化，适合新手甜品练习。',
  cover: coverImage,
  tags: ['甜品', '简单', '烘焙'],
  createdAt: '2小时前',
  prepTime: '30分钟',
  cookTime: '2小时',
  servings: '6人份',
  ingredientsRichText: chocolateIngredientsHtml,
  stepsRichText: chocolateStepsHtml,
};

const recipeDetailsById: Record<string, RecipeDetail> = {
  '1': recipeDetail,
  'chocolate-mousse-cake': {
    ...recipeDetail,
    id: 'chocolate-mousse-cake',
  },
  'salmon-asparagus': {
    ...recipeDetail,
    id: 'salmon-asparagus',
    title: '烤三文鱼配芦笋',
    description: '高蛋白低负担的快手主菜，工作日晚餐也能轻松完成。',
    tags: ['减脂', '高蛋白'],
    prepTime: '15分钟',
    cookTime: '12分钟',
    servings: '2人份',
    ingredientsRichText: salmonIngredientsHtml,
    stepsRichText: salmonStepsHtml,
  },
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export async function getRecipeDetailById(id: string): Promise<RecipeDetail | null> {
  await wait(250);

  if (id === 'error') {
    throw new Error('加载菜谱失败');
  }

  return recipeDetailsById[id] ?? null;
}
