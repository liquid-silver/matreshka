document.addEventListener('DOMContentLoaded', function () {
    const currentUser = dataManager.getCurrentUser();
    if (!currentUser) {
        window.location.href = '../index.html';
        return;
    }

    const userData = dataManager.getUserData(currentUser);
    const difficulty = userData.difficulty || 'medium';
    document.body.classList.add(`difficulty-${difficulty}`);

    const dollsContainer = document.getElementById('dolls-container');
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const pauseBtn = document.getElementById('pause-btn');
    const rulesBtn = document.getElementById('rules-btn');
    const wordDisplay = document.getElementById('word-display');
    const targetWordElement = document.getElementById('target-word');
    const difficultyDisplay = document.getElementById('difficulty-display');

    const difficultyNames = {
        easy: 'Легкий',
        medium: 'Средний',
        hard: 'Сложный'
    };

    // Обновляем отображение сложности
    if (difficultyDisplay) {
        difficultyDisplay.textContent = difficultyNames[difficulty];
    }

    const WORDS_BY_DIFFICULTY = {
        easy: {
            words: [
                "KUKLA", "OZERO", "TAIGA", "DOBRO", "DUSHA",
                "VOLGA", "MOROZ", "TEPLO", "CHUDO", "SANKI"
            ],
            word: "",
            letters: [],
            timeLimit: 90,
            basePoints: 80,
            scoreMultiplier: 0.8
        },
        medium: {
            words: [
                "KRASOTA", "BARANKA", "PROSTOR", "VALENKI", "SEREBRO",
                "VOSTORG", "PUSHKIN", "KULTURA", "BEREZKA", "SLOBODA"
            ],
            word: "",
            letters: [],
            timeLimit: 150,
            basePoints: 100,
            scoreMultiplier: 1.0
        },
        hard: {
            words: [
                "MATRESHKA", "KHOKHLOMA", "BALALAIKA", "KOKOSHNIK", "BRILLIANT",
                "VIKTORINA", "BUTERBROD", "ISKUSSTVO", "ATMOSFERA", "AKKORDEON"
            ],
            word: "",
            letters: [],
            timeLimit: 210,
            basePoints: 120,
            scoreMultiplier: 1.2
        }
    };

    let gameState = {
        isPlaying: false,
        isPaused: false,
        timeLeft: 0,
        score: 0,
        currentLetterIndex: 0,
        totalLetters: 0,
        currentWord: [],
        dollColors: [],
        openedDolls: [],
        dollsData: [],
        canClick: true,
        timerInterval: null,
        currentSettings: null,
        startTime: null
    };

    function selectRandomWord() {
        const settings = gameState.currentSettings;
        const randomIndex = Math.floor(Math.random() * settings.words.length);
        const selectedWord = settings.words[randomIndex];

        settings.word = selectedWord;
        settings.letters = selectedWord.split('');
        return selectedWord;
    }

    function initGame() {
        gameState.currentSettings = WORDS_BY_DIFFICULTY[difficulty];
        selectRandomWord();

        gameState.timeLeft = gameState.currentSettings.timeLimit;
        gameState.totalLetters = gameState.currentSettings.letters.length;
        gameState.currentWord = [...gameState.currentSettings.letters];

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

        prepareDollColors();
        createDolls();
        showStartModal();
        preloadImages();

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);
        setTimeout(handleResize, 100);
    }

    function prepareDollColors() {
        gameState.dollColors = [];
        const availableColors = DOLL_COLORS.filter(color => color !== 'black');
        const shuffledColors = [...availableColors].sort(() => Math.random() - 0.5);
        gameState.dollColors = shuffledColors.slice(0, gameState.totalLetters);
    }

    function createDolls() {
        dollsContainer.innerHTML = '';
        gameState.dollsData = [];
        gameState.openedDolls = [];
        gameState.currentLetterIndex = 0;

        const shuffledLetters = [...gameState.currentWord].sort(() => Math.random() - 0.5);

        for (let i = 0; i < gameState.totalLetters; i++) {
            const dollItem = document.createElement('div');
            dollItem.className = 'doll-item';
            dollItem.dataset.index = i;
            dollItem.dataset.letter = shuffledLetters[i];
            dollItem.dataset.color = gameState.dollColors[i];
            dollItem.setAttribute('draggable', 'false');
            dollItem.ondragstart = () => false;

            const imagesContainer = document.createElement('div');
            imagesContainer.className = 'doll-images-container';

            const color = gameState.dollColors[i];

            const topImg = document.createElement('img');
            topImg.src = DollManager.getAvatarUrl(color, 'up');
            topImg.className = 'doll-part doll-top';
            topImg.alt = `Верх матрёшки ${color}`;
            topImg.setAttribute('draggable', 'false');

            const bottomImg = document.createElement('img');
            bottomImg.src = DollManager.getAvatarUrl(color, 'down');
            bottomImg.className = 'doll-part doll-bottom';
            bottomImg.alt = `Низ матрёшки ${color}`;
            bottomImg.setAttribute('draggable', 'false');

            const letterDiv = document.createElement('div');
            letterDiv.className = 'doll-letter';
            letterDiv.textContent = shuffledLetters[i];

            imagesContainer.appendChild(topImg);
            imagesContainer.appendChild(bottomImg);
            dollItem.appendChild(imagesContainer);
            dollItem.appendChild(letterDiv);

            dollItem.addEventListener('click', () => openDoll(dollItem));
            dollsContainer.appendChild(dollItem);

            gameState.dollsData.push({
                element: dollItem,
                color: color,
                letter: shuffledLetters[i],
                isOpened: false,
                index: i
            });
        }

        setTimeout(updateDollsSize, 50);
    }

    function openDoll(dollItem) {
        if (!gameState.isPlaying || gameState.isPaused || !gameState.canClick) return;

        const index = parseInt(dollItem.dataset.index);
        const dollData = gameState.dollsData[index];

        if (dollData.isOpened) return;

        dollItem.classList.add('opened');
        dollData.isOpened = true;
        gameState.canClick = false;
        gameState.openedDolls.push(dollItem);

        setTimeout(() => {
            checkLetter(dollData.letter, dollItem);
        }, 500);
    }

    function checkLetter(letter, dollElement) {
        const expectedLetter = gameState.currentWord[gameState.currentLetterIndex];

        if (letter === expectedLetter) {
            handleCorrectLetter(dollElement);
        } else {
            handleWrongLetter(dollElement);
        }
    }

    function handleCorrectLetter(dollElement) {
        gameState.currentLetterIndex++;

        const points = calculatePoints(true);
        gameState.score += points;
        scoreElement.textContent = gameState.score;

        if (gameState.currentLetterIndex >= gameState.totalLetters) {
            setTimeout(() => endGame(true), 500);
            return;
        }

        setTimeout(() => {
            gameState.canClick = true;
        }, 300);
    }

    function handleWrongLetter(wrongDollElement) {
        const penalty = calculatePoints(false);
        gameState.score = Math.max(0, gameState.score - penalty);
        scoreElement.textContent = gameState.score;

        wrongDollElement.classList.add('shake');

        setTimeout(() => {
            closeAllDolls();
            wrongDollElement.classList.remove('shake');
            gameState.currentLetterIndex = 0;

            setTimeout(() => {
                gameState.canClick = true;
            }, 300);
        }, 500);
    }

    function closeAllDolls() {
        gameState.dollsData.forEach(dollData => {
            dollData.element.classList.remove('opened');
            dollData.isOpened = false;
        });
        gameState.openedDolls = [];
    }

    function calculatePoints(isCorrect) {
        if (!isCorrect) {
            return 20;
        }

        const settings = gameState.currentSettings;
        let points = settings.basePoints;
        points = Math.round(points * settings.scoreMultiplier);

        const timeBonusMultiplier = gameState.timeLeft / settings.timeLimit;
        const maxTimeBonus = 30;
        points += Math.round(timeBonusMultiplier * maxTimeBonus);

        const comboBonus = gameState.currentLetterIndex * 5;
        points += comboBonus;

        return points;
    }

    function showWord() {
        targetWordElement.textContent = gameState.currentSettings.word;
        wordDisplay.classList.remove('hidden');

        setTimeout(() => {
            wordDisplay.classList.add('hidden');
            startTimer();
            gameState.canClick = true;
        }, 3000);
    }

    function startTimer() {
        clearInterval(gameState.timerInterval);

        gameState.timerInterval = setInterval(() => {
            if (!gameState.isPaused && gameState.isPlaying) {
                gameState.timeLeft--;
                timerElement.textContent = gameState.timeLeft;

                if (gameState.timeLeft <= 30) {
                    timerElement.style.color = 'var(--color-danger)';
                } else if (gameState.timeLeft <= 60) {
                    timerElement.style.color = 'var(--color-warning)';
                } else {
                    timerElement.style.color = 'var(--color-primary)';
                }

                if (gameState.timeLeft <= 0) {
                    endGame(false);
                }
            }
        }, 1000);
    }

    function startGame() {
        if (gameState.isPlaying) return;

        gameState.isPlaying = true;
        gameState.isPaused = false;
        selectRandomWord();

        gameState.timeLeft = gameState.currentSettings.timeLimit;
        gameState.totalLetters = gameState.currentSettings.letters.length;
        gameState.currentWord = [...gameState.currentSettings.letters];
        gameState.score = 0;
        gameState.currentLetterIndex = 0;
        gameState.openedDolls = [];
        gameState.canClick = false;
        gameState.startTime = Date.now();

        prepareDollColors();
        createDolls();

        scoreElement.textContent = '0';
        timerElement.textContent = gameState.timeLeft;
        timerElement.style.color = 'var(--color-primary)';

        showWord();
    }

    function endGame(isVictory) {
        gameState.isPlaying = false;
        clearInterval(gameState.timerInterval);

        if (isVictory) {
            const timeBonus = calculateTimeBonus();
            gameState.score += timeBonus;
            scoreElement.textContent = gameState.score;
        }

        let isNewRecord = false;
        if (isVictory) {
            const currentHighScore = dataManager.getScore('level3');
            if (gameState.score > currentHighScore) {
                dataManager.setScore('level3', gameState.score);
                isNewRecord = true;
            }
        }

        showResults(isVictory, isNewRecord);
    }

    function calculateTimeBonus() {
        const maxTimeBonus = 500;
        const timeLeft = gameState.timeLeft;
        const totalTime = gameState.currentSettings.timeLimit;
        return Math.round((timeLeft / totalTime) * maxTimeBonus);
    }

    function showResults(isVictory, isNewRecord) {
        const stats = [
            { label: 'Затраченное время', value: `${gameState.currentSettings.timeLimit - gameState.timeLeft} сек` },
            { label: 'Очки', value: gameState.score }
        ];

        if (isVictory) {
            const recordText = `${dataManager.getScore('level3')}${isNewRecord ? ' (новый!)' : ''}`;
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

        modalSystem.showGameResults(isVictory, isNewRecord, stats, actions, 'level3');
    }

    function getDifficultyInfoText() {
        const s = gameState.currentSettings;
        const names = { easy: 'Легкий', medium: 'Средний', hard: 'Сложный' };
        return `${names[difficulty]}: слово из ${s.letters.length} букв, ${s.timeLimit} сек`;
    }

    function createRulesContent() {
        const contentDiv = document.createElement('div'); contentDiv.className = 'rules-text';
        const title = document.createElement('h3'); title.textContent = 'Правила игры';
        const rulesList = document.createElement('div'); rulesList.className = 'rules-list';
        const rules = [
            'Перед вами матрёшки с буквами внутри',
            'Запомните показанное слово',
            'Откройте матрёшки в правильной последовательности',
            'Если буква правильная - матрёшка остаётся открытой',
            'Если ошиблись - все матрёшки закроются',
        ];
        rules.forEach(ruleText => { const p = document.createElement('p'); p.textContent = ruleText; p.style.fontSize = 'var(--font-size-md)'; rulesList.appendChild(p); });
        const difficultyDiv = document.createElement('div'); difficultyDiv.className = 'difficulty-info';
        const diffTitle = document.createElement('h4'); diffTitle.textContent = 'Текущая сложность:';
        const diffText = document.createElement('p'); diffText.textContent = getDifficultyInfoText();
        difficultyDiv.appendChild(diffTitle); difficultyDiv.appendChild(diffText);
        contentDiv.appendChild(title); contentDiv.appendChild(rulesList); contentDiv.appendChild(difficultyDiv);
        return contentDiv;
    }

    function showStartModal() {
        modalSystem.showMessage('Уровень 3: Загадка матрёшек', createRulesContent(), [
            { text: 'Начать игру', className: 'btn-primary', action: () => startGame() }
        ]);
    }

    function showRulesModal() {
        modalSystem.showMessage('Уровень 3: Загадка матрёшек', createRulesContent(), [
            { text: 'Закрыть', action: 'close' }
        ]);
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
        selectRandomWord();
        setTimeout(startGame, 300);
    }

    function goToMenu() {
        window.location.href = '../pages/menu.html';
    }

    function handleResize() {
        const headerHeight = document.querySelector('.game-header').offsetHeight;
        const gameArea = document.querySelector('.game-area');
        gameArea.style.height = `calc(100vh - ${headerHeight}px)`;
        updateDollsSize();
    }

    function updateDollsSize() {
        const dollsContainer = document.getElementById('dolls-container');
        if (!dollsContainer || !gameState.dollsData.length) return;

        const containerWidth = dollsContainer.clientWidth;
        const containerHeight = dollsContainer.clientHeight;
        const dollCount = gameState.dollsData.length;

        let dollsPerRow;

        if (window.innerWidth < 480) {
            dollsPerRow = dollCount <= 6 ? dollCount : 4;
        } else if (window.innerWidth < 768) {
            dollsPerRow = dollCount <= 8 ? dollCount : 5;
        } else {
            dollsPerRow = dollCount <= 9 ? dollCount : 6;
        }

        const dollWidth = Math.min(
            (containerWidth / dollsPerRow) * 0.6,
            containerHeight * 0.3
        );

        document.querySelectorAll('.doll-item').forEach(doll => {
            doll.style.width = `${dollWidth}px`;
        });

        document.querySelectorAll('.doll-letter').forEach(letter => {
            const fontSize = Math.min(dollWidth * 0.4, 40);
            letter.style.fontSize = `${fontSize}px`;
        });
    }

    function preloadImages() {
        DOLL_COLORS.forEach(color => {
            const imgUp = new Image();
            imgUp.src = DollManager.getAvatarUrl(color, 'up');
            const imgDown = new Image();
            imgDown.src = DollManager.getAvatarUrl(color, 'down');
        });
    }

    pauseBtn.addEventListener('click', pauseGame);
    rulesBtn.addEventListener('click', showRulesModal);
    document.addEventListener('contextmenu', (e) => { e.preventDefault(); showRulesModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && gameState.isPlaying) pauseGame(); });

    initGame();
});