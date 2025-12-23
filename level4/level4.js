document.addEventListener('DOMContentLoaded', function () {
    const currentUser = dataManager.getCurrentUser();
    if (!currentUser) {
        window.location.href = '../index.html';
        return;
    }

    const userData = dataManager.getUserData(currentUser);
    const difficulty = userData.difficulty || 'medium';

    const flyingDollsContainer = document.getElementById('flying-dolls');
    const motherContainer = document.getElementById('mother-container');
    const scoreElement = document.getElementById('score');
    const timerElement = document.getElementById('timer');
    const pauseBtn = document.getElementById('pause-btn');
    const rulesBtn = document.getElementById('rules-btn');
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

    const DIFFICULTY_SETTINGS = {
        easy: {
            dollCount: 5,
            timeLimit: 120,
            scoreMultiplier: 0.8,
            basePoints: 100,
            minSize: 80,
            speedMultiplier: 0.5,
            timeBonusMultiplier: 1.5
        },
        medium: {
            dollCount: 7,
            timeLimit: 90,
            scoreMultiplier: 1.0,
            basePoints: 120,
            minSize: 70,
            speedMultiplier: 1,
            timeBonusMultiplier: 2.0
        },
        hard: {
            dollCount: 9,
            timeLimit: 60,
            scoreMultiplier: 1.2,
            basePoints: 150,
            minSize: 60,
            speedMultiplier: 1.8,
            timeBonusMultiplier: 3.0
        }
    };

    let gameState = {
        isPlaying: false,
        isPaused: false,
        timeLeft: 0,
        score: 0,
        currentSettings: null,
        draggedDoll: null,
        dragOffsetX: 0,
        dragOffsetY: 0,
        motherDoll: null,
        assembledDolls: [],
        dollInstances: new Map(),
        timerInterval: null,
        startTime: 0
    };

    class Doll {
        constructor(id, color, size, isMother = false) {
            this.id = id;
            this.color = color;
            this.size = size;
            this.isMother = isMother;
            this.isInMother = false;
            this.container = null;
            this.topElement = null;
            this.bottomElement = null;
            this.isOpen = false;
            this.dragClone = null;

            const speedMultiplier = gameState.currentSettings ? gameState.currentSettings.speedMultiplier : 0.8;
            const baseSpeed = 7;
            const angle = Math.random() * Math.PI * 2;
            const speed = baseSpeed * speedMultiplier;

            this.velocity = {
                x: Math.cos(angle) * speed,
                y: Math.sin(angle) * speed
            };

            this.originalSpeed = {
                x: Math.abs(this.velocity.x),
                y: Math.abs(this.velocity.y)
            };

            this.position = { x: 0, y: 0 };
            this.time = 0;
            this.speedMultiplier = speedMultiplier;
            this.animationId = null;

            this.createElement();
            gameState.dollInstances.set(this.id, this);
        }

        createElement() {
            this.container = document.createElement('div');
            this.container.className = 'doll';
            this.container.dataset.id = this.id;
            this.container.dataset.color = this.color;
            this.container.dataset.size = this.size;
            this.container.dataset.isMother = this.isMother;
            this.container.style.width = `${this.size}px`;

            const wrapper = document.createElement('div');
            wrapper.className = 'doll-wrapper';
            wrapper.style.position = 'relative';
            wrapper.style.width = '100%';
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.alignItems = 'center';

            this.topElement = document.createElement('img');
            this.topElement.className = 'doll-top';
            this.topElement.src = DollManager.getAvatarUrl(this.color, 'up');
            this.topElement.alt = `Верх матрёшки ${this.color}`;
            this.topElement.style.width = '100%';
            this.topElement.style.height = 'auto';
            this.topElement.style.display = 'block';
            this.topElement.setAttribute('draggable', 'false');

            this.bottomElement = document.createElement('img');
            this.bottomElement.className = 'doll-bottom';
            this.bottomElement.src = DollManager.getAvatarUrl(this.color, 'down');
            this.bottomElement.alt = `Низ матрёшки ${this.color}`;
            this.bottomElement.style.width = '100%';
            this.bottomElement.style.height = 'auto';
            this.bottomElement.style.display = 'block';
            this.bottomElement.setAttribute('draggable', 'false');

            wrapper.appendChild(this.topElement);
            wrapper.appendChild(this.bottomElement);
            this.container.appendChild(wrapper);

            if (this.isMother) {
                this.container.style.cursor = 'default';
                this.container.style.pointerEvents = 'none';
            } else {
                this.addDragListeners();
            }

            this.close();
            if (!this.isMother && !this.isInMother) {
                this.startFloatingAnimation();
            }
        }

        startFloatingAnimation() {
            if (this.isInMother || this.isMother || !this.container) return;

            const containerRect = flyingDollsContainer.getBoundingClientRect();

            const marginPercent = 0.005; 
            this.minX = containerRect.width * marginPercent;
            this.maxX = containerRect.width * (1 - marginPercent) - this.size;
            this.minY = containerRect.height * marginPercent;
            this.maxY = containerRect.height * (1 - marginPercent * 20) - this.size;

            this.position.x = this.minX + Math.random() * (this.maxX - this.minX);
            this.position.y = this.minY + Math.random() * (this.maxY - this.minY);

            this.container.style.position = 'absolute';
            this.container.style.left = `${this.position.x}px`;
            this.container.style.top = `${this.position.y}px`;

            this.animateFloat();
        }

        animateFloat() {
            if (this.isInMother || this.isMother || !this.container || gameState.isPaused) {
                if (!gameState.isPaused && !this.isInMother && !this.isMother) {
                    this.animationId = requestAnimationFrame(() => this.animateFloat());
                }
                return;
            }

            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;

            let bounced = false;

            if (this.position.x < this.minX) {
                this.position.x = this.minX;
                this.velocity.x = Math.abs(this.velocity.x);
                bounced = true;
            }
            else if (this.position.x > this.maxX) {
                this.position.x = this.maxX;
                this.velocity.x = -Math.abs(this.velocity.x);
                bounced = true;
            }

            if (this.position.y < this.minY) {
                this.position.y = this.minY;
                this.velocity.y = Math.abs(this.velocity.y);
                bounced = true;
            }
            else if (this.position.y > this.maxY) {
                this.position.y = this.maxY;
                this.velocity.y = -Math.abs(this.velocity.y);
                bounced = true;
            }

            if (bounced) {
                const speedX = Math.abs(this.velocity.x);
                const speedY = Math.abs(this.velocity.y);
                if (Math.random() > 0.7) {
                    this.velocity.x = (Math.random() > 0.5 ? 1 : -1) * speedX;
                    this.velocity.y = (Math.random() > 0.5 ? 1 : -1) * speedY;
                }
            }

            this.container.style.position = 'absolute';
            this.container.style.left = `${this.position.x}px`;
            this.container.style.top = `${this.position.y}px`;

            this.time += 0.01;
            const rotation = Math.sin(this.time * 0.01) * 0.3;
            this.container.style.transform = `rotate(${rotation}deg)`;

            this.animationId = requestAnimationFrame(() => this.animateFloat());
        }

        stopFloatingAnimation() {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            if (this.container) {
                this.container.style.transform = '';
            }
        }

        updateBoundaries() {
            if (this.isInMother || this.isMother || !this.container) return;

            const containerRect = flyingDollsContainer.getBoundingClientRect();

            const marginPercent = 0.05;
            this.minX = containerRect.width * marginPercent;
            this.maxX = containerRect.width * (1 - marginPercent) - this.size;
            this.minY = containerRect.height * marginPercent;
            this.maxY = containerRect.height * (1 - marginPercent * 3) - this.size;

            this.position.x = Math.max(this.minX, Math.min(this.position.x, this.maxX));
            this.position.y = Math.max(this.minY, Math.min(this.position.y, this.maxY));

            this.container.style.left = `${this.position.x}px`;
            this.container.style.top = `${this.position.y}px`;
        }

        addDragListeners() {
            this.container.addEventListener('mousedown', (e) => this.startDrag(e));
        }

        setOpenState(isOpen) {
            if (isOpen) {
                this.topElement.style.transform = 'translateY(-40px)';
                this.topElement.style.marginBottom = '-20px';
            } else {
                this.topElement.style.transform = 'translateY(0)';
                this.topElement.style.marginBottom = '0';
            }
            this.topElement.style.transition = 'transform 0.3s ease, margin-bottom 0.3s ease';
        }

        open() {
            if (this.isInMother || this.isMother) {
                this.setOpenState(true);
            }
        }

        close() {
            this.setOpenState(false);
            this.container.classList.remove('open-completely');
        }

        openCompletely() {
            this.container.classList.add('open-completely');
            this.container.classList.remove('open-partial');
            this.isOpen = true;
            if (this.topElement) {
                this.topElement.style.transform = 'translateY(-100px)';
                this.topElement.style.opacity = '0';
            }
        }

        closeCompletely() {
            this.container.classList.remove('open-completely');
            this.container.classList.remove('open-partial');
            this.isOpen = false;
            if (this.topElement) {
                this.topElement.style.transform = 'translateY(0)';
                this.topElement.style.opacity = '1';
                this.topElement.style.marginBottom = '0';
                this.topElement.style.transition = 'transform 0.3s ease, opacity 0.3s ease, margin-bottom 0.3s ease';
            }
        }

        closeAllPreviews() {
            if (gameState.assembledDolls.length > 0) {
                const lastDoll = gameState.assembledDolls[gameState.assembledDolls.length - 1];
                lastDoll.close();
            }
            if (gameState.motherDoll && gameState.assembledDolls.length === 0) {
                gameState.motherDoll.close();
            }
        }

        startDrag(e) {
            if (!gameState.isPlaying || gameState.isPaused) return;
            
            if (e.button === 2) return;
            
            e.preventDefault();

            if (this.isInMother && !this.isMother) {
                if (gameState.assembledDolls.length > 0) {
                    const lastDoll = gameState.assembledDolls[gameState.assembledDolls.length - 1];
                    if (lastDoll !== this) {
                        lastDoll.startDrag(e);
                        return;
                    }
                }
            }

            gameState.draggedDoll = this;
            let clientX, clientY;

            clientX = e.clientX;
            clientY = e.clientY;

            this.createDragClone(clientX, clientY);

            if (!this.isInMother) {
                this.stopFloatingAnimation();
                this.container.style.display = 'none';
            } else {
                this.container.style.opacity = '0';
            }

            document.addEventListener('mousemove', this.drag.bind(this));
            document.addEventListener('mouseup', this.endDrag.bind(this));
        }

        createDragClone(clientX, clientY) {
            this.dragClone = document.createElement('div');
            this.dragClone.className = 'doll dragging';
            this.dragClone.dataset.id = this.id + '_clone';
            this.dragClone.dataset.color = this.color;
            this.dragClone.dataset.size = this.size;
            this.dragClone.dataset.isMother = this.isMother;

            this.dragClone.innerHTML = `
                <div class="doll-wrapper" style="position:relative;width:100%;display:flex;flex-direction:column;align-items:center;">
                    <img src="${DollManager.getAvatarUrl(this.color, 'up')}" class="doll-top" alt="Верх матрёшки ${this.color}" 
                        style="width:100%;height:auto;display:block;draggable:false">
                    <img src="${DollManager.getAvatarUrl(this.color, 'down')}" class="doll-bottom" alt="Низ матрёшки ${this.color}" 
                        style="width:100%;height:auto;display:block;draggable:false">
                </div>
            `;

            this.dragClone.style.width = `${this.size}px`;
            this.dragClone.style.height = 'auto';
            this.dragClone.style.position = 'fixed';
            this.dragClone.style.zIndex = '1000';
            this.dragClone.style.pointerEvents = 'none';
            this.dragClone.style.filter = 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))';
            this.dragClone.style.cursor = 'grabbing';
            this.dragClone.style.transform = 'scale(1.05)';

            this.dragClone.style.left = `${clientX - this.size / 2}px`;
            this.dragClone.style.top = `${clientY - this.size / 2}px`;

            gameState.dragOffsetX = this.size / 2;
            gameState.dragOffsetY = this.size / 2;

            document.body.appendChild(this.dragClone);
        }

        drag(e) {
            if (!gameState.draggedDoll || gameState.draggedDoll.id !== this.id) return;
            e.preventDefault();

            let clientX, clientY;

            clientX = e.clientX;
            clientY = e.clientY;

            if (this.dragClone) {
                this.dragClone.style.left = `${clientX - gameState.dragOffsetX}px`;
                this.dragClone.style.top = `${clientY - gameState.dragOffsetY}px`;
            }

            const targetArea = this.checkDropTarget(clientX, clientY);

            if (targetArea === 'assembly') {
                if (gameState.assembledDolls.length > 0) {
                    const lastDoll = gameState.assembledDolls[gameState.assembledDolls.length - 1];
                    if (lastDoll !== this) {
                        lastDoll.open();
                    }
                } else {
                    if (gameState.motherDoll && gameState.motherDoll !== this) {
                        gameState.motherDoll.open();
                    }
                }
            } else {
                if (gameState.assembledDolls.length > 0) {
                    const lastDoll = gameState.assembledDolls[gameState.assembledDolls.length - 1];
                    if (lastDoll !== this) {
                        lastDoll.close();
                    }
                }
                if (gameState.motherDoll && gameState.motherDoll !== this && gameState.assembledDolls.length === 0) {
                    gameState.motherDoll.close();
                }
            }
        }

        endDrag(e) {
            if (!gameState.draggedDoll || gameState.draggedDoll.id !== this.id) return;
            e.preventDefault();

            let clientX, clientY;
            clientX = e.clientX;
            clientY = e.clientY;

            this.removeDragClone();
            if (this.isInMother) {
                this.container.style.opacity = '1';
            } else {
                this.container.style.display = 'block';
            }

            const targetArea = this.checkDropTarget(clientX, clientY);
            if (targetArea === 'play') {
                this.dropToPlayArea();
            } else if (targetArea === 'assembly') {
                this.dropToAssembly();
            } else {
                this.cancelDrag();
            }

            document.removeEventListener('mousemove', this.drag.bind(this));
            document.removeEventListener('mouseup', this.endDrag.bind(this));
            gameState.draggedDoll = null;
        }

        removeDragClone() {
            if (this.dragClone) {
                this.dragClone.remove();
                this.dragClone = null;
            }
        }

        cancelDrag() {
            this.removeDragClone();

            if (this.isInMother) {
                this.container.style.opacity = '1';
            } else {
                this.container.style.display = 'block';
                if (!this.isInMother && gameState.isPlaying && !gameState.isPaused) {
                    setTimeout(() => {
                        this.startFloatingAnimation();
                    }, 50);
                }
            }

            this.closeAllPreviews();
        }

        checkDropTarget(clientX, clientY) {
            const playArea = document.getElementById('play-area');
            const assemblyArea = document.getElementById('assembly-area');

            const playRect = playArea.getBoundingClientRect();
            const assemblyRect = assemblyArea.getBoundingClientRect();

            if (clientX > playRect.left && clientX < playRect.right &&
                clientY > playRect.top && clientY < playRect.bottom) {
                return 'play';
            } else if (clientX > assemblyRect.left && clientX < assemblyRect.right &&
                clientY > assemblyRect.top && clientY < assemblyRect.bottom) {
                return 'assembly';
            }
            return null;
        }

        dropToPlayArea() {
            if (!this.isInMother) {
                this.cancelDrag();
                return;
            }

            addScore(-Math.floor(gameState.currentSettings.basePoints * 0.3));
            showScoreEffect(-Math.floor(gameState.currentSettings.basePoints * 0.3), this.position.x, this.position.y);

            const index = gameState.assembledDolls.indexOf(this);
            if (index > -1) {
                gameState.assembledDolls.splice(index, 1);

                if (gameState.assembledDolls.length > 0) {
                    const newLastDoll = gameState.assembledDolls[gameState.assembledDolls.length - 1];
                    newLastDoll.closeCompletely();
                    newLastDoll.close();
                    newLastDoll.container.classList.remove('open-completely');
                } else {
                    if (gameState.motherDoll) {
                        gameState.motherDoll.closeCompletely();
                        gameState.motherDoll.close();
                        gameState.motherDoll.container.classList.remove('open-completely');
                    }
                }
            }

            updateAssembledZIndices();

            this.container.classList.remove('placed-assembled');
            this.container.classList.remove('open-completely');
            this.container.classList.remove('assembled');

            this.isInMother = false;
            this.close();
            flyingDollsContainer.appendChild(this.container);
            this.resetStyle();

            setTimeout(() => {
                this.startFloatingAnimation();
            }, 100);
        }

        resetStyleForAssembly() {
            this.container.classList.remove('dragging');
            this.container.style.position = 'absolute';
            this.container.style.left = '50%';
            this.container.style.top = '50%';
            this.container.style.transform = 'translate(-50%, -50%)';
            this.container.style.zIndex = '';
            this.container.style.opacity = '1';
        }

        dropToAssembly() {
            if (this.isInMother) {
                this.cancelDrag();
                this.closeAllPreviews();
                return;
            }

            if (!this.canBePlacedInAssembly()) {
                this.cancelDrag();
                this.closeAllPreviews();
                showErrorEffect(this.position.x, this.position.y);
                return;
            }

            this.stopFloatingAnimation();
            this.container.style.display = 'block';
            this.isInMother = true;
            motherContainer.appendChild(this.container);
            this.resetStyleForAssembly();
            gameState.assembledDolls.push(this);
            updateAssembledZIndices();

            const timeBonus = Math.max(0, Math.floor(
                (gameState.timeLeft / gameState.currentSettings.timeLimit) *
                gameState.currentSettings.timeBonusMultiplier * 100
            ));
            const basePoints = gameState.currentSettings.basePoints;
            const pointsEarned = basePoints + timeBonus;

            addScore(pointsEarned);

            const motherRect = motherContainer.getBoundingClientRect();
            showScoreEffect(pointsEarned,
                motherRect.left + motherRect.width / 2,
                motherRect.top + motherRect.height / 2);

            if (gameState.assembledDolls.length > 1) {
                const prevDoll = gameState.assembledDolls[gameState.assembledDolls.length - 2];
                this.animateTopOpening(prevDoll);
            } else {
                this.animateTopOpening(gameState.motherDoll);
            }

            if (gameState.assembledDolls.length === gameState.currentSettings.dollCount) {
                setTimeout(() => {
                    endGame(true);
                }, 500);
            }
        }

        animateTopOpening(doll) {
            if (!doll || !doll.topElement) return;
            const topElement = doll.topElement;
            const originalTransition = topElement.style.transition;

            topElement.style.transition = 'transform 0.5s ease-out, opacity 0.5s ease-out';
            topElement.style.transform = 'translateY(-100px)';
            topElement.style.opacity = '0';

            setTimeout(() => {
                doll.openCompletely();
                topElement.style.transition = originalTransition;
            }, 500);
        }

        canBePlacedInAssembly() {
            if (gameState.assembledDolls.length === 0) {
                return true;
            }
            const lastDoll = gameState.assembledDolls[gameState.assembledDolls.length - 1];
            return this.size < lastDoll.size;
        }

        resetStyle() {
            this.stopFloatingAnimation();
            this.container.classList.remove('dragging');
            this.container.style.position = '';
            this.container.style.left = '';
            this.container.style.top = '';
            this.container.style.zIndex = '';
            this.container.style.transform = '';
            this.container.style.width = `${this.size}px`;
            this.container.style.opacity = '1';

            this.position = { x: 0, y: 0 };
            this.time = Math.random() * 100;

            setTimeout(() => {
                this.startFloatingAnimation();
            }, 100);
        }
    }

    function updateAssembledZIndices() {
        gameState.assembledDolls.forEach((doll, index) => {
            if (doll.isMother) {
                doll.container.style.zIndex = '100';
            } else {
                const zIndexValue = 90 - index;
                doll.container.style.zIndex = zIndexValue.toString();
            }
        });
    }

    function calculateDollSizes() {
        const settings = gameState.currentSettings;

        // Фиксированный размер мамы
        const motherSize = 200;
        const minSize = settings.minSize;
        const sizeRange = motherSize - minSize;
        const step = sizeRange / settings.dollCount;

        const sizes = [];

        for (let i = 0; i < settings.dollCount; i++) {
            const size = Math.round(motherSize - (step * (i + 1)));
            sizes.push(size);
        }

        return sizes.sort(() => Math.random() - 0.5);
    }

    function recalculateChildDollSizes(motherSize) {
        const settings = gameState.currentSettings;
        const minSize = settings.minSize;
        const sizeRange = motherSize - minSize;
        const step = sizeRange / settings.dollCount;

        const childDolls = Array.from(gameState.dollInstances.values())
            .filter(doll => !doll.isMother && !doll.isInMother);

        childDolls.sort((a, b) => b.size - a.size);

        childDolls.forEach((doll, index) => {
            const newSize = Math.round(motherSize - (step * (index + 1)));
            doll.size = Math.max(minSize, newSize);
            doll.container.style.width = `${doll.size}px`;

            doll.updateBoundaries();
        });
    }

    function createDolls() {
        flyingDollsContainer.innerHTML = '';
        motherContainer.innerHTML = '';
        gameState.assembledDolls = [];
        gameState.dollInstances.clear();

        const settings = gameState.currentSettings;
        const sizes = calculateDollSizes();

        const motherDoll = new Doll('mother', 'black', 240, true);
        motherContainer.appendChild(motherDoll.container);
        gameState.motherDoll = motherDoll;

        const availableColors = DOLL_COLORS.filter(color => color !== 'black');
        const shuffledColors = [...availableColors].sort(() => Math.random() - 0.5);

        for (let i = 0; i < settings.dollCount; i++) {
            const colorIndex = i % shuffledColors.length;
            const color = shuffledColors[colorIndex];
            const size = sizes[i];

            if (colorIndex === shuffledColors.length - 1 && i < settings.dollCount - 1) {
                shuffledColors.sort(() => Math.random() - 0.5);
            }

            const doll = new Doll(`doll_${i}`, color, size, false);
            flyingDollsContainer.appendChild(doll.container);
        }
    }

    function initGame() {
        gameState.currentSettings = DIFFICULTY_SETTINGS[difficulty];

        modalSystem.init(
            () => {
                if (gameState.isPlaying && !gameState.isPaused) {
                    gameState.isPaused = true;
                    pauseAllAnimations();
                }
            },
            () => {
                if (gameState.isPlaying && gameState.isPaused) {
                    gameState.isPaused = false;
                    resumeAllAnimations();
                }
            }
        );

        createDolls();
        showStartModal();

        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
        });
    }

    function getDifficultyInfoText() {
        const s = gameState.currentSettings;
        const names = { easy: 'Легкий', medium: 'Средний', hard: 'Сложный' };
        return `${names[difficulty]}: ${s.dollCount} матрёшек, ${s.timeLimit} сек`;
    }

    function createRulesContent() {
        const contentDiv = document.createElement('div'); contentDiv.className = 'rules-text';
        const title = document.createElement('h3'); title.textContent = 'Правила игры';
        const rulesList = document.createElement('div'); rulesList.className = 'rules-list';
        const rules = [
            'Перетаскивайте матрёшек из левой области в правую',
            'Цель: Собрать все матрёшки от самой большой к самой маленькой',
            'Можно поместить вправо только ту матрёшку, которая меньше предыдущей',
            'Чтобы достать матрёшку обратно — перетащите её влево'
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
        modalSystem.showMessage('Уровень 4: Собирай по порядку', createRulesContent(), [
            { text: 'Начать игру', className: 'btn-primary', action: () => startGame() }
        ]);
    }

    function showRulesModal() {
        modalSystem.showMessage('Уровень 4: Собирай по порядку', createRulesContent(), [
            { text: 'Закрыть', action: 'close' }
        ]);
    }

    function startGame() {
        if (gameState.isPlaying) return;

        gameState.isPlaying = true;
        gameState.isPaused = false;
        gameState.timeLeft = gameState.currentSettings.timeLimit;
        gameState.score = 0;
        gameState.startTime = Date.now();

        scoreElement.textContent = '0';
        timerElement.textContent = gameState.timeLeft;
        timerElement.style.color = 'var(--color-primary)';
        timerElement.classList.remove('pulse');

        startTimer();
    }

    function startTimer() {
        if (gameState.timerInterval) {
            clearInterval(gameState.timerInterval);
        }

        gameState.timerInterval = setInterval(() => {
            updateTimer();
        }, 1000);
    }

    function updateTimer() {
        if (!gameState.isPlaying || gameState.isPaused) return;

        gameState.timeLeft--;
        timerElement.textContent = gameState.timeLeft;

        if (gameState.timeLeft <= 10) {
            timerElement.style.color = 'var(--color-error)';
            timerElement.classList.add('pulse');
        } else if (gameState.timeLeft <= 30) {
            timerElement.style.color = 'var(--color-warning)';
        }

        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timerInterval);
            endGame(false);
        }
    }

    function addScore(points) {
        const multiplier = gameState.currentSettings.scoreMultiplier;
        const earnedPoints = Math.floor(points * multiplier);
        gameState.score += earnedPoints;

        if (gameState.score < 0) {
            gameState.score = 0;
        }

        scoreElement.textContent = gameState.score;
    }

    function showScoreEffect(points, x, y) {
        if (!gameState.isPlaying) return;

        const effect = document.createElement('div');
        effect.className = 'score-effect';
        effect.textContent = points > 0 ? `+${points}` : points.toString();
        effect.style.position = 'fixed';
        effect.style.left = `${x || window.innerWidth / 2}px`;
        effect.style.top = `${y || window.innerHeight / 2}px`;
        effect.style.transform = 'translate(-50%, -50%)';
        effect.style.zIndex = '10000';
        effect.style.fontSize = '24px';
        effect.style.fontWeight = 'bold';
        effect.style.color = points > 0 ? 'var(--color-success)' : 'var(--color-error)';
        effect.style.textShadow = '0 2px 4px rgba(0,0,0,0.3)';
        effect.style.pointerEvents = 'none';
        effect.style.transition = 'all 0.8s ease-out';

        document.body.appendChild(effect);

        requestAnimationFrame(() => {
            effect.style.top = `${(y || window.innerHeight / 2) - 100}px`;
            effect.style.opacity = '0';
        });

        setTimeout(() => {
            effect.remove();
        }, 800);
    }

    function showErrorEffect(x, y) {
        const effect = document.createElement('div');
        effect.className = 'error-effect';
        effect.textContent = '✗';
        effect.style.position = 'fixed';
        effect.style.left = `${x || window.innerWidth / 2}px`;
        effect.style.top = `${y || window.innerHeight / 2}px`;
        effect.style.transform = 'translate(-50%, -50%)';
        effect.style.zIndex = '10000';
        effect.style.fontSize = '36px';
        effect.style.color = 'var(--color-error)';
        effect.style.textShadow = '0 2px 4px rgba(0,0,0,0.3)';
        effect.style.pointerEvents = 'none';
        effect.style.transition = 'all 0.5s ease-out';

        document.body.appendChild(effect);

        requestAnimationFrame(() => {
            effect.style.fontSize = '48px';
            effect.style.opacity = '0';
        });

        setTimeout(() => {
            effect.remove();
        }, 500);
    }

    function pauseAllAnimations() {
        gameState.dollInstances.forEach(doll => {
            if (!doll.isMother && !doll.isInMother) {
                doll.stopFloatingAnimation();
            }
        });
        clearInterval(gameState.timerInterval);
    }

    function resumeAllAnimations() {
        gameState.dollInstances.forEach(doll => {
            if (!doll.isMother && !doll.isInMother && gameState.isPlaying) {
                doll.startFloatingAnimation();
            }
        });
        if (gameState.isPlaying && !gameState.isPaused) {
            startTimer();
        }
    }

    function updateAllDollBoundaries() {
        gameState.dollInstances.forEach(doll => {
            if (!doll.isMother && !doll.isInMother) {
                doll.updateBoundaries();
            }
        });
    }

    function endGame(isVictory) {
        if (!gameState.isPlaying) return;

        gameState.isPlaying = false;
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
        pauseAllAnimations();

        if (isVictory) {
            const timeSpent = gameState.currentSettings.timeLimit - gameState.timeLeft;
            const currentHighScore = dataManager.getScore('level4');
            let isNewRecord = false;

            if (gameState.score > currentHighScore) {
                dataManager.setScore('level4', gameState.score);
                isNewRecord = true;
            }

            const stats = [
                { label: 'Собрано матрёшек', value: `${gameState.assembledDolls.length}/${gameState.currentSettings.dollCount}` },
                { label: 'Затраченное время', value: `${timeSpent} сек` },
                { label: 'Очки', value: gameState.score }
            ];

            if (isVictory) {
                const recordText = `${dataManager.getScore('level4')}${isNewRecord ? ' (новый!)' : ''}`;
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

            modalSystem.showGameResults(isVictory, isNewRecord, stats, actions, 'level4');
        } else {
            const timeSpent = gameState.currentSettings.timeLimit - gameState.timeLeft;
            const stats = [
                { label: 'Собрано матрёшек', value: `${gameState.assembledDolls.length}/${gameState.currentSettings.dollCount}` },
                { label: 'Затраченное время', value: `${timeSpent} сек` },
                { label: 'Очки', value: gameState.score }
            ];

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

            modalSystem.showGameResults(false, false, stats, actions, 'level4');
        }
    }

    function pauseGame() {
        if (!gameState.isPlaying) return;

        gameState.isPaused = true;
        pauseAllAnimations();

        modalSystem.showPause(
            () => {
                modalSystem.close();
                resumeGame();
            },
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

    function resumeGame() {
        if (gameState.isPlaying && gameState.isPaused) {
            gameState.isPaused = false;
            resumeAllAnimations();
        }
    }

    function restartGame() {
        gameState.isPlaying = false;
        gameState.isPaused = false;
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
        createDolls();
        setTimeout(startGame, 300);
    }

    function goToMenu() {
        window.location.href = '../pages/menu.html';
    }

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

    initGame();
});