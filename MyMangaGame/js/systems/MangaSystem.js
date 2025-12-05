import { gameState } from '../state.js';

export class MangaSystem {
    
    constructor() {
        this.genres = {}; 
        this.styles = {}; 
        
        this.RANKING_TIERS = [
            { id: 0, name: "🏠 小区最受欢迎榜", maxRank: 100, reqScore: 500 },
            { id: 1, name: "🌏 全球畅销漫画榜", maxRank: 1000, reqScore: 5000 },
            { id: 2, name: "🪐 太阳系文化遗产榜", maxRank: 10000, reqScore: 50000 },
            { id: 3, name: "⏳ 时间线收束名作榜", maxRank: 99999, reqScore: 500000 }
        ];
        
        // 情节描述模板
        this.plotTemplates = [
            "{title}的主角即将面临人生的抉择，是选择梦想还是现实？",
            "在{title}最新话中，神秘人物的真实身份即将揭晓...",
            "{title}迎来重大转折！主角发现了隐藏多年的秘密！",
            "令人震惊的真相！{title}中主角的过去原来是这样的...",
            "{title}的故事进入高潮，一场激烈的对决即将展开！",
            "新的挑战出现了！{title}的主角能否突破困境？",
            "感人至深！{title}中主角与重要角色的羁绊将接受考验。",
            "意外的相遇！在{title}最新章节中，两位宿敌将再度交锋！",
            "命运的齿轮开始转动，{title}的故事即将走向新的篇章！",
            "悬念丛生！{title}中那个神秘的预言终于要实现了？"
        ];
        
        // 按题材分类的特殊情节模板
        this.genreSpecificPlots = {
            'school_romance': [
                "校园的樱花树下，{title}的主角与暗恋已久的人终于独处...",
                "文化祭即将到来，{title}的主角能否鼓起勇气告白？",
                "期末考试临近，{title}中的学霸与学渣将擦出怎样的火花？"
            ],
            'slice_of_life': [
                "阳光明媚的午后，{title}的主角与可爱的猫咪度过了温馨的时光。",
                "新成员加入家庭！{title}中的萌宠们将如何相处？",
                "宠物医院的奇遇，{title}的主角与受伤的小动物会发生怎样的故事？"
            ],
            'ceo_romance': [
                "豪华的办公室里，{title}的主角收到了总裁的神秘邀约...",
                "商业晚宴上，{title}的女主角意外成为焦点，总裁的眼神意味深长。",
                "雨夜加班，{title}中的霸道总裁为女主角撑起了伞，气氛有些微妙..."
            ],
            'horror_suspense': [
                "废弃的教学楼里，{title}的主角听到了诡异的脚步声...",
                "午夜时分，{title}中的主角发现自己画的漫画情节正在现实中发生！",
                "一封匿名信，揭开了{title}中隐藏已久的恐怖秘密。"
            ],
            'historical_drama': [
                "金碧辉煌的宫殿中，{title}的主角卷入了一场权力的漩涡。",
                "战乱年代，{title}中的两位贵族青年不得不站在对立面。",
                "华丽的宫廷舞会，{title}的女主角的一曲霓裳羽衣惊艳全场。"
            ],
            'boys_love': [
                "图书馆的角落，{title}的两位男主角意外邂逅，眼神交汇的瞬间...",
                "社团活动结束后，{title}中的学长向学弟表白了隐藏已久的心意。",
                "星空下的操场，{title}的主角终于鼓起勇气牵起了对方的手。"
            ],
            'dark_cult': [
                "深夜的画室里，{title}的主角开始创作一幅让人不安的画作。",
                "镜子中的身影，似乎在{title}的主角耳边低语着什么...",
                "{title}中的主角发现，自己的每一笔都在召唤某种不可名状的存在。"
            ],
            'yandere_diary': [
                "日记的最后一页，{title}的主角写下了一行扭曲的字迹...",
                "窗外的月光下，{title}的囚禁者留下了令人恐惧的告白。",
                "{title}中的主角在日记中记录着自己最后的希望与绝望。"
            ]
        };
        
        // MangaSystem.js 构造函数内新增 
        this.plotFocuses = [ 
            { 
                id: 'filler', 
                name: '💧 划水过渡', 
                desc: '省力的一话，单纯为了凑页数。', 
                cost_mod: 0.5, // 精力消耗减半 
                score_mod: 0.6, // 评分打折 
                risk: 0 
            }, 
            { 
                id: 'climax', 
                name: '🔥 剧情高潮', 
                desc: '主线剧情的重大转折！', 
                cost_mod: 1.5, 
                stat_bonus: { story: 1.5, art: 0.8 }, // 剧情分大增，画工略降（因为太赶） 
                risk: 0.2 // 20% 概率崩坏 
            }, 
            { 
                id: 'fanservice', 
                name: '！狗血情节', 
                desc: '虽然俗套但是读者爱看。', 
                cost_mod: 1.0, 
                stat_bonus: { charm: 2.0, story: 0.5 }, // 魅力大增，剧情无脑 
                fans_mod: 1.5 // 涨粉倍率 
            }, 
            { 
                id: 'cliffhanger', 
                name: '🎣 恶意断章', 
                desc: '卡在最关键的地方结束！', 
                cost_mod: 1.2, 
                stat_bonus: { story: 1.2 }, 
                effect: 'retention' // 特殊效果：下一话基础热度提升 
            } 
        ];
        
        // 读者评论库
        this.commentPool = {
            // 通用好评 (分数 >= 80)
            high_score: [
                "神作预定！这一话的分镜简直绝了！",
                "每周指着这个活了，太太是神！",
                "这就没了？短小无力！再给我画50页！",
                "膝盖已献上，请收下我的推荐票。",
                "我不允许还有人没看过这部宝藏漫画！"
            ],
            // 通用中评 (50 <= 分数 < 80)
            mid_score: [
                "画风还可以，但是剧情稍微有点拖。",
                "打卡。希望能保持这个质量。",
                "这一话感觉是过渡回？期待后续发展。",
                "虽然老套，但就是很上头怎么回事...",
                "这里的透视是不是有点怪？不过不影响观看。"
            ],
            // 通用差评 (分数 < 50)
            low_score: [
                "画崩了啊...作者最近是不是太累了？",
                "剧情完全看不懂，是在乱画吗？",
                "退钱！浪费我两分钟人生。",
                "这人体结构是外星人吗？建议回去进修一下。",
                "江郎才尽了吗？取关了。"
            ],
            // 题材专属评论
            genres: {
                'school_romance': [
                    "啊啊啊啊按头小分队在哪里！亲下去啊！",
                    "这是什么绝美爱情，我枯了。",
                    "男主好帅！我也想要这样的学长！",
                    "太甜了，今天的胰岛素这一话包了。"
                ],
                'horror_suspense': [
                    "大半夜看的，现在不敢去厕所...",
                    "这就是我要的恐怖感！背后发凉！",
                    "最后那个眼神吓死爹了！",
                    "如果是为了吓死我，那你成功了。"
                ],
                'boys_love': [
                    "kswl! kswl!",
                    "这是不付费能看的内容吗？太太好人一生平安！",
                    "这对CP锁死，钥匙我吞了！"
                ],
                'ceo_romance': [
                    "虽然土但是我也想被霸总壁咚...",
                    "这总裁味儿太冲了，但我喜欢。",
                    "女人，你成功引起了我的注意。"
                ]
            }
        };
    }

    async init() {
        try {
            const respPlots = await fetch('./js/data/plots.json');
            const dataPlots = await respPlots.json();
            this.genres = dataPlots.reduce((acc, item) => { acc[item.id] = item; return acc; }, {});

            const respStyles = await fetch('./js/data/styles.json');
            const dataStyles = await respStyles.json();
            this.styles = dataStyles.reduce((acc, item) => { acc[item.id] = item; return acc; }, {});

            console.log(`[MangaSystem] 加载完毕`);
        } catch (error) {
            console.error("❌ 无法加载漫画数据:", error);
            this.genres = { 'school_romance': { id: 'school_romance', name: '校园纯爱', base_income: 100, base_fans: 10 } };
            this.styles = { 'standard': { id: 'standard', name: '标准画风', good_for: [], bad_for: [] } };
        }
    }

    getUnlockedGenres() {
        const career = gameState.mangaCareer;
        if (!career.unlockedGenres) career.unlockedGenres = ["school_romance"];
        return career.unlockedGenres.map(id => this.genres[id]).filter(g => g);
    }

    getUnlockedStyles() {
        const career = gameState.mangaCareer;
        if (!career.unlockedStyles) career.unlockedStyles = ["standard"];
        return career.unlockedStyles.map(id => this.styles[id]).filter(s => s);
    }

    startSerialization(title, genreId, styleId) {
        const genre = this.genres[genreId];
        const style = this.styles[styleId];
        
        let synergyLabel = "😐 平平无奇";
        if (style && style.good_for && style.good_for.includes(genreId)) {
            synergyLabel = "🔥 绝妙搭配";
        } else if (style && style.bad_for && style.bad_for.includes(genreId)) {
            synergyLabel = "💀 灾难组合";
        }

        gameState.mangaCareer.currentWork = {
            title: title || `无名漫画-${Date.now()}`,
            genreId: genreId,
            genreName: genre ? genre.name : "未知",
            styleId: styleId,
            styleName: style ? style.name : "未知",
            synergyLabel: synergyLabel,
            chapter: 0,
            totalScore: 0,
            maxIncom: 0,
            startTime: gameState.world.date
        };

        // 记录新连载开始日志
        if (window.logEvent) {
            window.logEvent('manga', `开始新连载《${gameState.mangaCareer.currentWork.title}》 (${genre ? genre.name : "未知"})`, 
                gameState.world.date, {
                    genre: genre ? genre.name : "未知",
                    style: style ? style.name : "未知",
                    synergy: synergyLabel
                });
        }

        return gameState.mangaCareer.currentWork;
    }

    drawChapter(attributes, focus = null) {
        const work = gameState.mangaCareer.currentWork;
        if (!work) return null;

        work.chapter += 1;

        const result = this.calculateChapterScore(attributes, work.genreId, work.styleId, focus);
        
        // 【新增】保存这一话的得分，用于反馈系统判断好评差评
        work.lastChapterScore = result.score;
        
        work.totalScore += result.score;
        work.maxIncom = Math.max(work.maxIncom, result.income);
        
        // 【关键修复】获取 updateRanking 返回的布尔值
        const isChampion = this.updateRanking(work.totalScore);

        return {
            ...result,
            chapter: work.chapter,
            title: `《${work.title}》第 ${work.chapter} 话`,
            isChampion: isChampion // 传给 main.js
        };
    }

    drawChapterWithStrategy(playerAttributes, work, draft) {
        if (!work) return null;
        
        work.chapter += 1;
        
        const genre = this.genres[work.genreId];
        const style = this.styles[work.styleId];
        const focus = draft.focus;
        
        // 1. 基础分计算：(玩家属性 + 投入的灵感点数) * 题材权重
        const artScore = (playerAttributes.art + draft.allocated.art) * (genre.weights.art || 0.5);
        const storyScore = (playerAttributes.story + draft.allocated.story) * (genre.weights.story || 0.5);
        const charmScore = ((playerAttributes.charm || 5) + draft.allocated.charm) * (genre.weights.charm || 0.2);
        
        let totalScore = artScore + storyScore + charmScore;
        
        // 应用策略修正 (Plot Focus)
        if (focus.stat_bonus) {
            if (focus.stat_bonus.art) totalScore *= focus.stat_bonus.art;
            if (focus.stat_bonus.story) totalScore *= focus.stat_bonus.story;
            if (focus.stat_bonus.charm) totalScore *= focus.stat_bonus.charm;
        }
        totalScore *= (focus.score_mod || 1);
        
        // 【新增】保存这一话的得分，用于反馈系统判断好评差评
        work.lastChapterScore = totalScore;
        
        // 3. 画风契合度修正
        let synergyMult = 1.0;
        let synergyMsg = "";
        
        if (style.good_for && style.good_for.includes(work.genreId)) {
            synergyMult = 1.3;
            synergyMsg = "🔥 绝妙搭配！";
        } else if (style.bad_for && style.bad_for.includes(work.genreId)) {
            synergyMult = 0.7;
            synergyMsg = "💀 灾难般的组合...";
        }
        
        totalScore *= synergyMult;

        // 4. 随机波动与暴击 (Risk check)
        let isCriticalSuccess = false;
        let isCriticalFail = false;
        
        const roll = Math.random();
        if (focus.risk && roll < focus.risk) {
            totalScore *= 0.6; // 崩坏
            isCriticalFail = true;
        } else if (roll > 0.9) {
            totalScore *= 1.5; // 暴击
            isCriticalSuccess = true;
        }

        // 5. 收入与粉丝计算
        const fansMult = focus.fans_mod || 1;
        const income = Math.floor(totalScore * 5); // 简化公式
        const fans = Math.floor(totalScore * 0.5 * fansMult);

        // 更新作品总分
        work.totalScore += totalScore;
        work.maxIncom = Math.max(work.maxIncom, income);
        
        // 排名计算
        const isChampion = this.updateRanking(work.totalScore);

        // 获取当前排名
        const rank = gameState.mangaCareer.currentRank || '无';

        // 生成剧情焦点效果消息
        let focusMsg = `策略: ${focus.name}`;
        if (focus.stat_bonus) {
            focusMsg += " (";
            const bonuses = [];
            if (focus.stat_bonus.art) bonuses.push(`画功 x${focus.stat_bonus.art}`);
            if (focus.stat_bonus.story) bonuses.push(`编剧 x${focus.stat_bonus.story}`);
            if (focus.stat_bonus.charm) bonuses.push(`魅力 x${focus.stat_bonus.charm}`);
            focusMsg += bonuses.join(", ") + ")";
        }

        // 记录章节发布日志
        if (window.logEvent) {
            const feedback = isCriticalSuccess ? "🔥 神回！" : isCriticalFail ? "💀 作画崩坏" : "";
            const message = `发布《${work.title}》第 ${work.chapter} 话 ${feedback}`;
            
            window.logEvent('manga', message, gameState.world.date, {
                chapter: work.chapter,
                score: totalScore,
                income: income,
                fans: fans,
                rank: rank,
                isChampion: isChampion
            });
        }

        return {
            chapter: work.chapter,
            title: `《${work.title}》第 ${work.chapter} 话`,
            score: totalScore,
            rank: rank,
            income,
            fans,
            synergyMsg,
            focusMsg,
            isChampion,
            isCriticalSuccess,
            isCriticalFail
        };
    }

    calculateChapterScore(attributes, genreId, styleId, focus = null) {
        let genre = this.genres[genreId] || Object.values(this.genres)[0];
        let style = this.styles[styleId] || this.styles['standard'];
        
        const w = genre.weights || { art: 0.5, story: 0.5, charm: 0 };
        
        // 计算带剧情焦点效果的属性值
        let effectiveAttributes = { ...attributes };
        let focusMsg = "";
        let finalScore;
        
        // 检查并应用上一话的焦点效果
        const chapter = gameState.mangaCareer.currentWork ? gameState.mangaCareer.currentWork.chapter : 0;
        let retentionBonus = 1.0;
        
        if (gameState.mangaCareer.focusEffects) {
            const currentEffects = gameState.mangaCareer.focusEffects;
            for (let i = currentEffects.length - 1; i >= 0; i--) {
                const effect = currentEffects[i];
                if (effect.type === 'retention' && effect.chapter === chapter) {
                    retentionBonus = effect.value;
                    focusMsg += `🔥 上话断章效果！热度提升 ${(retentionBonus - 1) * 100}%\n`;
                    // 移除已使用的效果
                    currentEffects.splice(i, 1);
                    break;
                }
            }
        }
        
        // 应用剧情焦点效果
        if (focus) {
            focusMsg = `📌 ${focus.name}：`;
            
            // 应用属性加成
            if (focus.stat_bonus) {
                Object.keys(focus.stat_bonus).forEach(stat => {
                    if (effectiveAttributes[stat]) {
                        effectiveAttributes[stat] *= focus.stat_bonus[stat];
                    }
                });
                focusMsg += "属性调整已应用，";
            }
            
            // 计算基础分数
            let baseScore = (effectiveAttributes.art * w.art) + (effectiveAttributes.story * w.story) + (effectiveAttributes.charm * (w.charm || 0));
            
            // 应用评分加成/折扣
            let scoreMod = focus.score_mod || 1.0;
            
            // 应用随机因子
            const randomFactor = 0.8 + Math.random() * 0.4;
            
            // 应用风险因素
            let riskFactor = 1.0;
            if (focus.risk && Math.random() < focus.risk) {
                riskFactor = 0.5; // 崩坏时分数减半
                focusMsg += "但剧情崩坏了！";
            } else {
                if (focus.risk > 0) {
                    focusMsg += "成功规避风险，";
                }
            }
            
            finalScore = baseScore * scoreMod * randomFactor * riskFactor;
        } else {
            // 没有选择剧情焦点时的默认计算
            finalScore = (attributes.art * w.art) + (attributes.story * w.story) + (attributes.charm * (w.charm || 0));
            finalScore *= (0.8 + Math.random() * 0.4); // 随机因子
        }
        
        // 应用画风协同效果
        let synergyMult = 1.0;
        let synergyMsg = "";
 
        if (style.good_for && style.good_for.includes(genreId)) {
            synergyMult = 1.5; 
            synergyMsg = "🔥 绝妙搭配！";
        } else if (style.bad_for && style.bad_for.includes(genreId)) {
            synergyMult = 0.6; 
            synergyMsg = "💀 灾难般的组合...";
        }
        
        finalScore *= synergyMult;
        
        // 计算章节加成 - 使用已声明的chapter变量
        const bonus = 1 + (chapter * 0.02);
        
        // 计算收入和粉丝增长，应用留存效果
        let income = Math.floor((genre.base_income || 50) * (finalScore / 10) * bonus * retentionBonus);
        let fans = Math.floor((genre.base_fans || 5) * (finalScore / 10) * bonus * retentionBonus);
        
        // 应用剧情焦点的粉丝增长加成
        if (focus && focus.fans_mod) {
            fans = Math.floor(fans * focus.fans_mod);
            focusMsg += "粉丝增长加速！";
        }
        
        // 应用剧情焦点的特殊效果
        if (focus && focus.effect) {
            if (focus.effect === 'retention') {
                // 特殊效果：下一话基础热度提升
                // 这里可以在游戏状态中记录这个效果
                if (!gameState.mangaCareer.focusEffects) {
                    gameState.mangaCareer.focusEffects = [];
                }
                gameState.mangaCareer.focusEffects.push({ type: 'retention', chapter: chapter + 1, value: 1.2 });
                focusMsg += "下一话热度提升！";
            }
        }
        
        // 清理剧情焦点效果文本
        if (focusMsg.endsWith("：, ")) {
            focusMsg = focusMsg.replace("：, ", "：");
        } else if (focusMsg.endsWith(", ")) {
            focusMsg = focusMsg.slice(0, -2);
        }

        // 获取当前排名
        const rank = gameState.mangaCareer.currentRank || '无';
        
        return { score: finalScore, income, fans, synergyMsg, focusMsg, rank };
    }

    endSerialization() {
        const work = gameState.mangaCareer.currentWork;
        if (!work) return null;
        let finalRank = "腰斩烂尾";
        if (work.totalScore > 5000) finalRank = "传世神作";
        else if (work.totalScore > 2000) finalRank = "人气佳作";
        else if (work.totalScore > 500) finalRank = "小有名气";
        
        const historyItem = { 
            ...work, 
            endTime: gameState.world.date, 
            finalRankLabel: finalRank 
        };
        
        if (!gameState.mangaCareer.history) gameState.mangaCareer.history = [];
        gameState.mangaCareer.history.unshift(historyItem);
        
        // 记录漫画完结日志
        if (window.logEvent) {
            window.logEvent('manga', `完结漫画《${work.title}》，最终评价：${finalRank}`, gameState.world.date, {
                chapters: work.chapter,
                totalScore: work.totalScore,
                finalRank: finalRank
            });
        }
        
        gameState.mangaCareer.currentWork = null;
        return historyItem;
    }

    // ==========================================
    // 排名更新逻辑 (修复 ReferenceError)
    // ==========================================
    updateRanking(totalScore) {
        const career = gameState.mangaCareer;
        // 如果已经通关最高级，不再计算
        if (career.rankingTier >= this.RANKING_TIERS.length) return false;

        const tierConfig = this.RANKING_TIERS[career.rankingTier];
        const oldRank = career.currentRank;
        
        const progress = Math.min(1, totalScore / tierConfig.reqScore);
        let newRank = Math.floor(tierConfig.maxRank - (tierConfig.maxRank * progress)) + 1;
        if (newRank < 1) newRank = 1;
        
        career.currentRank = newRank;

        // 【关键修复】必须先定义这个变量，否则后面报错
        let isChampion = false;

        // 检测是否夺冠
        if (newRank === 1 && oldRank !== 1) {
            this.celebrateChampion(tierConfig.name);
            isChampion = true; // 标记为真
        }
        
        return isChampion; // 返回给 drawChapter
    }

    celebrateChampion(tierName) {
        const career = gameState.mangaCareer;
        
        if (career.rankingTier < this.RANKING_TIERS.length - 1) {
            const nextTier = this.RANKING_TIERS[career.rankingTier + 1];
            
            if (window.game && window.game.ui) {
                window.game.ui.showDialog({
                    title: "🎉 榜单制霸！🎉",
                    text: `太强了！你的作品已经横扫了【${tierName}】！\n\n但这还不是终点……\n即刻起，你获得了挑战【${nextTier.name}】的资格！`,
                    choices: [{ text: "冲呀！", action: () => window.game.ui.closeDialog() }]
                });
            }
            career.rankingTier++;
            career.currentRank = nextTier.maxRank;
        } else {
            if (window.game && window.game.ui) {
                window.game.ui.showDialog({
                    title: "👑 漫画之神降临 👑",
                    text: `不可思议！你已经制霸了【${tierName}】！\n你就是传说中的漫画之神！`,
                    choices: [{ text: "我就是神！", action: () => window.game.ui.closeDialog() }]
                });
            }
        }
    }
    
    unlockRandomGenre() {
        const career = gameState.mangaCareer;
        if (!career.unlockedGenres) career.unlockedGenres = ["school_romance"];
        const lockedGenres = Object.values(this.genres).filter(g => !career.unlockedGenres.includes(g.id));
        if (lockedGenres.length === 0) return null;
        const newGenre = lockedGenres[Math.floor(Math.random() * lockedGenres.length)];
        career.unlockedGenres.push(newGenre.id);
        return newGenre;
    }

    unlockRandomStyle() {
        const career = gameState.mangaCareer;
        if (!career.unlockedStyles) career.unlockedStyles = ["standard"];
        const lockedStyles = Object.values(this.styles).filter(s => !career.unlockedStyles.includes(s.id));
        if (lockedStyles.length === 0) return null;
        const newStyle = lockedStyles[Math.floor(Math.random() * lockedStyles.length)];
        career.unlockedStyles.push(newStyle.id);
        console.log(`[MangaSystem] 领悟新画风: ${newStyle.name}`);
        return newStyle;
    }
    
    /**
     * 生成漫画情节描述
     * @param {string} title 漫画标题
     * @param {string} genreId 漫画题材ID
     * @param {number} chapter 当前章节
     * @returns {string} 情节描述文本
     */
    generatePlotDescription(title, genreId, chapter) {
        let templates = [...this.plotTemplates];
        
        // 如果有该题材的特殊模板，添加到模板池中
        if (this.genreSpecificPlots[genreId]) {
            templates = [...templates, ...this.genreSpecificPlots[genreId]];
        }
        
        // 根据章节数选择合适的模板
        // 第一话用特殊模板
        if (chapter === 1) {
            return `《${title}》正式开始连载！这将是一个充满未知与可能性的精彩故事...`;
        }
        
        // 随机选择一个模板
        const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
        
        // 替换模板中的占位符
        return randomTemplate.replace(/\{title\}/g, `《${title}》`);
    }
    
    /**
     * 【新增】生成读者反馈
     * 根据作品当前的各项指标，生成一组看起来很真实的评论
     */
    getReaderFeedback(work) {
        const comments = [];
        const score = work.totalScore / (work.chapter || 1); // 估算平均分，或直接用上一话得分
        // 注意：这里为了演示，假设上一话得分存在 work.lastChapterScore 中，如果没有就用随机数模拟
        const lastScore = work.lastChapterScore || (50 + Math.random() * 50);

        // 1. 确定基调
        let poolKey = 'mid_score';
        if (lastScore >= 80) poolKey = 'high_score';
        else if (lastScore < 50) poolKey = 'low_score';

        // 2. 抽取 2 条基础评论
        const basePool = this.commentPool[poolKey];
        for (let i = 0; i < 2; i++) {
            comments.push(basePool[Math.floor(Math.random() * basePool.length)]);
        }

        // 3. 抽取 1 条题材专属评论 (如果有)
        if (this.commentPool.genres[work.genreId]) {
            const genrePool = this.commentPool.genres[work.genreId];
            comments.push(genrePool[Math.floor(Math.random() * genrePool.length)]);
        }

        // 4. 生成一条“热评” (用于互动)
        // 热评通常比较极端，或者提出具体问题
        const hotComment = {
            user: "热心网友_" + Math.floor(Math.random() * 1000),
            content: comments[0], // 拿第一条当热评
            likes: Math.floor(Math.random() * 500) + 10,
            type: poolKey // 记录类型以便后续判断回复效果
        };

        return {
            list: comments.sort(() => Math.random() - 0.5), // 打乱顺序
            hotComment: hotComment
        };
    }
}