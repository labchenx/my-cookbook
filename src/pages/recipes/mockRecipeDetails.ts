import coverImage from '../../assets/recipe-detail/cover.jpg';
import stepImage1 from '../../assets/recipe-detail/step-1.jpg';
import stepImage2 from '../../assets/recipe-detail/step-2.jpg';
import stepImage3 from '../../assets/recipe-detail/step-3.jpg';
import stepImage4 from '../../assets/recipe-detail/step-4.jpg';
import stepImage5 from '../../assets/recipe-detail/step-5.jpg';
import stepImage6 from '../../assets/recipe-detail/step-6.jpg';
import type { RecipeDetail } from './recipeDetailTypes';

const recipeDetail: RecipeDetail = {
  id: '1',
  title: '巧克力慕斯蛋糕',
  description: '丝滑细腻的巧克力慕斯，入口即化',
  cover: coverImage,
  tags: ['甜品', '简单', '烘焙'],
  createdAt: '2小时前',
  prepTime: '30分钟',
  cookTime: '2小时',
  servings: '6人份',
  ingredients: [
    { name: '黑巧克力', amount: '200g' },
    { name: '淡奶油', amount: '300ml' },
    { name: '鸡蛋', amount: '3个' },
    { name: '细砂糖', amount: '60g' },
    { name: '可可粉', amount: '20g' },
    { name: '吉利丁片', amount: '10g' },
    { name: '牛奶', amount: '100ml' },
  ],
  steps: [
    {
      id: 'step-1',
      order: 1,
      text: '将黑巧克力隔水融化，融化时要不断搅拌，使其受热均匀，避免温度过高导致油水分离。',
      image: stepImage1,
    },
    {
      id: 'step-2',
      order: 2,
      text: '淡奶油打发至六成，呈现流动状态但有明显纹路即可，不要打发过度。',
      image: stepImage2,
    },
    {
      id: 'step-3',
      order: 3,
      text: '吉利丁片用冷水泡软后，加入温热的牛奶中搅拌至完全融化。',
      image: stepImage3,
    },
    {
      id: 'step-4',
      order: 4,
      text: '将融化的巧克力、吉利丁牛奶液和打发的淡奶油混合，用刮刀轻轻翻拌均匀。',
      image: stepImage4,
    },
    {
      id: 'step-5',
      order: 5,
      text: '将慕斯糊倒入模具中，轻震几下排出气泡，放入冰箱冷藏4小时以上。',
      image: stepImage5,
    },
    {
      id: 'step-6',
      order: 6,
      text: '脱模前用热毛巾在模具外壁热敷10秒，即可轻松脱模。表面撒上可可粉装饰。',
      image: stepImage6,
    },
  ],
  tips:
    '1. 巧克力融化时温度不要超过50度，否则容易油水分离 2. 淡奶油打发程度很关键，六成发最佳 3. 脱模时一定要用热毛巾热敷，否则容易破坏形状 4. 冷藏时间至少4小时，隔夜效果更佳',
};

const recipeDetailsById: Record<string, RecipeDetail> = {
  '1': recipeDetail,
  'chocolate-mousse-cake': {
    ...recipeDetail,
    id: 'chocolate-mousse-cake',
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
