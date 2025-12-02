// js/ui/renderer.js

/**
 * 渲染器模块：负责生成复杂的 HTML 结构和处理视觉特效
 * 将纯视觉逻辑从 UIManager 中剥离出来，保持代码整洁
 */
export const Renderer = {

    // ============================================================
    // 1. 漫画工作台渲染 (Manga Workspace)
    // 渲染当前正在创作的漫画状态：进度条、题材、质量评级
    // ============================================================
    renderWorkspace(container, currentManga) {
        if (!container) return;

        // 情况 A: 当前没有连载作品
        if (!currentManga) {
            container.innerHTML = `
                <div style="opacity: 0.6; padding: 20px;">
                    <div style="font-size: 40px; margin-bottom: 10px;">📄</div>
                    <p>桌面空空如也...</p>
                    <p style="font-size: 12px;">点击下方“开始新连载”来构思作品</p>
                </div>
            `;
            return;
        }

        // 情况 B: 显示当前作品进度
        // 计算星级 (每20点质量一颗星)
        const stars = '★'.repeat(Math.floor(currentManga.quality / 20)) + '☆'.repeat(5 - Math.floor(currentManga.quality / 20));
        
        container.innerHTML = `
            <div class="manga-status-card">
                <div class="manga-header">
                    <span class="manga-title">《${currentManga.title}》</span>
                    <span class="manga-genre-badge">${this._translateGenre(currentManga.genre)}</span>
                </div>
                
                <div class="manga-details">
                    <div class="detail-row">
                        <span>质量: <span style="color:#FFD700">${stars}</span></span>
                        <span>人气: ${currentManga.popularity || 0}</span>
                    </div>
                    
                    <div class="detail-row" style="margin-top:10px;">
                        <span>完成度: ${currentManga.progress}%</span>
                    </div>
                    
                    <div class="workspace-progress-bar">
                        <div class="workspace-progress-fill" style="width: ${currentManga.progress}%"></div>
                    </div>
                </div>
            </div>
        `;
    },

    // 内部辅助：翻译题材
    _translateGenre(genreKey) {
        const map = {
            'romance': '🌸 纯爱',
            'horror': '👻 恐怖',
            'action': '⚔️ 热血',
            'comedy': '🤣 搞笑'
        };
        return map[genreKey] || genreKey;
    },

    // ============================================================
    // 2. 视觉特效：点击飘字 (Floating Floating Text)
    // 这种“果汁感”(Juiciness) 是像素经营游戏的灵魂
    // ============================================================
    
    /**
     * 在指定位置生成一个上浮消失的文字
     * @param {number} x - 屏幕 X 坐标 (event.clientX)
     * @param {number} y - 屏幕 Y 坐标 (event.clientY)
     * @param {string} text - 显示文本 (如 "+100")
     * @param {string} type - 类型: 'money', 'fans', 'energy', 'heart'
     */
    createFloatingEffect(x, y, text, type = 'normal') {
        const el = document.createElement('div');
        
        // 基础样式
        el.style.position = 'fixed';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.pointerEvents = 'none'; // 让鼠标可以穿透
        el.style.zIndex = '9999';
        el.style.fontFamily = 'var(--font-pixel)';
        el.style.fontWeight = 'bold';
        el.style.fontSize = '20px';
        el.style.userSelect = 'none';
        
        // 颜色配置
        let color = '#333';
        if (type === 'money') color = '#FFD700';   // 金色
        if (type === 'fans') color = '#FF69B4';    // 粉色
        if (type === 'energy') color = '#FF3B30';  // 红色
        if (type === 'exp') color = '#34C759';     // 绿色
        
        el.style.color = color;
        // 给文字加个描边，在任何背景都清晰
        el.style.textShadow = '2px 2px 0px #000'; 
        
        el.textContent = text;
        
        document.body.appendChild(el);

        // 动画：使用 Web Animations API (比 CSS class 更灵活)
        const animation = el.animate([
            { transform: 'translate(-50%, 0) scale(0.5)', opacity: 0 },
            { transform: 'translate(-50%, -20px) scale(1.2)', opacity: 1, offset: 0.2 }, // 弹起
            { transform: 'translate(-50%, -60px) scale(1)', opacity: 0 } // 飘走消失
        ], {
            duration: 800,
            easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        });

        // 动画结束后清理 DOM
        animation.onfinish = () => el.remove();
    }
};