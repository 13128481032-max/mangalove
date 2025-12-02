/**
 * utils.js
 * 存放通用的工具函数，负责随机数生成、数据格式化、数学计算等。
 * 这个文件不涉及任何具体的游戏业务逻辑，纯粹是“工具”。
 */

// ==========================================
// 1. 随机数与概率系统 (RNG System)
// ==========================================

/**
 * 获取一个范围内的随机整数 (包含 min 和 max)
 * 用于：计算金钱波动、伤害浮动等
 * @example randomInt(10, 20) -> 15
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 【新增】获取一个范围内的随机浮点数 (小数)
 * 用于：计算评分系数、倍率等需要精确小数的地方
 * @example randomFloat(0.8, 1.2) -> 0.953...
 */
export function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * 从数组中随机选取一个元素
 * 用于：随机抽取男主名字、随机触发一句台词
 * @example randomPick(['A', 'B', 'C']) -> 'B'
 */
export function randomPick(array) {
    if (!array || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * 【高级】根据权重随机抽取
 * 用于：抽卡、决定漫画等级 (S级概率低，C级概率高)
 * @param {Array} items - 选项数组 [{ id: 'S', weight: 10 }, { id: 'A', weight: 90 }]
 * @returns 选中的对象
 */
export function weightedRandom(items) {
    // 1. 计算总权重
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
    
    // 2. 生成一个随机线
    let randomNum = Math.random() * totalWeight;
    
    // 3. 看随机线落在哪个区间
    for (const item of items) {
        randomNum -= (item.weight || 1);
        if (randomNum <= 0) {
            return item;
        }
    }
    return items[0]; // 防止意外返回第一个
}

/**
 * 简单的概率判定
 * 用于：判定是否触发修罗场 (30%概率)
 * @param {number} chance - 0 到 1 之间的小数 (0.3 = 30%)
 * @returns {boolean}
 */
export function chance(probability) {
    return Math.random() < probability;
}

// ==========================================
// 2. ID 与 数据处理
// ==========================================

/**
 * 生成简易唯一ID
 * 用于：给生成的男主贴标签，防止重名导致逻辑混乱
 */
export function generateID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * 深拷贝对象
 * 用于：从 data 模板中生成新男主/新事件，确保修改新对象不会影响原始模板
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// ==========================================
// 3. 数值计算与限制
// ==========================================

/**
 * 将数值限制在范围内
 * 用于：确保精力不小于0，也不超过100；好感度不超过上限
 * @example clamp(150, 0, 100) -> 100
 */
export function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}

// ==========================================
// 4. 格式化显示 (UI Helpers)
// ==========================================

/**
 * 格式化大数字
 * 用于：粉丝数显示 (例如 12500 -> "1.2万")
 */
export function formatNumber(num) {
    if (num >= 100000000) {
        return (num / 100000000).toFixed(1) + '亿';
    }
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toString();
}

/**
 * 将属性值转化为评级 (S/A/B/C)
 * 用于：评价漫画质量
 */
export function getRank(score) {
    if (score >= 90) return 'S';
    if (score >= 75) return 'A';
    if (score >= 60) return 'B';
    return 'C';
}