import { gameState, resetState, saveGame, loadGame, getAllSaves, deleteSave, gameConfig } from './state.js';
import { UIManager } from './ui/UIManager.js';
import { TimeSystem } from './systems/TimeSystem.js';
import { MangaSystem } from './systems/MangaSystem.js';
import { NPCSystem } from './systems/NPCSystem.js';
import { EventSystem } from './systems/EventSystem.js';
import { AchievementSystem } from './systems/AchievementSystem.js';
import { EndingSystem } from './systems/EndingSystem.js';
import { fixedNPCs } from './data/fixed_npcs.js';

class Game {
    constructor() {
        this.ui = new UIManager();
        this.timeSystem = new TimeSystem();
        this.mangaSystem = new MangaSystem();
        this.npcSystem = new NPCSystem();
        this.eventSystem = new EventSystem();
        this.achievementSystem = new AchievementSystem();
        this.endingSystem = new EndingSystem();
        this.currentDatingTarget = null; // 当前约会目标
        this.currentDraft = null; // 当前草稿信息
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

        // 初始化时，把哥哥加入到 NPC 列表
        const brother = JSON.parse(JSON.stringify(fixedNPCs.brother));
        gameState.npcs.push(brother);

        this.bindEvents();
        
        // 初始化UI管理器，收集DOM元素
        this.ui.init();
        
        this.ui.updateAll(gameState);
        window.game = this;

        // 如果是第一天，播放开场剧情 (背景设定)
        if (gameState.gameTime.day === 1) {
            this.playIntro();
        }
    }

    bindEvents() {
        const btnDraw = document.getElementById('btn-draw');
        const btnOut = document.getElementById('btn-out');
        const btnRest = document.getElementById('btn-rest');
        const btnSave = document.getElementById('btn-save');
        const btnLoad = document.getElementById('btn-load');
        const btnProfile = document.getElementById('btn-profile');
        const btnBack = document.getElementById('btn-back');

        if (btnDraw) btnDraw.addEventListener('click', () => this.handleWork());
        if (btnOut) btnOut.addEventListener('click', () => this.handleGoOut());
        if (btnRest) btnRest.addEventListener('click', () => this.handleRest());
        if (btnSave) btnSave.addEventListener('click', () => this.handleSave());
        if (btnLoad) btnLoad.addEventListener('click', () => this.handleLoad());
        if (btnProfile) btnProfile.addEventListener('click', () => this.handleProfile());
        if (btnBack) btnBack.addEventListener('click', () => this.handleBack());
    }
    
    handleProfile() {
        const profileSidebar = document.getElementById('profile-sidebar');
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            // 在手机端切换显示/隐藏
            if (profileSidebar.classList.contains('show-profile')) {
                profileSidebar.classList.remove('show-profile');
            } else {
                profileSidebar.classList.add('show-profile');
            }
        }
    }

    handleBack() {
        const profileSidebar = document.getElementById('profile-sidebar');
        const isMobile = window.innerWidth < 768;
        
        if (isMobile && profileSidebar.classList.contains('show-profile')) {
            // 在手机端且个人档案显示时，隐藏它
            profileSidebar.classList.remove('show-profile');
        }
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
                action: () => this.stepSelectStyle(genre),
                // 【关键修复】不关闭对话框，让画风选择对话框能够显示出来
                shouldClose: false
            }));

            genreChoices.push({ text: "再想想", action: () => this.ui.closeDialog() });

            this.ui.showDialog({
                title: "步骤 1/3: 选择题材",
                text: "要想富，先立项。这次画什么故事？",
                choices: genreChoices
            });
            return;
        }

        // 2. 连载中流程 - 新版
        this.ui.showDialog({
            title: `连载中: 《${work.title}》`,
            text: `题材: ${work.genreName} | 画风: ${work.styleName || '标准'}\n当前: 第 ${work.chapter} 话 | 总分: ${work.totalScore.toFixed(0)}\n排名: No.${career.currentRank}`,
            choices: [
                {
                    text: "✍️ 开始构思新一话", // 进入新流程
                    action: () => this.step1_SelectFocus(work)
                },
                {
                    // 【修改这里】调用新的反馈面板
                    text: "📱 查看读者反馈",
                    action: () => this.openFeedbackPanel()
                },
                {
                    text: "🏁 完结撒花",
                    action: () => this.processFinishSeries()
                },
                { text: "返回", action: () => this.ui.closeDialog() }
            ]
        });
    }

    // ==========================================
    // 读者反馈系统 (替换原本的 handleWork 中的空缺)
    // ==========================================

    /** 
     * 打开读者反馈面板
     * 能够看到评论，并选择回复热评
     */ 
    openFeedbackPanel() { 
        const work = gameState.mangaCareer.currentWork;
        
        // 如果还没开始画，或者刚立项还没发布第一话
        if (!work || work.chapter === 0) {
            this.ui.showToast("还没有发布过章节，暂无反馈。", "error");
            return;
        }

        // 生成数据
        const feedbackData = this.mangaSystem.getReaderFeedback(work);
        
        // 构建显示文本
        let feedbackText = `📊 《${work.title}》近期评论区摘要：\n\n`;
        
        feedbackData.list.forEach(comment => {
            feedbackText += `💬 "${comment}"\n`;
        });
        
        feedbackText += `\n🔥 [热门评论] @${feedbackData.hotComment.user} (👍${feedbackData.hotComment.likes}):\n"${feedbackData.hotComment.content}"`;

        // 互动选项
        const choices = [
            {
                text: "🥰 感谢支持 (精力-5, 粉丝+)",
                action: () => this.actionReplyComment('thanks', feedbackData.hotComment)
            },
            {
                text: "😠 怒怼黑粉 (精力-10, 随机效果)",
                action: () => this.actionReplyComment('argue', feedbackData.hotComment)
            },
            {
                text: "🤐 高冷无视 (无消耗)",
                action: () => this.ui.closeDialog()
            }
        ];

        this.ui.showDialog({
            title: "📱 读者反馈",
            text: feedbackText,
            choices: choices
        });
    }

    /** 
     * 处理回复评论的逻辑
     */ 
    actionReplyComment(type, commentData) {
        if (gameState.player.energy < 5) {
            this.ui.showToast("精力不足，没力气打字了...", "error");
            return;
        }

        let resultMsg = "";
        
        if (type === 'thanks') {
            this.timeSystem.consumeEnergy(5);
            const fanGain = Math.floor(Math.random() * 20) + 10;
            gameState.player.fans += fanGain;
            resultMsg = `你的亲切回复让粉丝们很感动！\n粉丝 +${fanGain}`;
        }
        else if (type === 'argue') {
            this.timeSystem.consumeEnergy(10);
            // 只有在差评时怼回去才可能爽，否则会掉粉
            if (commentData.type === 'low_score') {
                const fanGain = Math.floor(Math.random() * 50);
                gameState.player.fans += fanGain;
                resultMsg = `你据理力争的样子引起了争议，但也吸引了吃瓜群众！\n粉丝 +${fanGain}`;
            } else {
                const fanLoss = Math.floor(Math.random() * 10) + 5;
                gameState.player.fans = Math.max(0, gameState.player.fans - fanLoss);
                resultMsg = `你对普通读者的攻击性太强了，大家觉得你飘了。\n粉丝 -${fanLoss}`;
            }
        }

        this.ui.showDialog({
            title: "回复已发送",
            text: resultMsg,
            choices: [{ text: "返回工作", action: () => this.ui.closeDialog() }]
        });
        
        this.ui.updateAll(gameState);
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
        // 关闭当前弹窗
        this.ui.closeDialog();
        
        // 使用自定义的输入对话框替代prompt()
        this.ui.showInputDialog({
            title: "为漫画起名字",
            text: `题材: ${genre.name} + 画风: ${style.name}\n给你的大作起个名字吧:`,
            placeholder: "输入漫画标题",
            defaultValue: "无题",
            darkMode: true,
            onConfirm: (title) => {
                if (!title) return; // 取消则什么都不做

                this.mangaSystem.startSerialization(title, genre.id, style.id);

                this.ui.showToast(`新连载《${title}》正式立项！`);
                this.ui.updateAll(gameState);
            },
            onCancel: () => {
                // 用户取消输入，返回上一步
                this.stepSelectStyle(genre);
            }
        });
    }

    /**
     * 🎨 绘制漫画章节逻辑
     * (包含：收益计算、画风评价、夺冠检测、随机事件)
     */
    /**
     * 阶段 1: 选择本话侧重点 (策略选择)
     */
    step1_SelectFocus(work) {
        const focuses = this.mangaSystem.plotFocuses;
        
        const choices = focuses.map(f => ({
            text: `${f.name}`,
            action: () => this.step2_AllocatePoints(work, f)
        }));
        
        this.ui.showDialog({
            title: "步骤 1/3: 确定本话大纲",
            text: "这一话主要讲什么内容？\n不同的侧重点会影响最终的评分倾向。",
            choices: choices.concat([{ text: "返回", action: () => this.handleWork() }])
        });
    }

    /**
     * 阶段 2: 灵感分配 (资源管理)
     * 这里做一个简化版的分配，通过对话选项实现
     */
    step2_AllocatePoints(work, focus) {
        // 基础灵感点 = 玩家精力 * 0.1 + 随机波动
        let totalIP = Math.floor(gameState.player.energy * 0.15) + Math.floor(Math.random() * 5);
        
        this.currentDraft = {
            focus: focus,
            baseIP: totalIP,
            allocated: { art: 0, story: 0, charm: 0 }
        };

        this.showAllocationMenu(work);
    }

    showAllocationMenu(work) {
        const draft = this.currentDraft;
        const remaining = draft.baseIP - (draft.allocated.art + draft.allocated.story + draft.allocated.charm);

        let text = `【本话重点】：${draft.focus.name}\n`;
        text += `【可用灵感】：${remaining} 点\n`;
        text += `----------------\n`;
        text += `🖌️ 画面: ${draft.allocated.art}\n`;
        text += `📝 剧情: ${draft.allocated.story}\n`;
        text += `✨ 演出: ${draft.allocated.charm}\n`;

        const choices = [];

        // 分配选项
        if (remaining > 0) {
            choices.push({ text: "加点：🖌️ 画面 (+2)", action: () => { draft.allocated.art += 2; this.showAllocationMenu(work); } });
            choices.push({ text: "加点：📝 剧情 (+2)", action: () => { draft.allocated.story += 2; this.showAllocationMenu(work); } });
            choices.push({ text: "加点：✨ 演出 (+2)", action: () => { draft.allocated.charm += 2; this.showAllocationMenu(work); } });
            // 一键梭哈
            choices.push({
                    text: "🎲 随机分配",
                    action: () => {
                        // 简单的随机分配逻辑
                        let availablePoints = remaining;
                        while(availablePoints > 0) {
                             const r = Math.random();
                             if(r < 0.33) {
                                 draft.allocated.art++;
                                 availablePoints--;
                             } else if(r < 0.66) {
                                 draft.allocated.story++;
                                 availablePoints--;
                             } else {
                                 draft.allocated.charm++;
                                 availablePoints--;
                             }
                        }
                        this.step3_Finalize(work);
                    }
                });
        }

        // 完成选项
        if (remaining <= 2) {
            choices.push({
                text: "✅ 完成草稿，准备描线",
                action: () => this.step3_Finalize(work)
            });
        }

        // 重置
        choices.push({
            text: "🔄 重置点数",
            action: () => {
                draft.allocated = { art: 0, story: 0, charm: 0 };
                this.showAllocationMenu(work);
            }
        });
        
        // 返回选项
        choices.push({
            text: "🔙 返回",
            action: () => {
                this.currentDraft = null; // 清理当前草稿
                this.ui.closeDialog();
                this.handleWork(); // 返回连载管理界面
            }
        });

        this.ui.showDialog({
            title: "步骤 2/3: 分配灵感",
            text: text,
            choices: choices
        });
    }

    /**
     * 阶段 3: 最终结算 (包含风险判定)
     */
    step3_Finalize(work) {
        const draft = this.currentDraft;
        
        // 计算基础消耗
        const baseCost = this.mangaSystem.genres[work.genreId].cost_energy || 20;
        const finalCost = Math.floor(baseCost * (draft.focus.cost_mod || 1));

        if (gameState.player.energy < finalCost) {
            this.ui.showToast(`精力不足！(需要 ${finalCost})`, "error");
            return;
        }

        // 确认对话
        this.ui.showDialog({
            title: "步骤 3/3: 确认交稿",
            text: `消耗精力: ${finalCost}\n策略: ${draft.focus.name}\n\n确定要提交这一话吗？`,
            choices: [
                {
                    text: "🚀 提交印厂！",
                    action: () => {
                        this.timeSystem.consumeEnergy(finalCost);
                        
                        // 调用修改后的计算逻辑，传入 draft 数据
                        const result = this.mangaSystem.drawChapterWithStrategy(
                            gameState.player.attributes,
                            work,
                            draft
                        );

                        this.handleDrawResult(result);
                    }
                },
                { text: "再改改...", action: () => this.showAllocationMenu(work) },
                {
                    text: "🔙 返回",
                    action: () => {
                        this.currentDraft = null; // 清理当前草稿
                        this.ui.closeDialog();
                        this.handleWork(); // 返回连载管理界面
                    }
                }
            ]
        });
    }

    // 处理结果显示 (将原本 processDrawChapter 的后半部分提取出来)
    handleDrawResult(result) {
        // 更新金钱、粉丝、属性...
        gameState.player.money += result.income;
        gameState.player.fans += result.fans;
        
        // 增加熟练度
        gameState.player.attributes.art += 0.5;
        gameState.player.attributes.story += 0.5;
        gameState.player.attributes.charm += 0.2;
        
        // 检查是否夺冠
        let hasEvent = false;
        if (result.isChampion) {
            hasEvent = true;
        }

        // 如果没夺冠，检查是否触发随机事件
        if (!hasEvent) {
            // 传入 npcSystem 以支持修罗场/探班事件
            const triggered = this.eventSystem.checkTriggers(gameState, 'work', this.ui, this.npcSystem);
            if (triggered) {
                hasEvent = true;
            }
        }
        
        // 检查是否触发日常工作事件
        if (!hasEvent) {
            const triggered = this.eventSystem.checkTriggers(gameState, 'daily_work', this.ui);
            if (triggered) {
                hasEvent = true;
            }
        }
        
        // 显示发布结果
        let feedback = "";
        if (result.isCriticalSuccess) feedback = "🔥 读者反响热烈！神回！";
        else if (result.isCriticalFail) feedback = "💀 出现作画崩坏，被读者吐槽了...";
        
        // 生成完整的结果消息
        let resultMsg = `《${result.title}》发布成功！\n\n`;
        resultMsg += `📊 评分: ${result.score.toFixed(1)}\n`;
        resultMsg += `💰 稿费: ${result.income}\n`;
        resultMsg += `❤️ 新增粉丝: ${result.fans}\n\n`;
        
        // 添加画风协同效果
        if (result.synergyMsg) resultMsg += `${result.synergyMsg}\n`;
        // 添加剧情焦点效果
        if (result.focusMsg) resultMsg += `${result.focusMsg}\n`;
        // 添加特殊反馈
        if (feedback) resultMsg += `\n${feedback}`;
        
        this.ui.showDialog({
            title: "发布结果",
            text: resultMsg,
            choices: [{ text: "太好了", action: () => this.ui.closeDialog() }]
        });
        
        this.ui.updateAll(gameState);
    }

    // 保留原有方法但不再使用
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

        // 生成并显示情节描述
        const plotDescription = this.mangaSystem.generatePlotDescription(
            work.title,
            work.genreId,
            work.chapter + 1
        );

        // 显示情节描述对话框
        this.ui.showDialog({
            title: "情节预览",
            text: plotDescription,
            choices: [
                {
                    text: "选择剧情焦点",
                    action: () => {
                        // 显示剧情焦点选择对话框
                        this.ui.showDialog({
                            title: "🎯 选择剧情焦点",
                            text: "你想在这一话重点表现什么？",
                            choices: this.mangaSystem.plotFocuses.map(focus => ({
                                text: `${focus.name}\n${focus.desc}\n${this.getFocusEffectText(focus)}`,
                                action: () => {
                                    // 计算实际精力消耗
                                    const actualCost = Math.floor(cost * focus.cost_mod);
                                    
                                    // 检查精力是否足够
                                    if (gameState.player.energy < actualCost) {
                                        this.ui.showToast(`精力不足！(需要 ${actualCost})`, "error");
                                        this.ui.closeDialog();
                                        return;
                                    }
                                    
                                    // 扣除精力
                                    this.timeSystem.consumeEnergy(actualCost);

                                    // 执行绘制计算
                                    const result = this.mangaSystem.drawChapter(gameState.player.attributes, focus);
                                    gameState.player.money += result.income;
                                    gameState.player.fans += result.fans;

                                    // 增加熟练度
                                    gameState.player.attributes.art += 0.5;
                                    gameState.player.attributes.story += 0.5;

                                    // 显示基础收益提示
                                    let msg = `发布第 ${result.chapter} 话！人气+${result.fans} 💰+${result.income}`;
                                    // 如果有画风搭配评价，也显示出来
                                    if (result.synergyMsg) msg += `\n${result.synergyMsg}`;
                                    // 如果有剧情焦点效果，也显示出来
                                    if (result.focusMsg) msg += `\n${result.focusMsg}`;

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
                                    
                                    // C. 检查是否触发日常工作事件
                                    if (!hasEvent) {
                                        const triggered = this.eventSystem.checkTriggers(gameState, 'daily_work', this.ui);
                                        if (triggered) {
                                            hasEvent = true;
                                        }
                                    }

                                    // D. 显示读者反馈
                                    if (!hasEvent) {
                                        const work = gameState.mangaCareer.currentWork;
                                        const feedback = this.mangaSystem.getReaderFeedback(work);
                                        
                                        // 显示读者反馈对话框
                                        this.ui.showDialog({
                                            title: "📢 读者反馈",
                                            text: "读者们对最新一话的评价：",
                                            choices: feedback.list.map(comment => ({
                                                text: comment,
                                                action: () => {}
                                            })).concat([{
                                                text: "继续创作",
                                                action: () => this.ui.closeDialog()
                                            }])
                                        });
                                    }

                                    this.ui.updateAll(gameState);
                                }
                            })).concat([{
                                text: "取消",
                                action: () => {
                                    // 返回上一个对话框
                                    this.ui.closeDialog();
                                    // 重新显示情节预览
                                    this.ui.showDialog({
                                        title: "情节预览",
                                        text: plotDescription,
                                        choices: [{
                                            text: "选择剧情焦点",
                                            action: () => {
                                                this.ui.closeDialog();
                                                this.processDrawChapter();
                                            }
                                        }, {
                                            text: "返回",
                                            action: () => this.ui.closeDialog()
                                        }]
                                    });
                                }
                            }])
                        });
                    }
                }
            ]
        });
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

    handleSave() {
        // 显示存档界面
        this.showSaveMenu();
    }

    handleLoad() {
        // 显示读档界面
        this.showLoadMenu();
    }

    showSaveMenu() {
        const saves = getAllSaves();

        // 创建存档槽位选项
        const choices = saves.map(save => {
            const slotInfo = save.saveInfo;
            let text = `存档槽 ${save.slotId}`;

            if (slotInfo) {
                text += ` - 第${slotInfo.day}天 | ${slotInfo.saveTime}`;
            } else {
                text += " (空槽位)";
            }

            return {
                text: text,
                action: () => this.confirmSave(save.slotId, slotInfo)
            };
        });

        choices.push({ text: "返回", action: () => this.ui.closeDialog() });

        this.ui.showDialog({
            title: "💾 存档管理",
            text: "请选择要保存到的槽位：",
            choices: choices
        });
    }

    confirmSave(slotId, existingSave) {
        if (existingSave) {
            // 如果槽位已有存档，显示确认覆盖提示
            this.ui.showDialog({
                title: "确认覆盖",
                text: `确定要覆盖存档槽 ${slotId} 的存档吗？`,
                choices: [
                    {
                        text: "确认覆盖",
                        action: () => {
                            const success = saveGame(slotId);
                            if (success) {
                                this.ui.showToast(`成功保存到槽位 ${slotId}`);
                            } else {
                                this.ui.showToast("保存失败", "error");
                            }
                            this.ui.closeDialog();
                        }
                    },
                    {
                        text: "取消",
                        action: () => {
                            this.ui.closeDialog();
                            this.showSaveMenu();
                        }
                    }
                ]
            });
        } else {
            // 直接保存
            const success = saveGame(slotId);
            if (success) {
                this.ui.showToast(`成功保存到槽位 ${slotId}`);
            } else {
                this.ui.showToast("保存失败", "error");
            }
            this.ui.closeDialog();
        }
    }

    showLoadMenu() {
        const saves = getAllSaves();

        // 创建存档槽位选项
        const choices = saves.map(save => {
            const slotInfo = save.saveInfo;
            if (!slotInfo) {
                return null; // 跳过空槽位
            }

            let text = `存档槽 ${save.slotId} - 第${slotInfo.day}天`;
            text += ` | ${slotInfo.playerName}`;
            if (slotInfo.currentWorkTitle) {
                text += ` | 《${slotInfo.currentWorkTitle}》`;
            }

            return {
                text: text,
                action: () => this.confirmLoad(save.slotId, slotInfo)
            };
        }).filter(Boolean); // 过滤掉null

        if (choices.length === 0) {
            choices.push({ text: "没有找到存档", action: () => { } });
        }

        choices.push({ text: "返回", action: () => this.ui.closeDialog() });

        this.ui.showDialog({
            title: "📁 读取存档",
            text: "请选择要读取的存档：",
            choices: choices
        });
    }

    confirmLoad(slotId, slotInfo) {
        this.ui.showDialog({
            title: "确认读取",
            text: `确定要读取存档槽 ${slotId} 吗？\n当前进度将会丢失。`,
            choices: [
                {
                    text: "确认读取",
                    action: () => {
                        const success = loadGame(slotId);
                        if (success) {
                            this.ui.showToast(`成功读取存档槽 ${slotId}`);
                            // 重新初始化游戏系统
                            this.resetSystems();
                            this.ui.updateAll(gameState);
                        } else {
                            this.ui.showToast("读取失败", "error");
                        }
                        this.ui.closeDialog();
                    }
                },
                {
                    text: "取消",
                    action: () => {
                        this.ui.closeDialog();
                        this.showLoadMenu();
                    }
                }
            ]
        });
    }

    resetSystems() {
        // 重新初始化各个系统
        this.timeSystem.init();
        this.mangaSystem.init();
        this.npcSystem.init();
        this.eventSystem.init();
    }

    handleRest() {
        // 1. 调用 TimeSystem 推进日期，并获取报告
        const report = this.timeSystem.advanceDay();

        // 2. 调用 UI 显示报告
        // 传入一个回调函数，当玩家点击“迎接新的一天”后，再刷新界面
        this.ui.showDailyReport(report, () => {
            this.ui.updateAll(gameState);
            this.ui.showToast(`进入第 ${gameState.world.date} 天`);
            // 每天检查哥哥相关事件
            this.checkBrotherEvents();
            // 每天结束时检查
            this.handleNextDay();
        });
    }

    playIntro() {
        const brotherName = "沈清舟"; // 也可以动态获取
        const deadline = gameConfig.MAX_DAYS;
        
        // 模拟一段开场对话
        setTimeout(() => {
            this.ui.showDialog({
                title: "父亲 (电话)",
                text: `“这就是你的决心？离家出走去画那种不入流的东西？”\n“好，我给你 ${deadline} 天时间。如果到时候你没混出名堂，就乖乖回来联姻。”`,
                choices: [{
                    text: "挂断电话，我会证明给你看！",
                    action: () => {
                        this.ui.showToast(`任务目标：${deadline}天内获得 ${gameConfig.GOAL_FANS} 粉丝`, "normal");
                        // 哥哥发来警告
                        setTimeout(() => this.triggerBrotherWarning(), 1000);
                    }
                }]
            });
        }, 500);
    }

    triggerBrotherWarning() {
         // 获取哥哥数据
         const brother = this.npcSystem.getOrInitBrother();
         this.ui.showDialog({
             title: brother.name,
             text: "（一条新短信）爸停了你所有的卡。这张副卡你先用着，密码是你生日。\n别逞强，在外面受委屈了就回来。哥哥一直在。",
             choices: [{
                 text: "收下资助 (金钱 +1000)",
                 action: () => {
                     gameState.player.money += 1000;
                     brother.stats.restraint -= 5; // 接受好意扣理智
                     this.ui.updateAll();
                     // 触发教程事件
                     this.triggerTutorial();
                 }
             }]
         });
    }

    // 触发教程事件
    triggerTutorial() {
        // 查找教程事件
        const tutorialEvent = this.eventSystem.events.find(evt => evt.id === "intro_01");
        if (tutorialEvent) {
            this.eventSystem.startEvent(tutorialEvent, this.ui, gameState);
        } else {
            console.log("未找到教程事件，可能是加载失败");
        }
    }

    // 每天结束时检查
    handleNextDay() {
        // 1. 检查成就
        this.achievementSystem.check();
        
        // 2. 检查是否触发结局
        const isEnding = this.endingSystem.checkEnding();
        if (isEnding) return;

        // 3. 难度控制：随着时间推移，如果粉丝不够，父亲会施压
        if (gameState.gameTime.day === 30 && gameState.player.fans < 100) {
            this.ui.showToast("你的房租涨价了", "error");
            // 可以在这里增加难度flag
        }
    }

    handleNPCInteraction(npcId) {
        console.log('🎮 开始NPC互动，npcId:', npcId);
        const npc = gameState.npcs.find(n => n.id == npcId);

        if (!npc) {
            console.error('❌ 找不到NPC，id:', npcId);
            this.ui.showToast('找不到该角色', 'error');
            return;
        }

        // ============================================================
        // 【新增逻辑】骨科监禁状态下的拦截
        // ============================================================
        if (gameState.flags && gameState.flags.route === 'confined') {
            // 如果互动的对象不是哥哥
            if (npc.relation !== 'brother') {
                // 播放震动或恐怖音效（可选）
                if (navigator.vibrate) navigator.vibrate(200);
                
                // 弹出提示：哥哥正在看着你
                this.ui.showToast("👁️ 哥哥正在看着你...", "error");
                
                // 在控制台输出
                console.log("Interaction blocked by Brother.");
                return; // 直接终止，不执行后续互动逻辑
            }
        }
        // ============================================================

        console.log(`👥 找到NPC: ${npc.name}, 状态: ${npc.status}`);
        // 如果已经被他囚禁了，显示特殊菜单
        if (npc.status === 'imprisoned') {
            console.log(`🔒 显示囚禁状态对话框 - 角色: ${npc.name}`);
            this.ui.showDialog({
                title: `笼中鸟`,
                text: `${npc.name} 正微笑着看着你。\n"乖，把粥喝了。"`,
                choices: [
                    { text: "求饶", action: () => this.ui.showToast("他无动于衷。") },
                    { text: "绝食", action: () => this.ui.showToast("他强行喂了下去...") },
                    { text: "关闭", action: () => this.ui.closeDialog() }
                ]
            });
            return;
        }

        // 正常菜单
        console.log(`💬 准备显示互动对话框 - 角色: ${npc.name}`);
        let choices = [
            {
                text: "💬 闲聊 (精力-5)",
                action: () => this.triggerRandomChatEvent(npc, 5, 0)
            },
            { text: "🌹 约会 (精力-30, 金钱-200)", action: () => this.processInteraction(npc, 'date', 30, 200) },
            { text: "🎁 送礼 (金钱-500)", action: () => this.processInteraction(npc, 'gift', 5, 500) },
            // 【新增】断联选项 (红色警告)
            {
                text: "💔 断联/分手 (危险!)",
                action: () => this.actionBreakContact(npc)
            }
        ];

        // 为哥哥添加特殊选项：邀请做模特
        if (npc.relation === 'brother') {
            choices.push({
                text: "🎨 邀请当漫画模特 (精力-10, 艺术+5)",
                action: () => {
                    // 检查好感度和理智值条件
                    if (npc.stats.affection > 100 && npc.stats.restraint < 50) {
                        // 满足条件，触发事件
                        gameState.player.energy -= 10;
                        gameState.player.attributes.art += 5;
                        this.startFixedEvent(fixedNPCs.brother.events.art_model, npc);
                        this.ui.updateAll(gameState);
                    } else {
                        // 不满足条件，显示拒绝提示
                        gameState.player.energy -= 5; // 消耗少量精力
                        this.ui.showDialog({
                            title: "沈清舟",
                            text: "他推了推眼镜，眼神恢复了往常的清冷。\n\"抱歉，我现在没有时间。\"",
                            choices: [{ label: "好的", action: () => this.ui.closeDialog() }]
                        });
                        this.ui.updateAll(gameState);
                    }
                }
            });
        }

        // 添加关闭选项
        choices.push({ text: "关闭", action: () => this.ui.closeDialog() });

        // 显示骨科NPC的特殊状态信息
        let statusText = '';
        if (npc.relation === 'brother' && npc.stats) {
            statusText = `当前好感: ${npc.stats.affection || 0}\n关系: ${this.getRelationText(npc.status)}\n理智值: ${npc.stats.restraint || 0}`;
        } else {
            statusText = `当前好感: ${npc.favorability || 0}\n关系: ${this.getRelationText(npc.status)}`;
        }

        this.ui.showDialog({
            title: `与 ${npc.name} 互动`,
            text: statusText,
            choices: choices
        });
    }

    // 辅助文本
    getRelationText(status) {
        const map = { 'stranger': '陌生', 'dating': '恋人', 'broken': '前任', 'imprisoned': '主人?' };
        return map[status] || '普通';
    }

    processInteraction(npc, type, energyCost, moneyCost) {
        console.log('🔄 开始处理互动，角色:', npc.name, '类型:', type);

        if (gameState.player.energy < energyCost) {
            console.log('⚠️ 精力不足:', gameState.player.energy, '/', energyCost);
            this.ui.showToast("精力不足！", "error");
            return;
        }
        if (gameState.player.money < moneyCost) {
            console.log('⚠️ 资金不足:', gameState.player.money, '/', moneyCost);
            this.ui.showToast("资金不足！", "error");
            return;
        }

        console.log('💸 扣除资源: 精力-', energyCost, '金钱-', moneyCost);
        this.timeSystem.consumeEnergy(energyCost);
        gameState.player.money -= moneyCost;

        // 更新UI显示最新状态
        this.ui.updateStats(gameState);

        console.log('🎯 调用npcSystem.interact处理互动');
        try {
            const result = this.npcSystem.interact(npc.id, type);
            console.log('✅ 互动处理结果:', result);

            if (result.success) {
                console.log('🎉 互动成功，准备显示反馈对话框');
                this.ui.showDialog({
                    title: "互动反馈",
                    text: result.text,
                    choices: [{
                        text: "知道了", action: () => {
                            // 只在增加好感度时显示提示，减少时不提示
                            if (result.addedFavorability > 0) {
                                this.ui.showToast("互动成功！好感度+" + result.addedFavorability);
                            }
                            
                            // 检查是否触发嫉妒事件
                            this.eventSystem.checkTriggers(gameState, 'jealousy', this.ui, this.npcSystem);
                            
                            // 检查是否触发特殊结局事件（gloomy_chain）
                            this.eventSystem.checkTriggers(gameState, 'gloomy_chain', this.ui, this.npcSystem);
                            
                            this.ui.closeDialog();
                        }
                    }]
                });
                console.log('📱 反馈对话框已调用');
            } else {
                console.log('❌ 互动失败:', result.text);
                this.ui.showDialog({
                    title: "失败",
                    text: result.text
                });
            }
            this.ui.updateAll(gameState);
        } catch (error) {
            console.error('💥 互动处理出错:', error);
            this.ui.showToast('互动过程中发生错误', 'error');
        }
    }

    /**
     * 💬 触发随机聊天事件
     */
    triggerRandomChatEvent(npc, energyCost, moneyCost) {
        console.log('🎯 触发随机聊天事件，角色:', npc.name);

        // 检查资源
        if (gameState.player.energy < energyCost) {
            this.ui.showToast("精力不足！", "error");
            return;
        }
        if (gameState.player.money < moneyCost) {
            this.ui.showToast("资金不足！", "error");
            return;
        }

        // 扣除资源
        this.timeSystem.consumeEnergy(energyCost);
        gameState.player.money -= moneyCost;
        this.ui.updateStats(gameState);

        // 骨科NPC特殊处理
        if (npc.relation === 'brother' && npc.stats) {
            // 根据理智值选择对话池
            let interactionPool;
            if (npc.stats.restraint >= 80) {
                interactionPool = fixedNPCs.brother.interactions.high_sanity;
            } else if (npc.stats.restraint >= 30) {
                interactionPool = fixedNPCs.brother.interactions.shaken;
            } else {
                interactionPool = fixedNPCs.brother.interactions.broken;
            }

            // 随机选择一条对话
            const randomInteraction = interactionPool[Math.floor(Math.random() * interactionPool.length)];

            const self = this;
            // 显示骨科对话
            this.ui.showDialog({
                title: npc.name,
                text: randomInteraction.text,
                choices: [
                    {
                        label: "回应",
                        shouldClose: true,
                        action: function() {
                            // 随机小幅影响好感度或理智值
                            const favorabilityChange = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
                            const restraintChange = Math.floor(Math.random() * 3) - 2; // -2, -1, 0

                            if (favorabilityChange !== 0) {
                                npc.stats.affection = Math.max(0, Math.min(100, npc.stats.affection + favorabilityChange));
                                self.ui.showToast(`好感度${favorabilityChange > 0 ? '+' : ''}${favorabilityChange}`);
                            }

                            if (restraintChange !== 0) {
                                npc.stats.restraint = Math.max(0, Math.min(100, npc.stats.restraint + restraintChange));
                            }

                            self.ui.updateAll();
                            self.ui.closeDialog(); // 直接调用关闭对话框
                        }
                    },
                    {
                        label: "沉默",
                        shouldClose: true,
                        action: function() {
                            // 沉默可能略微降低好感度
                            const favorabilityChange = Math.random() > 0.5 ? -1 : 0;
                            if (favorabilityChange < 0) {
                                npc.stats.affection = Math.max(0, npc.stats.affection + favorabilityChange);
                                self.ui.showToast(`好感度${favorabilityChange}`);
                            }
                            self.ui.updateAll();
                            self.ui.closeDialog(); // 直接调用关闭对话框
                        }
                    }
                ]
            });
            return;
        }

        // 根据NPC性格调整事件效果的辅助函数
        const getFavorabilityEffect = (baseValue, personality) => {
            let adjustedValue = baseValue;

            if (personality) {
                switch (personality) {
                    case 'sunny':
                        // 开朗性格更容易增加好感，但大幅降低时影响也更大
                        if (baseValue > 0) adjustedValue += 1;
                        else if (baseValue < 0) adjustedValue -= 1;
                        break;
                    case 'gloomy':
                        // 阴郁性格对好感度变化反应较小
                        adjustedValue = Math.floor(baseValue * 0.8);
                        break;
                    case 'arrogant':
                        // 傲慢性格好感度增加难，但降低也难
                        if (baseValue > 0) adjustedValue = Math.max(1, Math.floor(baseValue * 0.7));
                        else if (baseValue < 0) adjustedValue = Math.min(-1, Math.floor(baseValue * 0.7));
                        break;
                }
            }

            return adjustedValue;
        };

        // 定义聊天事件池
        const chatEvents = [
            // 普通聊天事件 - 基于NPC性格
            {
                title: "日常闲聊",
                text: `${npc.name} 看起来心情不错。\n"今天过得怎么样？"他微笑着问道。`,
                choices: [
                    {
                        text: "很好，特别是和你聊天的时候",
                        getEffect: (npc) => ({
                            type: 'chat',
                            favorability: getFavorabilityEffect(5, npc.personality)
                        })
                    },
                    {
                        text: "一般般，不过见到你就好多了",
                        getEffect: (npc) => ({
                            type: 'chat',
                            favorability: getFavorabilityEffect(3, npc.personality)
                        })
                    },
                    {
                        text: "就那样吧",
                        getEffect: (npc) => ({
                            type: 'chat',
                            favorability: getFavorabilityEffect(1, npc.personality)
                        })
                    }
                ]
            },
            {
                title: "兴趣爱好",
                text: `${npc.name} 提到了最近在看的漫画。\n"你平时喜欢什么类型的漫画？"`,
                choices: [
                    {
                        text: "我喜欢浪漫爱情类的",
                        getEffect: (npc) => ({
                            type: 'chat',
                            favorability: getFavorabilityEffect(4, npc.personality)
                        })
                    },
                    {
                        text: "我喜欢热血战斗类的",
                        getEffect: (npc) => {
                            // 根据性格调整随机效果的概率
                            let probability = 0.5;
                            if (npc.personality === 'arrogant') probability = 0.7;
                            else if (npc.personality === 'sunny') probability = 0.4;

                            return {
                                type: 'chat',
                                favorability: getFavorabilityEffect(Math.random() > probability ? 3 : -2, npc.personality)
                            };
                        }
                    },
                    {
                        text: "我比较喜欢恐怖悬疑的",
                        getEffect: (npc) => {
                            let probability = 0.3;
                            if (npc.personality === 'gloomy') probability = 0.1;
                            else if (npc.personality === 'sunny') probability = 0.5;

                            return {
                                type: 'chat',
                                favorability: getFavorabilityEffect(Math.random() > probability ? 2 : -3, npc.personality)
                            };
                        }
                    }
                ]
            },
            {
                title: "工作话题",
                text: `${npc.name} 似乎对我的漫画工作很感兴趣。\n"创作漫画一定很辛苦吧？"`,
                choices: [
                    {
                        text: "虽然辛苦但很充实",
                        getEffect: (npc) => ({
                            type: 'chat',
                            favorability: getFavorabilityEffect(5, npc.personality)
                        })
                    },
                    {
                        text: "有时候会遇到瓶颈...",
                        getEffect: (npc) => ({
                            type: 'chat',
                            favorability: getFavorabilityEffect(3, npc.personality)
                        })
                    },
                    {
                        text: "还行吧，就是有点累",
                        getEffect: (npc) => ({
                            type: 'chat',
                            favorability: getFavorabilityEffect(1, npc.personality)
                        })
                    }
                ]
            },
            // 可能减少好感度的特殊事件
            {
                title: "敏感话题",
                text: `${npc.name} 不小心提到了一个让气氛有些尴尬的话题。\n你能感觉到他似乎有些不自在。`,
                choices: [
                    {
                        text: "巧妙地转移话题",
                        getEffect: (npc) => ({
                            type: 'chat',
                            favorability: getFavorabilityEffect(2, npc.personality)
                        })
                    },
                    {
                        text: "直接指出他说错了话",
                        getEffect: (npc) => ({
                            type: 'provoke',
                            favorability: getFavorabilityEffect(-5, npc.personality)
                        })
                    },
                    {
                        text: "沉默不语",
                        getEffect: (npc) => ({
                            type: 'provoke',
                            favorability: getFavorabilityEffect(-2, npc.personality)
                        })
                    }
                ]
            },
            {
                title: "意见分歧",
                text: `在讨论某个话题时，你和 ${npc.name} 产生了不同的看法。\n他坚持自己的观点，看起来有些激动。`,
                choices: [
                    {
                        text: "尊重他的观点，求同存异",
                        getEffect: (npc) => ({
                            type: 'chat',
                            favorability: getFavorabilityEffect(3, npc.personality)
                        })
                    },
                    {
                        text: "继续争论，试图说服他",
                        getEffect: (npc) => ({
                            type: 'provoke',
                            favorability: getFavorabilityEffect(-4, npc.personality)
                        })
                    },
                    {
                        text: "笑着说无所谓",
                        getEffect: (npc) => ({
                            type: 'chat',
                            favorability: getFavorabilityEffect(1, npc.personality)
                        })
                    }
                ]
            },
            {
                title: "意外状况",
                text: `聊天时，${npc.name} 不小心打翻了饮料。\n他手忙脚乱地擦拭，显得有些尴尬。`,
                choices: [
                    {
                        text: "没关系，我来帮忙",
                        getEffect: (npc) => ({
                            type: 'chat',
                            favorability: getFavorabilityEffect(6, npc.personality)
                        })
                    },
                    {
                        text: "你总是这么不小心",
                        getEffect: (npc) => ({
                            type: 'provoke',
                            favorability: getFavorabilityEffect(-6, npc.personality)
                        })
                    },
                    {
                        text: "没事，只是小事一桩",
                        getEffect: (npc) => ({
                            type: 'chat',
                            favorability: getFavorabilityEffect(2, npc.personality)
                        })
                    }
                ]
            },
            // 新增事件：赞美与评价
            {
                title: "赞美与评价",
                text: `${npc.name} 最近似乎在做一些新的尝试。\n他期待地看着你，似乎想得到你的评价。`,
                choices: [
                    {
                        text: "你真的很有才华，我很欣赏你",
                        getEffect: (npc) => ({
                            type: 'chat',
                            favorability: getFavorabilityEffect(5, npc.personality)
                        })
                    },
                    {
                        text: "做得不错，但还有改进空间",
                        getEffect: (npc) => {
                            // 根据性格决定效果
                            if (npc.personality === 'arrogant') {
                                return { type: 'provoke', favorability: getFavorabilityEffect(-3, npc.personality) };
                            } else if (npc.personality === 'gloomy') {
                                return { type: 'chat', favorability: getFavorabilityEffect(1, npc.personality) };
                            } else {
                                return { type: 'chat', favorability: getFavorabilityEffect(3, npc.personality) };
                            }
                        }
                    },
                    {
                        text: "一般般吧",
                        getEffect: (npc) => ({
                            type: 'provoke',
                            favorability: getFavorabilityEffect(-4, npc.personality)
                        })
                    }
                ]
            },
            // 新增事件：邀请活动
            {
                title: "邀请活动",
                text: `聊得正开心，${npc.name} 犹豫地开口：\n"要不要一起去...？"`,
                choices: [
                    {
                        text: "好啊，我很乐意",
                        getEffect: (npc) => ({
                            type: 'chat',
                            favorability: getFavorabilityEffect(6, npc.personality)
                        })
                    },
                    {
                        text: "我看看日程安排",
                        getEffect: (npc) => ({
                            type: 'chat',
                            favorability: getFavorabilityEffect(2, npc.personality)
                        })
                    },
                    {
                        text: "抱歉，我还有事要忙",
                        getEffect: (npc) => ({
                            type: 'provoke',
                            favorability: getFavorabilityEffect(-3, npc.personality)
                        })
                    }
                ]
            }
        ];

        // 随机选择一个事件
        const randomEvent = chatEvents[Math.floor(Math.random() * chatEvents.length)];

        // 处理NPC性格相关的文本替换
        let displayText = randomEvent.text;
        if (npc.personality) {
            // 根据NPC性格调整文本或选择权重
            switch (npc.personality) {
                case 'sunny':
                    displayText = displayText.replace(/心情不错/, "笑容灿烂");
                    break;
                case 'gloomy':
                    displayText = displayText.replace(/心情不错/, "表情平静");
                    break;
                case 'arrogant':
                    displayText = displayText.replace(/微笑着/, "挑了挑眉");
                    break;
            }
        }

        // 显示事件对话框
        this.ui.showDialog({
            title: randomEvent.title,
            text: displayText,
            choices: randomEvent.choices.map(choice => ({
                text: choice.text,
                action: () => {
                    // 处理玩家选择的效果
                    const effect = choice.getEffect ? choice.getEffect(npc) : choice.effect;
                    const result = this.npcSystem.interact(npc.id, effect.type);

                    // 应用好感度变化
                    if (effect.favorability !== undefined) {
                        const oldFavorability = npc.favorability || 0;
                        const newFavorability = Math.max(0, oldFavorability + effect.favorability);
                        npc.favorability = newFavorability;

                        // 根据好感度变化显示不同提示
                        if (effect.favorability > 0) {
                            this.ui.showToast(`互动成功！好感度+${effect.favorability}`);
                        } else if (effect.favorability < 0) {
                            this.ui.showToast(`气氛变得有些尴尬...好感度${effect.favorability}`);
                        }
                    }

                    // 显示结果反馈
                    this.ui.showDialog({
                        title: "聊天结束",
                        text: result.text || "聊天结束了。",
                        choices: [{
                            text: "知道了", action: () => {
                                this.ui.closeDialog();
                                this.ui.updateAll(gameState);
                            }
                        }]
                    });
                }
            }))
        });
    }

    /**
     * 💔 处理与NPC断联/分手的逻辑
     */
    actionBreakContact(npc) {
        this.ui.showDialog({
            title: "确认断联",
            text: `你确定要与 ${npc.name} 断联吗？\n这可能会产生严重后果...`,
            choices: [
                {
                    text: "是的，我想清楚了",
                    action: async () => {
                        // 1. 先关闭确认对话框
                        this.ui.closeDialog();

                        // 2. 调用NPCSystem的attemptBreakContact方法处理分手逻辑
                        // 该方法会返回是否触发黑化
                        const breakupResult = await this.npcSystem.attemptBreakContact(npc);

                        // 3. 展示对应的分手剧情
                        if (breakupResult.isBlackened) {
                            // 黑化剧情
                            await this.eventSystem.showBreakupScene('blackened', npc);
                        } else {
                            // 正常分手剧情
                            await this.eventSystem.showBreakupScene('normal', npc);
                        }

                        // 4. 剧情完成后更新UI，此时NPC已经被正确设置状态
                        this.ui.updateAll(gameState);
                    }
                },
                {
                    text: "等等，我再想想",
                    action: () => this.ui.closeDialog()
                }
            ]
        });
    }

    /**
     * 🧍‍♂️ 检查哥哥相关事件触发条件
     */
    checkBrotherEvents() {
        const brother = gameState.npcs.find(n => n.relation === 'brother');
        if (!brother) return;

        // 1. 检查是否触发【资金危机】
        if (gameState.player.money < 100 && !gameState.flags['brother_money_given']) {
            this.startFixedEvent(fixedNPCs.brother.events.financial_crisis, brother);
            gameState.flags['brother_money_given'] = true;
            return;
        }

        // 2. 检查是否触发【生病探视】
        if (gameState.player.energy < 10 && !gameState.flags['brother_sick_visit']) {
            this.startFixedEvent(fixedNPCs.brother.events.sick_visit, brother);
            gameState.flags['brother_sick_visit'] = true;
            return;
        }

        // 3. 检查是否触发【理智崩坏结局】
        if (brother.stats.restraint <= 0 && !gameState.flags['brother_ending_triggered']) {
            this.startFixedEvent(fixedNPCs.brother.events.entangled_fate, brother);
            gameState.flags['brother_ending_triggered'] = true;
            return;
        }

        // 4. 检查【修罗场·雨夜】
        if (this.currentDatingTarget && this.currentDatingTarget.id !== brother.id) {
            // 30% 概率触发雨夜对峙
            if (Math.random() < 0.3) {
                this.startFixedEvent(fixedNPCs.brother.events.rainy_confrontation, brother);
            }
        }

        // 5. 检查【破冰】
        if (brother.stats.restraint > 30 && brother.stats.restraint < 80 && 
            brother.stats.affection > 70 && !gameState.flags['brother_melting_ice']) {
            // 20% 概率在深夜触发
            if (Math.random() < 0.2) {
                this.startFixedEvent(fixedNPCs.brother.events.melting_ice, brother);
                gameState.flags['brother_melting_ice'] = true;
            }
        }

        // 6. 检查【诀别】
        if (brother.stats.restraint > 30 && gameState.player.money > 10000 && 
            !gameState.flags['brother_farewell_tears']) {
            // 10% 概率触发，当女主经济独立且哥哥理智尚存时
            if (Math.random() < 0.1) {
                this.startFixedEvent(fixedNPCs.brother.events.farewell_tears, brother);
                gameState.flags['brother_farewell_tears'] = true;
            }
        }
    }

    /**
     * 🎭 通用方法：启动固定事件
     */
    startFixedEvent(eventConfig, brother) {
        // 将配置转换为 UI 能识别的格式
        const dialogChoices = eventConfig.choices.map(c => ({
            label: c.label,
            action: () => {
                // 应用数值影响
                if (c.effect.restraint && brother) brother.stats.restraint += c.effect.restraint;
                if (c.effect.money) gameState.player.money += c.effect.money;
                if (c.effect.affection && brother) brother.stats.affection += c.effect.affection;
                if (c.effect.jealousy && brother) brother.stats.jealousy += c.effect.jealousy;
                if (c.effect.trust && brother) brother.stats.trust += c.effect.trust;

                // 处理特殊效果
                if (c.effect.route && brother) brother.flags.route_locked = c.effect.route;
                if (c.effect.ending) gameState.flags.ending = c.effect.ending;

                // 显示哥哥的回复
                this.ui.showDialog({
                    title: "沈清舟",
                    text: c.reply,
                    choices: [{ label: "继续", shouldClose: true }]
                });
                // 更新UI
                this.ui.updateAll();
            }
        }));

        this.ui.showDialog({
            title: eventConfig.title,
            text: eventConfig.text,
            choices: dialogChoices,
            darkMode: true // 开启暗黑模式
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Game().init();
});