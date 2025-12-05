import { gameState } from '../state.js';

export class EventSystem {
    constructor() {
        this.events = []; // 存储所有加载的事件
    }

    /**
     * 1. 初始化方法
     * main.js 会调用 await eventSystem.init()
     */
    async init() {
        try {
            const response = await fetch('./js/data/events.json');
            if (!response.ok) throw new Error("HTTP error " + response.status);
            
            const data = await response.json();
            
            // 合并所有事件类型
            this.events = [
                ...(data.tutorial || []),
                ...(data.daily_work || []),
                ...(data.encounters || []),
                ...(data.manga_stories || []),
                ...(data.conflict?.jealousy_light || []),
                ...(data.conflict?.shuraba || []),
                ...(data.special_endings?.gloomy_chain || [])
            ];
            console.log(`[EventSystem] 成功加载 ${this.events.length} 个事件`);
        } catch (error) {
            console.error("❌ 无法加载 events.json:", error);
            this.events = [];
        }
    }

    /**
     * 2. 核心：检查触发
     * 【修改】增加传入 npcSystem，以便获取台词
     */
    checkTriggers(gameState, triggerType, ui, npcSystem) {
        // 1. 修罗场检查 (高优先级)
        if (triggerType === 'work' || triggerType === 'go_out') {
            // 传入 npcSystem
            const conflictEvent = this.checkJealousyConflict(gameState, npcSystem);
            if (conflictEvent) {
                this.startEvent(conflictEvent, ui, gameState);
                return true;
            }
        }

        // 2. 特殊处理：gloomy_chain事件需要基于特定NPC条件触发
        if (triggerType === 'gloomy_chain' && gameState.npcs) {
            // 获取所有gloomy性格的NPC
            const gloomyNpcs = gameState.npcs.filter(npc => npc.personality === 'gloomy');
            
            if (gloomyNpcs.length > 0) {
                // 遍历每个gloomy NPC，检查是否有符合条件的事件
                for (const npc of gloomyNpcs) {
                    // 筛选与该NPC相关的gloomy_chain事件
                    const gloomyEvents = this.events.filter(evt => 
                        evt.trigger === 'gloomy_chain' && 
                        !gameState.flags[evt.id] &&
                        (evt.conditions ? this.checkConditions({...evt.conditions, npc}, gameState) : true)
                    );
                    
                    if (gloomyEvents.length > 0) {
                        // 检查每个事件的trigger_val条件（好感度等）
                        const validEvents = gloomyEvents.filter(evt => {
                            if (!evt.trigger_val) return true; // 如果没有trigger_val条件，默认有效
                            
                            // 检查好感度是否达到要求
                            return npc.favorability >= evt.trigger_val;
                        });
                        
                        if (validEvents.length > 0) {
                            // 随机选择一个有效事件并传递NPC信息
                            const selectedEvent = this.pickRandom(validEvents);
                            // 将NPC信息添加到事件中，以便在事件文本和效果中使用
                            selectedEvent.targetNpc = npc;
                            this.startEvent(selectedEvent, ui, gameState);
                            return true;
                        }
                    }
                }
            }
        }

        // 3. 普通事件处理：筛选符合当前时机的所有事件
        const candidates = this.events.filter(evt => 
            evt.trigger === triggerType && 
            !gameState.flags[evt.id] && 
            this.checkConditions(evt.conditions, gameState)
        );

        if (candidates.length === 0) return false;

        const selectedEvent = this.pickRandom(candidates);
        this.startEvent(selectedEvent, ui, gameState);
        return true;
    }

    /**
     * 3. 条件检测器
     */
    checkConditions(conditions, gameState) {
        if (!conditions) return true; 

        const p = gameState.player;
        
        // 检查属性
        if (conditions.min_art && p.attributes.art < conditions.min_art) return false;
        if (conditions.min_charm && p.attributes.charm < conditions.min_charm) return false;
        
        // 检查金钱/粉丝
        if (conditions.min_fans && p.fans < conditions.min_fans) return false;
        
        // 检查特定男主状态
        if (conditions.dating_with) {
            const boyfriend = gameState.npcs && gameState.npcs.find(n => n.id === conditions.dating_with);
            if (!boyfriend || boyfriend.status !== 'dating') return false;
        }

        // 检查特定NPC的属性条件 (支持gloomy_chain事件)
        if (conditions.trigger_val) {
            const targetNpc = gameState.npcs && gameState.npcs.find(n => n.id === conditions.trigger_val.npc_id);
            if (!targetNpc) return false;
            
            // 遍历所有需要检查的属性 (如 favorability)
            for (const [attr, minVal] of Object.entries(conditions.trigger_val)) {
                if (attr === 'npc_id') continue; // 跳过NPC ID字段
                if (targetNpc[attr] < minVal) return false; // 检查属性是否达标
            }
        }

        return true;
    }

    /**
     * 4. 修罗场逻辑 (动态生成)
     */
    checkJealousyConflict(gameState, npcSystem) {
        if (!gameState.npcs) return null;

        // 1. 筛选出关系亲密的人 (好感度 > 60 或者 已经是恋人)
        // 只有关系够好，才会吃醋
        const lovers = gameState.npcs.filter(n => n.status === 'dating' || n.favorability >= 60);
        
        // 至少要有 2 个人才能修罗场
        if (lovers.length < 2) return null; 

        // 2. 概率判定 (约会/外出的人越多，越容易撞车)
        // 2个人: 10%, 3个人: 20%, 4个人: 30%...
        const riskChance = (lovers.length - 1) * 0.1; 
        if (Math.random() > riskChance) return null; // 没触发，平安无事

        console.log("🔥 触发修罗场！当前高好感人数:", lovers.length);

        // 3. 随机抽取两名受害者 (A 和 B)
        // 先打乱数组
        const shuffled = lovers.sort(() => 0.5 - Math.random());
        const npcA = shuffled[0];
        const npcB = shuffled[1];

        // 4. 获取他们的台词 (需要 npcSystem 支持)
        const lineA = npcSystem ? npcSystem.getJealousyLine(npcA) : "...";
        const lineB = npcSystem ? npcSystem.getJealousyLine(npcB) : "...";

        // 5. 动态构建事件对象
        return {
            id: `shuraba_${Date.now()}`,
            title: "⚠️ 修罗场爆发",
            // 动态文本
            text: `当你正准备离开时，却迎面撞上了 ${npcA.name}。\n还没来得及打招呼，你的身后传来了 ${npcB.name} 的脚步声。\n\n空气瞬间凝固了。\n\n【${npcA.name}】:\n“${lineA}”\n\n【${npcB.name}】:\n“${lineB}”`,
            choices: [
                {
                    text: `偏向 ${npcA.name} (好感↑, ${npcB.name}心碎)`,
                    effects: { dating_with: npcA.id }, // 特殊标记
                    action: () => {
                        npcA.favorability += 10;
                        npcB.favorability -= 20; // 没被选中的人好感大跌
                    }
                },
                {
                    text: `偏向 ${npcB.name} (好感↑, ${npcA.name}心碎)`,
                    effects: { dating_with: npcB.id },
                    action: () => {
                        npcB.favorability += 10;
                        npcA.favorability -= 20;
                    }
                },
                {
                    text: "你们不要吵了！(全部逃跑)",
                    action: () => {
                        npcA.favorability -= 10;
                        npcB.favorability -= 10;
                    }
                }
            ]
        };
    }
/**
     * 检查特殊事件：哥哥的注视
     * 在玩家“外出”或“约会”时调用
     */
    checkBrotherTrigger(currentAction, datingTarget = null) {
        // 1. 获取哥哥对象
        const brother = window.game.npcSystem.getOrInitBrother();
        
        // 2. 判定触发概率 (默认 10%，如果女主钱少或状态差，概率提升，因为哥哥关心)
        let chance = 0.1;
        if (gameState.player.money < 500) chance += 0.2; // 没钱了哥哥会出现
        if (datingTarget) chance += 0.3; // 和别人约会时，哥哥容易出现（墨菲定律）

        if (Math.random() > chance) return null; // 未触发

        // 3. 根据情境生成剧情
        let eventContent = {};

        // === 场景 A: 和别人约会时被撞见 (修罗场) ===
        if (datingTarget && datingTarget.id !== brother.id) {
            // 哥哥理智 -10
            brother.restraint -= 10; 
            
            eventContent = {
                speaker: "沈清舟",
                text: `（街角，一道熟悉的视线刺痛了你的背脊）\n你正牵着${datingTarget.name}的手，却看到沈清舟站在阴影里。\n他没打伞，雨水顺着那副金丝眼镜滑落，眼神晦暗不明，像是在看你，又像是透过你在看某种无法触碰的深渊。`,
                choices: [
                    {
                        label: "慌乱地甩开男友的手",
                        action: () => {
                            brother.restraint += 5; // 稍微安抚了他的理智
                            this.triggerDialogue(brother, "explain");
                        }
                    },
                    {
                        label: "假装没看见，继续走",
                        action: () => {
                            brother.restraint -= 20; // 极度刺激他 -> 容易导致黑化
                            brother.affection += 5;  // 扭曲的爱意增加了
                            window.game.ui.showToast("沈清舟的理智正在崩坏...", "error");
                        }
                    }
                ]
            };
        } 
        // === 场景 B: 穷困潦倒时 (温情/拉扯) ===
        else if (gameState.player.money < 100) {
             eventContent = {
                speaker: "短信",
                text: `手机震动了一下，是银行卡到账提示：【转账 +5000元】。\n紧接着是一条简短的信息：“别饿着。——哥”`,
                choices: [
                    {
                        label: "收下，回复谢谢",
                        action: () => {
                            gameState.player.money += 5000;
                            brother.restraint -= 2; // 接受馈赠也是一种牵连
                        }
                    },
                    {
                        label: "退回，在此划清界限",
                        action: () => {
                            // 拒绝反而会激起他的控制欲
                            brother.affection += 10; 
                            window.game.ui.showDialog({
                    title: "沈清舟",
                    text: "你非要和我分得这么清吗？我们流着一样的血，这是你永远改变不了的事实。",
                    choices: [{label: "继续", shouldClose: true}]
                });
                        }
                    }
                ]
            };
        }

        return eventContent;
    }
    
    /**
     * 【新增功能】文本格式化工具
     * 负责把 {npc_name} 替换成真的名字
     */
    formatText(text, gameState) {
        if (!text) return "";
        let content = text;

        // 1. 替换玩家名字
        content = content.replace(/{player_name}/g, gameState.player.name || "你");

        // 2. 替换 NPC 名字
        if (content.includes('{npc_name}')) {
            let targetName = "神秘男子";
            
            // 尝试找一个认识的 NPC
            if (gameState.npcs && gameState.npcs.length > 0) {
                const randomNPC = this.pickRandom(gameState.npcs);
                if (randomNPC) targetName = randomNPC.name;
            }
            
            content = content.replace(/{npc_name}/g, targetName);
        }

        // 3. 替换 交互对象的名字 A 和 B (用于修罗场)
        // 这里只是简单示例，后续可扩展更复杂的逻辑
        if (content.includes('{npc_name_A}')) {
             const npc = gameState.npcs && gameState.npcs[0];
             content = content.replace(/{npc_name_A}/g, npc ? npc.name : "男人A");
        }
        if (content.includes('{npc_name_B}')) {
             const npc = gameState.npcs && gameState.npcs[1];
             content = content.replace(/{npc_name_B}/g, npc ? npc.name : "男人B");
        }

        return content;
    }

    /**
     * 5. 启动事件
     */
    startEvent(eventData, ui, gameState) {
        const title = eventData.title || "触发剧情";
        console.log(`[EventSystem] 启动事件: ${title}`);
        
        if (eventData.once) {
            gameState.flags[eventData.id] = true;
        }

        // 兼容 options 和 choices
        const choicesData = eventData.choices || eventData.options || [];

        // 【关键】调用格式化工具处理文本
        const processedText = this.formatText(eventData.text, gameState);

        ui.showDialog({
            title: title,
            text: processedText,
            choices: choicesData.map((opt) => ({
                text: opt.text,
                action: () => this.resolveChoice(opt, ui, gameState)
            }))
        });
    }

    /**
     * 6. 结算玩家的选择
     */
    resolveChoice(option, ui, gameState) {
        console.log("玩家选择了:", option.text);
        // 应用数值影响 (兼容 effect 和 effects)
        if (option.effects) {
            this.applyEffects(option.effects, gameState, ui);
        } else if (option.effect) {
            this.applyEffects(option.effect, gameState, ui);
        }

        // 关闭当前弹窗
        ui.closeDialog();

        // 连环事件处理
        if (option.next_event) {
            const nextEvent = this.events.find(e => e.id === option.next_event);
            if (nextEvent) {
                setTimeout(() => {
                    this.startEvent(nextEvent, ui, gameState);
                }, 300);
            }
        }
    }

    /**
     * 7. 应用效果
     */
    applyEffects(effects, gameState, ui) {
        const p = gameState.player;
        
        if (effects.money) p.money += effects.money;
        if (effects.fans) p.fans += effects.fans;
        if (effects.energy) p.energy += effects.energy;
        if (effects.art) p.attributes.art += effects.art;
        if (effects.dating_with_npc_favor) {
            // 简单策略：给列表里的第一个人，或者随机一个人加分
            // 这里的逻辑对应 formatText 里随机选人的逻辑
            if (gameState.npcs && gameState.npcs.length > 0) {
                // 这里简单给第一个人加，或者你可以写更复杂的逻辑去记录是哪个npc触发的事件
                const luckyGuy = gameState.npcs[0]; 
                luckyGuy.favorability += effects.dating_with_npc_favor;
                ui.showToast(`${luckyGuy.name} 好感度 +${effects.dating_with_npc_favor}`);
            }
        }
        // 特殊状态：被囚禁
        if (effects.status === 'confined') {
            gameState.flags['is_confined'] = true;
            document.body.classList.add('mode-confined');
            ui.showToast("你失去了自由...");
        }

        // 更新 UI
        ui.updateAll(gameState);
    }

    // 工具函数
    pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * 展示分手剧情
     * @param {string} type - 'normal' 或 'blackened'
     * @param {object} npc - NPC对象
     * @returns {Promise} - 剧情完成的Promise
     */
    async showBreakupScene(type, npc) {
        return new Promise(async (resolve) => {
            // 加载分手剧情数据
            try {
                const response = await fetch('./js/data/events.json');
                const data = await response.json();
                const breakupScenes = data.breakup_scenes || [];
                
                // 获取对应的剧情
                let startSceneId, endSceneId;
                if (type === 'blackened') {
                    startSceneId = 'blackened_breakup_start';
                    endSceneId = 'blackened_breakup_end';
                } else {
                    startSceneId = 'normal_breakup_start';
                    endSceneId = 'normal_breakup_end';
                }
                
                // 找到对应ID的剧情
                const startScene = breakupScenes.find(s => s.id === startSceneId);
                const endScene = breakupScenes.find(s => s.id === endSceneId);
                
                if (!startScene || !endScene) {
                    console.error('未找到分手剧情数据');
                    resolve();
                    return;
                }
                
                // 替换占位符
                const formatScene = (scene) => ({
                    ...scene,
                    text: scene.text.replace(/\{npc_name\}/g, npc.name)
                });
                
                // 显示开始场景
                await this.showSingleScene(formatScene(startScene));
                
                // 显示结束场景
                await this.showSingleScene(formatScene(endScene));
                
                resolve();
            } catch (error) {
                console.error('加载分手剧情失败:', error);
                resolve();
            }
        });
    }
    
    /**
     * 显示单个场景
     */
    async showSingleScene(scene) {
        return new Promise((resolve) => {
            const game = window.game;
            if (game && game.ui) {
                game.ui.showDialog({
                    title: scene.title,
                    text: scene.text,
                    choices: [
                        {
                            text: scene.type === 'dialogue' ? '继续' : '确定',
                            action: () => {
                                game.ui.closeDialog();
                                resolve();
                            }
                        }
                    ]
                });
            } else {
                resolve();
            }
        });
    }
}