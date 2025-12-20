document.addEventListener('DOMContentLoaded', function () {
    const currentUser = dataManager.getCurrentUser();
    if (!currentUser) { alert('Пожалуйста, войдите в систему'); window.location.href = '../index.html'; return; }
    if (typeof modalSystem !== 'undefined') modalSystem.init(() => { }, () => { });

    const usernameElement = document.getElementById('username');
    const userAvatar = document.getElementById('user-avatar');
    const volumeSlider = document.getElementById('volume-slider');
    const difficultySelect = document.getElementById('difficulty-select');
    const logoutBtn = document.getElementById('logout-btn');
    const resetProgressBtn = document.getElementById('reset-progress');
    const levelsGrid = document.getElementById('levels-grid');

    const userData = dataManager.getUserData(currentUser);
    initInterface();

    function initInterface() {
        usernameElement.textContent = currentUser;
        usernameElement.style.fontSize = 'var(--font-size-xxxl)';
        updateAvatar(userData?.avatarColor || DollManager.getDefaultColor());
        volumeSlider.value = userData?.volume || 0.5;
        difficultySelect.value = userData?.difficulty || 'medium';
        loadLevels();
        setupEventListeners();
    }

    function updateAvatar(color) {
        if (!DollManager.isValidColor(color)) color = DollManager.getDefaultColor();
        userAvatar.src = DollManager.getAvatarUrl(color, 'up');
        userAvatar.alt = `Матрешка ${color}`;
        dataManager.updateUserData(currentUser, { avatarColor: color });
    }

    function loadLevels() {
        const levels = [
            { id: 1, name: 'Растущая матрёшка', description: 'Нажимайте и удерживайте, чтобы вырастить матрёшку', unlocked: true },
            { id: 2, name: 'Память', description: 'Найдите пары одинаковых матрёшек', unlocked: true },
            { id: 3, name: 'Загадка матрёшек', description: 'Соберите слово, открывая матрёшки', unlocked: true },
            { id: 4, name: 'Семейный порядок', description: 'Соберите матрёшки от мамы к малышке', unlocked: true }
        ];

        levelsGrid.innerHTML = '';
        levels.forEach(level => {
            const score = dataManager.getScore(`level${level.id}`);
            const levelCard = document.createElement('div');
            levelCard.className = 'level-card';
            levelCard.innerHTML = `
            <div class="level-number" style="font-size: var(--font-size-xl);">Игра ${level.id}</div>
            <div class="level-name" style="font-size: var(--font-size-xxl);">${level.name}</div>
            
            <!-- Контейнер для превью уровня -->
            <div class="level-preview" data-level="${level.id}">
                <!-- Содержимое будет заполняться previews.js -->
            </div>
            
            <p class="level-description" style="font-size: var(--font-size-lg);">${level.description}</p>
            <div class="level-score" style="font-size: var(--font-size-lg);">Рекорд: <span class="score-value" style="font-size: var(--font-size-xl);">${score}</span></div>
            <button class="play-button" data-level="${level.id}">Играть</button>
        `;

            levelCard.dataset.levelId = level.id;
            levelsGrid.appendChild(levelCard);
        });

        setTimeout(() => {
            if (window.PreviewManager) {
                PreviewManager.init();
            } else if (window.initPreviews) {
                window.initPreviews();
            }
        }, 100);

        document.querySelectorAll('.play-button').forEach(button => button.addEventListener('click', (e) => {
            e.stopPropagation(); startLevel(parseInt(button.dataset.level));
        }));
    }

    function setupEventListeners() {
        userAvatar.parentElement.addEventListener('click', showAvatarModal);
        volumeSlider.addEventListener('input', updateVolume);
        difficultySelect.addEventListener('change', updateDifficulty);
        logoutBtn.addEventListener('click', logout);
        resetProgressBtn.addEventListener('click', showResetConfirmation);
    }

    function showAvatarModal() {
        const avatars = DollManager.getAllAvatars();
        const currentColor = userData?.avatarColor || DollManager.getDefaultColor();
        if (typeof modalSystem === 'undefined' || !modalSystem.show) {
            const color = prompt('Введите цвет матрешки (red, blue, green, yellow, pink, orange, bordo, sea, turquoise, black):', currentColor);
            if (color && DollManager.isValidColor(color)) updateAvatar(color);
            return;
        }

        const content = document.createElement('div');
        content.className = 'avatars-grid';
        content.style.display = 'grid';
        content.style.gridTemplateColumns = 'repeat(4, 1fr)';
        content.style.gap = '20px';
        content.style.padding = '25px';
        content.style.minHeight = '250px';

        avatars.forEach(doll => {
            const avatarOption = document.createElement('div');
            avatarOption.className = `avatar-option ${doll.color === currentColor ? 'selected' : ''}`;
            avatarOption.dataset.color = doll.color;
            avatarOption.title = doll.color.charAt(0).toUpperCase() + doll.color.slice(1);
            avatarOption.style.cursor = 'pointer';
            avatarOption.style.paddingTop = '5px';
            avatarOption.style.border = doll.color === currentColor ? '4px solid var(--color-primary)' : '3px solid var(--color-border)';
            avatarOption.style.borderRadius = '50%';
            avatarOption.style.display = 'flex';
            avatarOption.style.alignItems = 'center';
            avatarOption.style.justifyContent = 'center';
            avatarOption.style.width = '90px';
            avatarOption.style.height = '90px';
            avatarOption.style.margin = '0 auto';
            avatarOption.style.overflow = 'hidden';

            const img = new Image(); img.src = doll.url; img.alt = `Матрешка ${doll.color}`; img.style.width = '80px'; img.style.height = '80px'; img.style.objectFit = 'contain';
            const imgContainer = document.createElement('div'); imgContainer.style.display = 'flex'; imgContainer.style.alignItems = 'center'; imgContainer.style.justifyContent = 'center'; imgContainer.style.width = '100%'; imgContainer.style.height = '100%';
            imgContainer.appendChild(img); avatarOption.appendChild(imgContainer);

            avatarOption.addEventListener('click', () => {
                content.querySelectorAll('.avatar-option').forEach(option => { option.classList.remove('selected'); option.style.border = '3px solid var(--color-border)'; option.style.boxShadow = 'none'; });
                avatarOption.classList.add('selected'); avatarOption.style.border = '4px solid var(--color-primary)'; avatarOption.style.boxShadow = '0 0 15px rgba(220, 53, 69, 0.3)';
            });

            content.appendChild(avatarOption);
        });

        const colorNames = document.createElement('div'); colorNames.style.marginTop = '20px'; colorNames.style.textAlign = 'center'; colorNames.style.fontSize = 'var(--font-size-md)'; colorNames.style.color = 'var(--color-text-secondary)';
        const modalContent = document.createElement('div'); modalContent.appendChild(content); modalContent.appendChild(colorNames);

        modalSystem.show({
            title: 'Выберите матрёшку',
            content: modalContent,
            buttons: [
                { text: 'Выбрать', className: 'btn-primary', action: () => { const sel = content.querySelector('.avatar-option.selected'); if (sel) updateAvatar(sel.dataset.color); modalSystem.close(); } },
                { text: 'Отмена', className: 'btn-secondary', action: 'close' }
            ]
        });
    }

    function showResetConfirmation() {
        if (typeof modalSystem === 'undefined' || !modalSystem.show) {
            if (confirm('Вы уверены, что хотите сбросить весь прогресс?\nВсе рекорды и достижения будут удалены.')) resetProgress();
            return;
        }

        modalSystem.show({
            title: 'Сброс прогресса',
            content: '<p style="text-align: center; font-size: var(--font-size-lg);">Вы уверены, что хотите сбросить весь прогресс?<br>Все рекорды и достижения будут удалены.</p>',
            buttons: [
                { text: 'Сбросить', className: 'btn-danger', action: () => { resetProgress(); modalSystem.close(); } },
                { text: 'Отмена', className: 'btn-secondary', action: 'close' }
            ]
        });
    }

    function resetProgress() {
        dataManager.data.scores[currentUser] = {};
        dataManager.save();
        loadLevels();
        if (typeof modalSystem !== 'undefined' && modalSystem.showMessage) modalSystem.showMessage('Прогресс сброшен', 'Все рекорды успешно удалены!', [{ text: 'Отлично', action: 'close' }]);
        else alert('Прогресс успешно сброшен!');
    }

    function updateVolume() { const volume = parseFloat(volumeSlider.value); dataManager.updateUserData(currentUser, { volume }); dataManager.save(); }
    function updateDifficulty() { const difficulty = difficultySelect.value; dataManager.updateUserData(currentUser, { difficulty }); dataManager.save(); }

    function logout() {
        if (typeof modalSystem === 'undefined' || !modalSystem.show) {
            if (confirm('Вы уверены, что хотите выйти?')) { dataManager.logout(); window.location.href = '../index.html'; }
            return;
        }

        modalSystem.show({
            title: 'Выход из системы', content: '<p style="text-align: center; font-size: var(--font-size-lg);">Вы уверены, что хотите выйти?</p>', buttons: [
                { text: 'Выйти', className: 'btn-danger', action: () => { dataManager.logout(); window.location.href = '../index.html'; } },
                { text: 'Отмена', className: 'btn-secondary', action: 'close' }
            ]
        });
    }

    function startLevel(levelId) {
        const paths = { 1: '../level1/level1.html', 2: '../level2/level2.html', 3: '../level3/level3.html', 4: '../level4/level4.html' };
        const levelPath = paths[levelId]; if (!levelPath) return;
        window.location.href = levelPath;
    }
});