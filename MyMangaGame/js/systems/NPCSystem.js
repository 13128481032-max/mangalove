import { gameState } from '../state.js';
import { fixedNPCs } from '../data/fixed_npcs.js';

export class NPCSystem {
    constructor() {
        // ==========================================
        // 1. Roguelike 词条库 (随机池)
        // ==========================================
        
        // 姓氏库
        this.surnames = ["顾","刘","路","陆", "沈", "陆", "白","商", "谢", "裴","幸", "霍", "江", "秦", "傅", "厉", "萧", "林", "苏", "叶", "墨"];
        
        // 名字库
        this.names = [
            "辞", "泽", "野", "妄", "予", "修", "让", "知行", "晏", "深", "沉", "聿", "尚","率","行","星",
            "司", "宴","林","秋","寒","然","听白", "云深", "千帆", "星野", "景行", "洛", "无忧", "长风"
        ];

        // 外貌 - 眼睛
        this.looks_eyes = [
            "眼尾泛红", "气质清冷", "深邃狼眼", "多情桃花眼", "垂眼慵懒", "瞳色浅淡", "笑眼弯弯", "狭长丹凤眼", "瞳色浅若琉璃", "眼尾狭长上挑", "睫毛浓密如扇", "瞳仁漆黑如墨", 
            "左右双瞳异色", "眼神深邃", "眼窝深邃立体", "虹膜呈灰蓝色","眼廓圆润下垂"
        ];

        // 外貌 - 饰品/特征
        this.looks_feature = [
            "架着金丝眼镜", "左耳戴着黑钉", "指骨缠着绷带", "锁骨若隐若现", "眼角有一颗泪痣", "喉结旁有一点痣", "手背青筋蜿蜒", "耳骨夹着银环", 
            "唇珠圆润饱满", "手腕系着褪色红绳", 
            "指尖泛着淡淡粉色", "嘴角天生微微上扬",
            "穿着禁欲系衬衫", "手腕戴着佛珠", "领带系得一丝不苟", "身上有淡淡烟草味", "指尖夹着画笔"
        ];
        
        // 性格逻辑库 (关联 interactions.json 和 events.json)
        this.personalities = [
            { key: "sunny", label: "☀️ 阳光修勾", desc: "直球热烈，像小太阳一样围着你转，但极其害怕被抛弃。" },
            { key: "gloomy", label: "🌧️ 阴湿偏执", desc: "平时沉默寡言，甚至有些自卑，但占有欲极强，会在暗处盯着你。" },
            { key: "arrogant", label: "⚡ 傲娇毒舌", desc: "嘴上嫌弃你的画，私底下却偷偷给你砸钱买热搜。" },
            { key: "gentle", label: "🍵 温柔腹黑", desc: "永远带着笑意，但当你和其他男人亲近时，那个男人会莫名其妙倒霉。" },
            { key: "stoic", label: "❄️ 高岭之花", desc: "眼神清冷，扣子永远扣到最上面一颗。看似无情，实则深情。" },
            { key: "flirty", label: "🦊 风流浪子", desc: "嘴角总是噙着笑，擅长用甜言蜜语编织陷阱，却不小心把自己陷了进去。" }
        ];

        // 互动文案库 (初始为空，init时加载)
        this.interactionDB = {};
    }

    /**
     * 异步初始化，加载文案库
     */
    async init() {
        try {
            const response = await fetch('./js/data/interactions.json');
            if (response.ok) {
                this.interactionDB = await response.json();
                console.log("[NPCSystem] 互动文案加载完成");
            }
        } catch (e) {
            console.error("❌ 无法加载 interactions.json", e);
            // 兜底数据，防止报错
            this.interactionDB = { chat: {}, date: {}, gift: {}, jealousy: {} };
        }
    }

/**
     * 【核心】随机生成男主 (纯本地头像版)
     * 仅从 assets/avatars/ 文件夹读取图片，拒绝在线生成
     */
    generateNewNPC(state) {
        if (!state.npcs) state.npcs = [];

        // 1. 随机组合姓名 (Roguelike)
        const surname = this.randomPick(this.surnames);
        const name = this.randomPick(this.names);
        const fullName = surname + name;

        // 2. 随机组合外貌特征
        const eye = this.randomPick(this.looks_eyes);
        const feature = this.randomPick(this.looks_feature);
        const lookDesc = `${feature}，${eye}`;

        // 3. 智能抽取性格 (优先抽取未遇到的)
        const existingTypes = state.npcs.map(n => n.personality);
        const availableP = this.personalities.filter(p => !existingTypes.includes(p.key));
        const pData = (availableP.length > 0) ? this.randomPick(availableP) : this.randomPick(this.personalities);

        // ========================================================
        // 4. 头像逻辑：纯本地智能分配
        // ========================================================
        
        // 获取设置的总数，如果没有设置则默认为 10 (防止报错)
        const totalImages = this.maxLocalAvatars || 10;
        
        // A. 找出目前存档里已经占用的图片编号
        const usedIndexes = state.npcs.map(npc => {
            // 正则匹配 avatars/数字.jpg
            const match = npc.avatar ? npc.avatar.match(/avatars\/(\d+)\.jpg/) : null;
            return match ? parseInt(match[1]) : -1;
        });

        // B. 找出所有“空闲”的编号
        const availableIndexes = [];
        for (let i = 1; i <= totalImages; i++) {
            if (!usedIndexes.includes(i)) {
                availableIndexes.push(i);
            }
        }

        let finalIndex;
        
        if (availableIndexes.length > 0) {
            // C. 还有空闲头像：从中随机选一个 (优先去重)
            finalIndex = this.randomPick(availableIndexes);
            console.log(`[NPCSystem] 分配新头像: ${finalIndex}.jpg (剩余库存: ${availableIndexes.length - 1})`);
        } else {
            // D. 头像全用完了：被迫随机重复
            finalIndex = Math.floor(Math.random() * totalImages) + 1;
            console.log(`[NPCSystem] 头像库耗尽，重复使用: ${finalIndex}.jpg`);
        }

        // 构建路径 (确保你的图片放在 assets/avatars/ 下且是 jpg 格式)
        const finalAvatarUrl = `./assets/avatars/${finalIndex}.jpg`;

        // ========================================================

        // 5. 构建完整对象
        const newNPC = {
            id: `npc_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            name: fullName,
            
            // 逻辑字段
            personality: pData.key,
            
            // 展示字段
            personalityLabel: pData.label, 
            description: lookDesc,      
            detailDesc: pData.desc,     
            
            favorability: 0,
            status: 'stranger',
            
            // 最终头像
            avatar: finalAvatarUrl
        };

        state.npcs.push(newNPC);
        console.log(`[NPCSystem] 生成新角色: ${fullName} [${pData.key}]`);
        
        return newNPC;
    }

    /**
     * 尝试偶遇 (随机)
     * (包含新人逻辑 + 正确的文本调用)
     */
    tryEncounter(state) {
        if (!state.npcs) state.npcs = [];

        // ============================================================
        // 【新增逻辑】监禁状态下无法遇到新人
        // ============================================================
        if (state.flags && state.flags.route === 'confined') {
            return {
                metSomeone: false,
                // 增强压迫感的文案
                message: "街上人来人往，但你总感觉有一道视线死死黏在你背上，让你不敢在这个路口停留。"
            };
        }
        // ============================================================

        // 1. 基础偶遇概率 (70%)
        const roll = Math.random();
        if (roll < 0.7) {
            
            let targetNPC;
            const currentCount = state.npcs.length;
            
            // 2. 遇到新人概率 (新手保护机制)
            let meetNewChance = 0.2; 
            if (currentCount < 3) meetNewChance = 1.0; // 前3个必出新
            else if (currentCount < 6) meetNewChance = 0.5;

            // 如果集齐所有性格，降低遇到新人概率
            if (currentCount >= this.personalities.length) meetNewChance = 0.1;

            if (currentCount === 0 || Math.random() < meetNewChance) {
                targetNPC = this.generateNewNPC(state);
            } else {
                targetNPC = state.npcs[Math.floor(Math.random() * state.npcs.length)];
            }
            
            return {
                metSomeone: true,
                npc: targetNPC,
                // 复用 'chat' 类型的文案作为打招呼
                dialogue: this.getRandomText(targetNPC, 'chat') 
            };
        }

        return { metSomeone: false };
    }

    /**
     * 获取打招呼文本 (备用/Fallback)
     */
    getGreeting(npc) {
        if (npc.personality === 'gloomy') return "……是你啊。我在看风景，没看你。";
        if (npc.personality === 'arrogant') return "啧，走路不长眼吗？";
        if (npc.personality === 'sunny') return "嗨！好巧啊！我是闻着你的味道找来的（笑）";
        if (npc.personality === 'gentle') return "真巧，我们很有缘分呢。";
        if (npc.personality === 'stoic') return "……有事？（眼神冷淡地扫了你一眼）";
        if (npc.personality === 'flirty') return "哟，这位美丽的小姐，是专门来偶遇我的吗？";
        return "你好。";
    }

    /**
     * 获取角色的吃醋台词 (用于修罗场)
     */
    getJealousyLine(npc) {
        const lines = this.interactionDB.jealousy?.[npc.personality];
        if (!lines || lines.length === 0) {
            return "……（他不悦地盯着另一边）";
        }
        return this.randomPick(lines);
    }

    /**
     * 互动逻辑 (约会/聊天/送礼)
     */
    interact(npcId, type) {
        const npc = gameState.npcs.find(n => n.id === npcId);
        if (!npc) return { success: false, text: "找不到该角色" };

        let text = "";
        let success = true;
        let addedFavorability = 0;

        // 性格对应的负面对话
        const negativeResponses = {
            sunny: [
                "(眼神瞬间暗了下来)你...是不是不喜欢我了？",
                "(声音颤抖)为什么要这么说？我做错什么了吗？",
                "(委屈地咬着下唇)我以为我们的关系很好..."
            ],
            gloomy: [
                "(眼神变得阴鸷)我早该知道...",
                "(冷笑)果然，没有人会真正在意我。",
                "(后退一步)你想离开我吗？"
            ],
            arrogant: [
                "(挑眉)有意思，你知道自己在说什么吗？",
                "(嘲讽)原来你是这样看我的。",
                "(转身就走)随便你怎么想！"
            ],
            gentle: [
                "(笑容僵在脸上)这样啊...",
                "(垂下眼帘)我明白了。",
                "(轻声)原来我的关心让你困扰了。"
            ],
            stoic: [
                "(面无表情)我知道了。",
                "(转身)随你。",
                "(眼神变冷)你有你的选择。"
            ],
            flirty: [
                "(收起玩世不恭的笑容)看来我玩得太过了。",
                "(点燃一支烟)无所谓，反正没人会当真。",
                "(挑眉)有意思，你是第一个拒绝我的人。"
            ]
        };

        switch (type) {
            case 'chat':
                // 哥哥角色的聊天逻辑
                if (npc.relation === 'brother') {
                    addedFavorability = 5;
                    npc.stats.affection += addedFavorability;
                    // 聊天会略微降低克制值
                    npc.stats.restraint -= 1;
                    // 从库里取一句随机的话
                    text = `【${npc.name}】\n` + this.getRandomText(npc, 'chat');
                } else {
                    // 普通NPC的聊天逻辑
                    addedFavorability = 2;
                    npc.favorability += addedFavorability;
                    // 从库里取一句随机的话
                    text = `【${npc.name}】\n` + this.getRandomText(npc, 'chat');
                }
                break;

            case 'date':
                // 哥哥角色的特殊约会逻辑
                if (npc.relation === 'brother') {
                    const restraint = npc.stats?.restraint || 0;
                    if (restraint > 20) {
                        success = false;
                        text = `${npc.name} 严肃地拒绝了你的邀请："我们是兄妹，这样不合适。"`;
                    } else {
                        addedFavorability = 15;
                        npc.stats.affection += addedFavorability;
                        // 约会会进一步降低理智值
                        npc.stats.restraint -= 5;
                        const dateText = this.getRandomText(npc, 'date');
                        text = `你们度过了一段心跳加速的时光。\n\n${npc.name}: "${dateText}"`;
                        
                        if (npc.status !== 'dating' && npc.stats.affection >= 80) {
                            npc.status = 'dating';
                            text += `\n\n(❤ 你和哥哥还是迈出了那一步，${npc.name} 现在是你的恋人了！)`;
                        }
                    }
                } else {
                    // 普通NPC的约会逻辑
                    if (npc.favorability < 20) {
                        success = false;
                        text = `${npc.name} 婉拒了你的邀请："我们还不够熟吧？"`;
                    } else {
                        addedFavorability = 10;
                        npc.favorability += addedFavorability;
                        const dateText = this.getRandomText(npc, 'date');
                        text = `你们度过了一段浪漫的时光。\n\n${npc.name}: "${dateText}"`;
                        
                        if (npc.status !== 'dating' && npc.favorability >= 80) {
                            npc.status = 'dating';
                            text += `\n\n(❤ 关系升级！${npc.name} 现在是你的男朋友了！)`;
                        }
                    }
                }
                break;

            case 'gift':
                // 哥哥角色的送礼逻辑
                if (npc.relation === 'brother') {
                    addedFavorability = 20;
                    npc.stats.affection += addedFavorability;
                    // 送礼会显著降低克制值
                    npc.stats.restraint -= 8;
                    const giftList = this.interactionDB.gift?.default || ["他收下了礼物。"];
                    text = this.randomPick(giftList);
                } else {
                    // 普通NPC的送礼逻辑
                    addedFavorability = 15;
                    npc.favorability += addedFavorability;
                    const giftList = this.interactionDB.gift?.default || ["他收下了礼物。"];
                    text = this.randomPick(giftList);
                }
                break;

            case 'provoke':
                // 哥哥角色的挑衅逻辑
                if (npc.relation === 'brother') {
                    // 挑衅会显著减少好感度
                    addedFavorability = -15;
                    npc.stats.affection += addedFavorability;
                    // 但会降低克制值
                    npc.stats.restraint -= 5;
                    
                    // 确保好感度不为负数
                    if (npc.stats.affection < 0) npc.stats.affection = 0;
                    
                    // 哥哥的特殊回应
                    const brotherResponses = [
                        "你这是在故意激怒我吗？",
                        "别闹了，我不想和你吵架。",
                        "（眼神变得阴沉）你知道这样会让我很生气吗？",
                        "我们是兄妹，为什么要这样对我？"
                    ];
                    text = `${npc.name}: "${this.randomPick(brotherResponses)}"`;
                } else {
                    // 普通NPC的挑衅逻辑
                    addedFavorability = -10;
                    npc.favorability += addedFavorability;
                    
                    // 确保好感度不为负数
                    if (npc.favorability < 0) npc.favorability = 0;
                    
                    // 获取性格对应的负面回应
                    const responses = negativeResponses[npc.personality] || negativeResponses.sunny;
                    text = `${npc.name}: "${this.randomPick(responses)}"`;
                }
                break;
        }

        return { success, text, npc, addedFavorability };
    }
    

    /**
     * 【核心】根据好感度获取随机文本
     * (已修复变量名错误 favor -> npc.favorability)
     */
    getRandomText(npc, category) {
        // 1. 获取该分类下的性格包
        const categoryData = this.interactionDB[category];
        if (!categoryData) return "...";

        const personalityData = categoryData[npc.personality] || [];
        
        // 2. 筛选符合当前好感度的台词 (min_favor <= 当前好感)
        const validOptions = personalityData.filter(item => 
            (npc.favorability || 0) >= (item.min_favor || 0)
        );

        // 3. 如果没找到，兜底逻辑
        if (validOptions.length === 0) {
            // 尝试使用 getGreeting 兜底
            const fallback = this.getGreeting(npc); 
            return fallback !== "你好。" ? fallback : "...";
        }

        // 4. 随机取一条
        const selected = this.randomPick(validOptions);
        return selected.text;
    }

    /**
     * 辅助工具：随机抽取
     */
    randomPick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
    /**
     * 【新增】获取断联/分手台词
     */
    getBreakupLine(npc, type) {
        // type: 'normal' 或 'blackened'
        const lines = this.interactionDB.break_contact?.[type];
        if (!lines) return "...";
        
        // 获取对应性格的台词，如果没有则用默认
        return lines[npc.personality] || "……再见。";
    }
    
     /**
     * 获取哥哥对象（如果还没出现过，就初始化他）
     */
    getOrInitBrother() {
        // 1. 检查存档里是否已经有哥哥了
        let brother = gameState.npcs.find(n => n.id === fixedNPCs.brother.id);
        
        if (!brother) {
            // 2. 如果没有，根据配置初始化一个
            brother = {
                ...fixedNPCs.brother,
                status: 'normal', // normal, watching(暗中观察), broken(黑化)
                met: false, // 是否正式重逢
                avatar: './assets/avatars/15.jpg' // 设置哥哥的头像为15.jpg
            };
            // 加入到 NPC 列表
            gameState.npcs.push(brother);
        }
        return brother;
    }
    /**
     * 【新增】执行断联逻辑
     * @returns {Object} 结果 { success, text, isBlackened }
     */
    attemptBreakContact(npc) {
        // 基础黑化率
        let risk = 0.3;
        
        // 1. 处理普通NPC非恋爱状态
        if (npc.relation !== 'brother' && npc.status !== 'dating') {
            npc.status = 'stranger'; // 或者 'broken' (老死不相往来)
            npc.favorability = 0;
            return {
                success: true,
                isBlackened: false,
                text: `你删除了 ${npc.name} 的联系方式。\n从此你们成为了陌路人。`
            };
        }
        
        // 2. 特殊处理骨科NPC
        if (npc.relation === 'brother') {
            // 骨科NPC非恋爱状态
            if (npc.status !== 'dating') {
                npc.status = 'stranger';
                if (npc.stats) {
                    npc.stats.affection = 0;
                    // 断联会大幅降低理智值
                    npc.stats.restraint -= 20;
                    if (npc.stats.restraint < 0) npc.stats.restraint = 0;
                }
                return {
                    success: true,
                    isBlackened: false,
                    text: `你试图与 ${npc.name} 保持距离。\n他看起来很受伤，但还是尊重了你的选择。`
                };
            } else {
                // 骨科NPC作为恋人 -> 判定是否黑化
                // 骨科NPC分手黑化率更高
                risk = 0.7; // 骨科NPC分手黑化率70%
                // 如果理智值已经很低，黑化率更高
                if (npc.stats && npc.stats.restraint < 50) {
                    risk = 1.0; // 理智值低于50时必定黑化
                }
            }
        } else {
            // 3. 普通NPC作为恋人 -> 性格修正黑化率
            if (npc.personality === 'gloomy') risk += 0.4;  // 阴湿男极易黑化 (70%)
            if (npc.personality === 'gentle') risk += 0.3;  // 腹黑男容易黑化 (60%)
            if (npc.personality === 'stoic') risk += 0.2;   // 高岭之花 (50%)
            if (npc.personality === 'arrogant') risk += 0.1;// 霸总 (40%)
            // sunny 和 flirty 保持基础概率
        }

        // 4. 判定结果 (适用于所有NPC作为恋人的情况)
        if (Math.random() < risk) {
            // === 触发黑化囚禁 ===
            npc.status = 'imprisoned'; // 修改状态为监禁
            gameState.flags.is_imprisoned = true; // 全局标记
            gameState.flags.imprisoned_by = npc.name;
            
            const line = this.getBreakupLine(npc, 'blackened');
            
            return {
                success: true,
                isBlackened: true, // 标记为黑化
                text: `【${npc.name} (黑化)】:\n“${line}”\n\n(你感到眼前一黑……)`
            };
        } else {
            // === 正常和平分手 ===
            npc.status = 'broken'; // 分手状态
            
            // 根据NPC类型设置不同的属性
            if (npc.relation === 'brother' && npc.stats) {
                npc.stats.affection = -50; // 骨科NPC的好感度
                npc.stats.restraint -= 10; // 分手会降低理智值
                if (npc.stats.restraint < 0) npc.stats.restraint = 0;
            } else {
                npc.favorability = -50; // 普通NPC的好感度
            }
            
            const line = this.getBreakupLine(npc, 'normal');
            
            return {
                success: true,
                isBlackened: false,
                text: `【${npc.name}】:\n“${line}”\n\n(你们的关系结束了。)`
            };
        }
    }
}