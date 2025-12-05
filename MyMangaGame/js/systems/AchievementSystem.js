// js/systems/AchievementSystem.js
import { gameState } from '../state.js';

export class AchievementSystem {
    constructor() {
        this.list = [
            {
                id: 'first_pot_of_gold',
                title: '第一桶金',
                desc: '拥有存款超过 5,000 元',
                check: () => gameState.player.money >= 5000,
                bonus: '二周目初始金钱 +2000'
            },
            {
                id: 'harem_king',
                title: '海王潜质',
                desc: '同时与 2 名男性保持暧昧关系',
                check: () => gameState.npcs.filter(n => n.affection > 50).length >= 2,
                bonus: '二周目初始魅力 +20'
            },
            {
                id: 'brother_breaker',
                title: '背德者',
                desc: '让沈清舟的理智值低于 20',
                check: () => {
                    const bro = gameState.npcs.find(n => n.relation === 'brother');
                    return bro && bro.stats.restraint < 20;
                },
                bonus: '二周目开启“禁忌”题材漫画'
            },
            {
                id: 'workaholic',
                title: '爆肝画师',
                desc: '累计完成 10 部漫画作品',
                check: () => gameState.player.finishedWorks >= 10,
                bonus: '二周目画工/剧情成长速度 +20%'
            }
        ];
    }

    check() {
        this.list.forEach(ach => {
            // 如果未解锁且满足条件
            if (!gameState.achievements.includes(ach.id) && ach.check()) {
                this.unlock(ach);
            }
        });
    }

    unlock(achievement) {
        gameState.achievements.push(achievement.id);
        // 弹出高亮提示
        window.game.ui.showToast(`🏆 解锁成就：${achievement.title}`, 'success');
        window.game.ui.showToast(`效果：${achievement.bonus}`);
        
        // 这里可以保存到 localStorage 以便多周目继承
        localStorage.setItem('myMangaGame_achievements', JSON.stringify(gameState.achievements));
    }
}