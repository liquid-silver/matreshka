document.addEventListener('DOMContentLoaded', function () {
    const currentUser = dataManager.getCurrentUser();
    if (!currentUser) {
        window.location.href = '../index.html';
        return;
    }

    const userData = dataManager.getUserData(currentUser);
    const difficulty = userData.difficulty || 'medium';

    const dollsCounterElement = document.getElementById('dolls-counter');
    const playArea = document.getElementById('playArea');
    const fixedLayer = document.getElementById('fixedLayer');
    const currentLayer = document.getElementById('currentLayer');
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const pauseBtn = document.getElementById('pause-btn');
    const rulesBtn = document.getElementById('rules-btn');

    const difficultySettings = {
        easy: {
            timeLimit: 90,
            growRate: 0.35,
            sizeFactor: 0.35,
            targetDolls: 5,
            scoreMultiplier: 0.7,
            perfectZone: 0.08
        },
        medium: {
            timeLimit: 60,
            growRate: 0.45,
            sizeFactor: 0.33,
            targetDolls: 8,
            scoreMultiplier: 1.0,
            perfectZone: 0.05
        },
        hard: {
            timeLimit: 45,
            growRate: 0.55,
            sizeFactor: 0.30,
            targetDolls: 12,
            scoreMultiplier: 1.3,
            perfectZone: 0.03
        }
    };

    let gameState = {
        isPlaying: false,
        isPaused: false,
        timeLeft: 0,
        score: 0,
        dollsCollected: 0,
        targetDolls: 0,
        scaleStack: [],
        outlineStack: [],
        currentScale: 0,
        isGrowing: false,
        lastFrameTime: 0,
        rafId: null,
        timerInterval: null,
        currentColor: DollManager.getDefaultColor(),
        nextColor: DollManager.getRandomColor(),
        currentSettings: null,
        startTime: null,
        currentImage: null
    };

    let imagesCache = {}; // Кэш для всех изображений

    function initGame() {
        gameState.currentSettings = difficultySettings[difficulty];
        gameState.timeLeft = gameState.currentSettings.timeLimit;
        gameState.targetDolls = gameState.currentSettings.targetDolls;

        modalSystem.init(
            () => {
                if (gameState.isPlaying && !gameState.isPaused) {
                    gameState.isPaused = true;
                    stopTimer();
                    if (gameState.rafId) {
                        cancelAnimationFrame(gameState.rafId);
                        gameState.rafId = null;
                    }
                }
            },
            () => {
                if (gameState.isPlaying && gameState.isPaused) {
                    gameState.isPaused = false;
                    startTimer();
                    if (gameState.isGrowing) {
                        startGrowLoop();
                    }
                }
            }
        );

        // Предзагрузка всех изображений (цветные матрешки и их контуры)
        preloadImages().then(() => {
            showStartModal();
        });

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        setTimeout(handleResize, 100);
    }

    function preloadImages() {
        return new Promise((resolve) => {
            let loaded = 0;
            const total = DOLL_COLORS.length * 2; // Каждый цвет: обычная + контур

            DOLL_COLORS.forEach(color => {
                // Предзагружаем цветную матрешку
                    const colorImg = new Image();
                    colorImg.src = DollManager.getUrl(color);
                colorImg.onload = colorImg.onerror = () => {
                    loaded++;
                    if (!imagesCache[color]) imagesCache[color] = {};
                    imagesCache[color].full = colorImg.src;
                    if (loaded === total) resolve();
                };

                // Предзагружаем контур матрешки
                const outlineImg = new Image();
                outlineImg.src = DollManager.getOutlineUrl(color);
                outlineImg.onload = outlineImg.onerror = () => {
                    loaded++;
                    if (!imagesCache[color]) imagesCache[color] = {};
                    imagesCache[color].outline = outlineImg.src;
                    if (loaded === total) resolve();
                };
            });
        });
    }

    function pickNextColor(excludeColor = null) {
        let availableColors = DOLL_COLORS.filter(c => c !== 'black');
        if (excludeColor) availableColors = availableColors.filter(c => c !== excludeColor);
        return availableColors[Math.floor(Math.random() * availableColors.length)];
    }

    function spawnCurrent() {
        currentLayer.innerHTML = '';
        gameState.currentColor = gameState.nextColor;
        const lastFixed = gameState.scaleStack[gameState.scaleStack.length - 1] || 1;
        gameState.currentScale = lastFixed * 0.4 * gameState.currentSettings.sizeFactor;

        const img = new Image();
        img.src = DollManager.getUrl(gameState.currentColor); // Цветная матрешка
        img.className = 'doll-image';
        img.style.position = 'absolute';
        img.style.left = '50%';
        img.style.top = '50%';
        img.style.transformOrigin = 'center center';
        img.style.transform = `translate(-50%, -50%) scale(${gameState.currentScale})`;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        img.style.pointerEvents = 'none';
        img.setAttribute('draggable', 'false');
        img.setAttribute('data-doll-color', gameState.currentColor);

        currentLayer.appendChild(img);
        gameState.currentImage = img;
        gameState.nextColor = pickNextColor(gameState.currentColor);
    }

    function commitCurrentAsOutline() {
        const frozenColor = gameState.currentColor;
        const frozenScale = gameState.currentScale;
        const lastFixed = gameState.scaleStack[gameState.scaleStack.length - 1] || 1;

        const accuracy = calculateAccuracy(frozenScale, lastFixed);
        const points = calculatePoints(accuracy);
        gameState.score += points;
        gameState.dollsCollected++;
        scoreElement.textContent = gameState.score;
        updateDollsCounter();

        // Создаем изображение КОНТУРА (не черной матрешки!)
        const img = new Image();
        img.src = DollManager.getOutlineUrl(frozenColor); // Контур нужного цвета
        img.className = 'doll-image doll-outline';
        img.style.position = 'absolute';
        img.style.left = '50%';
        img.style.top = '50%';
        img.style.transformOrigin = 'center center';
        img.style.transform = `translate(-50%, -50%) scale(${frozenScale})`;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        img.style.pointerEvents = 'none';
        img.setAttribute('draggable', 'false');
        img.setAttribute('data-outline-color', frozenColor);

        // Добавляем стили для контуров
        img.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';
        img.style.opacity = '0.7';

        fixedLayer.appendChild(img);
        gameState.outlineStack.push({
            element: img,
            color: frozenColor,
            scale: frozenScale,
            accuracy: accuracy,
            points: points
        });
        gameState.scaleStack.push(frozenScale);

        // Анимация успеха
        if (gameState.currentImage) {
            gameState.currentImage.classList.add('success-animation');
            setTimeout(() => gameState.currentImage.classList.remove('success-animation'), 300);
        }

        if (gameState.dollsCollected >= gameState.targetDolls) {
            setTimeout(() => endGame(true), 500);
            return;
        }

        spawnCurrent();
    }

    function calculateAccuracy(currentScale, lastFixed) {
        const targetScale = lastFixed * gameState.currentSettings.sizeFactor;
        const difference = Math.abs(currentScale - targetScale);
        return Math.max(0, 1 - (difference / targetScale));
    }

    function calculatePoints(accuracy) {
        let points = 100;

        if (accuracy > 0.9) {
            points += 50;
        } else if (accuracy > 0.7) {
            points += 25;
        } else if (accuracy > 0.5) {
            points += 10;
        }

        points = Math.round(points * gameState.currentSettings.scoreMultiplier);
        const timeBonus = Math.round((gameState.timeLeft / gameState.currentSettings.timeLimit) * 30);
        points += timeBonus;

        return points;
    }

    function renderCurrent() {
        if (gameState.currentImage) {
            gameState.currentImage.style.transform = `translate(-50%, -50%) scale(${gameState.currentScale})`;
        }
    }

    function growLoop(ts) {
        if (!gameState.isGrowing || gameState.isPaused) return;
        if (!gameState.lastFrameTime) gameState.lastFrameTime = ts;

        const dt = (ts - gameState.lastFrameTime) / 1000;
        gameState.lastFrameTime = ts;
        gameState.currentScale += gameState.currentSettings.growRate * dt;
        const lastFixed = gameState.scaleStack[gameState.scaleStack.length - 1] || 1;

        if (gameState.currentScale >= lastFixed) {
            renderCurrent();
            endGame(false);
            return;
        }

        renderCurrent();
        gameState.rafId = requestAnimationFrame(growLoop);
    }

    function startGrow() {
        if (gameState.isGrowing || !gameState.isPlaying || gameState.isPaused) return;
        gameState.isGrowing = true;
        gameState.lastFrameTime = 0;
        startGrowLoop();
    }

    function startGrowLoop() {
        gameState.rafId = requestAnimationFrame(growLoop);
    }

    function stopGrow() {
        if (!gameState.isGrowing || !gameState.isPlaying || gameState.isPaused) return;
        gameState.isGrowing = false;
        if (gameState.rafId) {
            cancelAnimationFrame(gameState.rafId);
            gameState.rafId = null;
        }
        gameState.lastFrameTime = 0;

        const lastFixed = gameState.scaleStack[gameState.scaleStack.length - 1] || 1;
        if (gameState.currentScale >= lastFixed) {
            endGame(false);
            return;
        }

        commitCurrentAsOutline();
    }

    function startTimer() {
        stopTimer();
        gameState.timeLeft = gameState.currentSettings.timeLimit;
        updateTimerDisplay();

        gameState.timerInterval = setInterval(() => {
            if (!gameState.isPaused) {
                gameState.timeLeft--;
                updateTimerDisplay();

                if (gameState.timeLeft <= 0) {
                    endGame(false);
                }
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        timerElement.textContent = gameState.timeLeft;

        if (gameState.timeLeft <= 10) {
            timerElement.style.color = 'var(--color-danger)';
        } else if (gameState.timeLeft <= 30) {
            timerElement.style.color = 'var(--color-warning)';
        } else {
            timerElement.style.color = 'var(--color-primary)';
        }
    }

    function stopTimer() {
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
            gameState.timerInterval = null;
        }
    }

    function startGame() {
        if (gameState.isPlaying) return;

        gameState.isPlaying = true;
        gameState.isPaused = false;
        gameState.timeLeft = gameState.currentSettings.timeLimit;
        gameState.score = 0;
        gameState.dollsCollected = 0;
        gameState.scaleStack = [];
        gameState.outlineStack = [];
        gameState.isGrowing = false;
        gameState.currentColor = DollManager.getDefaultColor();
        gameState.nextColor = pickNextColor(gameState.currentColor);
        gameState.startTime = Date.now();
        gameState.currentImage = null;

        fixedLayer.innerHTML = '';
        currentLayer.innerHTML = '';
        scoreElement.textContent = '0';
        updateDollsCounter();
        updateTimerDisplay();

        initOuterContour();
        spawnCurrent();
        startTimer();
    }

    function initOuterContour() {
        const rect = playArea.getBoundingClientRect();
        const maxScale = Math.min(rect.width, rect.height) / 200 * gameState.currentSettings.sizeFactor;

        // Используем черный контур для внешней границы
        const img = new Image();
        img.src = DollManager.getOutlineUrl('black'); // Черный контур
        img.className = 'doll-image doll-outline';
        img.style.position = 'absolute';
        img.style.left = '50%';
        img.style.top = '50%';
        img.style.transformOrigin = 'center center';
        img.style.transform = `translate(-50%, -50%) scale(${maxScale})`;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        img.style.pointerEvents = 'none';
        img.setAttribute('draggable', 'false');
        img.setAttribute('data-outline-color', 'black');
        img.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))';
        img.style.opacity = '0.8';

        fixedLayer.appendChild(img);
        gameState.scaleStack.push(maxScale);
        gameState.outlineStack.push({
            element: img,
            color: 'black',
            scale: maxScale
        });
    }

    function endGame(isVictory) {
        gameState.isPlaying = false;
        gameState.isGrowing = false;

        if (gameState.rafId) {
            cancelAnimationFrame(gameState.rafId);
            gameState.rafId = null;
        }

        updateDollsCounter();
        stopTimer();

        if (isVictory) {
            const timeBonus = calculateTimeBonus();
            gameState.score += timeBonus;
            scoreElement.textContent = gameState.score;
        }

        let isNewRecord = false;
        if (isVictory) {
            const currentHighScore = dataManager.getScore('level1');
            if (gameState.score > currentHighScore) {
                dataManager.setScore('level1', gameState.score);
                isNewRecord = true;
            }
        }

        showResults(isVictory, isNewRecord);
    }

    function updateDollsCounter() {
        dollsCounterElement.textContent = `${gameState.dollsCollected}/${gameState.targetDolls}`;

        if (gameState.dollsCollected === gameState.targetDolls) {
            dollsCounterElement.style.color = 'var(--color-success)';
        } else if (gameState.dollsCollected > gameState.targetDolls * 0.7) {
            dollsCounterElement.style.color = 'var(--color-warning)';
        } else {
            dollsCounterElement.style.color = 'var(--color-primary)';
        }
    }

    function calculateTimeBonus() {
        const maxTimeBonus = 300;
        const timeLeft = gameState.timeLeft;
        const totalTime = gameState.currentSettings.timeLimit;
        return Math.round((timeLeft / totalTime) * maxTimeBonus);
    }

    function showResults(isVictory, isNewRecord) {
        const stats = [
            { label: 'Собрано матрёшек', value: `${gameState.dollsCollected}/${gameState.targetDolls}` },
            { label: 'Затраченное время', value: `${gameState.currentSettings.timeLimit - gameState.timeLeft} сек` },
            { label: 'Очки', value: gameState.score }
        ];

        if (isVictory) {
            const recordText = `${dataManager.getScore('level1')}${isNewRecord ? ' (новый!)' : ''}`;
            stats.push({ label: 'Ваш рекорд', value: recordText });
        }

        const actions = [
            {
                text: 'Заново',
                className: 'btn-primary',
                action: restartGame
            },
            {
                text: 'В меню',
                className: 'btn-secondary',
                action: goToMenu
            }
        ];

        modalSystem.showGameResults(isVictory, isNewRecord, stats, actions, 'level1');
    }

    function getDifficultyInfoText() {
        const s = gameState.currentSettings;
        const names = { easy: 'Легкий', medium: 'Средний', hard: 'Сложный' };
        return `${names[difficulty]}: ${s.targetDolls} матрёшек, ${s.timeLimit} сек, скорость: ${s.growRate.toFixed(2)}`;
    }

    function createRulesContent() {
        const contentDiv = document.createElement('div'); contentDiv.className = 'rules-text';
        const title = document.createElement('h3'); title.textContent = 'Правила игры';
        const rulesList = document.createElement('div'); rulesList.className = 'rules-list';
        const rules = [
            'Нажимайте и удерживайте, чтобы матрёшка росла',
            'Отпустите, чтобы зафиксировать размер',
            'Новая матрёшка должна быть меньше предыдущей',
            'Если коснетесь контура — проигрыш',
            `Соберите ${gameState.targetDolls} матрёшек за ${gameState.timeLeft} секунд!`,
            'Чем быстрее соберете — тем больше очков'
        ];
        rules.forEach(t => { const p = document.createElement('p'); p.textContent = t; p.style.fontSize = 'var(--font-size-md)'; rulesList.appendChild(p); });
        const difficultyDiv = document.createElement('div'); difficultyDiv.className = 'difficulty-info';
        const diffTitle = document.createElement('h4'); diffTitle.textContent = 'Текущая сложность:';
        const diffText = document.createElement('p'); diffText.textContent = getDifficultyInfoText();
        difficultyDiv.appendChild(diffTitle); difficultyDiv.appendChild(diffText);
        contentDiv.appendChild(title); contentDiv.appendChild(rulesList); contentDiv.appendChild(difficultyDiv);
        return contentDiv;
    }

    function showStartModal() {
        modalSystem.showMessage('Уровень 1: Растущая матрёшка', createRulesContent(), [ { text: 'Начать игру', className: 'btn-primary', action: () => startGame() } ]);
    }

    function showRulesModal() {
        modalSystem.showMessage('Уровень 1: Растущая матрёшка', createRulesContent(), [ { text: 'Закрыть', action: 'close' } ]);
    }

    function pauseGame() {
        if (!gameState.isPlaying) return;
        modalSystem.showPause(
            () => modalSystem.close(),
            () => {
                modalSystem.close();
                restartGame();
            },
            () => {
                modalSystem.close();
                goToMenu();
            }
        );
    }

    function restartGame() {
        gameState.isPlaying = false;
        gameState.isPaused = false;
        setTimeout(startGame, 300);
    }

    function goToMenu() {
        window.location.href = '../pages/menu.html';
    }

    function onPointerDown(e) {
        // Игнорируем правую кнопку мыши
        if (e.button === 2) return;
        
        e.preventDefault();
        startGrow();
    }

    function onPointerUp(e) {
        e.preventDefault();
        stopGrow();
    }

    function handleResize() {
        const headerHeight = document.querySelector('.game-header').offsetHeight;
        const gameArea = document.querySelector('.game-area');
        gameArea.style.height = `calc(100vh - ${headerHeight}px)`;

        const playArea = document.getElementById('playArea');
        const size = Math.min(
            window.innerWidth * 0.85,
            window.innerHeight - headerHeight - 40,
            700
        );
        document.documentElement.style.setProperty('--size', `${size}px`);
    }

    function initializeEventListeners() {
        playArea.addEventListener("mousedown", onPointerDown);
        document.addEventListener("mouseup", onPointerUp);
        pauseBtn.addEventListener('click', pauseGame);
        rulesBtn.addEventListener('click', showRulesModal);
        
        // Открытие модального окна с правилами по правой кнопке мыши
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showRulesModal();
        });
        
        // Пауза по нажатию ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && gameState.isPlaying) {
                pauseGame();
            }
        });
    }

    initializeEventListeners();
    initGame();
});