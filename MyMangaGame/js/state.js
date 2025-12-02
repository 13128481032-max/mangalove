/**
 * state.js
 * 游戏数据的核心仓库 (Single Source of Truth)
 * 所有游戏运行时的变化（金钱、属性、男主状态）都存储在这里。
 */

// ==========================================
// 1. 定义初始状态 (Configuration)
// ==========================================
const initialState = {
    // --- 玩家基础数据 ---
    player: {
        name: "默认女主名",
        energy: 100,        // 当前精力
        maxEnergy: 100,     // 精力上限
        money: 1000,        // 初始资金
        fans: 0,            // 粉丝数
        
        // --- 核心属性 ---
        attributes: {
            art: 10,        // 画功
            story: 10,      // 编剧
            charm: 10,      // 魅力
            darkness: 0     // 黑化值
        }
    },

    // --- 漫画经营数据 (已合并修复) ---
    mangaCareer: {
        // 基础 RPG 属性
        level: 1,           // 漫画家等级
        exp: 0,             // 经验值
        unlockedGenres: ["romance"], // 已解锁题材

        // 经营与排名属性
        rankingTier: 0,     // 排行榜等级: 0=小区, 1=全球, 2=太阳系, 3=时间线
        currentRank: 999,   // 当前排名

        unlockedGenres: ["school_romance"], // 初始必须有一个
        unlockedStyles: ["standard"],

        // 历史记录
        history: [],        // 存放已完结作品的历史记录 (合并了 completedWorks)
        
        // 当前正在创作的作品 (如果没有则为 null)
        currentWork: null 
        /* currentWork 结构示例 (兼容单次创作与连载):
        {
            title: "霸道总裁爱上我",
            genre: "romance",
            // 创作阶段数据
            progress: 0,      // 进度 0-100
            qualityScore: 0,  // 质量分
            stage: "drafting",// drafting(构思) -> drawing(线稿) -> coloring(上色)
            // 连载数据
            chapter: 0,       // 当前话数
            status: "serializing" // serializing(连载中), finished(已完结)
        } 
        */
    },

    // --- NPC / 恋爱系统 ---
    npcs: [
        // 游戏开始时是空的，随着 random 生成推入对象
        /*
        结构示例:
        {
            id: 1733050000,
            name: "顾沉",
            personality: "gloomy",
            looks: ["泪痣", "金丝眼镜"],
            affection: 0,       // 好感度
            jealousy: 0,        // 嫉妒值
            status: "stranger", // stranger, friend, dating, confined
            history: []         // 互动记录
        }
        */
    ],

    // --- 游戏时间与环境 ---
    world: {
        day: 1,             // 第几天
        dateStr: "1月1日",  // 显示用日期
        weather: "sunny",   // 天气
        location: "home"    // home, park, cafe, basement
    },

    // --- 剧情标记 (Flags) ---
    flags: {
        tutorial_done: false,      // 新手教程是否完成
        first_encounter: false,    // 是否第一次遇到男主
        triggered_yandere: false   // 是否触发过病娇觉醒
    },

    // --- 系统设置 ---
    settings: {
        bgmVolume: 0.5,
        textSpeed: "normal"
    }
};

// ==========================================
// 2. 状态实例 (Reactive State)
// ==========================================

// 使用深拷贝创建一个可变的 gameState 对象
export let gameState = JSON.parse(JSON.stringify(initialState));

// ==========================================
// 3. 状态管理工具函数 (Helpers)
// ==========================================

/**
 * 重置游戏
 */
export function resetState() {
    const freshState = JSON.parse(JSON.stringify(initialState));
    
    // 清空当前对象属性并重新赋值
    for (const key in gameState) {
        delete gameState[key];
    }
    Object.assign(gameState, freshState);
    
    localStorage.removeItem('myMangaGameSave');
    console.log("State Reset Complete");
}

/**
 * 保存游戏
 */
export function saveGame() {
    try {
        const jsonStr = JSON.stringify(gameState);
        localStorage.setItem('myMangaGameSave', jsonStr);
        console.log("Game Saved Successfully");
        return true;
    } catch (e) {
        console.error("Save Failed:", e);
        return false;
    }
}

/**
 * 读取存档
 */
export function loadGame() {
    const saveStr = localStorage.getItem('myMangaGameSave');
    if (!saveStr) {
        console.log("No Save Found");
        return false;
    }

    try {
        const savedData = JSON.parse(saveStr);
        // 数据合并，防止新旧版本字段差异导致报错
        Object.assign(gameState, savedData);
        
        console.log("Game Loaded:", gameState);
        return true;
    } catch (e) {
        console.error("Load Failed:", e);
        return false;
    }
}

// 挂载到 window 方便调试
window.gameState = gameState;