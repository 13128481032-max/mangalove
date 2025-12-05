// js/systems/TimeSystem.js
import { gameState } from '../state.js';

export class TimeSystem {
    
    constructor() {
        this.CONSTANTS = {
            COST_OF_LIVING: 500,    // 每周固定开销
            MAX_ENERGY: 100
        };
        this.dailySnapshot = null;
    }
    /**
     * 【新增】新的一天开始时，给数据拍个快照
     * 在 main.js 初始化和每次睡觉后调用
     */
    startNewDay() {
        this.dailySnapshot = {
            money: gameState.player.money,
            fans: gameState.player.fans,
            art: gameState.player.attributes.art,
            story: gameState.player.attributes.story,
            charm: gameState.player.attributes.charm
        };
        console.log("🌞 新的一天开始了，状态已记录");
    }
    /**
     * 消耗精力
     * @param {number} amount 
     * @returns {boolean}
     */
    consumeEnergy(amount) {
        if (gameState.player.energy >= amount) {
            gameState.player.energy -= amount;
            return true;
        }
        return false;
    }
/**
     * 【重写】推进日期并生成报告
     * @returns {Object} 结算报告数据
     */
    advanceDay() {
        // 1. 防呆初始化
        if (!gameState.world) gameState.world = {};
        if (typeof gameState.world.date !== 'number') gameState.world.date = 1;

        const currentDay = gameState.world.date;
        const report = {
            day: currentDay,
            events: [],
            changes: {}
        };

        // 2. 计算当天变动 (现在数值 - 早上快照的数值)
        if (this.dailySnapshot) {
            report.changes = {
                money: gameState.player.money - this.dailySnapshot.money,
                fans: gameState.player.fans - this.dailySnapshot.fans,
                art: gameState.player.attributes.art - this.dailySnapshot.art,
                story: gameState.player.attributes.story - this.dailySnapshot.story,
                charm: gameState.player.attributes.charm - this.dailySnapshot.charm
            };
        }

        // 3. 推进日期
        gameState.world.date++;
        
        // 4. 恢复精力 (随机睡眠事件)
        let energyRecovered = 100;
        const rand = Math.random();
        
        if (rand > 0.9) {
            energyRecovered = 120; 
            report.events.push("💤 昨晚做了个美梦，精力爆棚！(精力上限突破)");
        } else if (rand < 0.15) {
            energyRecovered = 60;
            report.events.push("💤 邻居装修太吵，失眠了... (精力恢复减少)");
        } else {
            report.events.push("💤 睡得很香，精力已回满。");
        }
        
        gameState.player.energy = Math.min(this.CONSTANTS.MAX_ENERGY, energyRecovered);

        // 5. 周结逻辑 (每7天触发)
        // 注意：房租是在结算后扣除的，算作下一天的起始负债，或者算在当天
        // 这里我们把它算进报告的“额外支出”提示里
        if (currentDay % 7 === 0) {
            const rent = this.CONSTANTS.COST_OF_LIVING;
            gameState.player.money -= rent;
            report.events.push(`💸 **周结日**：扣除房租和生活费 ¥${rent}`);
            
            // 记录周结日志
            if (window.logEvent) {
                window.logEvent('system', `周结日：扣除房租和生活费 ¥${rent}`, currentDay, { rent: rent });
            }
            
            // 修正一下显示：因为刚刚扣了钱，所以上面的 money 变动应该把这笔钱排除，或者包含进去？
            // 这种写法是把房租算在“之后”发生。
            
            if (gameState.player.money < 0) {
                report.events.push("⚠️ **警告**：你的存款已为负数！即将面临破产！");
                
                // 记录破产警告日志
                if (window.logEvent) {
                    window.logEvent('event', '存款已为负数！即将面临破产！', currentDay, { money: gameState.player.money });
                }
            }
        }

        console.log(`[TimeSystem] 结算完毕，进入第 ${gameState.world.date} 天`);
        
        // 6. 保存报告数据到世界状态（用于调试和存档）
        // gameState.world.dailyReports = gameState.world.dailyReports || [];
        // gameState.world.dailyReports.push(report);
        
        // 7. 记录日常日志
        if (window.logEvent && this.dailySnapshot) {
            // 记录基本属性变化
            const changes = report.changes;
            const changeMessages = [];
            
            if (changes.money !== 0) {
                changeMessages.push(`金钱${changes.money > 0 ? '+' : ''}${changes.money}`);
            }
            if (changes.fans !== 0) {
                changeMessages.push(`粉丝${changes.fans > 0 ? '+' : ''}${changes.fans}`);
            }
            if (changes.art !== 0) {
                changeMessages.push(`艺术${changes.art > 0 ? '+' : ''}${changes.art}`);
            }
            if (changes.story !== 0) {
                changeMessages.push(`故事${changes.story > 0 ? '+' : ''}${changes.story}`);
            }
            if (changes.charm !== 0) {
                changeMessages.push(`魅力${changes.charm > 0 ? '+' : ''}${changes.charm}`);
            }
            
            if (changeMessages.length > 0) {
                window.logEvent('system', `日常变化：${changeMessages.join(', ')}`, currentDay, changes);
            }
        }
        
        // 8. 为明天重新拍快照
        this.startNewDay();

        return report;
    }
}