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

        return gameState.mangaCareer.currentWork;
    }

    drawChapter(attributes) {
        const work = gameState.mangaCareer.currentWork;
        if (!work) return null;

        work.chapter += 1;

        const result = this.calculateChapterScore(attributes, work.genreId, work.styleId);
        
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

    calculateChapterScore(attributes, genreId, styleId) {
        let genre = this.genres[genreId] || Object.values(this.genres)[0];
        let style = this.styles[styleId] || this.styles['standard'];
        
        const w = genre.weights || { art: 0.5, story: 0.5, charm: 0 };
        let baseScore = (attributes.art * w.art) + (attributes.story * w.story) + (attributes.charm * (w.charm || 0));
        
        let synergyMult = 1.0;
        let synergyMsg = ""; 

        if (style.good_for && style.good_for.includes(genreId)) {
            synergyMult = 1.5; 
            synergyMsg = "🔥 绝妙搭配！";
        } else if (style.bad_for && style.bad_for.includes(genreId)) {
            synergyMult = 0.6; 
            synergyMsg = "💀 灾难般的组合...";
        }

        const randomFactor = 0.8 + Math.random() * 0.4;
        const finalScore = baseScore * synergyMult * randomFactor;
        
        const chapter = gameState.mangaCareer.currentWork ? gameState.mangaCareer.currentWork.chapter : 0;
        const bonus = 1 + (chapter * 0.02);
        
        const income = Math.floor((genre.base_income || 50) * (finalScore / 10) * bonus);
        const fans = Math.floor((genre.base_fans || 5) * (finalScore / 10) * bonus);

        return { score: finalScore, income, fans, synergyMsg };
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
}