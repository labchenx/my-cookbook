import { db } from '../db/sqlite';
import '../db/init';
import {
  createListRichTextDocument,
  deriveRichTextValue,
} from '../components/recipes/richTextUtils';

type RecipeStatus = 'published' | 'draft';
type RecipeSourceType = 'manual' | 'ai_parse' | null;
type RecipeParseStatus = 'none' | 'pending' | 'success' | 'failed';

type IngredientItem = {
  name: string;
  amount: string;
};

type SeedRecipe = {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  category: string;
  tags: string[];
  ingredientsJson: string;
  ingredientsHtml: string;
  ingredientsText: string;
  stepsJson: string;
  stepsHtml: string;
  stepsText: string;
  sourceUrl: string | null;
  sourceType: RecipeSourceType;
  parseStatus: RecipeParseStatus;
  status: RecipeStatus;
  createdAt: string;
  updatedAt: string;
};

type RecipeSeedInput = {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  category: string;
  tags: string[];
  status?: RecipeStatus;
  createdAt: string;
  updatedAt?: string;
  ingredientItems?: IngredientItem[];
  steps?: string[];
  sourceUrl?: string | null;
  sourceType?: RecipeSourceType;
  parseStatus?: RecipeParseStatus;
};

const categoryFamily = '家常菜';
const categoryDessert = '甜品';
const categoryLight = '减脂';
const categorySoup = '汤类';

function createRecipeTimestamp(dayOffset: number, hour: number, minute = 0) {
  const date = new Date(Date.UTC(2026, 3, 12, hour - 8, minute, 0));
  date.setUTCDate(date.getUTCDate() - dayOffset);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const paddedHour = String(hour).padStart(2, '0');
  const paddedMinute = String(minute).padStart(2, '0');

  return `${year}-${month}-${day}T${paddedHour}:${paddedMinute}:00+08:00`;
}

function buildRecipe({
  id,
  title,
  description,
  coverImage,
  category,
  tags,
  createdAt,
  updatedAt = createdAt,
  status = 'published',
  ingredientItems = [],
  steps = [],
  sourceUrl = null,
  sourceType = null,
  parseStatus = 'none',
}: RecipeSeedInput): SeedRecipe {
  const ingredients = deriveRichTextValue(
    createListRichTextDocument(ingredientItems.map((item) => `${item.name} - ${item.amount}`)),
  );
  const stepContent = deriveRichTextValue(createListRichTextDocument(steps, true));

  return {
    id,
    title,
    description,
    coverImage,
    category,
    tags,
    ingredientsJson: JSON.stringify(ingredients.json),
    ingredientsHtml: ingredients.html,
    ingredientsText: ingredients.text,
    stepsJson: JSON.stringify(stepContent.json),
    stepsHtml: stepContent.html,
    stepsText: stepContent.text,
    sourceUrl,
    sourceType,
    parseStatus,
    status,
    createdAt,
    updatedAt,
  };
}

const curatedRecipes: SeedRecipe[] = [
  buildRecipe({
    id: 'tomato-beef-brisket-stew',
    title: '番茄土豆炖牛腩',
    description: '酸甜番茄味很足，适合周末一次炖一锅，第二顿更入味。',
    coverImage: '/assets/recipes/cover-cabbage-rolls.png',
    category: categoryFamily,
    tags: [categoryFamily, '炖菜', '周末料理'],
    createdAt: createRecipeTimestamp(0, 10, 0),
    updatedAt: createRecipeTimestamp(0, 11, 20),
    ingredientItems: [
      { name: '牛腩', amount: '700g' },
      { name: '番茄', amount: '4个' },
      { name: '土豆', amount: '2个' },
      { name: '胡萝卜', amount: '1根' },
      { name: '洋葱', amount: '半个' },
      { name: '姜片', amount: '6片' },
      { name: '番茄膏', amount: '1大勺' },
      { name: '生抽', amount: '2大勺' },
    ],
    steps: [
      '牛腩冷水下锅焯 2 分钟，捞出后冲掉浮沫备用。',
      '锅里放少量油，先把姜片和洋葱炒香，再倒入牛腩翻炒到边缘微微上色。',
      '加入番茄块和番茄膏炒出汁水，随后调入生抽和一点点老抽。',
      '倒入没过食材的热水，小火炖 50 分钟。',
      '放入土豆和胡萝卜继续炖 20 分钟，最后按口味补盐，撒黑胡椒即可。',
    ],
  }),
  buildRecipe({
    id: 'cola-chicken-wings',
    title: '可乐鸡翅',
    description: '甜咸平衡，颜色红亮，特别适合工作日晚餐配米饭。',
    coverImage: '/assets/recipes/cover-teriyaki-chicken.png',
    category: categoryFamily,
    tags: [categoryFamily, '下饭', '快手'],
    createdAt: createRecipeTimestamp(0, 7, 30),
    updatedAt: createRecipeTimestamp(0, 8, 10),
    ingredientItems: [
      { name: '鸡中翅', amount: '10个' },
      { name: '可乐', amount: '330ml' },
      { name: '生抽', amount: '2大勺' },
      { name: '老抽', amount: '半大勺' },
      { name: '姜片', amount: '5片' },
      { name: '料酒', amount: '1大勺' },
      { name: '熟白芝麻', amount: '少许' },
    ],
    steps: [
      '鸡翅两面划刀，用料酒和姜片抓匀，静置 10 分钟去腥。',
      '平底锅不放太多油，把鸡翅煎到两面金黄。',
      '加入生抽、老抽和整罐可乐，液面大约没过鸡翅的三分之二。',
      '中小火焖 15 分钟后开大火收汁，期间翻两次面让颜色更均匀。',
      '汤汁变浓就关火，装盘后撒白芝麻。',
    ],
  }),
  buildRecipe({
    id: 'garlic-vermicelli-shrimp',
    title: '蒜蓉粉丝蒸虾',
    description: '蒜香足但不冲，宴客上桌也体面，提前处理好只要蒸几分钟。',
    coverImage: '/assets/recipes/cover-salmon-asparagus.png',
    category: categoryFamily,
    tags: [categoryFamily, '蒸菜', '海鲜'],
    createdAt: createRecipeTimestamp(1, 18, 0),
    ingredientItems: [
      { name: '大虾', amount: '12只' },
      { name: '龙口粉丝', amount: '2把' },
      { name: '蒜末', amount: '4大勺' },
      { name: '小米椒', amount: '1根' },
      { name: '生抽', amount: '2大勺' },
      { name: '蚝油', amount: '1大勺' },
      { name: '葱花', amount: '适量' },
    ],
    steps: [
      '粉丝温水泡软后剪短，铺在盘底。',
      '虾开背去虾线，冲洗后平码在粉丝上。',
      '蒜末分两次下锅炒，一半炒到浅金色再和另一半生蒜混合，蒜香会更有层次。',
      '把蒜蓉、生抽、蚝油和一点温水调匀，均匀浇在虾上。',
      '水开后上锅蒸 5 到 6 分钟，出锅撒葱花和小米椒，淋一勺热油激香。',
    ],
    sourceUrl: 'https://example.com/import/xiaohongshu/garlic-vermicelli-shrimp',
    sourceType: 'ai_parse',
    parseStatus: 'success',
  }),
  buildRecipe({
    id: 'oyster-sauce-lettuce',
    title: '蚝油生菜',
    description: '三分钟就能完成的快手青菜，适合给重口味主菜配个清口边菜。',
    coverImage: '/assets/recipes/cover-salad.png',
    category: categoryLight,
    tags: [categoryLight, '蔬菜', '快手'],
    createdAt: createRecipeTimestamp(1, 12, 30),
    ingredientItems: [
      { name: '球生菜', amount: '1颗' },
      { name: '蒜末', amount: '1大勺' },
      { name: '蚝油', amount: '1.5大勺' },
      { name: '生抽', amount: '1小勺' },
      { name: '白糖', amount: '少许' },
      { name: '淀粉水', amount: '2大勺' },
    ],
    steps: [
      '生菜洗净后沥干，大叶子对半撕开更容易入味。',
      '锅里烧一锅水，加一点点油和盐，生菜下锅汆烫 20 秒立刻捞出。',
      '另起锅放少许油，蒜末炒香后加入蚝油、生抽和白糖。',
      '倒入淀粉水煮到微微浓稠，把酱汁浇在生菜上即可。',
    ],
  }),
  buildRecipe({
    id: 'black-pepper-beef-pasta',
    title: '黑椒牛肉意面',
    description: '比外卖清爽，牛肉提前腌十分钟就会很嫩，适合一个人快速做。',
    coverImage: '/assets/recipes/cover-mushroom-pasta.png',
    category: categoryFamily,
    tags: [categoryFamily, '意面', '快手'],
    createdAt: createRecipeTimestamp(2, 19, 0),
    ingredientItems: [
      { name: '意大利面', amount: '180g' },
      { name: '牛里脊', amount: '180g' },
      { name: '彩椒', amount: '半个' },
      { name: '洋葱', amount: '四分之一个' },
      { name: '黑胡椒碎', amount: '1大勺' },
      { name: '生抽', amount: '1大勺' },
      { name: '蚝油', amount: '1大勺' },
      { name: '黄油', amount: '10g' },
    ],
    steps: [
      '牛肉切条后用生抽、黑胡椒和少许淀粉抓匀，腌 10 分钟。',
      '意面按包装时间煮到略带一点芯，捞出拌一小勺橄榄油防粘。',
      '热锅下黄油，先把牛肉炒到变色盛出。',
      '利用锅中余油炒香洋葱和彩椒，再倒回牛肉和意面。',
      '加入蚝油和额外一点黑胡椒碎翻匀，起锅前尝味补盐。',
    ],
  }),
  buildRecipe({
    id: 'mushroom-chicken-rice',
    title: '蘑菇鸡腿焖饭',
    description: '一锅到底很省事，米饭会吸满鸡汁和蘑菇香，第二天带饭也好吃。',
    coverImage: '/assets/recipes/cover-eggplant-risotto.png',
    category: categoryFamily,
    tags: [categoryFamily, '焖饭', '一锅出'],
    createdAt: createRecipeTimestamp(3, 18, 30),
    ingredientItems: [
      { name: '去骨鸡腿肉', amount: '300g' },
      { name: '大米', amount: '2杯' },
      { name: '香菇', amount: '6朵' },
      { name: '胡萝卜', amount: '半根' },
      { name: '生抽', amount: '2大勺' },
      { name: '老抽', amount: '半大勺' },
      { name: '料酒', amount: '1大勺' },
      { name: '葱花', amount: '适量' },
    ],
    steps: [
      '鸡腿肉切块，用生抽、料酒和一点黑胡椒腌 15 分钟。',
      '香菇和胡萝卜切丁，米洗净后按平时稍微少一点的水量浸泡 15 分钟。',
      '锅里把鸡腿肉煎到表面微黄，再下香菇和胡萝卜翻炒。',
      '加入米、生抽和老抽拌匀后转入电饭煲，倒入清水开始正常煮饭程序。',
      '程序结束再焖 10 分钟，开盖撒葱花后翻松。',
    ],
  }),
  buildRecipe({
    id: 'tomato-shrimp-scrambled-eggs',
    title: '茄汁虾仁滑蛋',
    description: '酸甜番茄汁搭配嫩滑鸡蛋，十来分钟能做完，特别适合拌饭。',
    coverImage: '/assets/recipes/cover-teriyaki-chicken.png',
    category: categoryFamily,
    tags: [categoryFamily, '下饭', '虾仁'],
    createdAt: createRecipeTimestamp(4, 11, 30),
    ingredientItems: [
      { name: '虾仁', amount: '200g' },
      { name: '鸡蛋', amount: '4个' },
      { name: '番茄', amount: '2个' },
      { name: '番茄酱', amount: '1大勺' },
      { name: '葱花', amount: '适量' },
      { name: '白胡椒', amount: '少许' },
      { name: '淀粉', amount: '1小勺' },
    ],
    steps: [
      '虾仁用少许盐、白胡椒和淀粉抓匀，静置 10 分钟。',
      '鸡蛋打散，先炒到七成熟盛出，这样回锅后口感更嫩。',
      '番茄切块下锅炒出汁，再加入番茄酱和少量热水。',
      '放入虾仁煮到卷曲变红，倒回鸡蛋轻轻翻匀。',
      '汤汁收至能挂在食材表面，撒葱花出锅。',
    ],
  }),
  buildRecipe({
    id: 'dry-pan-cauliflower',
    title: '干锅花菜',
    description: '保留一点脆感最好吃，五花肉提香但不会太腻，很适合当家常硬菜。',
    coverImage: '/assets/recipes/cover-cabbage-rolls.png',
    category: categoryFamily,
    tags: [categoryFamily, '家常小炒', '下饭'],
    createdAt: createRecipeTimestamp(5, 18, 0),
    ingredientItems: [
      { name: '花菜', amount: '1颗' },
      { name: '五花肉', amount: '120g' },
      { name: '蒜片', amount: '4瓣' },
      { name: '青椒', amount: '1个' },
      { name: '豆瓣酱', amount: '1大勺' },
      { name: '生抽', amount: '1大勺' },
      { name: '糖', amount: '少许' },
    ],
    steps: [
      '花菜掰成小朵后淡盐水浸泡，沥干备用。',
      '五花肉切薄片，下锅煸到微微吐油。',
      '加入蒜片和豆瓣酱炒出红油，再放花菜大火翻炒。',
      '沿锅边淋少许水，盖盖焖 2 分钟让花菜断生。',
      '最后放青椒、生抽和一点糖提味，炒到青椒断生就可以出锅。',
    ],
  }),
  buildRecipe({
    id: 'pan-seared-salmon-asparagus',
    title: '香煎三文鱼配芦笋',
    description: '适合晚餐控制油脂，三文鱼外皮煎脆后口感会更好。',
    coverImage: '/assets/recipes/cover-salmon-asparagus.png',
    category: categoryLight,
    tags: [categoryLight, '高蛋白', '晚餐'],
    createdAt: createRecipeTimestamp(6, 19, 0),
    ingredientItems: [
      { name: '三文鱼排', amount: '2块' },
      { name: '芦笋', amount: '1把' },
      { name: '柠檬', amount: '半个' },
      { name: '海盐', amount: '适量' },
      { name: '黑胡椒', amount: '适量' },
      { name: '橄榄油', amount: '1大勺' },
    ],
    steps: [
      '三文鱼厨房纸吸干表面水分，两面撒海盐和黑胡椒，回温 10 分钟。',
      '芦笋切掉老根后拌少许橄榄油和盐。',
      '平底锅先煎三文鱼，带皮的一面多煎一会儿，直到表皮变脆。',
      '把芦笋放入锅中同煎 2 到 3 分钟，保持翠绿口感。',
      '装盘后挤柠檬汁，喜欢的话再磨一点黑胡椒。',
    ],
  }),
  buildRecipe({
    id: 'quinoa-chicken-salad',
    title: '藜麦鸡胸沙拉',
    description: '适合做减脂期午餐，提前备餐也不容易出水。',
    coverImage: '/assets/recipes/cover-salad.png',
    category: categoryLight,
    tags: [categoryLight, '轻食', 'meal-prep'],
    createdAt: createRecipeTimestamp(7, 12, 0),
    ingredientItems: [
      { name: '鸡胸肉', amount: '220g' },
      { name: '藜麦', amount: '80g' },
      { name: '生菜', amount: '1小颗' },
      { name: '黄瓜', amount: '1根' },
      { name: '圣女果', amount: '8颗' },
      { name: '玉米粒', amount: '80g' },
      { name: '油醋汁', amount: '2大勺' },
    ],
    steps: [
      '藜麦提前洗净，按 1 比 1.5 的水量煮熟后放凉。',
      '鸡胸肉撒盐和黑胡椒，平底锅煎熟后静置 5 分钟再切片。',
      '生菜撕小块，黄瓜切片，圣女果对半切开。',
      '把所有蔬菜、藜麦和鸡胸装入大碗，吃之前再淋油醋汁拌匀。',
    ],
  }),
  buildRecipe({
    id: 'avocado-egg-open-sandwich',
    title: '牛油果鸡蛋开放三明治',
    description: '早餐做法很简单，牛油果压成泥后拌一点酸味会更耐吃。',
    coverImage: '/assets/recipes/cover-salad.png',
    category: categoryLight,
    tags: [categoryLight, '早餐', '快手'],
    createdAt: createRecipeTimestamp(8, 8, 0),
    ingredientItems: [
      { name: '全麦酸面包', amount: '2片' },
      { name: '牛油果', amount: '1个' },
      { name: '鸡蛋', amount: '2个' },
      { name: '柠檬汁', amount: '1小勺' },
      { name: '海盐', amount: '少许' },
      { name: '黑胡椒', amount: '少许' },
      { name: '芝麻叶', amount: '一小把' },
    ],
    steps: [
      '鸡蛋煮到喜欢的熟度，想要流心大约 6 分 30 秒即可。',
      '牛油果压成泥，拌入柠檬汁、海盐和黑胡椒。',
      '面包烤到表面酥脆，抹上牛油果泥。',
      '铺上芝麻叶和切开的鸡蛋，最后再撒一点黑胡椒。',
    ],
  }),
  buildRecipe({
    id: 'corn-chicken-soup',
    title: '玉米鸡茸羹',
    description: '口感顺滑，孩子也容易接受，晚饭来一碗很暖胃。',
    coverImage: '/assets/recipes/cover-corn-soup.png',
    category: categorySoup,
    tags: [categorySoup, '家常汤', '暖胃'],
    createdAt: createRecipeTimestamp(9, 18, 30),
    ingredientItems: [
      { name: '鸡胸肉', amount: '150g' },
      { name: '甜玉米粒', amount: '200g' },
      { name: '鸡蛋', amount: '1个' },
      { name: '高汤', amount: '800ml' },
      { name: '姜片', amount: '3片' },
      { name: '水淀粉', amount: '3大勺' },
      { name: '白胡椒', amount: '少许' },
    ],
    steps: [
      '鸡胸肉剁成细茸，用少许盐和白胡椒抓匀。',
      '高汤加姜片煮开后，放入玉米粒先煮 5 分钟。',
      '把鸡茸一点点拨入锅中，用筷子快速搅散避免结团。',
      '分次加入水淀粉让汤体变浓，再淋入蛋液形成蛋花。',
      '出锅前尝味，撒一点白胡椒提香。',
    ],
  }),
  buildRecipe({
    id: 'yam-rib-soup',
    title: '山药排骨汤',
    description: '汤色清爽但味道足，适合换季时喝，炖久一点山药会更绵。',
    coverImage: '/assets/recipes/cover-pumpkin-soup.png',
    category: categorySoup,
    tags: [categorySoup, '炖汤', '家常'],
    createdAt: createRecipeTimestamp(10, 9, 0),
    ingredientItems: [
      { name: '排骨', amount: '500g' },
      { name: '铁棍山药', amount: '2根' },
      { name: '胡萝卜', amount: '1根' },
      { name: '姜片', amount: '5片' },
      { name: '料酒', amount: '1大勺' },
      { name: '枸杞', amount: '1小把' },
    ],
    steps: [
      '排骨冷水下锅焯水，加入姜片和料酒后煮出血沫，捞出洗净。',
      '砂锅里放排骨和足量热水，大火烧开后转小火炖 40 分钟。',
      '山药和胡萝卜切滚刀块，放入锅中继续炖 20 分钟。',
      '最后放枸杞和少量盐，再煮 5 分钟就可以关火。',
    ],
  }),
  buildRecipe({
    id: 'pumpkin-soy-milk-soup',
    title: '南瓜豆乳浓汤',
    description: '奶味很轻，主要是南瓜和豆乳本身的甜香，适合早餐或轻晚餐。',
    coverImage: '/assets/recipes/cover-pumpkin-soup.png',
    category: categorySoup,
    tags: [categorySoup, '轻食', '早餐'],
    createdAt: createRecipeTimestamp(11, 8, 30),
    ingredientItems: [
      { name: '南瓜', amount: '500g' },
      { name: '无糖豆乳', amount: '350ml' },
      { name: '洋葱', amount: '四分之一个' },
      { name: '黄油', amount: '8g' },
      { name: '海盐', amount: '适量' },
      { name: '南瓜籽', amount: '少许' },
    ],
    steps: [
      '南瓜去皮切小块，洋葱切丝备用。',
      '锅里放黄油炒香洋葱，再放南瓜翻炒 2 分钟。',
      '加入刚好没过南瓜的热水，煮到南瓜可以轻松压碎。',
      '倒入料理机和豆乳一起打顺，再回锅加热到微微冒泡。',
      '按口味加盐，装碗后撒一点南瓜籽。',
    ],
  }),
  buildRecipe({
    id: 'miso-tofu-seaweed-soup',
    title: '味噌豆腐海带汤',
    description: '十分钟就能完成，适合工作日晚上想吃点热汤的时候。',
    coverImage: '/assets/recipes/cover-corn-soup.png',
    category: categorySoup,
    tags: [categorySoup, '快手', '日式'],
    createdAt: createRecipeTimestamp(12, 18, 0),
    ingredientItems: [
      { name: '嫩豆腐', amount: '1盒' },
      { name: '味噌', amount: '2大勺' },
      { name: '裙带菜', amount: '1小把' },
      { name: '金针菇', amount: '半把' },
      { name: '高汤', amount: '700ml' },
      { name: '葱花', amount: '适量' },
    ],
    steps: [
      '裙带菜用冷水泡发，嫩豆腐切小块。',
      '高汤煮开后先放金针菇煮 2 分钟。',
      '转小火，加入豆腐和裙带菜，避免大滚把豆腐煮碎。',
      '舀一勺热汤把味噌调开，再回倒锅里拌匀，不要再大火久煮。',
      '出锅前撒葱花即可。',
    ],
    sourceUrl: 'https://example.com/import/douyin/miso-tofu-seaweed-soup',
    sourceType: 'ai_parse',
    parseStatus: 'success',
  }),
  buildRecipe({
    id: 'basque-cheesecake',
    title: '巴斯克芝士蛋糕',
    description: '中心保留一点湿润口感最好吃，冷藏一夜后风味更稳定。',
    coverImage: '/assets/recipes/cover-chocolate-mousse.png',
    category: categoryDessert,
    tags: [categoryDessert, '烘焙', '聚会'],
    createdAt: createRecipeTimestamp(13, 14, 0),
    ingredientItems: [
      { name: '奶油奶酪', amount: '500g' },
      { name: '细砂糖', amount: '110g' },
      { name: '鸡蛋', amount: '4个' },
      { name: '淡奶油', amount: '250ml' },
      { name: '玉米淀粉', amount: '15g' },
      { name: '香草精', amount: '少许' },
    ],
    steps: [
      '奶油奶酪提前回温，和砂糖一起搅打到顺滑。',
      '分次加入鸡蛋，每加一个都拌到完全吸收。',
      '倒入淡奶油、香草精和过筛后的玉米淀粉，轻轻混合均匀。',
      '模具铺好烘焙纸，面糊倒入后在桌面轻震几下排掉大气泡。',
      '220 度烘烤约 28 分钟，表面上色明显即可，放凉后冷藏 6 小时以上。',
    ],
    sourceUrl: 'https://example.com/recipes/basque-cheesecake',
    sourceType: 'manual',
    parseStatus: 'success',
  }),
  buildRecipe({
    id: 'matcha-soy-pudding',
    title: '抹茶豆乳布丁',
    description: '甜度不高，口感轻盈，抹茶味干净，适合做成单人份冷藏甜点。',
    coverImage: '/assets/recipes/cover-chocolate-mousse.png',
    category: categoryDessert,
    tags: [categoryDessert, '冷藏甜点', '抹茶'],
    createdAt: createRecipeTimestamp(14, 16, 0),
    ingredientItems: [
      { name: '无糖豆乳', amount: '300ml' },
      { name: '淡奶油', amount: '120ml' },
      { name: '细砂糖', amount: '35g' },
      { name: '抹茶粉', amount: '8g' },
      { name: '吉利丁片', amount: '2片' },
    ],
    steps: [
      '吉利丁片冰水泡软，抹茶粉先用少量温豆乳调成无颗粒的糊。',
      '锅里放剩余豆乳、淡奶油和砂糖，小火加热到边缘冒小泡。',
      '离火后加入抹茶糊和挤干水分的吉利丁，搅匀到完全融化。',
      '过筛倒入小杯中，冷藏至少 4 小时。',
      '食用前可以撒一点抹茶粉或者加少量蜜红豆。',
    ],
  }),
  buildRecipe({
    id: 'sweet-fermented-rice-balls',
    title: '红糖酒酿小圆子',
    description: '暖甜型甜品，晚上煮一碗很舒服，酒酿不要久滚才会保留香气。',
    coverImage: '/assets/recipes/cover-chocolate-mousse.png',
    category: categoryDessert,
    tags: [categoryDessert, '中式甜品', '快手'],
    createdAt: createRecipeTimestamp(15, 20, 0),
    ingredientItems: [
      { name: '小圆子', amount: '200g' },
      { name: '酒酿', amount: '4大勺' },
      { name: '红糖', amount: '35g' },
      { name: '枸杞', amount: '1小把' },
      { name: '清水', amount: '700ml' },
      { name: '鸡蛋', amount: '1个，可选' },
    ],
    steps: [
      '锅里加水和红糖煮开，先把糖完全化开。',
      '放入小圆子，煮到全部浮起来后再多煮 1 分钟。',
      '加入酒酿和枸杞，小火再煮半分钟即可。',
      '喜欢蛋花的话最后淋入蛋液，轻轻搅一下就关火。',
    ],
  }),
  buildRecipe({
    id: 'berry-yogurt-cup',
    title: '希腊酸奶莓果杯',
    description: '适合早餐或下午加餐，提前分装冷藏，第二天直接拿出来吃。',
    coverImage: '/assets/recipes/cover-chocolate-mousse.png',
    category: categoryDessert,
    tags: [categoryDessert, '早餐', '免烤'],
    createdAt: createRecipeTimestamp(16, 8, 30),
    ingredientItems: [
      { name: '希腊酸奶', amount: '250g' },
      { name: '蓝莓', amount: '50g' },
      { name: '草莓', amount: '4颗' },
      { name: '格兰诺拉', amount: '40g' },
      { name: '蜂蜜', amount: '1小勺' },
    ],
    steps: [
      '草莓切小块，和蓝莓一起擦干表面水分。',
      '杯底先铺一层酸奶，再放一层莓果和少量格兰诺拉。',
      '重复一次层次，最上面淋一点蜂蜜提味。',
      '如果不马上吃，格兰诺拉可以单独装，吃前再撒保持酥脆。',
    ],
  }),
  buildRecipe({
    id: 'draft-yuzu-yogurt-mousse',
    title: '柚香酸奶慕斯杯',
    description: '想做成更清爽的夏季甜点版本，目前还在调整酸甜比例。',
    coverImage: '/assets/recipes/cover-chocolate-mousse.png',
    category: categoryDessert,
    tags: [categoryDessert, '草稿'],
    status: 'draft',
    createdAt: createRecipeTimestamp(17, 9, 0),
    ingredientItems: [
      { name: '希腊酸奶', amount: '200g' },
      { name: '淡奶油', amount: '100ml' },
      { name: '柚子酱', amount: '2大勺' },
      { name: '吉利丁片', amount: '2片' },
    ],
    steps: [
      '先保留这个版本的比例，下一次把柚子酱减半再试一次酸度。',
      '底部想加一层饼干碎，但还没决定是黄油饼干还是燕麦碎。',
    ],
    parseStatus: 'none',
  }),
  buildRecipe({
    id: 'draft-weekend-focaccia',
    title: '周末佛卡夏测试版',
    description: '记录正在试的高含水面团配方，后续要补充发酵和烘烤时间。',
    coverImage: '/assets/recipes/cover-salad.png',
    category: categoryFamily,
    tags: [categoryFamily, '草稿', '烘焙'],
    status: 'draft',
    createdAt: createRecipeTimestamp(18, 11, 0),
    ingredientItems: [
      { name: '高筋面粉', amount: '300g' },
      { name: '水', amount: '240g' },
      { name: '酵母', amount: '4g' },
      { name: '橄榄油', amount: '20g' },
      { name: '海盐', amount: '6g' },
    ],
    steps: [
      '当前版本一发后面团偏湿，下一次试着把水量降到 230g。',
      '迷迭香和小番茄的组合可以保留，表面盐量还需要再减一点。',
    ],
    sourceUrl: 'https://example.com/import/browser/weekend-focaccia',
    sourceType: 'ai_parse',
    parseStatus: 'pending',
  }),
];

const insertRecipeStatement = db.prepare(`
  INSERT INTO recipes (
    id,
    title,
    description,
    cover_image,
    category,
    tags,
    ingredients_json,
    ingredients_html,
    ingredients_text,
    steps_json,
    steps_html,
    steps_text,
    source_url,
    source_type,
    parse_status,
    status,
    created_at,
    updated_at
  ) VALUES (
    @id,
    @title,
    @description,
    @cover_image,
    @category,
    @tags,
    @ingredients_json,
    @ingredients_html,
    @ingredients_text,
    @steps_json,
    @steps_html,
    @steps_text,
    @source_url,
    @source_type,
    @parse_status,
    @status,
    @created_at,
    @updated_at
  )
`);

const resetAndSeedRecipes = db.transaction((recipes: SeedRecipe[]) => {
  db.prepare('DELETE FROM recipes').run();

  for (const recipe of recipes) {
    insertRecipeStatement.run({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      cover_image: recipe.coverImage,
      category: recipe.category,
      tags: JSON.stringify(recipe.tags),
      ingredients_json: recipe.ingredientsJson,
      ingredients_html: recipe.ingredientsHtml,
      ingredients_text: recipe.ingredientsText,
      steps_json: recipe.stepsJson,
      steps_html: recipe.stepsHtml,
      steps_text: recipe.stepsText,
      source_url: recipe.sourceUrl,
      source_type: recipe.sourceType,
      parse_status: recipe.parseStatus,
      status: recipe.status,
      created_at: recipe.createdAt,
      updated_at: recipe.updatedAt,
    });
  }
});

resetAndSeedRecipes(curatedRecipes);

const publishedCount = curatedRecipes.filter((recipe) => recipe.status === 'published').length;
const draftCount = curatedRecipes.filter((recipe) => recipe.status === 'draft').length;

console.log(
  `Replaced recipes table with ${curatedRecipes.length} realistic recipes (${publishedCount} published, ${draftCount} draft)`,
);
