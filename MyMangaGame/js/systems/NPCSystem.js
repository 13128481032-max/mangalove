import { gameState } from '../state.js';

export class NPCSystem {
    constructor() {
        // ==========================================
        // 1. Roguelike 词条库 (随机池)
        // ==========================================
        
        // 姓氏库
        this.surnames = ["顾", "沈", "陆", "白", "谢", "裴", "霍", "江", "秦", "傅", "厉", "萧", "林", "苏", "叶", "墨"];
        
        // 名字库
        this.names = [
            "辞", "泽", "野", "妄", "予", "修", "让", "知行", "晏", "深", "沉", "聿", 
            "司宴", "听白", "云深", "千帆", "星野", "景行", "洛", "无忧", "长风"
        ];

        // 外貌 - 眼睛
        this.looks_eyes = [
            "眼尾泛红", "清冷瑞凤眼", "深邃狼眼", "多情桃花眼", "垂眼慵懒", "瞳色浅淡", "笑眼弯弯", "狭长丹凤眼"
        ];
        
        // 外貌 - 饰品/特征
        this.looks_feature = [
            "架着金丝眼镜", "左耳戴着黑钉", "指骨缠着绷带", "锁骨若隐若现", "眼角有一颗泪痣", 
            "穿着禁欲系衬衫", "手腕戴着佛珠", "领带系得一丝不苟", "身上有淡淡烟草味", "指尖夹着画笔"
        ];

        // 性格逻辑库 (关联 interactions.json 和 events.json)
        this.personalities = [
            { key: "sunny", label: "☀️ 阳光修勾", desc: "直球热烈，像小太阳一样围着你转，但极其害怕被抛弃。" },
            { key: "gloomy", label: "🌧️ 阴湿偏执", desc: "平时沉默寡言，甚至有些自卑，但占有欲极强，会在暗处盯着你。" },
            { key: "arrogant", label: "⚡ 傲娇毒舌", desc: "嘴上嫌弃你的画，私底下却偷偷给你砸钱买热搜。" },
            { key: "gentle", label: "🍵 温柔腹黑", desc: "永远带着笑意，但当你和其他男人亲近时，那个男人会莫名其妙倒霉。" },
            // 【新增性格】
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
     * 【核心】随机生成一个独一无二的男主 (本地图片版)
     */
    generateNewNPC(state) {
        // 防呆初始化
        if (!state.npcs) state.npcs = [];

        // 1. 随机组合姓名
        const surname = this.randomPick(this.surnames);
        const name = this.randomPick(this.names);
        const fullName = surname + name;

        // 2. 随机组合外貌特征
        const eye = this.randomPick(this.looks_eyes);
        const feature = this.randomPick(this.looks_feature);
        const lookDesc = `${feature}，${eye}`;

        // 3. 随机抽取性格
        const pData = this.randomPick(this.personalities);

        // 4. 【核心修改】随机选取一张本地图片
        // 假设你有 10 张图 (1.jpg 到 10.jpg)
        // Math.random() * 10 得到 0-9.99，floor后是 0-9，+1 后是 1-10
        const totalImages = 14; 
        const randomImgIndex = Math.floor(Math.random() * totalImages) + 1;
        
        // 构建本地路径 (注意路径是相对于 index.html 的)
        const localAvatarUrl = `./assets/avatars/${randomImgIndex}.jpg`;

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
            
            // 使用本地图片路径
            avatar: localAvatarUrl
        };

        // 存入全局状态
        state.npcs.push(newNPC);
        console.log(`[NPCSystem] 生成新角色: ${fullName} [${pData.key}] (图:${randomImgIndex}.jpg)`);
        
        return newNPC;
    }

    /**
     * 尝试偶遇
     * (包含新人逻辑 + 正确的文本调用)
     */
    tryEncounter(state) {
        if (!state.npcs) state.npcs = [];

        // 1. 基础偶遇概率 (40%)
        const roll = Math.random();
        if (roll < 0.4) {
            
            let targetNPC;
            // 2. 遇到新人概率 (30% 或 列表为空时必出)
            const meetNewChance = 0.3; 
            
            if (state.npcs.length === 0 || Math.random() < meetNewChance) {
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
     * 已更新所有性格
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

        switch (type) {
            case 'chat':
                npc.favorability += 2;
                // 从库里取一句随机的话
                text = `【${npc.name}】\n` + this.getRandomText(npc, 'chat');
                break;

            case 'date':
                if (npc.favorability < 20) {
                    success = false;
                    text = `${npc.name} 婉拒了你的邀请：“我们还不够熟吧？”`;
                } else {
                    npc.favorability += 10;
                    const dateText = this.getRandomText(npc, 'date');
                    text = `你们度过了一段浪漫的时光。\n\n${npc.name}: “${dateText}”`;
                    
                    if (npc.status !== 'dating' && npc.favorability >= 80) {
                        npc.status = 'dating';
                        text += `\n\n(❤ 关系升级！${npc.name} 现在是你的男朋友了！)`;
                    }
                }
                break;

            case 'gift':
                npc.favorability += 15;
                const giftList = this.interactionDB.gift?.default || ["他收下了礼物。"];
                text = this.randomPick(giftList);
                break;
        }

        return { success, text, npc };
    }

    /**
     * 【核心】根据好感度获取随机文本
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
            // 尝试使用 getGreeting 兜底，或者返回默认点点点
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
}