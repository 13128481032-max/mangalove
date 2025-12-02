import { gameState, resetState } from './state.js';
import { UIManager } from './ui/UIManager.js';
import { TimeSystem } from './systems/TimeSystem.js';
import { MangaSystem } from './systems/MangaSystem.js';
import { NPCSystem } from './systems/NPCSystem.js';
import { EventSystem } from './systems/EventSystem.js';

class Game {
    constructor() {
        this.ui = new UIManager();
        this.timeSystem = new TimeSystem();
        this.mangaSystem = new MangaSystem();
        this.npcSystem = new NPCSystem();
        this.eventSystem = new EventSystem();
    }

    async init() {
        console.log("Game Initializing...");
        resetState();

        try {
            await Promise.all([
                this.eventSystem.init(), 
                this.mangaSystem.init(),
                this.npcSystem.init()
            ]);
            console.log("✅ 所有系统数据加载完毕");
        } catch (e) {
            console.error("❌ 数据加载失败", e);
        }

        // 【新增】游戏开始，记录第1天的初始状态
        this.timeSystem.startNewDay();

        this.bindEvents();
        this.ui.updateAll(gameState);
        window.game = this;
    }

    bindEvents() {
        const btnDraw = document.getElementById('btn-draw');
        const btnOut = document.getElementById('btn-out');
        const btnRest = document.getElementById('btn-rest');

        if (btnDraw) btnDraw.addEventListener('click', () => this.handleWork());
        if (btnOut) btnOut.addEventListener('click', () => this.handleGoOut());
        if (btnRest) btnRest.addEventListener('click', () => this.handleRest());
    }

    // ==========================================
    // 连载管理 (画画按钮逻辑)
    // ==========================================
    handleWork() {
        const career = gameState.mangaCareer;
        const work = career.currentWork;

        // 1. 开启新连载流程
        if (!work) {
            // 第一步：选择题材
            const unlockedGenres = this.mangaSystem.getUnlockedGenres();
            
            const genreChoices = unlockedGenres.map(genre => ({
                text: `${genre.name} (耗能${genre.cost_energy || 15})`,
                // 点击后进入第二步：选择画风
                action: () => this.stepSelectStyle(genre) 
            }));

            genreChoices.push({ text: "再想想", action: () => this.ui.closeDialog() });

            this.ui.showDialog({
                title: "步骤 1/3: 选择题材",
                text: "要想富，先立项。这次画什么故事？",
                choices: genreChoices
            });
            return;
        }

        // 2. 连载中流程 (保持不变，增加显示画风)
        this.ui.showDialog({
            title: `连载中: 《${work.title}》`,
            // 在这里把画风显示出来
            text: `题材: ${work.genreName} | 画风: ${work.styleName || '标准'}\n当前: 第 ${work.chapter} 话 | 总分: ${work.totalScore.toFixed(0)}\n排名: No.${career.currentRank}`,
            choices: [
                { 
                    text: `🎨 绘制第 ${work.chapter + 1} 话`, 
                    action: () => this.processDrawChapter() 
                },
                { 
                    text: "🏁 完结撒花", 
                    action: () => this.processFinishSeries() 
                },
                { text: "返回", action: () => this.ui.closeDialog() }
            ]
        });
    }

    /**
     * 【新增】步骤 2: 选择画风
     */
    stepSelectStyle(selectedGenre) {
        const unlockedStyles = this.mangaSystem.getUnlockedStyles();
        
        const styleChoices = unlockedStyles.map(style => ({
            text: style.name,
            // 点击后进入第三步：输入标题
            action: () => this.stepInputTitle(selectedGenre, style)
        }));

        styleChoices.push({ text: "返回重选", action: () => this.handleWork() });

        this.ui.showDialog({
            title: "步骤 2/3: 确定画风",
            text: `你决定画【${selectedGenre.name}】。\n用什么画风来表现它最合适？\n(提示: 不同的搭配会影响评分)`,
            choices: styleChoices
        });
    }

    /**
     * 【新增】步骤 3: 输入标题并开始
     */
    stepInputTitle(genre, style) {
        // 关闭当前弹窗以便显示 prompt
        // (有些浏览器会阻塞，简单的做法是直接调用 prompt)
        
        setTimeout(() => {
            let title = prompt(`题材: ${genre.name} + 画风: ${style.name}\n给你的大作起个名字吧:`, "无题");
            if (!title) return; // 取消则什么都不做

            this.mangaSystem.startSerialization(title, genre.id, style.id);
            
            this.ui.showToast(`新连载《${title}》正式立项！`);
            this.ui.closeDialog(); // 确保关闭之前的
            this.ui.updateAll(gameState);
        }, 100);
    }

    /**
     * 🎨 绘制漫画章节逻辑
     * (包含：收益计算、画风评价、夺冠检测、随机事件)
     */
    processDrawChapter() {
        const work = gameState.mangaCareer.currentWork;
        // 获取当前题材的消耗，如果没有则默认 20
        const genre = this.mangaSystem.genres[work.genreId];
        const cost = genre ? (genre.cost_energy || 20) : 20;

        // 1. 检查精力
        if (gameState.player.energy < cost) {
            this.ui.showToast(`精力不足！(需要 ${cost})`, "error");
            this.ui.closeDialog();
            return;
        }

        // 2. 扣除精力
        this.timeSystem.consumeEnergy(cost);
        
        // 3. 执行绘制计算 (会返回 isChampion 标记)
        const result = this.mangaSystem.drawChapter(gameState.player.attributes);
        gameState.player.money += result.income;
        gameState.player.fans += result.fans;
        
        // 4. 增加熟练度
        gameState.player.attributes.art += 0.5;
        gameState.player.attributes.story += 0.5;

        // 5. 显示基础收益提示
        let msg = `发布第 ${result.chapter} 话！人气+${result.fans} 💰+${result.income}`;
        // 如果有画风搭配评价，也显示出来
        if (result.synergyMsg) msg += `\n${result.synergyMsg}`;
        
        this.ui.showToast(msg, result.synergyMsg && result.synergyMsg.includes('绝妙') ? 'success' : 'normal');

        // ========================================================
        // 【核心修复】弹窗优先级逻辑 (防止庆祝/事件被秒关)
        // ========================================================
        let hasEvent = false;

        // A. 检查是否夺冠
        // 如果夺冠，MangaSystem 内部已经调用了 celebrateChampion 弹出了庆祝窗
        if (result.isChampion) {
            hasEvent = true;
        }

        // B. 如果没夺冠，检查是否触发随机事件 (如粉丝来信、修罗场)
        // checkTriggers 会返回 true/false，表示是否有事件弹窗被激活
        if (!hasEvent) {
            // 传入 npcSystem 以支持修罗场/探班事件
            const triggered = this.eventSystem.checkTriggers(gameState, 'work', this.ui, this.npcSystem);
            if (triggered) {
                hasEvent = true;
            }
        }

        // C. 只有当什么都没发生时，才关闭当前的“连载管理”窗口
        // 如果发生了事件，我们保留那个事件的弹窗让玩家看
        if (!hasEvent) {
            this.ui.closeDialog();
        }
        
        this.ui.updateAll(gameState);
    }



    processFinishSeries() {
        const history = this.mangaSystem.endSerialization();
        this.ui.showDialog({
            title: "完结结算",
            text: `《${history.title}》已完结！\n最终话数: ${history.chapter}\n历史评价: ${history.finalRankLabel}\n累计总分: ${history.totalScore.toFixed(0)}`,
            choices: [{ text: "辛苦了！", action: () => this.ui.closeDialog() }]
        });
        this.ui.updateAll(gameState);
    }

    // ==========================================
    // 外出逻辑 (含初遇锁 + 找题材)
    // ==========================================
    handleGoOut() {
        this.ui.showDialog({
            title: "🏙️ 外出计划",
            text: "你要去哪里消磨时间？",
            choices: [
                { 
                    text: "🎨 参观美术馆 (精力-20, 画工++)", 
                    action: () => this.actionTraining('art') 
                },
                { 
                    text: "📚 市立图书馆 (精力-20, 剧情++)", 
                    action: () => this.actionTraining('story') 
                },
                { 
                    text: "💡 寻找新灵感 (精力-30, 解锁题材)", 
                    action: () => this.actionHuntGenre() 
                },
                { 
                    text: "👟 随便逛逛 (精力-15, 偶遇/随机)", 
                    action: () => this.actionWander() 
                },
                { text: "返回", action: () => this.ui.closeDialog() }
            ]
        });
    }

    actionTraining(type) {
        if (gameState.player.energy < 20) {
            this.ui.showToast("精力不足...", "error"); return;
        }
        this.timeSystem.consumeEnergy(20);
        
        let gain = 2 + Math.floor(Math.random() * 3);
        if (type === 'art') {
            gameState.player.attributes.art += gain;
            this.ui.showToast(`画工提升了 ${gain} 点`, 'success');
        } else {
            gameState.player.attributes.story += gain;
            this.ui.showToast(`剧情力提升了 ${gain} 点`, 'success');
        }
        this.ui.closeDialog();
        this.ui.updateAll(gameState);
    }

    /**
     * 💡 寻找灵感 (修改版：可解锁题材 或 画风)
     */
    actionHuntGenre() {
        // 1. 检查精力
        if (gameState.player.energy < 30) {
            this.ui.showToast("精力不足...", "error"); 
            return;
        }
        this.timeSystem.consumeEnergy(30);

        // 2. 抽奖逻辑
        const roll = Math.random();

        // --- 情况 A: 领悟新画风 (15% 概率，最稀有) ---
        if (roll < 0.15) {
            const newStyle = this.mangaSystem.unlockRandomStyle();
            if (newStyle) {
                this.ui.showDialog({
                    title: "✨ 艺术升华！",
                    text: `你在观察中顿悟了新的艺术表现形式！\n\n【解锁画风】：${newStyle.name}\n"${newStyle.description}"`,
                    choices: [{ text: "太强了！", action: () => this.ui.closeDialog() }]
                });
                this.ui.updateAll(gameState);
                return;
            }
            // 如果画风都解锁完了，自动向下流转到解锁题材
        }

        // --- 情况 B: 发现新题材 (50% 概率) ---
        if (roll < 0.65) {
            const newGenre = this.mangaSystem.unlockRandomGenre();
            if (newGenre) {
                this.ui.showDialog({
                    title: "💡 灵光一闪！",
                    text: `你观察到了有趣的事物！\n\n【解锁题材】：${newGenre.name}\n"${newGenre.description}"`,
                    choices: [{ text: "记在小本本上", action: () => this.ui.closeDialog() }]
                });
                this.ui.updateAll(gameState);
                return;
            }
        }

        // --- 情况 C: 一无所获 (保底奖励) ---
        this.ui.showDialog({
            title: "一无所获",
            text: "你在街头逛了半天，并没有什么特别的发现。\n不过散散步让你的思维更敏捷了。(剧情力微量提升)",
            choices: [{ text: "继续努力", action: () => this.ui.closeDialog() }]
        });
        gameState.player.attributes.story += 0.5;
        
        this.ui.updateAll(gameState);
    }

    /**
     * 👟 闲逛逻辑 (包含初遇锁 + 随机偶遇 + 修罗场检查)
     */
    actionWander() {
        const cost = 15;
        if (gameState.player.energy < cost) {
            this.ui.showToast("精力不足...", "error"); return;
        }
        this.timeSystem.consumeEnergy(cost);

        // --- 1. 初遇锁逻辑 (强制触发第一次见面) ---
        if (!gameState.flags.first_encounter) {
            // 如果还没男主，生成一个
            if (!gameState.npcs || gameState.npcs.length === 0) {
                this.npcSystem.generateNewNPC(gameState);
            }
            // 获取第一个男主的性格，匹配对应剧本
            const firstNPC = gameState.npcs[0];
            const targetEventId = `first_meet_${firstNPC.personality}`;
            
            // 查找剧本 (找不到就用兜底的 scripted_first_meet)
            let targetEvent = this.eventSystem.events.find(e => e.id === targetEventId);
            if (!targetEvent) targetEvent = this.eventSystem.events.find(e => e.id === 'scripted_first_meet');

            if (targetEvent) {
                this.eventSystem.startEvent(targetEvent, this.ui, gameState);
                gameState.flags.first_encounter = true;
                this.ui.updateAll(gameState);
                return; // 强制中断后续逻辑
            }
        }

        // --- 2. 尝试随机偶遇 NPC ---
        const encounter = this.npcSystem.tryEncounter(gameState);
        
        if (encounter.metSomeone) {
            // 遇到了某人
            this.ui.showDialog({
                title: `偶遇 ${encounter.npc.name}`,
                text: `${encounter.npc.name}:\n"${encounter.dialogue}"`,
                choices: [
                    { 
                        text: "打个招呼", 
                        action: () => { 
                            encounter.npc.favorability += 2;
                            this.ui.showToast("好感度 +2");
                            this.ui.closeDialog();
                        }
                    },
                    { text: "离开", action: () => this.ui.closeDialog() }
                ]
            });
        } else {
            // --- 3. 【关键修改】没遇到人，触发通用事件/修罗场 ---
            // 传入 this.npcSystem，让 checkJealousyConflict 能获取吃醋台词
            const triggered = this.eventSystem.checkTriggers(gameState, 'go_out', this.ui, this.npcSystem);
            
            // 如果什么剧情都没触发，给个低保提示
            if (!triggered) {
                this.ui.showToast("外出散步，心情变好了。");
            }
        }
    this.ui.updateAll(gameState);
    }

    handleRest() {
        // 1. 调用 TimeSystem 推进日期，并获取报告
        const report = this.timeSystem.advanceDay();
        
        // 2. 调用 UI 显示报告
        // 传入一个回调函数，当玩家点击“迎接新的一天”后，再刷新界面
        this.ui.showDailyReport(report, () => {
            this.ui.updateAll(gameState);
            this.ui.showToast(`进入第 ${gameState.world.date} 天`);
        });
        }
        
    // 互动接口
    handleNPCInteraction(npcId) {
        // 确保 npcId 类型匹配 (字符串/数字)
        const npc = gameState.npcs.find(n => n.id == npcId);
        if (!npc) return;

        this.ui.showDialog({
            title: `与 ${npc.name} 互动`,
            text: `当前好感: ${npc.favorability || 0}`,
            choices: [
                { text: "💬 闲聊 (精力-5)", action: () => this.processInteraction(npc, 'chat', 5, 0) },
                { text: "🌹 约会 (精力-30, 金钱-200)", action: () => this.processInteraction(npc, 'date', 30, 200) },
                { text: "🎁 送礼 (金钱-500)", action: () => this.processInteraction(npc, 'gift', 5, 500) },
                { text: "关闭", action: () => this.ui.closeDialog() }
            ]
        });
    }

    processInteraction(npc, type, energyCost, moneyCost) {
        if (gameState.player.energy < energyCost) {
            this.ui.showToast("精力不足！", "error"); return;
        }
        if (gameState.player.money < moneyCost) {
            this.ui.showToast("资金不足！", "error"); return;
        }

        this.timeSystem.consumeEnergy(energyCost);
        gameState.player.money -= moneyCost;

        const result = this.npcSystem.interact(npc.id, type);
        
        if (result.success) {
            this.ui.showDialog({
                title: "互动反馈",
                text: result.text,
                choices: [{ text: "开心", action: () => this.ui.closeDialog() }]
            });
        } else {
            this.ui.showDialog({
                title: "失败",
                text: result.text
            });
        }
        this.ui.updateAll(gameState);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Game().init();
});