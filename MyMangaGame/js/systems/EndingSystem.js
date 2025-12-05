// js/systems/EndingSystem.js
import { gameState, gameConfig } from '../state.js';
import { fixedNPCs } from '../data/fixed_npcs.js';

export class EndingSystem {
    
    checkEnding() {
        // 1. 检查是否破产 (余额低于-100)
        if (gameState.player.money < -100) {
            this.triggerBankruptcyEnding();
            return true;
        }
        // 2. 检查是否时间耗尽
        if (gameState.world.date > gameConfig.MAX_DAYS) {
            this.triggerEnding();
            return true;
        }
        return false;
    }

    triggerEnding() {
        const { fans, money } = gameState.player;
        const brother = gameState.npcs.find(n => n.relation === 'brother');
        const datingCount = gameState.npcs.filter(n => n.status === 'dating').length;

        let endingTitle = "";
        let endingDesc = "";
        let endingType = "normal"; // normal, bad, happy, true

        // ===================================
        // 1. 优先级最高：骨科/特殊结局
        // ===================================
        if (brother && brother.stats.restraint <= 0) {
            endingTitle = "笼中鸟 (BE/HE?)";
            endingDesc = "你没能成为大漫画家，因为你甚至无法踏出这间金色的卧室。\n沈清舟实现了他的诺言，你们共享呼吸与罪孽，至死方休。";
            endingType = "bad"; 
            this.showEndingScreen(endingTitle, endingDesc, endingType);
            return;
        }

        // ===================================
        // 2. 优先级次高：失败结局 (强制回家)
        // ===================================
        if (fans < gameConfig.GOAL_FANS) {
            endingTitle = "继承家业 (Bad Ending)";
            endingDesc = "“玩够了吗？”父亲的秘书站在出租屋门口，递给你一张机票。\n你没能证明自己。画笔被收进箱底，你穿上高定套装，成为了沈氏集团的继承人。\n偶尔在深夜，你还会想起那个关于漫画的梦。";
            endingType = "bad";
            this.showEndingScreen(endingTitle, endingDesc, endingType);
            return;
        }

        // ===================================
        // 3. 成功结局：根据感情状态分支
        // ===================================
        
        // A. 事业有成 + 独美
        if (datingCount === 0) {
            endingTitle = "单身贵族漫画家 (Normal Ending)";
            endingDesc = "你证明了自己！你的漫画改编成了动画、电影。\n虽然身边没有伴侣，但看着银行卡里的数字和粉丝的欢呼，你觉得自由才是最贵的奢侈品。";
            endingType = "happy";
        }
        // B. 事业有成 + 海王 (如果攻略了2个以上)
        else if (datingCount >= 2) {
            endingTitle = "成年人的世界我全都要 (Harem Ending)";
            endingDesc = "谁说漫画家只能有一个灵感缪斯？\n他们在你的签售会上相遇，虽然空气中弥漫着火药味，但你知道，今晚的修罗场也会是绝佳的素材。";
            endingType = "happy";
        }
        // C. 事业有成 + 纯爱
        else {
            const lover = gameState.npcs.find(n => n.status === 'dating');
            endingTitle = `与 ${lover.name} 的幸福生活 (Happy Ending)`;
            endingDesc = `你不仅收获了事业，还收获了独一无二的爱。\n${lover.name} 笑着帮你整理画稿，窗外阳光正好。`;
            endingType = "happy";
        }

        this.showEndingScreen(endingTitle, endingDesc, endingType);
    }

    // 破产结局
    triggerBankruptcyEnding() {
        const endingTitle = "破产边缘 (Bad Ending)";
        const endingDesc = "你的存款已经见底，房东将你赶了出去。\n\n当你拖着行李箱站在街头时，父亲的秘书出现在你面前。\n\"少爷让我来接您回去。\"\n\n你失去了追求梦想的机会，被迫接受了家族安排的联姻。";
        this.showEndingScreen(endingTitle, endingDesc, "bad");
    }

    showEndingScreen(title, text, type) {
        // 调用 UI 显示全屏结局，并提供“开启二周目”按钮
        window.game.ui.renderEnding(title, text, type);
    }
}