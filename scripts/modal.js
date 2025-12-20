class ModalSystem {
    constructor() {
        this.currentModal = null; this.gamePauseCallback = null; this.gameResumeCallback = null; this.isGamePaused = false; this.modalContainer = null; this.initModalContainer();
    }

    initModalContainer() {
        this.modalContainer = document.createElement('div');
        this.modalContainer.id = 'modal-container';
        this.modalContainer.style.display = 'none';
        document.body.appendChild(this.modalContainer);
        this.modalContainer.addEventListener('click', (e) => { if (e.target === this.modalContainer) this.close(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.currentModal) this.close(); });
    }

    init(gamePauseCallback, gameResumeCallback) { this.gamePauseCallback = gamePauseCallback; this.gameResumeCallback = gameResumeCallback; }

    show(options = {}) {
        if (this.currentModal) this.close();
        const modal = this.createModal(options);
        this.currentModal = modal;
        this.modalContainer.style.display = 'flex';
        this.modalContainer.appendChild(modal);
        if (options.dontPauseGame !== true && this.gamePauseCallback) { this.gamePauseCallback(); this.isGamePaused = true; }
        return modal;
    }

    createModal(options) {
        const modal = document.createElement('div'); modal.className = 'modal'; modal.style.display = 'flex';
        const modalContent = document.createElement('div'); modalContent.className = 'modal-content';

        if (options.type) modalContent.classList.add(`modal-${options.type}`);

        if (options.title) {
            const header = document.createElement('div'); header.className = 'modal-header';
            const title = document.createElement('h2'); title.className = 'modal-title'; title.textContent = options.title; header.appendChild(title); modalContent.appendChild(header);
        }

        if (options.content) {
            const body = document.createElement('div'); body.className = 'modal-body';
            const contentDiv = document.createElement('div'); contentDiv.className = 'modal-content-inner';
            if (typeof options.content === 'string') contentDiv.innerHTML = options.content; else contentDiv.appendChild(options.content);
            body.appendChild(contentDiv); modalContent.appendChild(body);
        }

        if (options.buttons && options.buttons.length) {
            const footer = document.createElement('div'); footer.className = 'modal-footer';
            const buttonsDiv = document.createElement('div'); buttonsDiv.className = 'modal-buttons';
            options.buttons.forEach(cfg => {
                const btn = document.createElement('button'); btn.textContent = cfg.text; btn.className = cfg.className || 'btn-primary';
                btn.addEventListener('click', () => { if (cfg.action === 'close') this.close(); else if (typeof cfg.action === 'function') cfg.action(); });
                buttonsDiv.appendChild(btn);
            });
            footer.appendChild(buttonsDiv); modalContent.appendChild(footer);
        }

        modal.appendChild(modalContent); return modal;
    }

    close() {
        if (!this.currentModal) return;
        this.modalContainer.style.display = 'none'; this.modalContainer.innerHTML = '';
        if (this.isGamePaused && this.gameResumeCallback) { this.gameResumeCallback(); this.isGamePaused = false; }
        this.currentModal = null;
    }

    showGameResults(isVictory, isNewRecord, stats, actions, level = null) {
        let title = isVictory ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ'; if (isNewRecord && isVictory) title = 'НОВЫЙ РЕКОРД!';
        const type = isNewRecord && isVictory ? 'record' : isVictory ? 'victory' : 'defeat';
        const content = document.createElement('div'); content.className = 'game-results';
        const statsDiv = document.createElement('div'); statsDiv.className = 'result-stats';
        stats.forEach(stat => { const statItem = document.createElement('div'); statItem.className = 'stat-item'; const label = document.createElement('span'); label.className = 'stat-label'; label.textContent = stat.label; const value = document.createElement('span'); value.className = 'stat-value'; value.textContent = stat.value; statItem.appendChild(label); statItem.appendChild(value); statsDiv.appendChild(statItem); });
        content.appendChild(statsDiv);
        if (isVictory && level) {
            const leaderboard = document.createElement('div'); leaderboard.className = 'modal-leaderboard'; leaderboard.innerHTML = '<h3>Таблица рекордов:</h3>';
            const leaderboardList = document.createElement('div'); leaderboardList.className = 'leaderboard-list'; leaderboardList.id = 'modal-leaderboard-list'; leaderboard.appendChild(leaderboardList); content.appendChild(leaderboard);
            setTimeout(() => { this.updateLeaderboard(level); }, 100);
        }

        const updated = actions.map(a => ({ ...a, action: () => { if (a.action) a.action(); this.close(); } }));
        return this.show({ title, type, content, buttons: updated });
    }

    showMessage(title, message, buttons = [{ text: 'OK', action: 'close' }]) {
        const updated = buttons.map(b => ({ ...b, action: b.action === 'close' ? () => this.close() : () => { if (b.action) b.action(); this.close(); } }));
        return this.show({ title, content: typeof message === 'string' ? `<div class="message-content">${message}</div>` : message, buttons: updated });
    }

    showPause(resumeCallback, restartCallback, menuCallback) {
        const contentDiv = document.createElement('div'); const title = document.createElement('div'); title.className = 'pause-title'; title.textContent = 'Игра приостановлена'; contentDiv.appendChild(title);
        return this.show({ type: 'pause', title: 'Пауза', content: contentDiv, buttons: [ { text: 'Продолжить', className: 'btn-primary', action: resumeCallback }, { text: 'Заново', className: 'btn-secondary', action: restartCallback }, { text: 'В меню', className: 'btn-secondary', action: menuCallback } ] });
    }

    updateLeaderboard(level) {
        const leaderboardList = document.getElementById('modal-leaderboard-list'); if (!leaderboardList) return;
        const allScores = dataManager.getAllScores(); const currentUser = dataManager.getCurrentUser(); const levelScores = [];
        for (const username in allScores) { const userScore = allScores[username][level]; if (userScore && userScore > 0) levelScores.push({ username, score: userScore, avatarColor: dataManager.getUserAvatar(username), isCurrentUser: username === currentUser }); }
        levelScores.sort((a, b) => b.score - a.score); const topScores = levelScores.slice(0, 10); leaderboardList.innerHTML = '';
        if (topScores.length === 0) { const emptyItem = document.createElement('div'); emptyItem.className = 'leaderboard-item'; emptyItem.innerHTML = `<div style="text-align:center; width:100%; color:var(--color-text-secondary); padding:1rem;"> <div style="margin-top:0.5rem;">Рекордов пока нет</div> <div style="font-size:0.9rem; margin-top:0.3rem;">Будьте первым!</div></div>`; leaderboardList.appendChild(emptyItem); return; }
        topScores.forEach((player, index) => {
            const leaderboardItem = document.createElement('div'); leaderboardItem.className = `leaderboard-item ${player.isCurrentUser ? 'current-user-record' : ''}`;
            leaderboardItem.innerHTML = `
            <div class="leaderboard-place" style="display:flex; align-items:center; gap:10px;">
                <span style="width:30px; text-align:center; font-weight:bold; font-size:1.1rem;">${index + 1}</span>
                <div style="display:flex; align-items:center; gap:8px;">
                    <img src="${DollManager.getAvatarUrl(player.avatarColor, 'up')}" alt="${player.username}" style="width:32px; height:32px; object-fit:contain; border-radius:50%;">
                    <span class="leaderboard-username" style="color:${player.isCurrentUser ? 'var(--color-primary)' : 'var(--color-text-primary)'}; font-weight:${player.isCurrentUser ? '800' : '600'}">${player.username}${player.isCurrentUser ? ' (Вы)' : ''}</span>
                </div>
            </div>
            <span class="leaderboard-score" style="color:${player.isCurrentUser ? 'var(--color-primary-dark)' : 'var(--color-primary)'}; font-size:${player.isCurrentUser ? '1.3rem' : '1.2rem'}">${player.score}</span>
        `;
            leaderboardList.appendChild(leaderboardItem);
        });
    }
}

const modalSystem = new ModalSystem();
