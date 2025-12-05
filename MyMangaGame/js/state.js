/**
 * state.js
 * 游戏数据的核心仓库 (Single Source of Truth)
 * 所有游戏运行时的变化（金钱、属性、男主状态）都存储在这里。
 */

// ==========================================
// 1. 游戏配置常量 (Configuration Constants)
// ==========================================
export const gameConfig = {
    MAX_DAYS: 100,           // 只有100天的时间证明自己 
    GOAL_FANS: 50000,        // 目标：5万粉丝（一周目很难达到） 
    GOAL_MONEY: 100000,      // 目标：赚10万 
    INHERIT_RATE: 0.1        // 二周目继承 10% 的金钱 
};

// ==========================================
// 2. 定义初始状态 (Initial State)
// ==========================================
const initialState = {
    // --- 玩家基础数据 ---
    player: {
        name: "默认女主名",
        energy: 100,        // 当前精力
        maxEnergy: 100,     // 精力上限
        money: 1000,        // 离家出走带的启动资金，很少
        fans: 0,            // 粉丝数
        
        // --- 核心属性 ---
        attributes: {
            art: 5,        // 画功
            story: 5,      // 编剧
            charm: 5,      // 魅力
            darkness: 0     // 黑化值
        },
        title: "无名之辈"
    },

    // --- 漫画经营数据 (已合并修复) ---
    mangaCareer: {
        // 基础 RPG 属性
        level: 1,           // 漫画家等级
        exp: 0,             // 经验值

        // 经营与排名属性
        rankingTier: 0,     // 排行榜等级: 0=小区, 1=全球, 2=太阳系, 3=时间线
        currentRank: 999,   // 当前排名

        unlockedGenres: ["school_romance"], // 初始必须有一个
        unlockedStyles: ["standard"],

        // 历史记录
        history: [],        // 存放已完结作品的历史记录 (合并了 completedWorks)
        
        // 当前正在创作的作品 (如果没有则为 null)
        currentWork: null,
        // 剧情焦点效果记录
        focusEffects: [] 
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
        date: 1,            // 第几天
        dateStr: "1月1日",  // 显示用日期
        weather: "sunny",   // 天气
        location: "home"    // home, park, cafe, basement
    },
    
    // --- 游戏时间配置 ---
    gameTime: {
        day: 1,
        deadline: gameConfig.MAX_DAYS
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
    },
    
    // --- 成就记录 (永久保存) ---
    achievements: [],
    
    // --- 结局历史 ---
    endingsUnlock: [],
    
    // --- 游戏日志 ---
    logs: []
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
 * 保存游戏到指定槽位
 * @param {number} slotId - 存档槽位ID (1-10)
 */
export function saveGame(slotId = 1) {
    try {
        // 添加存档元数据
        const saveData = {
            ...gameState,
            saveInfo: {
                slotId: slotId,
                saveTime: new Date().toLocaleString(),
                day: gameState.world?.day || 1,
                playerName: gameState.player?.name || "未知",
                currentWorkTitle: gameState.mangaCareer?.currentWork?.title || "无"
            }
        };
        
        const jsonStr = JSON.stringify(saveData);
        localStorage.setItem(`myMangaGameSave_${slotId}`, jsonStr);
        console.log(`Game Saved to Slot ${slotId} Successfully`);
        return true;
    } catch (e) {
        console.error("Save Failed:", e);
        return false;
    }
}

/**
 * 从指定槽位读取存档
 * @param {number} slotId - 存档槽位ID (1-10)
 */
export function loadGame(slotId = 1) {
    const saveStr = localStorage.getItem(`myMangaGameSave_${slotId}`);
    if (!saveStr) {
        console.log(`No Save Found in Slot ${slotId}`);
        return false;
    }

    try {
        const savedData = JSON.parse(saveStr);
        // 数据合并，防止新旧版本字段差异导致报错
        Object.assign(gameState, savedData);
        
        console.log(`Game Loaded from Slot ${slotId}:`, gameState);
        return true;
    } catch (e) {
        console.error("Load Failed:", e);
        return false;
    }
}

/**
 * 获取所有存档槽位的信息
 */
export function getAllSaves() {
    const saves = [];
    const maxSlots = 10; // 最大存档槽位数
    
    for (let i = 1; i <= maxSlots; i++) {
        try {
            const saveStr = localStorage.getItem(`myMangaGameSave_${i}`);
            if (saveStr) {
                const saveData = JSON.parse(saveStr);
                saves.push({
                    slotId: i,
                    saveInfo: saveData.saveInfo || {
                        saveTime: "未知时间",
                        day: saveData.world?.day || 1,
                        playerName: saveData.player?.name || "未知",
                        currentWorkTitle: saveData.mangaCareer?.currentWork?.title || "无"
                    }
                });
            } else {
                // 空槽位
                saves.push({
                    slotId: i,
                    saveInfo: null
                });
            }
        } catch (e) {
            console.error(`Error reading slot ${i}:`, e);
            saves.push({
                slotId: i,
                saveInfo: null,
                error: true
            });
        }
    }
    
    return saves;
}

/**
 * 删除指定槽位的存档
 * @param {number} slotId - 存档槽位ID (1-10)
 */
export function deleteSave(slotId) {
    try {
        localStorage.removeItem(`myMangaGameSave_${slotId}`);
        console.log(`Save in Slot ${slotId} deleted successfully`);
        return true;
    } catch (e) {
        console.error(`Delete save failed for slot ${slotId}:`, e);
        return false;
    }
}

/**
 * 记录游戏事件到日志
 * @param {string} type - 事件类型 (如: 'manga', 'npc', 'event', 'system')
 * @param {string} message - 事件描述
 * @param {Object} data - 可选的附加数据
 */
export function logEvent(type, message, data = {}) {
    const logEntry = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        type: type,
        message: message,
        day: gameState.world?.date || 1,
        timestamp: new Date().toLocaleString(),
        data: data
    };
    
    // 添加到日志数组
    gameState.logs.push(logEntry);
    
    // 限制日志数量，只保留最近的100条
    if (gameState.logs.length > 100) {
        gameState.logs.shift();
    }
    
    console.log(`[GameLog] ${type}: ${message}`, data);
}

// 挂载到 window 方便调试
window.gameState = gameState;
window.logEvent = logEvent;