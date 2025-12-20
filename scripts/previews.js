class PreviewManager {
    constructor() {
        this.previews = new Map();
        this.activeAnimations = new Map();
        this.imagesCache = {};
        this.isInitialized = false;
    }

    // Инициализация всех превью
    init() {
        if (this.isInitialized) return;

        // Ждем немного, чтобы элементы успели отрендериться
        setTimeout(() => {
            this.initPreviews();
            this.setupHoverListeners();
            this.isInitialized = true;
        }, 100);
    }

    // Инициализация отдельных превью для каждого уровня
    initPreviews() {
        const previewElements = document.querySelectorAll('.level-preview[data-level]');

        if (previewElements.length === 0) {
            console.warn('PreviewManager: Элементы превью не найдены');
            return;
        }

        previewElements.forEach(previewEl => {
            const levelId = previewEl.dataset.level;

            // Проверяем, не инициализировали ли уже этот превью
            if (this.previews.has(levelId)) {
                return;
            }

            // Очищаем контейнер (на всякий случай)
            previewEl.innerHTML = '';

            // Создаем контейнер для анимации
            const canvasContainer = document.createElement('div');
            canvasContainer.className = 'preview-canvas';
            previewEl.appendChild(canvasContainer);

            // Загружаем изображения для этого уровня
            this.loadLevelImages(levelId).then(() => {
                // Создаем статичное превью
                this.createStaticPreview(levelId, canvasContainer);

                // Сохраняем ссылку на контейнер
                this.previews.set(levelId, {
                    element: previewEl,
                    canvas: canvasContainer,
                    isAnimating: false,
                    animationFrame: null,
                    levelCard: previewEl.closest('.level-card')
                });
            }).catch(error => {
                console.error(`PreviewManager: Ошибка загрузки изображений для уровня ${levelId}:`, error);
                this.showError(canvasContainer);
            });
        });
    }

    // Загрузка изображений для уровня
    async loadLevelImages(levelId) {
        // Для всех уровней нам нужны матрешки и контуры
        const colors = ['red', 'blue', 'yellow', 'pink']; // Добавили pink для уровня 2
        const promises = [];

        // Загружаем цветные матрешки и их контуры
        colors.forEach(color => {
            if (!this.imagesCache[color]) {
                this.imagesCache[color] = {};
            }

            // Загружаем цветную матрешку
            const imgPromise = new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.imagesCache[color].full = img.src;
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Не удалось загрузить изображение: ${DollManager.getUrl(color)}`);
                    resolve();
                };
                img.src = DollManager.getUrl(color);
            });

            // Загружаем контур матрешки (только для уровня 1)
            if (levelId === '1') {
                const outlinePromise = new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        this.imagesCache[color].outline = img.src;
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`Не удалось загрузить изображение: ${DollManager.getOutlineUrl(color)}`);
                        resolve();
                    };
                    img.src = DollManager.getOutlineUrl(color);
                });
                promises.push(outlinePromise);
            }

            promises.push(imgPromise);
        });

        // Загружаем черную матрешку (не контур, а обычную)
        if (!this.imagesCache.black) {
            this.imagesCache.black = {};
        }

        const blackDollPromise = new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.imagesCache.black.full = img.src;
                resolve();
            };
            img.onerror = () => {
                console.warn(`Не удалось загрузить черную матрешку: ${DollManager.getUrl('black')}`);
                resolve();
            };
            img.src = DollManager.getUrl('black');
        });

        promises.push(blackDollPromise);

        // Для уровня 1 также нужен черный контур
        if (levelId === '1') {
            const blackOutlinePromise = new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.imagesCache.black.outline = img.src;
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Не удалось загрузить черный контур: ${DollManager.getOutlineUrl('black')}`);
                    resolve();
                };
                img.src = DollManager.getOutlineUrl('black');
            });
            promises.push(blackOutlinePromise);
        }

        return Promise.all(promises);
    }

    // Создание статичного превью (начальное состояние)
    createStaticPreview(levelId, container) {
        container.innerHTML = '';

        switch (levelId) {
            case '1':
                this.createLevel1StaticPreview(container);
                break;
            case '2':
                this.createLevel2StaticPreview(container);
                break;
            case '3':
                this.createLevel3StaticPreview(container);
                break;
            case '4':
                this.createLevel4StaticPreview(container);
                break;
            default:
                this.createDefaultPreview(container);
        }
    }

    // Статичное превью для уровня 1: черный контур с маленькой красной матрешкой
    createLevel1StaticPreview(container) {
        if (!this.imagesCache.black?.outline || !this.imagesCache.red?.full) {
            this.showLoading(container);
            setTimeout(() => this.createLevel1StaticPreview(container), 100);
            return;
        }

        // Создаем черный контур
        const blackOutline = new Image();
        blackOutline.src = this.imagesCache.black.outline;
        blackOutline.className = 'preview-doll doll-outline';
        blackOutline.style.transform = 'translate(-50%, -50%) scale(0.8)';
        blackOutline.setAttribute('data-outline-color', 'black');
        blackOutline.style.zIndex = '1';

        // Создаем маленькую красную матрешку
        const redDoll = new Image();
        redDoll.src = this.imagesCache.red.full;
        redDoll.className = 'preview-doll';
        redDoll.style.transform = 'translate(-50%, -50%) scale(0.2)';
        redDoll.style.zIndex = '2';

        container.appendChild(blackOutline);
        container.appendChild(redDoll);
    }

    // Настройка обработчиков наведения мыши
    setupHoverListeners() {
        // Добавляем обработчики ко всем карточкам уровней
        document.querySelectorAll('.level-card').forEach(levelCard => {
            const levelId = levelCard.querySelector('.play-button')?.dataset.level;

            if (!levelId) return;

            // Проверяем, не добавлены ли уже обработчики
            if (levelCard.dataset.previewListenersAdded) return;

            levelCard.addEventListener('mouseenter', (e) => {
                this.startPreviewAnimation(levelId);
            });

            levelCard.addEventListener('mouseleave', (e) => {
                this.stopPreviewAnimation(levelId);
            });

            levelCard.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startPreviewAnimation(levelId);
            }, { passive: false });

            levelCard.addEventListener('touchend', (e) => {
                e.preventDefault();
                setTimeout(() => this.stopPreviewAnimation(levelId), 1000);
            }, { passive: false });

            // Помечаем, что обработчики добавлены
            levelCard.dataset.previewListenersAdded = 'true';
        });
    }

    // Запуск анимации превью
    startPreviewAnimation(levelId) {
        const preview = this.previews.get(levelId);
        if (!preview || preview.isAnimating) return;

        preview.isAnimating = true;

        switch (levelId) {
            case '1':
                this.animateLevel1Preview(preview);
                break;
            case '2':
                this.animateLevel2Preview(preview);
                break;
            case '3':
                this.animateLevel3Preview(preview);
                break;
            case '4':
                this.animateLevel4Preview(preview);
                break;
            default:
                console.warn(`Неизвестный уровень: ${levelId}`);
        }
    }

    // Остановка анимации превью
    stopPreviewAnimation(levelId) {
        const preview = this.previews.get(levelId);
        if (!preview || !preview.isAnimating) return;

        preview.isAnimating = false;

        if (preview.animationFrame) {
            cancelAnimationFrame(preview.animationFrame);
            preview.animationFrame = null;
        }

        this.createStaticPreview(levelId, preview.canvas);
    }

    createLevel1StaticPreview(container) {
        if (!this.imagesCache.black?.outline || !this.imagesCache.red?.full) {
            this.showLoading(container);
            setTimeout(() => this.createLevel1StaticPreview(container), 100);
            return;
        }

        // Создаем черный контур
        const blackOutline = new Image();
        blackOutline.src = this.imagesCache.black.outline;
        blackOutline.className = 'preview-doll doll-outline';
        blackOutline.style.transform = 'translate(-50%, -50%) scale(1.0)';
        blackOutline.setAttribute('data-outline-color', 'black');
        blackOutline.style.zIndex = '1';

        // Создаем маленькую красную матрешку
        const redDoll = new Image();
        redDoll.src = this.imagesCache.red.full;
        redDoll.className = 'preview-doll';
        redDoll.style.transform = 'translate(-50%, -50%) scale(0.2)';
        redDoll.style.zIndex = '2';

        // Создаем синий контур (чуть меньше)
        const blueOutline = new Image();
        blueOutline.src = this.imagesCache.blue?.outline || this.imagesCache.red.outline;
        blueOutline.className = 'preview-doll doll-outline';
        blueOutline.style.transform = 'translate(-50%, -50%) scale(0.8)';
        blueOutline.style.opacity = '0.7';
        blueOutline.style.zIndex = '3';

        // Создаем желтый контур (еще меньше)
        const yellowOutline = new Image();
        yellowOutline.src = this.imagesCache.yellow?.outline || this.imagesCache.red.outline;
        yellowOutline.className = 'preview-doll doll-outline';
        yellowOutline.style.transform = 'translate(-50%, -50%) scale(0.6)';
        yellowOutline.style.opacity = '0.7';
        yellowOutline.style.zIndex = '4';

        container.appendChild(blackOutline);
        container.appendChild(blueOutline);
        container.appendChild(yellowOutline);
        container.appendChild(redDoll);
    }

    animateLevel1Preview(preview) {
        const container = preview.canvas;
        const colors = ['red', 'blue', 'yellow'];
        let currentColorIndex = 0;
        let currentScale = 0.2;
        let isGrowing = true;
        let lastFrameTime = 0;
        let currentDoll = null;
        const maxScales = [0.95, 0.8, 0.65]; // Разные максимальные размеры для каждой матрешки
        const startScales = [0.2, 0.15, 0.1]; // Стартовые размеры
        const growSpeed = 0.6; // Скорость роста
        const pauseBetweenDolls = 100; // Пауза между матрешками (мс)
        let pauseUntil = 0;
        const outlines = []; // Массив для хранения созданных контуров

        // Очищаем контейнер
        container.innerHTML = '';

        // Создаем черный контур (внешний)
        const blackOutline = new Image();
        blackOutline.src = this.imagesCache.black.outline;
        blackOutline.className = 'preview-doll doll-outline';
        blackOutline.style.transform = 'translate(-50%, -50%) scale(1.0)';
        blackOutline.setAttribute('data-outline-color', 'black');
        blackOutline.style.zIndex = '1';

        container.appendChild(blackOutline);
        outlines.push(blackOutline);

        // Создаем первую матрешку (красную)
        currentDoll = new Image();
        currentDoll.src = this.imagesCache[colors[currentColorIndex]].full;
        currentDoll.className = 'preview-doll';
        currentDoll.style.transform = `translate(-50%, -50%) scale(${startScales[currentColorIndex]})`;
        currentDoll.style.zIndex = '2';

        container.appendChild(currentDoll);

        const animate = (currentTime) => {
            if (!preview.isAnimating) return;

            // Запрашиваем следующий кадр
            preview.animationFrame = requestAnimationFrame(animate);

            if (!lastFrameTime) lastFrameTime = currentTime;
            const deltaTime = (currentTime - lastFrameTime) / 1000;
            lastFrameTime = currentTime;

            // Если пауза между матрешками
            if (pauseUntil > currentTime) {
                return;
            }

            if (isGrowing) {
                // Растим текущую матрешку
                currentScale += growSpeed * deltaTime;

                if (currentScale >= maxScales[currentColorIndex]) {
                    // Достигли максимального размера - превращаем в контур
                    isGrowing = false;

                    // Создаем контур из текущей матрешки
                    const outlineDoll = new Image();
                    outlineDoll.src = this.imagesCache[colors[currentColorIndex]].outline;
                    outlineDoll.className = 'preview-doll doll-outline';
                    outlineDoll.style.transform = `translate(-50%, -50%) scale(${currentScale * 0.8})`;
                    outlineDoll.style.zIndex = (3 + currentColorIndex).toString();
                    outlineDoll.setAttribute('data-outline-color', colors[currentColorIndex]);

                    container.appendChild(outlineDoll);
                    outlines.push(outlineDoll);

                    // Удаляем растущую матрешку
                    container.removeChild(currentDoll);

                    // Переходим к следующей матрешке
                    currentColorIndex++;

                    if (currentColorIndex < colors.length) {
                        // Создаем следующую матрешку
                        pauseUntil = currentTime + pauseBetweenDolls;
                    } else {
                        // Все матрешки превращены в контуры
                        // Ждем и перезапускаем анимацию
                        pauseUntil = currentTime + 500; // Пауза перед перезапуском
                    }
                }
            } else {
                // Создаем новую матрешку или перезапускаем анимацию
                if (currentColorIndex < colors.length) {
                    // Создаем следующую матрешку
                    currentScale = startScales[currentColorIndex];
                    isGrowing = true;

                    currentDoll = new Image();
                    currentDoll.src = this.imagesCache[colors[currentColorIndex]].full;
                    currentDoll.className = 'preview-doll';
                    currentDoll.style.transform = `translate(-50%, -50%) scale(${currentScale})`;
                    currentDoll.style.zIndex = '2';

                    container.appendChild(currentDoll);
                } else {
                    // Перезапускаем анимацию - удаляем все контуры (кроме черного)
                    outlines.forEach((outline, index) => {
                        if (index > 0) { // Оставляем черный контур (индекс 0)
                            container.removeChild(outline);
                        }
                    });

                    // Очищаем массив контуров (оставляем только черный)
                    outlines.splice(1);

                    // Сбрасываем параметры
                    currentColorIndex = 0;
                    currentScale = startScales[currentColorIndex];
                    isGrowing = true;

                    // Создаем первую матрешку
                    currentDoll = new Image();
                    currentDoll.src = this.imagesCache[colors[currentColorIndex]].full;
                    currentDoll.className = 'preview-doll';
                    currentDoll.style.transform = `translate(-50%, -50%) scale(${currentScale})`;
                    currentDoll.style.zIndex = '2';

                    container.appendChild(currentDoll);
                }
            }

            // Обновляем трансформацию текущей матрешки (если она существует)
            if (currentDoll && currentDoll.parentNode === container) {
                currentDoll.style.transform = `translate(-50%, -50%) scale(${currentScale})`;
            }
        };

        // Запускаем анимацию
        preview.animationFrame = requestAnimationFrame(animate);
    }

    createLevel2StaticPreview(container) {
        container.innerHTML = '';

        // Создаем сетку 2x2 черных матрешек (меньшего размера)
        const positions = [
            { top: '28%', left: '38%' },  // левая верхняя
            { top: '28%', left: '62%' },  // правая верхняя
            { top: '73%', left: '38%' },  // левая нижняя
            { top: '73%', left: '62%' }   // правая нижняя
        ];

        positions.forEach((pos, index) => {
            const blackDoll = new Image();
            blackDoll.src = this.imagesCache.black?.full || DollManager.getUrl('black');
            blackDoll.className = 'preview-doll';
            blackDoll.style.top = pos.top;
            blackDoll.style.left = pos.left;
            blackDoll.style.transform = 'translate(-50%, -50%) scale(0.5)';
            blackDoll.style.opacity = '1';
            blackDoll.style.zIndex = '1';
            blackDoll.setAttribute('data-index', index);
            blackDoll.setAttribute('data-position', ['left-top', 'right-top', 'left-bottom', 'right-bottom'][index]);

            container.appendChild(blackDoll);
        });
    }

    animateLevel2Preview(preview) {
        const container = preview.canvas;

        // Очищаем контейнер и создаем начальное состояние
        this.createLevel2StaticPreview(container);

        // Получаем все черные матрешки
        const blackDolls = Array.from(container.querySelectorAll('.preview-doll'));
        const dolls = blackDolls.map((doll, index) => ({
            element: doll,
            color: null,
            isFlipped: false,
            isMatched: false,
            colorElement: null,
            index: index
        }));

        let animationStep = 0;
        let lastStepTime = Date.now();
        let animationId = null;

        // Функция для открытия матрешки
        const flipCard = (dollIndex, color) => {
            const doll = dolls[dollIndex];
            if (!doll || doll.isMatched) return;

            doll.isFlipped = true;
            doll.color = color;

            // Создаем цветную версию поверх черной
            const colorDoll = new Image();
            colorDoll.src = this.imagesCache[color]?.full || DollManager.getUrl(color);
            colorDoll.className = 'preview-doll';
            colorDoll.style.top = doll.element.style.top;
            colorDoll.style.left = doll.element.style.left;
            colorDoll.style.transform = 'translate(-50%, -50%) scale(0.5)';
            colorDoll.style.zIndex = '2';
            colorDoll.style.opacity = '0';
            colorDoll.setAttribute('data-flipped', 'true');
            colorDoll.setAttribute('data-color', color);

            doll.colorElement = colorDoll;
            container.appendChild(colorDoll);

            // Анимация появления
            setTimeout(() => {
                colorDoll.style.transition = 'opacity 0.3s ease';
                colorDoll.style.opacity = '1';
            }, 10);

            return colorDoll;
        };

        // Функция для скрытия матрешки
        const unflipCard = (dollIndex) => {
            const doll = dolls[dollIndex];
            if (!doll || !doll.isFlipped || doll.isMatched) return;

            if (doll.colorElement) {
                // Анимация исчезновения
                doll.colorElement.style.transition = 'opacity 0.3s ease';
                doll.colorElement.style.opacity = '0';

                setTimeout(() => {
                    if (doll.colorElement && doll.colorElement.parentNode) {
                        container.removeChild(doll.colorElement);
                    }
                    doll.colorElement = null;
                    doll.isFlipped = false;
                    doll.color = null;
                }, 300);
            }
        };

        // Функция для совпадения пары
        const matchCards = (dollIndex1, dollIndex2) => {
            const doll1 = dolls[dollIndex1];
            const doll2 = dolls[dollIndex2];

            if (!doll1 || !doll2) return;

            doll1.isMatched = true;
            doll2.isMatched = true;

            // Анимация совпадения для цветных матрешек
            if (doll1.colorElement) {
                doll1.colorElement.style.transition = 'all 0.4s ease';
                doll1.colorElement.style.opacity = '0';
                doll1.colorElement.style.transform = 'translate(-50%, -50%) scale(0)';
            }

            if (doll2.colorElement) {
                doll2.colorElement.style.transition = 'all 0.4s ease';
                doll2.colorElement.style.opacity = '0';
                doll2.colorElement.style.transform = 'translate(-50%, -50%) scale(0)';
            }

            // Также скрываем черные матрешки
            doll1.element.style.opacity = '0';
            doll2.element.style.opacity = '0';

            // Удаляем элементы после анимации
            setTimeout(() => {
                if (doll1.colorElement && doll1.colorElement.parentNode) {
                    container.removeChild(doll1.colorElement);
                }
                if (doll2.colorElement && doll2.colorElement.parentNode) {
                    container.removeChild(doll2.colorElement);
                }
                doll1.colorElement = null;
                doll2.colorElement = null;
            }, 400);
        };

        // Основная функция анимации с использованием setTimeout для более простого управления временем
        const animateStep = () => {
            if (!preview.isAnimating) {
                if (animationId) {
                    clearTimeout(animationId);
                }
                return;
            }

            const now = Date.now();
            const timeSinceLastStep = now - lastStepTime;

            // Управление анимацией по шагам
            switch (animationStep) {
                case 0: // Начало - открываем правую верхнюю (синюю)
                    flipCard(1, 'sea'); // индекс 1 = правая верхняя
                    animationStep = 1;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 800);
                    break;

                case 1: // Открываем левую верхнюю (розовую)
                    flipCard(0, 'pink'); // индекс 0 = левая верхняя
                    animationStep = 2;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 800);
                    break;

                case 2: // Скрываем обе матрешки
                    unflipCard(1); // правая верхняя
                    unflipCard(0); // левая верхняя
                    animationStep = 3;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 800);
                    break;

                case 3: // Открываем правую верхнюю (синюю) снова
                    flipCard(1, 'sea');
                    animationStep = 4;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 800);
                    break;

                case 4: // Открываем левую нижнюю (синюю)
                    flipCard(2, 'sea'); // индекс 2 = левая нижняя
                    animationStep = 5;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 800);
                    break;

                case 5: // Совпадение синих матрешек
                    matchCards(1, 2); // правая верхняя и левая нижняя
                    animationStep = 6;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 800);
                    break;

                case 6: // Открываем левую верхнюю (розовую)
                    flipCard(0, 'pink');
                    animationStep = 7;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 800);
                    break;

                case 7: // Открываем правую нижнюю (розовую)
                    flipCard(3, 'pink'); // индекс 3 = правая нижняя
                    animationStep = 8;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 800);
                    break;

                case 8: // Совпадение розовых матрешек
                    matchCards(0, 3); // левая верхняя и правая нижняя
                    animationStep = 9;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 1000);
                    break;

                case 9: // Перезапуск анимации
                    // Сбрасываем состояние
                    dolls.forEach(doll => {
                        doll.isFlipped = false;
                        doll.isMatched = false;
                        doll.color = null;
                        if (doll.colorElement && doll.colorElement.parentNode) {
                            container.removeChild(doll.colorElement);
                        }
                        doll.colorElement = null;
                        doll.element.style.opacity = '1';
                    });

                    // Удаляем все элементы и создаем заново
                    container.innerHTML = '';
                    this.createLevel2StaticPreview(container);

                    // Обновляем ссылки на элементы
                    const newBlackDolls = Array.from(container.querySelectorAll('.preview-doll'));
                    newBlackDolls.forEach((newDoll, index) => {
                        if (dolls[index]) {
                            dolls[index].element = newDoll;
                        }
                    });

                    animationStep = 0;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 500);
                    break;
            }
        };

        // Запускаем анимацию
        animationId = setTimeout(animateStep, 500);
        preview.animationFrame = animationId; // Сохраняем ID для отмены
    }

    animateLevel3Preview(preview) {
        const container = preview.canvas;

        container.innerHTML = '';

        const dolls = [
            {
                color: 'orange',
                letter: 'G',
                order: 2,
                position: 0,
                openOrder: 2
            },
            {
                color: 'turquoise',
                letter: 'A',
                order: 4,
                position: 1,
                openOrder: 4
            },
            {
                color: 'bordo',
                letter: 'I',
                order: 1,
                position: 2,
                openOrder: 1
            },
            {
                color: 'yellow',
                letter: 'R',
                order: 3,
                position: 3,
                openOrder: 3
            }
        ];

        dolls.sort((a, b) => a.position - b.position);

        const dollElements = dolls.map((doll, index) => {
            const dollItem = document.createElement('div');
            dollItem.className = 'doll-preview-container';
            dollItem.style.position = 'absolute';
            dollItem.style.width = '20%';
            dollItem.style.height = '80%';
            dollItem.style.bottom = '-45%';
            dollItem.style.left = `${15 + index * 23}%`;
            dollItem.style.transform = 'translate(-50%, -50%)';
            dollItem.style.zIndex = '1';
            dollItem.setAttribute('data-color', doll.color);
            dollItem.setAttribute('data-letter', doll.letter);
            dollItem.setAttribute('data-order', doll.order);

            // Нижняя часть матрешки
            const bottomImg = new Image();
            bottomImg.src = DollManager.getAvatarUrl(doll.color, 'down');
            bottomImg.className = 'doll-bottom-preview';
            bottomImg.style.width = '100%';
            bottomImg.style.height = '50%';
            bottomImg.style.objectFit = 'contain';
            bottomImg.style.objectPosition = 'center top';
            bottomImg.style.position = 'absolute';
            bottomImg.style.bottom = '0';
            bottomImg.style.left = '0';
            bottomImg.style.zIndex = '1';

            // Верхняя часть матрешки (закрытая)
            const topImg = new Image();
            topImg.src = DollManager.getAvatarUrl(doll.color, 'up');
            topImg.className = 'doll-top-preview';
            topImg.style.width = '100%';
            topImg.style.height = '50%';
            topImg.style.objectFit = 'contain';
            topImg.style.objectPosition = 'center bottom';
            topImg.style.position = 'absolute';
            topImg.style.top = '0';
            topImg.style.left = '0';
            topImg.style.zIndex = '2';
            topImg.style.transformOrigin = 'bottom center';
            topImg.style.transition = 'transform 0.5s ease';

            // Буква внутри матрешки (изначально скрыта)
            const letterDiv = document.createElement('div');
            letterDiv.className = 'doll-letter-preview';
            letterDiv.textContent = doll.letter;
            letterDiv.style.position = 'absolute';
            letterDiv.style.top = '40%';
            letterDiv.style.left = '50%';
            letterDiv.style.transform = 'translate(-50%, -50%)';
            letterDiv.style.fontSize = '30px';
            letterDiv.style.fontWeight = 'bold';
            letterDiv.style.color = 'var(--color-text-primary)';
            letterDiv.style.opacity = '0';
            letterDiv.style.zIndex = '0';
            letterDiv.style.transition = 'opacity 0.3s ease, transform 0.5s ease';
            letterDiv.style.fontFamily = 'Kelly Slab, Arial Black, Impact, sans-serif';
            letterDiv.style.textShadow = '1px 1px 2px rgba(0,0,0,0.3)';

            dollItem.appendChild(bottomImg);
            dollItem.appendChild(topImg);
            dollItem.appendChild(letterDiv);
            container.appendChild(dollItem);

            return {
                element: dollItem,
                top: topImg,
                bottom: bottomImg,
                letter: letterDiv,
                color: doll.color,
                letterChar: doll.letter,
                order: doll.order,
                position: doll.position,
                openOrder: doll.openOrder,
                isOpened: false
            };
        });

        let currentStep = 0;
        let animationId = null;

        // Сортируем по порядку открытия
        const dollsByOpenOrder = [...dollElements].sort((a, b) => a.openOrder - b.openOrder);

        // Функция открытия матрешки
        const openDoll = (doll) => {
            if (doll.isOpened) return;

            doll.isOpened = true;

            // Анимация открытия верхней части (как в игре)
            doll.top.style.transform = 'translateY(-50%) rotate(-10deg)';

            // Показываем букву
            setTimeout(() => {
                doll.letter.style.opacity = '1';
                doll.letter.style.transform = 'translate(-50%, -60%)';
            }, 100);
        };

        // Функция закрытия всех матрешек
        const closeAllDolls = () => {
            dollElements.forEach(doll => {
                doll.isOpened = false;
                doll.top.style.transform = 'translateY(0) rotate(0deg)';
                doll.letter.style.opacity = '0';
                doll.letter.style.transform = 'translate(-50%, -50%)';
            });
        };

        // Функция анимации
        const animateStep = () => {
            if (!preview.isAnimating) {
                if (animationId) {
                    clearTimeout(animationId);
                }
                return;
            }

            switch (currentStep) {
                case 0: // Начало - все матрешки закрыты
                    closeAllDolls();
                    currentStep = 1;
                    animationId = setTimeout(animateStep, 500);
                    break;

                case 1: // Открываем первую матрешку (бордовую, буква I)
                    openDoll(dollsByOpenOrder[0]); // bordo (I) - первый открывается
                    currentStep = 2;
                    animationId = setTimeout(animateStep, 500);
                    break;

                case 2: // Открываем вторую матрешку (оранжевую, буква G)
                    openDoll(dollsByOpenOrder[1]); // orange (G) - второй открывается
                    currentStep = 3;
                    animationId = setTimeout(animateStep, 500);
                    break;

                case 3: // Открываем третью матрешку (желтую, буква R)
                    openDoll(dollsByOpenOrder[2]); // yellow (R) - третий открывается
                    currentStep = 4;
                    animationId = setTimeout(animateStep, 500);
                    break;

                case 4: // Открываем четвертую матрешку (бирюзовую, буква A)
                    openDoll(dollsByOpenOrder[3]); // turquoise (A) - четвертый открывается
                    currentStep = 5;
                    animationId = setTimeout(animateStep, 500);
                    break;

                case 5: // Все матрешки открыты, ждем и перезапускаем
                    currentStep = 6;
                    animationId = setTimeout(animateStep, 500);
                    break;

                case 6: // Перезапускаем анимацию
                    currentStep = 0;
                    animationId = setTimeout(animateStep, 1000);
                    break;
            }
        };

        // Запускаем анимацию
        animationId = setTimeout(animateStep, 500);
        preview.animationFrame = animationId;
    }

    createLevel3StaticPreview(container) {
        container.innerHTML = '';

        // Четыре цветных матрешки в ряд: orange, turquoise, bordo, yellow
        const dolls = [
            { color: 'orange', letter: 'G', order: 2 },
            { color: 'turquoise', letter: 'A', order: 4 },
            { color: 'bordo', letter: 'I', order: 1 },
            { color: 'yellow', letter: 'R', order: 3 }
        ];

        dolls.forEach((doll, index) => {
            const dollItem = document.createElement('div');
            dollItem.className = 'doll-preview-container';
            dollItem.style.position = 'absolute';
            dollItem.style.width = '20%';
            dollItem.style.height = '80%';
            dollItem.style.bottom = '-45%';
            dollItem.style.left = `${15 + index * 23}%`; // Равномерное распределение
            dollItem.style.transform = 'translate(-50%, -50%)';
            dollItem.style.zIndex = '1';

            // Нижняя часть матрешки
            const bottomImg = new Image();
            bottomImg.src = DollManager.getAvatarUrl(doll.color, 'down');
            bottomImg.className = 'doll-bottom-preview';
            bottomImg.style.width = '100%';
            bottomImg.style.height = '50%';
            bottomImg.style.objectFit = 'contain';
            bottomImg.style.objectPosition = 'center top';
            bottomImg.style.position = 'absolute';
            bottomImg.style.bottom = '0';
            bottomImg.style.left = '0';
            bottomImg.style.zIndex = '1';

            // Верхняя часть матрешки (закрытая)
            const topImg = new Image();
            topImg.src = DollManager.getAvatarUrl(doll.color, 'up');
            topImg.className = 'doll-top-preview';
            topImg.style.width = '100%';
            topImg.style.height = '50%';
            topImg.style.objectFit = 'contain';
            topImg.style.objectPosition = 'center bottom';
            topImg.style.position = 'absolute';
            topImg.style.top = '0';
            topImg.style.left = '0';
            topImg.style.zIndex = '2';
            topImg.style.transformOrigin = 'bottom center';

            dollItem.appendChild(bottomImg);
            dollItem.appendChild(topImg);
            container.appendChild(dollItem);
        });
    }

    animateLevel4Preview(preview) {
        const container = preview.canvas;

        // Очищаем и создаем начальное состояние
        this.createLevel4StaticPreview(container);

        // Получаем все матрешки уровня 4
        const dollElements = Array.from(container.querySelectorAll('.preview-level4-doll'));

        if (dollElements.length === 0) return;

        // Инициализируем данные для анимации
        const dolls = dollElements.map((element, index) => {
            const rect = element.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            // Преобразуем текущие проценты в пиксели
            const currentTop = parseFloat(element.style.top);
            const currentLeft = parseFloat(element.style.left);

            // Начальная позиция в пикселях относительно контейнера
            const top = (currentTop / 100) * containerRect.height;
            const left = (currentLeft / 100) * containerRect.width;

            // Размер элемента
            const size = parseFloat(element.style.width) / 100 * containerRect.width;

            // Случайное направление движения (в пикселях за кадр)
            const speed = 1.8; // Одинаковая скорость для всех
            const angle = Math.random() * Math.PI * 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            return {
                element,
                x: left,
                y: top,
                width: size,
                height: size * 0.8,
                vx,
                vy,
                color: element.getAttribute('data-color'),
                size: parseFloat(element.getAttribute('data-size'))
            };
        });

        let animationId = null;
        let lastTime = 0;

        // Функция обновления анимации
        const animate = (currentTime) => {
            if (!preview.isAnimating) {
                if (animationId) {
                    cancelAnimationFrame(animationId);
                }
                return;
            }

            if (!lastTime) lastTime = currentTime;
            const deltaTime = Math.min(currentTime - lastTime, 16); // Макс 60 FPS
            lastTime = currentTime;

            // Получаем размеры контейнера
            const containerRect = container.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const containerHeight = containerRect.height;

            // Обновляем позиции всех матрешек
            dolls.forEach(doll => {
                // Обновляем позицию
                doll.x += doll.vx * (deltaTime / 16); // Нормализуем к 60 FPS
                doll.y += doll.vy * (deltaTime / 16);

                // Проверка столкновения со стенками
                const halfWidth = doll.width * 0.5;
                const halfHeight = doll.height * 0.85;

                // Левая стенка
                if (doll.x - halfWidth <= 0) {
                    doll.x = halfWidth;
                    doll.vx = Math.abs(doll.vx); // Отражение
                }

                // Правая стенка
                if (doll.x + halfWidth >= containerWidth) {
                    doll.x = containerWidth - halfWidth;
                    doll.vx = -Math.abs(doll.vx); // Отражение
                }

                // Верхняя стенка
                if (doll.y - halfHeight <= 0) {
                    doll.y = halfHeight;
                    doll.vy = Math.abs(doll.vy); // Отражение
                }

                // Нижняя стенка
                if (doll.y + halfHeight >= containerHeight) {
                    doll.y = containerHeight - halfHeight;
                    doll.vy = -Math.abs(doll.vy); // Отражение
                }

                // Преобразуем обратно в проценты для стилей
                const topPercent = (doll.y / containerHeight) * 100;
                const leftPercent = (doll.x / containerWidth) * 100;

                // Обновляем стиль элемента
                doll.element.style.top = `${topPercent}%`;
                doll.element.style.left = `${leftPercent}%`;
            });

            // Запрашиваем следующий кадр
            animationId = requestAnimationFrame(animate);
        };

        // Запускаем анимацию
        animationId = requestAnimationFrame(animate);
        preview.animationFrame = animationId;
    }

    createLevel4StaticPreview(container) {
        container.innerHTML = '';

        // 4 цветные матрешки разных размеров
        const dolls = [
            { color: 'red', size: 30, position: { x: 20, y: 60 } },
            { color: 'yellow', size: 25, position: { x: 80, y: 35 } },
            { color: 'blue', size: 20, position: { x: 45, y: 25 } },
            { color: 'green', size: 15, position: { x: 60, y: 75 } }
        ];

        dolls.forEach((doll, index) => {
            const dollImg = new Image();
            dollImg.src = this.imagesCache[doll.color]?.full || DollManager.getUrl(doll.color);
            dollImg.className = 'preview-doll preview-level4-doll';
            dollImg.style.width = `${doll.size * 0.8}%`;
            dollImg.style.height = 'auto';
            dollImg.style.top = `${doll.position.y}%`;
            dollImg.style.left = `${doll.position.x}%`;
            dollImg.style.transform = 'translate(-50%, -50%)';
            dollImg.style.position = 'absolute';
            dollImg.style.zIndex = (index).toString();
            dollImg.setAttribute('data-color', doll.color);
            dollImg.setAttribute('data-size', doll.size);
            dollImg.setAttribute('data-index', index);

            container.appendChild(dollImg);
        });
    }

    createDefaultPreview(container) {
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
                <div style="color: var(--color-text-secondary); font-size: 14px; text-align: center; padding: 20px;">
                    Превью уровня
                </div>
            </div>
        `;
    }

    // Показ загрузки
    showLoading(container) {
        container.innerHTML = `
            <div class="preview-loading">
                <div class="preview-loading-spinner"></div>
                <span>Загрузка...</span>
            </div>
        `;
    }

    // Показать ошибку
    showError(container) {
        container.innerHTML = `
            <div style="color: var(--color-danger); font-size: 12px; text-align: center; padding: 20px;">
                Ошибка загрузки превью
            </div>
        `;
    }
}

// Создаем глобальный экземпляр менеджера превью
window.PreviewManager = new PreviewManager();

// Функция для ручной инициализации (вызывается из menu.js)
window.initPreviews = function () {
    if (window.PreviewManager) {
        window.PreviewManager.init();
    }
};

// Автоматическая инициализация при полной загрузке страницы
window.addEventListener('load', () => {
    // Ждем немного дольше для полной загрузки
    setTimeout(() => {
        if (window.PreviewManager && !window.PreviewManager.isInitialized) {
            window.PreviewManager.init();
        }
    }, 300);
});