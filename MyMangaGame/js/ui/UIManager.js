// js/ui/UIManager.js
import { gameState } from '../state.js';

export class UIManager {
    constructor() {
        // ============================================================
        // 1. 初始化与 DOM 缓存
        // ============================================================
        
        this.els = {
            // --- 顶部状态栏 ---
            money: document.getElementById('stat-money'),
            fans: document.getElementById('stat-fans'),
            energy: document.getElementById('stat-energy'), // 精力数值文本 (100/100)
            date: document.getElementById('stat-date'),
            
            // --- 【关键修改】精力条 (使用 ID 精确获取，防止误操作其他进度条) ---
            energyFill: document.getElementById('energy-fill'), 

            // --- 【新增】属性面板数值 (画工、剧情、魅力) ---
            art: document.getElementById('attr-art'),
            story: document.getElementById('attr-story'),
            charm: document.getElementById('attr-charm'),
            
            // --- 侧边栏容器 (用于挂载漫画面板) ---
            sidebar: document.querySelector('.sidebar'),

            // --- 右侧栏 (NPC列表) ---
            npcContainer: document.getElementById('npc-list'),
            
            // --- 剧情对话框 (覆盖层) ---
            dialogOverlay: document.getElementById('dialogue-overlay'),
            
            // --- 提示容器 (动态生成) ---
            toastContainer: null
        };

        // 自动初始化飘字提示容器
        this.initToastContainer();
    }

    /**
     * 【核心方法】初始化 (main.js 会调用)
     */
    init() {
        console.log("UI Manager Initialized");
    }

    /**
     * 刷新所有界面
     * @param {Object} state - 传入最新的 gameState
     */
    updateAll(state) {
        if (!state) return;
        this.updateStats(state);
        this.updateNPCs(state);
        this.updateMangaPanel(state); // 更新漫画连载面板
    }

    // ============================================================
    // 2. 玩家属性刷新
    // ============================================================
    updateStats(state) {
        // 1. 更新基础资源文本
        if (this.els.money) this.els.money.textContent = state.player.money;
        if (this.els.fans) this.els.fans.textContent = state.player.fans;
        
        const dateStr = state.world ? `第 ${state.world.date} 天` : "第 1 天";
        if (this.els.date) this.els.date.textContent = dateStr;
        
        // 2. 【新增】更新三大属性数值 (保留0位小数)
        if (this.els.art) this.els.art.textContent = state.player.attributes.art.toFixed(0);
        if (this.els.story) this.els.story.textContent = state.player.attributes.story.toFixed(0);
        if (this.els.charm) this.els.charm.textContent = state.player.attributes.charm.toFixed(0);

        // 3. 【修复】更新精力 (文本 + 进度条)
        const currentEnergy = Math.max(0, state.player.energy);
        const maxEnergy = state.player.maxEnergy || 100;
        const day = (state.world && state.world.date) ? state.world.date : 1;
        
        if (this.els.date) {
            this.els.date.textContent = `第 ${day} 天`;
        } // <--- 【修复点】此处原代码缺少闭合括号

        // 更新文本 100/100
        if (this.els.energy) {
            this.els.energy.textContent = `${Math.floor(currentEnergy)}/${maxEnergy}`;
        }

        // 更新进度条宽度
        if (this.els.energyFill) {
            const pct = (currentEnergy / maxEnergy) * 100;
            this.els.energyFill.style.width = `${Math.max(0, pct)}%`;
            
            // 样式逻辑：低于 20% 变红 (危险状态)
            if (pct < 20) this.els.energyFill.style.backgroundColor = '#FF4757'; 
            else this.els.energyFill.style.backgroundColor = '#FF69B4'; 
        }
    }

  /**
     * 更新漫画连载面板
     * (包含：折叠/展开功能、相性评价显示、历史记录)
     */
    updateMangaPanel(state) {
        // 1. 检查面板是否存在，不存在则创建
        let panel = document.getElementById('manga-panel');
        if (!panel) {
            if (this.els.sidebar) {
                panel = document.createElement('div');
                panel.id = 'manga-panel';
                // 像素风样式
                panel.style.marginTop = '15px';
                panel.style.borderTop = '2px dashed #4A2C35';
                
                // 【核心】折叠状态标记 (默认为展开)
                panel.dataset.expanded = "true";
                
                this.els.sidebar.appendChild(panel);
            } else {
                return; // 找不到侧边栏，放弃渲染
            }
        }

        const career = state.mangaCareer;
        if (!career) return;

        // 判断当前是展开还是折叠
        const isExpanded = panel.dataset.expanded === "true";
        const toggleIcon = isExpanded ? "🔽" : "▶";

        // 2. 构建标题栏 (点击可切换)
        let html = `
            <div onclick="document.getElementById('manga-panel').dataset.expanded = '${!isExpanded}'; window.game.ui.updateMangaPanel(window.gameState);" 
                 style="cursor:pointer; padding:12px 0; display:flex; justify-content:space-between; align-items:center; user-select:none;">
                <h3 style="margin:0; font-size:16px;">📖 连载状态</h3>
                <span style="font-size:12px; color:#666;">${toggleIcon}</span>
            </div>
        `;

        // 如果是折叠状态，直接结束渲染，只显示标题
        if (!isExpanded) {
            panel.innerHTML = html;
            return;
        }

        // --- 下面是展开时的详细内容 ---

        // 榜单信息
        const tierNames = [
            "🏠 小区最受欢迎榜", 
            "🌏 全球畅销漫画榜", 
            "🪐 太阳系文化遗产榜", 
            "⏳ 时间线收束名作榜"
        ];
        const currentTierName = tierNames[career.rankingTier] || "未知领域";

        html += `
            <div style="background:#fff; padding:8px; border:2px solid #eee; margin-bottom:15px; border-radius:4px;">
                <div style="color:#FF1493; font-weight:bold; font-size:14px; margin-bottom:4px;">${currentTierName}</div>
                <div style="display:flex; justify-content:space-between; align-items:end;">
                    <span style="color:#666; font-size:12px;">当前位次:</span>
                    <span style="font-size:20px; font-weight:bold; color:#4A2C35;">No.${career.currentRank}</span>
                </div>
            </div>
        `;

        // 连载中状态显示
        if (career.currentWork) {
            const w = career.currentWork;
            
            // 根据评价设置颜色
            let synColor = '#666'; 
            if (w.synergyLabel && w.synergyLabel.includes('绝妙')) synColor = '#FF4500'; // 橙红
            if (w.synergyLabel && w.synergyLabel.includes('灾难')) synColor = '#2F4F4F'; // 深灰

            html += `
                <div style="background:#FFF0F5; padding:10px; border:2px solid #FF69B4; border-radius:4px; position:relative; animation: fadeIn 0.3s;">
                    <div style="position:absolute; top:-10px; right:-5px; background:#FF69B4; color:white; padding:2px 6px; font-size:10px; border-radius:4px;">连载中</div>
                    
                    <div style="font-weight:bold; margin-bottom:5px; color:#333; font-size:14px;">${w.title}</div>
                    
                    <div style="font-size:12px; color:#666; line-height: 1.6;">
                        <div>进度: 第 <span style="color:#FF1493; font-weight:bold;">${w.chapter}</span> 话</div>
                        <div>累计质量: ${w.totalScore.toFixed(0)}</div>
                        
                        <div style="margin-top:8px; padding-top:6px; border-top:1px dashed #ccc;">
                            <div style="display:flex; justify-content:space-between; font-size:11px; color:#555;">
                                <span>${w.genreName}</span>
                                <span>+</span>
                                <span>${w.styleName || '标准'}</span>
                            </div>
                            <div style="margin-top:4px; text-align:center; font-weight:bold; color:${synColor}; background:rgba(255,255,255,0.6); border-radius:4px; padding:2px;">
                                ${w.synergyLabel || '未知评价'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // 休刊状态显示
            html += `
                <div style="background:#f9f9f9; padding:15px; border:2px dashed #ccc; text-align:center; color:#999; font-size:12px; border-radius:4px;">
                    (休刊中)<br>点击“创作”开启新连载
                </div>
            `;
        }

        // 历史出版记录 (只显示最近 3 条)
        if (career.history && career.history.length > 0) {
            html += `<h3 style="margin:15px 0 8px 0; font-size:14px;">📜 出版履历</h3>`;
            html += `<div style="font-size:12px;">`;
            
            career.history.slice(0, 3).forEach(h => {
                let rankColor = '#666';
                if (h.finalRankLabel === '传世神作') rankColor = '#FFD700'; 
                else if (h.finalRankLabel === '人气佳作') rankColor = '#FF69B4'; 

                html += `
                    <div style="padding:6px 0; border-bottom:1px dotted #ddd; display:flex; justify-content:space-between;">
                        <span style="color:#333;">${h.title}</span> 
                        <span style="color:${rankColor}; font-weight:bold;">${h.finalRankLabel}</span>
                    </div>
                `;
            });
            html += `</div>`;
        }

        panel.innerHTML = html;
    }

// ============================================================
    // 4. NPC 列表渲染 (修复头像显示)
    // ============================================================
    updateNPCs(state) {
        const container = this.els.npcContainer;
        if (!container) return;

        container.innerHTML = '';

        if (!state.npcs || state.npcs.length === 0) {
            container.innerHTML = `<div style="color:#999; font-size:14px; text-align:center; padding:10px;">暂无认识的人...<br>去外出碰碰运气吧！</div>`;
            return;
        }

        state.npcs.forEach(npc => {
            const card = document.createElement('div');
            card.className = 'npc-card'; 

            const heartsCount = Math.floor((npc.favorability || npc.affection || 0) / 20);
            const hearts = '❤️'.repeat(heartsCount) + '🤍'.repeat(5 - heartsCount);

            let statusTag = '';
            if (npc.status === 'dating') statusTag = `<span style="color:#FF1493; font-weight:bold; font-size:12px; margin-left:5px;">[💕恋人]</span>`;
            else if (npc.status === 'imprisoned') statusTag = `<span style="color:red; font-weight:bold; font-size:12px; margin-left:5px;">[⛓️监禁]</span>`;

            // 【核心修复】生成头像 URL (兼容旧存档)
            const avatarUrl = npc.avatar || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${npc.name}`;

            // 【修改】重新加入了头像布局
            card.innerHTML = `
                <div class="npc-header" style="display:flex; align-items:center; gap:10px;">
                    <div style="width:50px; height:50px; border:2px solid #4A2C35; border-radius:4px; overflow:hidden; flex-shrink:0; background:#eee;">
                        <img src="${avatarUrl}" style="width:100%; height:100%; object-fit:cover; image-rendering:pixelated;" alt="头像">
                    </div>
                    
                    <div style="flex:1;">
                        <div style="font-weight:bold; font-size:16px;">${npc.name}</div>
                        ${statusTag}
                    </div>
                </div>
                
                <div style="font-size:12px; color:#555; margin:10px 0; font-style:italic; line-height:1.4; min-height:34px;">
                    "${npc.description || '一个神秘的男人...'}"
                </div>

                <div style="margin: 8px 0; font-size:12px; color:#666;">
                    好感: ${hearts} <span style="color:#ccc; font-size:10px;">(${npc.favorability || 0})</span>
                </div>
                
                <button class="btn" style="width:100%; padding: 6px;" 
                    onclick="window.game.handleNPCInteraction('${npc.id}')">
                    💬 互动
                </button>
            `;
            container.appendChild(card);
        });
    }

    // ============================================================
    // 5. 对话框系统 (Visual Novel Style)
    // ============================================================
   /**
     * 显示通用对话框
     * (包含防卡死机制)
     */
    showDialog(options) {
        const overlay = this.els.dialogOverlay;
        if (!overlay) {
            console.error("❌ 找不到 id='dialogue-overlay'，无法显示剧情！");
            return;
        }

        // 1. 清空旧内容
        overlay.innerHTML = '';

        // 2. 动态创建对话框 DOM
        const box = document.createElement('div');
        box.className = 'dialogue-box'; 
        
        // 标题
        if (options.title) {
            const h2 = document.createElement('h2');
            h2.textContent = options.title;
            box.appendChild(h2);
        }

        // 文本内容
        const p = document.createElement('div');
        p.className = 'dialogue-text';
        p.innerText = options.text || "...";
        box.appendChild(p);

        // 选项容器
        const choiceContainer = document.createElement('div');
        choiceContainer.className = 'choice-container';
        choiceContainer.style.display = 'flex';
        choiceContainer.style.flexDirection = 'column';
        choiceContainer.style.gap = '10px';
        choiceContainer.style.marginTop = '20px';

        // 生成按钮
        const choices = options.choices || [];
        if (choices.length > 0) {
            choices.forEach(choice => {
                const btn = document.createElement('button');
                btn.className = 'btn';
                btn.textContent = choice.text || "继续";
                
                // =================================================
                // 【核心修改】增加 try-catch 防卡死机制
                // =================================================
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    
                    // 1. 防止重复点击 (网络卡顿或连点时很有用)
                    btn.disabled = true; 

                    try {
                        // 2. 尝试执行逻辑 (支持异步)
                        if (choice.action) {
                            await choice.action(); 
                        }
                    } catch (error) {
                        // 3. 如果报错，打印错误但不要卡死界面
                        console.error("❌ 选项执行出错:", error);
                        // 尝试调用 showToast 提示用户（如果该方法存在）
                        if (this.showToast) this.showToast("发生错误，请查看控制台", "error");
                    } finally {
                        // 4. 【关键】无论成功还是失败，最后一定要关闭弹窗
                        // (除非 explicit 设置了 shouldClose: false)
                        if (choice.shouldClose !== false) {
                            this.closeDialog();
                        } else {
                            // 如果逻辑要求不关闭弹窗，则恢复按钮可用状态
                            btn.disabled = false;
                        }
                    }
                };
                
                choiceContainer.appendChild(btn);
            });
        } else {
            // 默认关闭按钮
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.textContent = "关闭";
            btn.onclick = () => this.closeDialog();
            choiceContainer.appendChild(btn);
        }

        box.appendChild(choiceContainer);
        overlay.appendChild(box);

        // 3. 显示
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
    }

    /**
     * 【新增】显示每日结算报告
     */
    showDailyReport(report, onConfirm) {
        const overlay = this.els.dialogOverlay;
        overlay.innerHTML = '';

        const box = document.createElement('div');
        box.className = 'dialogue-box';
        // 稍微加宽一点，像账单
        box.style.maxWidth = '500px'; 

        // 1. 标题
        const h2 = document.createElement('h2');
        h2.textContent = `📅 第 ${report.day} 天 · 结算报告`;
        h2.style.borderBottom = '2px solid #4A2C35';
        h2.style.textAlign = 'center';
        box.appendChild(h2);

        // 2. 核心数据变动 (用网格布局显示)
        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = '1fr 1fr';
        grid.style.gap = '10px';
        grid.style.margin = '20px 0';
        grid.style.background = '#f9f9f9';
        grid.style.padding = '15px';
        grid.style.borderRadius = '8px';

        // 辅助函数：生成一行数据
        const createRow = (label, value, icon) => {
            const div = document.createElement('div');
            // 正数绿色，负数红色，0灰色
            let color = '#666';
            let sign = '';
            if (value > 0) { color = '#2E8B57'; sign = '+'; }
            if (value < 0) { color = '#DC143C'; sign = ''; } // 负数自带符号
            
            // 如果是小数，保留1位
            const valStr = Number.isInteger(value) ? value : value.toFixed(1);

            div.innerHTML = `<span>${icon} ${label}</span> <span style="float:right; font-weight:bold; color:${color}">${sign}${valStr}</span>`;
            return div;
        };

        const c = report.changes;
        if (c) {
            grid.appendChild(createRow('资金', c.money, '💰'));
            grid.appendChild(createRow('粉丝', c.fans, '❤️'));
            grid.appendChild(createRow('画工', c.art, '🎨'));
            grid.appendChild(createRow('剧情', c.story, '📚'));
            grid.appendChild(createRow('魅力', c.charm, '✨'));
        }
        box.appendChild(grid);

        // 3. 事件日志 (睡眠、房租等)
        if (report.events && report.events.length > 0) {
            const eventBox = document.createElement('div');
            eventBox.style.fontSize = '13px';
            eventBox.style.color = '#555';
            eventBox.style.lineHeight = '1.6';
            eventBox.innerHTML = report.events.map(e => `<div>${e}</div>`).join('');
            box.appendChild(eventBox);
        }

        // 4. 确认按钮
        const btnContainer = document.createElement('div');
        btnContainer.style.textAlign = 'center';
        btnContainer.style.marginTop = '20px';
        
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = '迎接新的一天 ☀️';
        btn.style.width = '100%';
        btn.onclick = () => {
            this.closeDialog();
            if (onConfirm) onConfirm();
        };
        
        btnContainer.appendChild(btn);
        box.appendChild(btnContainer);

        overlay.appendChild(box);
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
    };

    closeDialog() {
        if (this.els.dialogOverlay) {
            this.els.dialogOverlay.style.display = 'none';
        }
    };

    // ============================================================
    // 6. 飘字提示系统 (Toast)
    // ============================================================
    initToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.gap = '10px';
            document.body.appendChild(container);
        }
        this.els.toastContainer = container;
    };

    showToast(message, type = 'normal') {
        if (!this.els.toastContainer) this.initToastContainer();

        const toast = document.createElement('div');
        toast.className = 'toast-message'; 
        
        // 内联样式兜底
        toast.style.background = '#fff';
        toast.style.border = '2px solid #4A2C35';
        toast.style.padding = '10px 20px';
        toast.style.boxShadow = '4px 4px 0px rgba(0,0,0,0.1)';
        toast.style.animation = 'fadeIn 0.3s';
        toast.style.minWidth = '200px';

        let icon = '💡';
        if (type === 'success' || message.includes('+')) icon = '✅';
        if (type === 'error' || message.includes('不足')) icon = '❌';

        toast.innerHTML = `${icon} ${message}`;
        this.els.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };
}