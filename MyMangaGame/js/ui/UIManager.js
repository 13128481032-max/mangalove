// js/ui/UIManager.js
import { gameState } from '../state.js';

export class UIManager {
    constructor() {
        // 初始化els对象，但暂时不获取DOM元素
        this.els = {
            // 顶部状态栏
            money: null,
            fans: null,
            energy: null,
            date: null,
            energyFill: null,
            energyBarContainer: null,
            energyContainer: null,

            // 属性面板数值
            art: null,
            story: null,
            charm: null,
            
            // 侧边栏容器
            sidebar: null,

            // 右侧栏 (NPC列表)
            npcContainer: null,
            
            // 剧情对话框 (覆盖层)
            dialogOverlay: null,
            
            // 提示容器 (动态生成)
            toastContainer: null
        };
        
        // 初始化事件处理函数
    }

    /**
     * 【核心方法】初始化 (main.js 会调用)
     */
    init() {
        console.log("UI Manager Initialized");
        
        // 在DOM完全加载后获取所有UI元素引用
        this.collectUIElements();
        
        // 自动初始化飘字提示容器
        this.initToastContainer();
        
        // 初始化日志功能
        this.initLogs();
    }
    
    /**
     * 收集所有UI元素的引用
     */
    collectUIElements() {
        this.els = {
            // --- 顶部状态栏 ---
            money: document.getElementById('stat-money'),
            fans: document.getElementById('stat-fans'),
            energy: document.getElementById('stat-energy'), // 精力数值文本 (100/100)
            date: document.getElementById('stat-date'),
            
            // --- 精力条 ---
            energyFill: document.getElementById('energy-fill'),
            energyBarContainer: document.getElementById('energy-bar-container'),
            energyContainer: document.querySelector('.energy-container'),

            // --- 属性面板数值 (画工、剧情、魅力) ---
            art: document.getElementById('attr-art'),
            story: document.getElementById('attr-story'),
            charm: document.getElementById('attr-charm'),
            
            // --- 侧边栏容器 (用于挂载漫画面板) ---
            sidebar: document.querySelector('.sidebar'),

            // --- 右侧栏 (NPC列表) ---
            npcContainer: document.getElementById('npc-list'),
            
            // --- 剧情对话框 (覆盖层) ---
            dialogOverlay: document.getElementById('dialogue-overlay'),
            
            // --- 日志功能 ---
            logsContainer: document.getElementById('logs-container'),
            btnClearLogs: document.getElementById('btn-clear-logs'),
            
            // --- 提示容器 (动态生成) ---
            toastContainer: null // 将在initToastContainer中初始化
        };
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
        this.updateLogs(state); // 更新游戏日志
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
     * (直接显示所有内容：相性评价显示、历史记录)
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
                
                this.els.sidebar.appendChild(panel);
            } else {
                return; // 找不到侧边栏，放弃渲染
            }
        }

        const career = state.mangaCareer;
        if (!career) return;

        // 2. 构建标题栏
        let html = `
            <h3 style="margin:0; font-size:16px; padding:12px 0;">📖 连载状态</h3>
        `;

        // --- 直接显示所有详细内容 ---

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
    // 3.5 游戏日志更新
    // ============================================================
    updateLogs(state) {
        const container = this.els.logsContainer;
        if (!container) return;

        const logs = state.logs || [];
        
        if (logs.length === 0) {
            container.innerHTML = `<div style="color: #999; text-align: center;">暂无日志记录</div>`;
            return;
        }

        // 按时间倒序排列日志
        const sortedLogs = [...logs].sort((a, b) => b.id - a.id);

        // 渲染日志条目
        container.innerHTML = sortedLogs.map(log => {
            // 根据日志类型设置不同的颜色
            let typeColor = '#666';
            switch (log.type) {
                case 'manga':
                    typeColor = '#FF69B4'; // 粉色 - 漫画相关
                    break;
                case 'npc':
                    typeColor = '#4A90E2'; // 蓝色 - NPC相关
                    break;
                case 'event':
                    typeColor = '#F5A623'; // 橙色 - 事件相关
                    break;
                case 'system':
                    typeColor = '#7ED321'; // 绿色 - 系统相关
                    break;
            }

            return `
                <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed #eee;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="color: ${typeColor}; font-weight: bold; font-size: 10px;">[${log.type}]</span>
                        <span style="color: #999; font-size: 10px;">第${log.day}天</span>
                    </div>
                    <div style="margin-left: 5px;">${log.message}</div>
                </div>
            `;
        }).join('');
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

        // 只显示未分手且未被监禁的NPC
        const activeNpcs = state.npcs.filter(npc => 
            npc.status !== 'broken' && npc.status !== 'imprisoned'
        );
        
        // 如果没有活跃的NPC，显示提示信息
        if (activeNpcs.length === 0) {
            container.innerHTML = `<div style="color:#999; font-size:14px; text-align:center; padding:10px;">暂无活跃的关系...<br>去外出结识新朋友吧！</div>`;
            return;
        }
        
        activeNpcs.forEach(npc => {
            const card = document.createElement('div');
            card.className = 'npc-card'; 

            const favorability = Math.max(0, npc.favorability || npc.affection || 0);
            const heartsCount = Math.min(5, Math.floor(favorability / 20));
            const hearts = '❤️'.repeat(heartsCount) + '🤍'.repeat(5 - heartsCount);

            let statusTag = '';
            if (npc.status === 'dating') statusTag = `<span style="color:#FF1493; font-weight:bold; font-size:12px; margin-left:5px;">[💕恋人]</span>`;
            else if (npc.status === 'imprisoned') statusTag = `<span style="color:red; font-weight:bold; font-size:12px; margin-left:5px;">[⛓️监禁]</span>`;

            // 【核心修复】生成头像 URL (兼容旧存档)
            const avatarUrl = npc.avatar || `https://api.dicebear.com/9.x/pixel-art/svg?seed=${npc.name}`;

            // 判断是否被锁定
            const isLocked = (state.flags && state.flags.route === 'confined' && npc.relation !== 'brother');
            
            // 如果被锁定，按钮样式变灰，且文字变化
            let btnStyle = 'width:100%; padding: 6px;';
            let btnText = '💬 互动';
            let btnClass = 'btn npc-interact-btn';

            if (isLocked) {
                btnStyle += '; background:#EEE; color:#AAA; border-color:#DDD; cursor:not-allowed;';
                btnText = '🚫 无法接触';
                // 注意：这里我们依然保留onclick事件，为了触发"哥哥看着你"的飘字提示
            }

            // 【修改】重新加入了头像布局
            card.innerHTML = `
                <div class="npc-header" style="display:flex; align-items:center; gap:10px;">
                    <div style="width:50px; height:50px; border:2px solid #4A2C35; border-radius:4px; overflow:hidden; flex-shrink:0; background:#eee;">
                        <img src="${avatarUrl}" style="width:100%; height:100%; object-fit:cover; image-rendering:pixelated;" alt="头像">
                    </div>
                    
                    <div style="flex:1;">
                        <div style="font-weight:bold; font-size:16px; ${isLocked ? 'color:#AAA' : ''};">${npc.name}</div>
                        ${statusTag}
                    </div>
                </div>
                
                <div style="font-size:12px; color:#555; margin:10px 0; font-style:italic; line-height:1.4; min-height:34px;">
                    "${npc.description || '一个神秘的男人...'}"
                </div>

                <div style="margin: 8px 0; font-size:12px; color:#666;">
                    ${npc.relation === 'brother' ? 
                        `好感: ${hearts} <span style="color:#ccc; font-size:10px;">(${npc.stats?.affection || 0})</span>` : 
                        `好感: ${hearts} <span style="color:#ccc; font-size:10px;">(${npc.favorability || 0})</span>`
                    }
                </div>
                
                <button class="${btnClass}" style="${btnStyle}" 
                    data-npc-id="${npc.id}">
                    ${btnText}
                </button>
            `;
            
            // 骨科专属样式
            if (npc.relation === 'brother') {
                // 骨科专属样式 - 暗金色边框
                card.style.border = '2px solid #B8860B';
                card.style.borderRadius = '8px';
                
                const restraint = npc.stats?.restraint || 0;
                const restraintPct = Math.min(100, Math.max(0, restraint)); // 确保在0-100之间
                
                // 动态文案：根据理智值变化
                let stateText = "克制中";
                let barColor = "#4A90E2"; // 蓝色代表理智
                
                if (restraintPct < 60) { stateText = "动摇"; barColor = "#F5A623"; } // 橙色
                if (restraintPct < 20) { stateText = "⚠️ 危险边缘"; barColor = "#D0021B"; } // 红色

                card.innerHTML += `
                    <div style="margin-top:8px; font-size:12px; color:#666;">
                        <div style="display:flex; justify-content:space-between;">
                            <span>理智防线: ${stateText}</span>
                            <span>${restraintPct}%</span>
                        </div>
                        <div style="width:100%; height:6px; background:#EEE; border-radius:3px; margin-top:4px;">
                            <div style="width:${restraintPct}%; height:100%; background:${barColor}; transition:width 0.5s;"></div>
                        </div>
                    </div>
                `;
                
                // 给卡片加一个特殊的边框颜色，暗示血缘羁绊
                card.style.borderColor = "#D4AF37"; // 暗金色
            }
            
            container.appendChild(card);
        });
        
        // 移除旧的事件监听器，避免重复绑定
        const oldButtons = document.querySelectorAll('.npc-interact-btn[data-listening="true"]');
        oldButtons.forEach(btn => {
            btn.removeAttribute('data-listening');
        });
        
        // 添加新的事件监听器
        setTimeout(() => {
            const interactButtons = document.querySelectorAll('.npc-interact-btn:not([data-listening="true"])');
            interactButtons.forEach(btn => {
                btn.setAttribute('data-listening', 'true');
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const npcId = btn.getAttribute('data-npc-id');
                    console.log('互动按钮点击，NPC ID:', npcId);
                    
                    if (!window.game) {
                        console.error('❌ window.game 未初始化');
                        return;
                    }
                    
                    if (typeof window.game.handleNPCInteraction !== 'function') {
                        console.error('❌ handleNPCInteraction 方法不存在');
                        return;
                    }
                    
                    if (!npcId) {
                        console.error('❌ NPC ID 不存在');
                        return;
                    }
                    
                    try {
                        window.game.handleNPCInteraction(npcId);
                    } catch (error) {
                        console.error('❌ 调用 handleNPCInteraction 出错:', error);
                    }
                });
            });
        }, 0);
    }

    // ============================================================
    // 5. 对话框系统 (Visual Novel Style)
    // ============================================================
   /**
     * 显示通用对话框
     * (包含防卡死机制)
     */
    showDialog(options) {
        console.log('🚀 开始创建对话框，options:', options);
        
        const overlay = this.els.dialogOverlay;
        if (!overlay) {
            console.error("❌ 找不到 id='dialogue-overlay'，无法显示剧情！");
            return;
        }
        
        // 立即设置overlay样式，确保早期就能看到
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        
        // 1. 清空旧内容
        overlay.innerHTML = '';

        // 2. 动态创建对话框 DOM
        const box = document.createElement('div');
        box.className = 'dialogue-box'; 
        box.style.padding = '20px';
        box.style.borderRadius = '8px';
        box.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        box.style.maxWidth = '500px';
        box.style.width = '90%';
        box.style.maxHeight = '80vh';
        box.style.overflow = 'auto';
        box.style.position = 'relative';
        box.style.zIndex = '10000';
        
        // 暗黑模式支持
        if (options.darkMode) {
            box.style.backgroundColor = '#222222';
            box.style.border = '3px solid #ff6b6b';
            box.style.color = '#ffffff';
        } else {
            box.style.backgroundColor = '#ffffff';
            box.style.border = '3px solid #4A2C35';
            box.style.color = '#333333';
        }
        
        console.log('✅ 对话框box元素创建完成，准备添加内容');
        
        // 标题
        if (options.title) {
            const h2 = document.createElement('h2');
            h2.textContent = options.title;
            h2.style.marginTop = '0';
            h2.style.color = options.darkMode ? '#ff6b6b' : '#333';
            box.appendChild(h2);
        }

        // 文本内容
        const p = document.createElement('div');
        p.className = 'dialogue-text';
        p.innerText = options.text || "...";
        p.style.margin = '15px 0';
        p.style.lineHeight = '1.6';
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
// 生成按钮 - 同时支持label和text属性
                btn.textContent = choice.label || choice.text || "继续";
                btn.style.padding = '10px 15px';
                btn.style.border = 'none';
                btn.style.borderRadius = '4px';
                btn.style.backgroundColor = '#4A2C35';
                btn.style.color = 'white';
                btn.style.cursor = 'pointer';
                btn.style.fontSize = '14px';
                
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
                    }
                    
                    // 【修复】移除finally块中的无条件关闭逻辑
                    // 这样可以让choice.action()中自己控制何时关闭对话框
                    // 只有当显式设置了shouldClose为true时才自动关闭
                    if (choice.shouldClose === true) {
                        console.log("自动关闭对话框，因为shouldClose=true");
                        this.closeDialog();
                    } else if (choice.shouldClose !== false) {
                        // 默认情况下（shouldClose未设置），不要自动关闭，让action自己处理
                        console.log("不自动关闭对话框，等待action处理");
                        // 恢复按钮可用状态，以便用户可以再次点击
                        btn.disabled = false;
                    } else {
                        // 如果显式设置了shouldClose=false
                        console.log("不自动关闭对话框，因为shouldClose=false");
                        btn.disabled = false;
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

        // 3. 完成显示 - 样式已在方法开始设置
        console.log('🎉 对话框创建并显示完成');
    }
    
    /**
     * 显示输入对话框（替代不被支持的prompt()函数）
     */
    showInputDialog(options) {
        const overlay = this.els.dialogOverlay;
        if (!overlay) {
            console.error("❌ 找不到 id='dialogue-overlay'，无法显示输入对话框！");
            return;
        }
        
        // 设置overlay样式
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        
        // 清空旧内容
        overlay.innerHTML = '';
        
        // 创建对话框容器
        const box = document.createElement('div');
        box.className = 'dialogue-box'; 
        box.style.padding = '20px';
        box.style.borderRadius = '8px';
        box.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        box.style.maxWidth = '500px';
        box.style.width = '90%';
        box.style.position = 'relative';
        box.style.zIndex = '10000';
        
        // 暗黑模式支持
        if (options.darkMode) {
            box.style.backgroundColor = '#222222';
            box.style.border = '3px solid #ff6b6b';
            box.style.color = '#ffffff';
        } else {
            box.style.backgroundColor = '#ffffff';
            box.style.border = '3px solid #4A2C35';
            box.style.color = '#333333';
        }
        
        // 标题
        if (options.title) {
            const h2 = document.createElement('h2');
            h2.textContent = options.title;
            h2.style.marginTop = '0';
            h2.style.color = options.darkMode ? '#ff6b6b' : '#333';
            box.appendChild(h2);
        }
        
        // 文本内容
        const p = document.createElement('div');
        p.className = 'dialogue-text';
        p.innerText = options.text || "请输入:";
        p.style.margin = '15px 0';
        p.style.lineHeight = '1.6';
        box.appendChild(p);
        
        // 输入框
        const inputContainer = document.createElement('div');
        inputContainer.style.margin = '15px 0';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = options.placeholder || '';
        input.value = options.defaultValue || '';
        input.style.width = '100%';
        input.style.padding = '10px';
        input.style.border = '2px solid ' + (options.darkMode ? '#555' : '#ddd');
        input.style.borderRadius = '4px';
        input.style.fontSize = '16px';
        input.style.boxSizing = 'border-box';
        input.style.backgroundColor = options.darkMode ? '#333' : '#fff';
        input.style.color = options.darkMode ? '#fff' : '#333';
        
        // 自动聚焦输入框
        setTimeout(() => input.focus(), 100);
        
        inputContainer.appendChild(input);
        box.appendChild(inputContainer);
        
        // 按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginTop = '20px';
        
        // 取消按钮
        if (options.allowCancel !== false) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn';
            cancelBtn.textContent = "取消";
            cancelBtn.style.padding = '10px 15px';
            cancelBtn.style.border = 'none';
            cancelBtn.style.borderRadius = '4px';
            cancelBtn.style.backgroundColor = '#666';
            cancelBtn.style.color = 'white';
            cancelBtn.style.cursor = 'pointer';
            cancelBtn.style.fontSize = '14px';
            
            cancelBtn.onclick = () => {
                this.closeDialog();
                if (options.onCancel) options.onCancel();
            };
            
            buttonContainer.appendChild(cancelBtn);
        }
        
        // 确认按钮
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'btn';
        confirmBtn.textContent = "确认";
        confirmBtn.style.padding = '10px 15px';
        confirmBtn.style.border = 'none';
        confirmBtn.style.borderRadius = '4px';
        confirmBtn.style.backgroundColor = '#4A2C35';
        confirmBtn.style.color = 'white';
        confirmBtn.style.cursor = 'pointer';
        confirmBtn.style.fontSize = '14px';
        
        confirmBtn.onclick = () => {
            const value = input.value;
            this.closeDialog();
            if (options.onConfirm) options.onConfirm(value);
        };
        
        buttonContainer.appendChild(confirmBtn);
        box.appendChild(buttonContainer);
        overlay.appendChild(box);
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
        console.log('❌ 关闭对话框');
        const overlay = this.els.dialogOverlay;
        if (overlay) {
            console.log('  - 隐藏overlay');
            // 先清空内容，再设置display，确保彻底重置
            overlay.innerHTML = '';
            overlay.style.display = 'none';
            console.log('  - 对话框已关闭并清空内容');
        } else {
            console.error('❌ 找不到dialogOverlay元素，无法关闭对话框');
        }
    }

    // ============================================================
    // 6. 飘字提示系统 (Toast)
    // ============================================================
    // ============================================================
    // 初始化日志功能
    // ============================================================
    initLogs() {
        // 绑定清空日志按钮事件
        if (this.els.btnClearLogs) {
            this.els.btnClearLogs.addEventListener('click', () => {
                // 清空游戏状态中的日志
                if (window.gameState) {
                    window.gameState.logs = [];
                    // 更新UI
                    this.updateLogs(window.gameState);
                    this.showToast('日志已清空', 'success');
                }
            });
        }
    }

    initToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.left = '20px';
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

    renderEnding(title, text, type) {
        const endingOverlay = document.createElement('div');
        endingOverlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: ${type === 'bad' ? '#000' : '#FFF0F5'};
            color: ${type === 'bad' ? '#FFF' : '#333'};
            z-index: 10000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 40px;
            animation: fadeIn 2s;
        `;

        endingOverlay.innerHTML = `
            <h1 style="font-size: 40px; margin-bottom: 20px; font-family: var(--font-pixel)">${title}</h1>
            <p style="font-size: 18px; line-height: 1.8; max-width: 600px; margin-bottom: 40px;">${text.replace(/\n/g, '<br>')}</p>
            
            <div style="border: 2px solid currentColor; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
                <h3>最终成绩</h3>
                <p>粉丝: ${gameState.player.fans}</p>
                <p>存款: ¥${gameState.player.money}</p>
                <p>达成成就: ${gameState.achievements.length} 个</p>
            </div>

            <button id="btn-restart" class="btn" style="padding: 15px 40px; font-size: 20px;">
                ↻ 开启二周目 (继承天赋)
            </button>
        `;

        document.body.appendChild(endingOverlay);

        document.getElementById('btn-restart').onclick = () => {
            // 这里执行重置逻辑，保留 achievements 数据
            location.reload();
        };
    };
}