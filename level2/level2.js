document.addEventListener('DOMContentLoaded', function () {
    const currentUser = dataManager.getCurrentUser();
    if (!currentUser) {
        window.location.href = '../index.html';
        return;
    }

    const userData = dataManager.getUserData(currentUser);
    const difficulty = userData.difficulty || 'medium';

    const dollsGrid = document.getElementById('dolls-grid');
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const pauseBtn = document.getElementById('pause-btn');
    const rulesBtn = document.getElementById('rules-btn');

    const difficultySettings = {
        easy: {
            timeLimit: 60,
            columns: 3,
            rows: 2,
            totalPairs: 3,
            scoreMultiplier: 0.7
        },
        medium: {
            timeLimit: 120,
            columns: 4,
            rows: 3,
            totalPairs: 6,
            scoreMultiplier: 1.0
        },
        hard: {
            timeLimit: 180,
            columns: 6,
            rows: 3,
            totalPairs: 9,
            scoreMultiplier: 1.3
        }
    };

    let gameState = {
        isPlaying: false,
        isPaused: false,
        timeLeft: 0,
        pairsFound: 0,
        totalPairs: 0,
        score: 0,
        firstCard: null,
        secondCard: null,
        canFlip: true,
        matchedPairs: new Set(),
        dollColors: [],
        cards: [],
        timerInterval: null,
        totalAttempts: 0,
        successfulAttempts: 0,
        startTime: null,
        currentSettings: null
    };

    function initGame() {
        gameState.currentSettings = difficultySettings[difficulty];
        gameState.totalPairs = gameState.currentSettings.totalPairs;
        gameState.timeLeft = gameState.currentSettings.timeLimit;

        modalSystem.init(
            () => {
                if (gameState.isPlaying && !gameState.isPaused) {
                    gameState.isPaused = true;
                    clearInterval(gameState.timerInterval);
                }
            },
            () => {
                if (gameState.isPlaying && gameState.isPaused) {
                    gameState.isPaused = false;
                    startTimer();
                }
            }
        );

        updateGridLayout();
        prepareAndShuffleDollColors();
        createDolls();
        showStartModal();
        preloadImages();

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        setTimeout(handleResize, 100);
    }

    function updateGridLayout() {
        const settings = gameState.currentSettings;
        dollsGrid.style.gridTemplateColumns = `repeat(${settings.columns}, 1fr)`;
        dollsGrid.style.gridTemplateRows = `repeat(${settings.rows}, 1fr)`;

        const baseSize = Math.min(settings.columns, settings.rows) * 120;
        dollsGrid.style.maxWidth = `min(${baseSize}px, 85vmin)`;
        dollsGrid.style.maxHeight = `min(${baseSize}px, 85vmin)`;
    }

    function handleResize() {
        const headerHeight = document.querySelector('.game-header').offsetHeight;
        const gameArea = document.querySelector('.game-area');
        gameArea.style.height = `calc(100vh - ${headerHeight}px)`;
        updateGridCellSize();
    }

    function updateGridCellSize() {
        const dollsGrid = document.getElementById('dolls-grid');
        if (!dollsGrid) return;

        const settings = gameState.currentSettings;
        const grid = dollsGrid.getBoundingClientRect();
        const cellWidth = grid.width / settings.columns;
        const cellHeight = grid.height / settings.rows;
        const minCellSize = 60;

        if (cellWidth < minCellSize || cellHeight < minCellSize) {
            const scale = Math.min(minCellSize / cellWidth, minCellSize / cellHeight);
            const newWidth = grid.width * scale * 0.9;
            const newHeight = grid.height * scale * 0.9;

            dollsGrid.style.maxWidth = `${newWidth}px`;
            dollsGrid.style.maxHeight = `${newHeight}px`;
        } else {
            dollsGrid.style.maxWidth = '';
            dollsGrid.style.maxHeight = '';
        }
    }

    function prepareAndShuffleDollColors() {
        gameState.dollColors = [];
        const settings = gameState.currentSettings;
        const availableColors = DOLL_COLORS.filter(color => color !== 'black');

        const shuffledColors = [...availableColors].sort(() => Math.random() - 0.5);
        const selectedColors = shuffledColors.slice(0, settings.totalPairs);

        selectedColors.forEach(color => {
            gameState.dollColors.push(color, color);
        });

        shuffleArray(gameState.dollColors);
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function createDolls() {
        dollsGrid.innerHTML = '';
        gameState.cards = [];
        const totalCards = gameState.currentSettings.columns * gameState.currentSettings.rows;

        for (let i = 0; i < totalCards; i++) {
            const dollItem = document.createElement('div');
            dollItem.className = 'doll-item';
            dollItem.dataset.index = i;
            dollItem.setAttribute('draggable', 'false');
            dollItem.ondragstart = () => false;

            const blackImg = document.createElement('img');
            blackImg.src = DollManager.getUrl('black');
            blackImg.className = 'doll-image black-doll';
            blackImg.alt = 'Матрёшка';
            blackImg.setAttribute('draggable', 'false');
            blackImg.ondragstart = () => false;

            const colorImg = document.createElement('img');
            const color = gameState.dollColors[i];
            colorImg.src = DollManager.getUrl(color);
            colorImg.className = 'doll-image color-doll';
            colorImg.alt = `Матрёшка ${color}`;
            colorImg.setAttribute('draggable', 'false');
            colorImg.ondragstart = () => false;

            dollItem.appendChild(blackImg);
            dollItem.appendChild(colorImg);

            dollItem.addEventListener('click', () => flipCard(dollItem));
            dollItem.addEventListener('contextmenu', (e) => e.preventDefault());

            dollsGrid.appendChild(dollItem);
            gameState.cards.push({
                element: dollItem,
                color: color,
                isFlipped: false,
                isMatched: false,
                index: i
            });
        }
    }

    function flipCard(dollItem) {
        if (!gameState.isPlaying || gameState.isPaused || !gameState.canFlip) return;

        const cardIndex = parseInt(dollItem.dataset.index);
        const cardData = gameState.cards[cardIndex];

        if (cardData.isFlipped || cardData.isMatched) return;

        if (gameState.firstCard === null) {
            gameState.firstCard = cardData;
            flipCardAnimation(cardData, true);
        }
        else if (gameState.secondCard === null && cardData !== gameState.firstCard) {
            gameState.secondCard = cardData;
            flipCardAnimation(cardData, true);
            gameState.canFlip = false;
            setTimeout(checkMatch, 400);
        }
    }

    function flipCardAnimation(cardData, showColor) {
        cardData.isFlipped = showColor;
        const dollElement = cardData.element;

        if (showColor) {
            dollElement.classList.add('flipped');
        } else {
            dollElement.classList.remove('flipped');
        }
    }

    function checkMatch() {
        gameState.totalAttempts++;

        if (gameState.firstCard.color === gameState.secondCard.color) {
            handleMatchSuccess();
        } else {
            handleMatchFail();
        }
    }

    function handleMatchSuccess() {
        gameState.successfulAttempts++;
        gameState.pairsFound++;

        gameState.firstCard.isMatched = true;
        gameState.secondCard.isMatched = true;
        gameState.matchedPairs.add(gameState.firstCard.color);

        gameState.firstCard.element.classList.add('match-success');
        gameState.secondCard.element.classList.add('match-success');

        const points = calculatePoints();
        gameState.score += points;
        scoreElement.textContent = gameState.score;

        setTimeout(() => {
            gameState.firstCard.element.classList.add('matched');
            gameState.secondCard.element.classList.add('matched');

            if (gameState.pairsFound === gameState.totalPairs) {
                setTimeout(() => endGame(true), 300);
            }

            resetSelection();
        }, 300);
    }

    function calculatePoints() {
        const settings = gameState.currentSettings;
        let points = 100;
        points = Math.round(points * settings.scoreMultiplier);

        const timeBonusMultiplier = gameState.timeLeft / settings.timeLimit;
        const maxTimeBonus = 50;
        points += Math.round(timeBonusMultiplier * maxTimeBonus);

        return points;
    }

    function handleMatchFail() {
        gameState.score = Math.max(0, gameState.score - 25);
        scoreElement.textContent = gameState.score;

        gameState.firstCard.element.classList.add('match-fail');
        gameState.secondCard.element.classList.add('match-fail');

        setTimeout(() => {
            flipCardAnimation(gameState.firstCard, false);
            flipCardAnimation(gameState.secondCard, false);

            gameState.firstCard.element.classList.remove('match-fail');
            gameState.secondCard.element.classList.remove('match-fail');

            resetSelection();
        }, 500);
    }

    function resetSelection() {
        gameState.firstCard = null;
        gameState.secondCard = null;
        gameState.canFlip = true;
    }

    function startGame() {
        if (gameState.isPlaying) return;

        gameState.isPlaying = true;
        gameState.timeLeft = gameState.currentSettings.timeLimit;
        gameState.pairsFound = 0;
        gameState.score = 0;
        gameState.firstCard = null;
        gameState.secondCard = null;
        gameState.canFlip = true;
        gameState.matchedPairs.clear();
        gameState.totalAttempts = 0;
        gameState.successfulAttempts = 0;
        gameState.startTime = Date.now();

        prepareAndShuffleDollColors();
        createDolls();

        scoreElement.textContent = '0';
        timerElement.textContent = gameState.timeLeft;
        timerElement.style.color = '#764ba2';

        startTimer();
    }

    function startTimer() {
        clearInterval(gameState.timerInterval);

        gameState.timerInterval = setInterval(() => {
            if (!gameState.isPaused && gameState.isPlaying) {
                gameState.timeLeft--;
                timerElement.textContent = gameState.timeLeft;

                if (gameState.timeLeft <= 30) {
                    timerElement.style.color = '#dc3545';
                } else if (gameState.timeLeft <= 60) {
                    timerElement.style.color = '#ffc107';
                } else {
                    timerElement.style.color = '#764ba2';
                }

                if (gameState.timeLeft <= 0) {
                    endGame(false);
                }
            }
        }, 1000);
    }

    function endGame(isVictory) {
        gameState.isPlaying = false;
        clearInterval(gameState.timerInterval);

        if (isVictory) {
            const completionBonus = calculateCompletionBonus();
            gameState.score += completionBonus;
            scoreElement.textContent = gameState.score;
        }

        let isNewRecord = false;
        if (isVictory) {
            const currentHighScore = dataManager.getScore('level2');
            if (gameState.score > currentHighScore) {
                dataManager.setScore('level2', gameState.score);
                isNewRecord = true;
            }
        }

        showResults(isVictory, isNewRecord);
    }

    function calculateCompletionBonus() {
        const settings = gameState.currentSettings;
        const timeLeft = gameState.timeLeft;
        const maxCompletionBonus = 500;
        return Math.round((timeLeft / settings.timeLimit) * maxCompletionBonus);
    }

    function showResults(isVictory, isNewRecord) {
        const stats = [
            { label: 'Найдено пар', value: `${gameState.pairsFound}/${gameState.totalPairs}` },
            { label: 'Затраченное время', value: `${gameState.currentSettings.timeLimit - gameState.timeLeft} сек` },
            { label: 'Очки', value: gameState.score }
        ];

        if (isVictory) {
            const recordText = `${dataManager.getScore('level2')}${isNewRecord ? ' (новый!)' : ''}`;
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

        modalSystem.showGameResults(isVictory, isNewRecord, stats, actions, 'level2');
    }

    function createRulesContent() {
        const contentDiv = document.createElement('div'); contentDiv.className = 'rules-text';
        const title = document.createElement('h3'); title.textContent = 'Правила игры';
        const rulesList = document.createElement('div'); rulesList.className = 'rules-list';
        const rules = [
            'Перед вами черные матрешки (пары разных цветов)',
            'Нажмите на матрешку, чтобы увидеть ее цвет',
            'Найдите вторую матрешку того же цвета',
            'Если цвета совпадают - пара исчезает',
            'Если нет - матрешки снова становятся черными',
            'Найдите все пары до конца времени!'
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
        modalSystem.showMessage('Уровень 2: Память', createRulesContent(), [ { text: 'Начать игру', className: 'btn-primary', action: () => startGame() } ]);
    }

    function getDifficultyInfoText() {
        const s = gameState.currentSettings;
        const names = { easy: 'Легкий', medium: 'Средний', hard: 'Сложный' };
        return `${names[difficulty]}: ${s.totalPairs} пар матрёшек, ${s.timeLimit} сек`;
    }

    function showRulesModal() {
        modalSystem.showMessage('Уровень 2: Память', createRulesContent(), [ { text: 'Закрыть', action: 'close' } ]);
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
        prepareAndShuffleDollColors();
        setTimeout(startGame, 300);
    }

    function goToMenu() {
        window.location.href = '../pages/menu.html';
    }

    function preloadImages() {
        DOLL_COLORS.forEach(color => {
            const img = new Image();
            img.src = DollManager.getUrl(color);
        });
    }

    pauseBtn.addEventListener('click', pauseGame);
    rulesBtn.addEventListener('click', showRulesModal);
    document.addEventListener('contextmenu', (e) => { e.preventDefault(); showRulesModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && gameState.isPlaying) pauseGame(); });

    initGame();
});