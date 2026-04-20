import coverImage from '../../assets/recipe-detail/cover.jpg';
import { htmlToRichTextJson } from '../../components/recipes/richTextUtils';
import type { RecipeDetail } from './recipeDetailTypes';

type RecipeDetailSeed = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: string;
  ingredients: string[];
  steps: string[];
  [key: string]: unknown;
};

function toListHtml(items: string[]) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function toStepsHtml(items: string[]) {
  return `<ol>${items.map((item) => `<li>${item}</li>`).join('')}</ol>`;
}

function buildRecipeDetail(recipe: RecipeDetailSeed): RecipeDetail {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    coverImage,
    category: null,
    tags: recipe.tags,
    createdAt: recipe.createdAt,
    updatedAt: recipe.createdAt,
    ingredientsJson: htmlToRichTextJson(toListHtml(recipe.ingredients)),
    ingredientsHtml: null,
    ingredientsText: null,
    stepsJson: htmlToRichTextJson(toStepsHtml(recipe.steps)),
    stepsHtml: null,
    stepsText: null,
    sourceUrl: null,
    sourceType: null,
    parseStatus: 'none',
    status: 'published',
  };
}

const recipeSeeds: RecipeDetailSeed[] = [
  {
    id: '1',
    title: '巧克力慕斯蛋糕',
    description: '丝滑细腻的巧克力慕斯，入口即化，适合新手甜品练习。',
    tags: ['甜品', '简单', '烘焙'],
    createdAt: '2小时前',
    prepTime: '30分钟',
    cookTime: '2小时',
    servings: '6人份',
    ingredients: [
      '<strong>黑巧克力</strong> - 200g',
      '<strong>淡奶油</strong> - 300ml',
      '<strong>鸡蛋</strong> - 3个',
      '<strong>牛奶</strong> - 100ml',
    ],
    steps: [
      '<strong>融化巧克力：</strong>隔水加热至顺滑。',
      '<strong>打发奶油：</strong>保持柔软流动的质地。',
      '<strong>混合慕斯液：</strong>翻拌均匀。',
      '<strong>冷藏定型：</strong>至少冷藏 4 小时。',
    ],
  },
  {
    id: 'chocolate-mousse-cake',
    title: '巧克力慕斯蛋糕',
    description: '丝滑细腻的巧克力慕斯，入口即化，适合新手甜品练习。',
    tags: ['甜品', '简单', '烘焙'],
    createdAt: '2小时前',
    prepTime: '30分钟',
    cookTime: '2小时',
    servings: '6人份',
    ingredients: [
      '<strong>黑巧克力</strong> - 200g',
      '<strong>淡奶油</strong> - 300ml',
      '<strong>鸡蛋</strong> - 3个',
      '<strong>牛奶</strong> - 100ml',
    ],
    steps: [
      '<strong>融化巧克力：</strong>隔水加热至顺滑。',
      '<strong>打发奶油：</strong>保持柔软流动的质地。',
      '<strong>混合慕斯液：</strong>翻拌均匀。',
      '<strong>冷藏定型：</strong>至少冷藏 4 小时。',
    ],
  },
  {
    id: 'corn-soup',
    title: '香草玉米浓汤',
    description: '温暖舒心的玉米浓汤，营养丰富。',
    tags: ['汤类', '营养'],
    createdAt: '5小时前',
    prepTime: '15分钟',
    cookTime: '25分钟',
    servings: '3人份',
    ingredients: ['玉米粒 300g', '洋葱 1个', '淡奶油 100ml'],
    steps: ['炒香洋葱和玉米。', '加高汤煮软。', '搅打顺滑后加奶油调味。'],
  },
  {
    id: 'turkish-cabbage-rolls',
    title: '土耳其卷心菜卷',
    description: '传统家常菜，味道浓郁。',
    tags: ['家常菜', '传统'],
    createdAt: '1天前',
    prepTime: '25分钟',
    cookTime: '40分钟',
    servings: '4人份',
    ingredients: ['卷心菜 1颗', '牛肉末 250g', '米饭 1碗'],
    steps: ['焯软卷心菜叶。', '包入肉馅。', '用番茄酱汁慢炖入味。'],
  },
  {
    id: 'roasted-vegetable-salad',
    title: '法式烤蔬菜沙拉',
    description: '清爽健康的低脂沙拉。',
    tags: ['减脂', '低脂'],
    createdAt: '1天前',
    prepTime: '20分钟',
    cookTime: '18分钟',
    servings: '2人份',
    ingredients: ['彩椒 2个', '西葫芦 1根', '生菜 1把'],
    steps: ['烤制蔬菜。', '与生菜和油醋汁拌匀。', '趁温热食用。'],
  },
  {
    id: 'eggplant-risotto',
    title: '意式番茄芝士焗饭',
    description: '浓郁的芝士与新鲜番茄的完美结合。',
    tags: ['家常菜', '简单'],
    createdAt: '2天前',
    prepTime: '20分钟',
    cookTime: '25分钟',
    servings: '3人份',
    ingredients: ['米饭 2碗', '番茄 2个', '芝士 120g'],
    steps: ['熬煮番茄酱汁。', '与米饭拌匀。', '铺芝士焗至金黄。'],
  },
  {
    id: 'mushroom-pasta',
    title: '奶油蘑菇意面',
    description: '浓郁顺滑的奶油酱汁配新鲜蘑菇。',
    tags: ['家常菜', '快手'],
    createdAt: '3天前',
    prepTime: '15分钟',
    cookTime: '15分钟',
    servings: '2人份',
    ingredients: ['意面 200g', '口蘑 150g', '淡奶油 150ml'],
    steps: ['煮熟意面。', '炒香蘑菇并加入奶油。', '与意面拌匀。'],
  },
  {
    id: 'teriyaki-chicken-rice',
    title: '日式照烧鸡腿饭',
    description: '外焦里嫩的照烧鸡腿，酱汁浓郁。',
    tags: ['家常菜', '下饭'],
    createdAt: '3天前',
    prepTime: '20分钟',
    cookTime: '18分钟',
    servings: '2人份',
    ingredients: ['鸡腿肉 2块', '照烧汁 4勺', '米饭 2碗'],
    steps: ['煎香鸡腿肉。', '淋入照烧汁收浓。', '配米饭装盘。'],
  },
  {
    id: 'pumpkin-soup',
    title: '南瓜浓汤',
    description: '香甜可口的南瓜浓汤，暖胃又营养。',
    tags: ['汤类', '营养'],
    createdAt: '4天前',
    prepTime: '15分钟',
    cookTime: '30分钟',
    servings: '3人份',
    ingredients: ['南瓜 500g', '洋葱 1个', '牛奶 200ml'],
    steps: ['炒香洋葱。', '加入南瓜煮软。', '搅打顺滑并调味。'],
  },
  {
    id: 'salmon-asparagus',
    title: '烤三文鱼配芦笋',
    description: '高蛋白低脂的健康餐。',
    tags: ['减脂', '高蛋白'],
    createdAt: '5天前',
    prepTime: '15分钟',
    cookTime: '12分钟',
    servings: '2人份',
    ingredients: ['三文鱼 2块', '芦笋 1把', '柠檬 1个'],
    steps: ['三文鱼调味静置。', '与芦笋一起烤熟。', '挤上柠檬汁即可。'],
  },
];

const recipeDetailsById = Object.fromEntries(
  recipeSeeds.map((recipe) => [recipe.id, buildRecipeDetail(recipe)]),
) as Record<string, RecipeDetail>;

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export async function getRecipeDetailById(id: string): Promise<RecipeDetail | null> {
  await wait(250);

  if (id === 'error') {
    throw new Error('加载菜谱失败');
  }

  return recipeDetailsById[id] ?? null;
}
