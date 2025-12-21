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
        const colors = ['red', 'blue', 'yellow', 'pink', 'orange', 'bordo', 'sea', 'turquoise', 'black'];
        const promises = [];

        // Загружаем цветные матрешки
        colors.forEach(color => {
            if (!this.imagesCache[color]) {
                this.imagesCache[color] = {};
            }

            // Загружаем цветную матрешку (полную)
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

            promises.push(imgPromise);
        });

        // Для уровня 1 загружаем контуры
        if (levelId === '1') {
            colors.forEach(color => {
                const outlinePromise = new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        this.imagesCache[color].outline = img.src;
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`Не удалось загрузить контур: ${DollManager.getOutlineUrl(color)}`);
                        resolve();
                    };
                    img.src = DollManager.getOutlineUrl(color);
                });
                promises.push(outlinePromise);
            });
        }

        // Для уровня 3 загружаем верх и низ матрёшек
        if (levelId === '3') {
            colors.forEach(color => {
                const upPromise = new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        this.imagesCache[color].up = img.src;
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`Не удалось загрузить верх матрёшки: ${DollManager.getAvatarUrl(color, 'up')}`);
                        resolve();
                    };
                    img.src = DollManager.getAvatarUrl(color, 'up');
                });

                const downPromise = new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        this.imagesCache[color].down = img.src;
                        resolve();
                    };
                    img.onerror = () => {
                        console.warn(`Не удалось загрузить низ матрёшки: ${DollManager.getAvatarUrl(color, 'down')}`);
                        resolve();
                    };
                    img.src = DollManager.getAvatarUrl(color, 'down');
                });

                promises.push(upPromise, downPromise);
            });
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

    // СТАТИЧНОЕ ПРЕВЬЮ ДЛЯ УРОВНЯ 3
    createLevel3StaticPreview(container) {
        if (!this.imagesCache.orange || !this.imagesCache.turquoise || 
            !this.imagesCache.bordo || !this.imagesCache.yellow) {
            this.showLoading(container);
            setTimeout(() => this.createLevel3StaticPreview(container), 100);
            return;
        }

        container.innerHTML = '';
        
        // Создаем 4 цветные матрёшки в ряд
        const dolls = [
            { color: 'orange', letter: 'G', order: 2 },
            { color: 'turquoise', letter: 'A', order: 4 },
            { color: 'bordo', letter: 'I', order: 1 },
            { color: 'yellow', letter: 'R', order: 3 }
        ];

        dolls.forEach((doll, index) => {
            const dollContainer = document.createElement('div');
            dollContainer.className = 'preview-doll-container';
            dollContainer.style.position = 'absolute';
            dollContainer.style.width = '20%';
            dollContainer.style.height = '80%';
            dollContainer.style.left = `${15 + index * 20}%`;
            dollContainer.style.top = '10%';
            dollContainer.style.display = 'flex';
            dollContainer.style.flexDirection = 'column';
            dollContainer.style.alignItems = 'center';
            dollContainer.style.justifyContent = 'flex-end';

            // Нижняя часть матрёшки (основание)
            const bottomImg = new Image();
            bottomImg.src = this.imagesCache[doll.color].down || DollManager.getAvatarUrl(doll.color, 'down');
            bottomImg.className = 'doll-part doll-bottom';
            bottomImg.style.width = '100%';
            bottomImg.style.height = 'auto';
            bottomImg.style.maxHeight = '70%';
            bottomImg.style.objectFit = 'contain';
            bottomImg.style.zIndex = '1';

            // Верхняя часть матрёшки (крышка)
            const topImg = new Image();
            topImg.src = this.imagesCache[doll.color].up || DollManager.getAvatarUrl(doll.color, 'up');
            topImg.className = 'doll-part doll-top';
            topImg.style.width = '100%';
            topImg.style.height = 'auto';
            topImg.style.maxHeight = '70%';
            topImg.style.objectFit = 'contain';
            topImg.style.position = 'relative';
            topImg.style.zIndex = '2';

            // Буква (скрыта)
            const letterDiv = document.createElement('div');
            letterDiv.className = 'preview-letter';
            letterDiv.textContent = doll.letter;
            letterDiv.style.position = 'absolute';
            letterDiv.style.bottom = '5%';
            letterDiv.style.left = '50%';
            letterDiv.style.transform = 'translateX(-50%)';
            letterDiv.style.fontSize = '2rem';
            letterDiv.style.fontWeight = 'bold';
            letterDiv.style.color = 'var(--color-text-primary)';
            letterDiv.style.opacity = '0';
            letterDiv.style.transition = 'opacity 0.3s ease';
            letterDiv.style.zIndex = '3';
            letterDiv.style.fontFamily = 'Kelly Slab, sans-serif';

            dollContainer.appendChild(bottomImg);
            dollContainer.appendChild(topImg);
            dollContainer.appendChild(letterDiv);
            container.appendChild(dollContainer);

            // Сохраняем ссылки на элементы для анимации
            dollContainer.dataset.color = doll.color;
            dollContainer.dataset.letter = doll.letter;
            dollContainer.dataset.order = doll.order;
            dollContainer.topImg = topImg;
            dollContainer.letterDiv = letterDiv;
            dollContainer.bottomImg = bottomImg;
        });
    }

    // АНИМАЦИЯ ПРЕВЬЮ ДЛЯ УРОВНЯ 3
    animateLevel3Preview(preview) {
        const container = preview.canvas;
        
        // Создаем статичное превью
        this.createLevel3StaticPreview(container);
        
        // Получаем все контейнеры матрёшек
        const dollContainers = Array.from(container.querySelectorAll('.preview-doll-container'));
        
        // Сортируем по порядку открытия
        const dolls = dollContainers.map(container => ({
            element: container,
            color: container.dataset.color,
            letter: container.dataset.letter,
            order: parseInt(container.dataset.order),
            isOpened: false,
            topImg: container.topImg,
            letterDiv: container.letterDiv,
            bottomImg: container.bottomImg
        })).sort((a, b) => a.order - b.order);

        let currentStep = 0;
        let animationId = null;

        // Функция открытия матрёшки
        const openDoll = (doll) => {
            return new Promise((resolve) => {
                // Анимация открытия (поднимаем верхнюю часть - крышку)
                doll.topImg.style.transform = 'translate(-50%, -40%) rotate(-10deg)';
                doll.topImg.style.left = '50%';
                doll.topImg.style.position = 'absolute';
                doll.topImg.style.transition = 'transform 0.5s ease, left 0.5s ease';
                
                // Показываем букву
                setTimeout(() => {
                    doll.letterDiv.style.opacity = '1';
                    doll.letterDiv.style.transform = 'translateX(-50%) translateY(-20px)';
                    doll.letterDiv.style.transition = 'all 0.3s ease 0.2s';
                    doll.isOpened = true;
                    resolve();
                }, 300);
            });
        };

        // Функция закрытия всех матрёшек
        const closeAllDolls = () => {
            return new Promise((resolve) => {
                dolls.forEach(doll => {
                    doll.topImg.style.transform = 'translate(-50%, 0) rotate(0deg)';
                    doll.topImg.style.left = '50%';
                    doll.topImg.style.position = 'relative';
                    doll.topImg.style.transition = 'transform 0.3s ease, left 0.3s ease';
                    doll.letterDiv.style.opacity = '0';
                    doll.letterDiv.style.transform = 'translateX(-50%) translateY(0)';
                    doll.isOpened = false;
                });
                
                setTimeout(resolve, 400);
            });
        };

        // Основная функция анимации
        const animateStep = () => {
            if (!preview.isAnimating) {
                if (animationId) {
                    clearTimeout(animationId);
                }
                return;
            }

            switch(currentStep) {
                case 0: // Начало - открываем бордовую (I)
                    openDoll(dolls[0]).then(() => {
                        currentStep = 1;
                        animationId = setTimeout(animateStep, 800);
                    });
                    break;
                    
                case 1: // Открываем оранжевую (G)
                    openDoll(dolls[1]).then(() => {
                        currentStep = 2;
                        animationId = setTimeout(animateStep, 800);
                    });
                    break;
                    
                case 2: // Открываем желтую (R)
                    openDoll(dolls[2]).then(() => {
                        currentStep = 3;
                        animationId = setTimeout(animateStep, 800);
                    });
                    break;
                    
                case 3: // Открываем бирюзовую (A) - слово собрано
                    openDoll(dolls[3]).then(() => {
                        currentStep = 4;
                        animationId = setTimeout(animateStep, 1500);
                    });
                    break;
                    
                case 4: // Пауза, затем закрываем все и начинаем заново
                    closeAllDolls().then(() => {
                        currentStep = 0;
                        animationId = setTimeout(animateStep, 500);
                    });
                    break;
            }
        };

        // Запускаем анимацию
        animationId = setTimeout(animateStep, 500);
        preview.animationFrame = animationId;
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

    // СТАТИЧНОЕ ПРЕВЬЮ ДЛЯ УРОВНЯ 1 (вернул как было)
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

    // АНИМАЦИЯ ПРЕВЬЮ ДЛЯ УРОВНЯ 1 (вернул как было)
    animateLevel1Preview(preview) {
        const container = preview.canvas;
        
        // Очищаем контейнер и создаем начальное состояние
        this.createLevel1StaticPreview(container);
        
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
            switch(animationStep) {
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
                    animationId = setTimeout(animateStep, 1200);
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
                    animationId = setTimeout(animateStep, 1000);
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
                    animationId = setTimeout(animateStep, 1500);
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

    // Статичное превью для уровня 2
    createLevel2StaticPreview(container) {
        container.innerHTML = '';
        const positions = [
            { top: '28%', left: '38%' },
            { top: '28%', left: '62%' },
            { top: '73%', left: '38%' },
            { top: '73%', left: '62%' }
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
            container.appendChild(blackDoll);
        });
    }

    // Анимация превью для уровня 2
    animateLevel2Preview(preview) {
        const container = preview.canvas;
        this.createLevel2StaticPreview(container);
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
        
        const flipCard = (dollIndex, color) => {
            const doll = dolls[dollIndex];
            if (!doll || doll.isMatched) return;
            doll.isFlipped = true;
            doll.color = color;
            const colorDoll = new Image();
            colorDoll.src = this.imagesCache[color]?.full || DollManager.getUrl(color);
            colorDoll.className = 'preview-doll';
            colorDoll.style.top = doll.element.style.top;
            colorDoll.style.left = doll.element.style.left;
            colorDoll.style.transform = 'translate(-50%, -50%) scale(0.5)';
            colorDoll.style.zIndex = '2';
            colorDoll.style.opacity = '0';
            doll.colorElement = colorDoll;
            container.appendChild(colorDoll);
            setTimeout(() => {
                colorDoll.style.transition = 'opacity 0.3s ease';
                colorDoll.style.opacity = '1';
            }, 10);
            return colorDoll;
        };
        
        const unflipCard = (dollIndex) => {
            const doll = dolls[dollIndex];
            if (!doll || !doll.isFlipped || doll.isMatched) return;
            if (doll.colorElement) {
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
        
        const matchCards = (dollIndex1, dollIndex2) => {
            const doll1 = dolls[dollIndex1];
            const doll2 = dolls[dollIndex2];
            if (!doll1 || !doll2) return;
            doll1.isMatched = true;
            doll2.isMatched = true;
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
            doll1.element.style.opacity = '0';
            doll2.element.style.opacity = '0';
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
        
        const animateStep = () => {
            if (!preview.isAnimating) {
                if (animationId) {
                    clearTimeout(animationId);
                }
                return;
            }
            
            const now = Date.now();
            switch(animationStep) {
                case 0:
                    flipCard(1, 'sea');
                    animationStep = 1;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 800);
                    break;
                case 1:
                    flipCard(0, 'pink');
                    animationStep = 2;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 1200);
                    break;
                case 2:
                    unflipCard(1);
                    unflipCard(0);
                    animationStep = 3;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 800);
                    break;
                case 3:
                    flipCard(1, 'sea');
                    animationStep = 4;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 800);
                    break;
                case 4:
                    flipCard(2, 'sea');
                    animationStep = 5;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 800);
                    break;
                case 5:
                    matchCards(1, 2);
                    animationStep = 6;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 1000);
                    break;
                case 6:
                    flipCard(0, 'pink');
                    animationStep = 7;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 800);
                    break;
                case 7:
                    flipCard(3, 'pink');
                    animationStep = 8;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 800);
                    break;
                case 8:
                    matchCards(0, 3);
                    animationStep = 9;
                    lastStepTime = now;
                    animationId = setTimeout(animateStep, 1500);
                    break;
                case 9:
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
                    container.innerHTML = '';
                    this.createLevel2StaticPreview(container);
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
        
        animationId = setTimeout(animateStep, 500);
        preview.animationFrame = animationId;
    }

    // Статичное превью для уровня 4
    createLevel4StaticPreview(container) {
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
                <div style="color: var(--color-text-secondary); font-size: 14px; text-align: center; padding: 20px;">
                    Порядок<br>От большой к маленькой!
                </div>
            </div>
        `;
    }

    // Анимация превью для уровня 4 (заглушка)
    animateLevel4Preview(preview) {
        // Заглушка для уровня 4
        console.log('Анимация для уровня 4 еще не реализована');
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
    setTimeout(() => {
        if (window.PreviewManager && !window.PreviewManager.isInitialized) {
            window.PreviewManager.init();
        }
    }, 300);
});
