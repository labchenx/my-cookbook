import coverCabbageRolls from '../../assets/recipes/cover-cabbage-rolls.png';
import coverChocolateMousse from '../../assets/recipes/cover-chocolate-mousse.png';
import coverCornSoup from '../../assets/recipes/cover-corn-soup.png';
import coverEggplantRisotto from '../../assets/recipes/cover-eggplant-risotto.png';
import coverMushroomPasta from '../../assets/recipes/cover-mushroom-pasta.png';
import coverPumpkinSoup from '../../assets/recipes/cover-pumpkin-soup.png';
import coverSalad from '../../assets/recipes/cover-salad.png';
import coverSalmonAsparagus from '../../assets/recipes/cover-salmon-asparagus.png';
import coverTeriyakiChicken from '../../assets/recipes/cover-teriyaki-chicken.png';
import type { Recipe, RecipeCategory } from './recipesTypes';

export const recipeCategories: RecipeCategory[] = ['全部', '家常菜', '甜品', '减脂', '汤类'];

export const recipeMockData: Recipe[] = [
  {
    id: 'chocolate-mousse-cake',
    title: '巧克力慕斯蛋糕',
    description: '丝滑细腻的巧克力慕斯，入口即化',
    cover: coverChocolateMousse,
    tags: ['甜品', '简单'],
    createdAt: '2026-04-12T10:00:00+08:00',
    category: '甜品',
  },
  {
    id: 'corn-soup',
    title: '香草玉米浓汤',
    description: '温暖舒心的玉米浓汤，营养丰富',
    cover: coverCornSoup,
    tags: ['汤类', '营养'],
    createdAt: '2026-04-12T07:00:00+08:00',
    category: '汤类',
  },
  {
    id: 'turkish-cabbage-rolls',
    title: '土耳其卷心菜卷',
    description: '传统家常菜，味道浓郁',
    cover: coverCabbageRolls,
    tags: ['家常菜', '传统'],
    createdAt: '2026-04-11T12:00:00+08:00',
    category: '家常菜',
  },
  {
    id: 'roasted-vegetable-salad',
    title: '法式烤蔬菜沙拉',
    description: '清爽健康的低脂沙拉',
    cover: coverSalad,
    tags: ['减脂', '低脂'],
    createdAt: '2026-04-11T10:00:00+08:00',
    category: '减脂',
  },
  {
    id: 'eggplant-risotto',
    title: '意式番茄芝士焗饭',
    description: '浓郁的芝士与新鲜番茄的完美结合',
    cover: coverEggplantRisotto,
    tags: ['家常菜', '简单'],
    createdAt: '2026-04-10T10:00:00+08:00',
    category: '家常菜',
  },
  {
    id: 'mushroom-pasta',
    title: '奶油蘑菇意面',
    description: '浓郁顺滑的奶油酱汁配新鲜蘑菇',
    cover: coverMushroomPasta,
    tags: ['家常菜', '快手'],
    createdAt: '2026-04-09T10:00:00+08:00',
    category: '家常菜',
  },
  {
    id: 'teriyaki-chicken-rice',
    title: '日式照烧鸡腿饭',
    description: '外焦里嫩的照烧鸡腿，酱汁浓郁',
    cover: coverTeriyakiChicken,
    tags: ['家常菜', '下饭'],
    createdAt: '2026-04-09T04:00:00+08:00',
    category: '家常菜',
  },
  {
    id: 'pumpkin-soup',
    title: '南瓜浓汤',
    description: '香甜可口的南瓜浓汤，暖胃又营养',
    cover: coverPumpkinSoup,
    tags: ['汤类', '营养'],
    createdAt: '2026-04-08T10:00:00+08:00',
    category: '汤类',
  },
  {
    id: 'salmon-asparagus',
    title: '烤三文鱼配芦笋',
    description: '高蛋白低脂的健康餐',
    cover: coverSalmonAsparagus,
    tags: ['减脂', '高蛋白'],
    createdAt: '2026-04-07T10:00:00+08:00',
    category: '减脂',
  },
];

