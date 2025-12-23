class PreviewManager {
    constructor() {
        this.previews = new Map();
        this.activeAnimations = new Map();
        this.imagesCache = {};
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;

        setTimeout(() => {
            this.initPreviews();
            this.setupHoverListeners();
            this.isInitialized = true;
        }, 100);
    }

    initPreviews() {
        const previewElements = document.querySelectorAll('.level-preview[data-level]');

        if (previewElements.length === 0) {
            console.warn('PreviewManager: Элементы превью не найдены');
            return;
        }

        previewElements.forEach(previewEl => {
            const levelId = previewEl.dataset.level;

            if (this.previews.has(levelId)) {
                return;
            }

            previewEl.innerHTML = '';
            const canvasContainer = document.createElement('div');
            canvasContainer.className = 'preview-canvas';
            previewEl.appendChild(canvasContainer);

            this.loadLevelImages(levelId).then(() => {
                this.createStaticPreview(levelId, canvasContainer);

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

    async loadLevelImages(levelId) {
        const colors = ['red', 'blue', 'yellow', 'pink']; 
        const promises = [];

        colors.forEach(color => {
            if (!this.imagesCache[color]) {
                this.imagesCache[color] = {};
            }

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

    createLevel1StaticPreview(container) {
        if (!this.imagesCache.black?.outline || !this.imagesCache.red?.full) {
            this.showLoading(container);
            setTimeout(() => this.createLevel1StaticPreview(container), 100);
            return;
        }

        const blackOutline = new Image();
        blackOutline.src = this.imagesCache.black.outline;
        blackOutline.className = 'preview-doll doll-outline';
        blackOutline.style.transform = 'translate(-50%, -50%) scale(0.8)';
        blackOutline.setAttribute('data-outline-color', 'black');
        blackOutline.style.zIndex = '1';

        const redDoll = new Image();
        redDoll.src = this.imagesCache.red.full;
        redDoll.className = 'preview-doll';
        redDoll.style.transform = 'translate(-50%, -50%) scale(0.2)';
        redDoll.style.zIndex = '2';

        container.appendChild(blackOutline);
        container.appendChild(redDoll);
    }

    setupHoverListeners() {
        document.querySelectorAll('.level-card').forEach(levelCard => {
            const levelId = levelCard.querySelector('.play-button')?.dataset.level;

            if (!levelId) return;

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

            levelCard.dataset.previewListenersAdded = 'true';
        });
    }

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

    getLevel3Dolls() {
        return [
            { color: 'orange', letter: 'G', order: 2, position: 0 },
            { color: 'turquoise', letter: 'A', order: 4, position: 1 },
            { color: 'bordo', letter: 'I', order: 1, position: 2 },
            { color: 'yellow', letter: 'R', order: 3, position: 3 }
        ];
    }

    createLevel1StaticPreview(container) {
        if (!this.imagesCache.black?.outline || !this.imagesCache.red?.full) {
            this.showLoading(container);
            setTimeout(() => this.createLevel1StaticPreview(container), 100);
            return;
        }

        const blackOutline = new Image();
        blackOutline.src = this.imagesCache.black.outline;
        blackOutline.className = 'preview-doll doll-outline';
        blackOutline.style.transform = 'translate(-50%, -50%) scale(1.0)';
        blackOutline.setAttribute('data-outline-color', 'black');
        blackOutline.style.zIndex = '1';

        const redDoll = new Image();
        redDoll.src = this.imagesCache.red.full;
        redDoll.className = 'preview-doll';
        redDoll.style.transform = 'translate(-50%, -50%) scale(0.2)';
        redDoll.style.zIndex = '2';

        const blueOutline = new Image();
        blueOutline.src = this.imagesCache.blue?.outline || this.imagesCache.red.outline;
        blueOutline.className = 'preview-doll doll-outline';
        blueOutline.style.transform = 'translate(-50%, -50%) scale(0.8)';
        blueOutline.style.opacity = '0.7';
        blueOutline.style.zIndex = '3';

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
        const maxScales = [0.95, 0.8, 0.65]; 
        const startScales = [0.2, 0.15, 0.1]; 
        const growSpeed = 0.6; 
        const pauseBetweenDolls = 100; 
        let pauseUntil = 0;
        const outlines = []; 

        container.innerHTML = '';

        const blackOutline = new Image();
        blackOutline.src = this.imagesCache.black.outline;
        blackOutline.className = 'preview-doll doll-outline';
        blackOutline.style.transform = 'translate(-50%, -50%) scale(1.0)';
        blackOutline.setAttribute('data-outline-color', 'black');
        blackOutline.style.zIndex = '1';

        container.appendChild(blackOutline);
        outlines.push(blackOutline);

        currentDoll = new Image();
        currentDoll.src = this.imagesCache[colors[currentColorIndex]].full;
        currentDoll.className = 'preview-doll';
        currentDoll.style.transform = `translate(-50%, -50%) scale(${startScales[currentColorIndex]})`;
        currentDoll.style.zIndex = '2';

        container.appendChild(currentDoll);

        const animate = (currentTime) => {
            if (!preview.isAnimating) return;

            preview.animationFrame = requestAnimationFrame(animate);

            if (!lastFrameTime) lastFrameTime = currentTime;
            const deltaTime = (currentTime - lastFrameTime) / 1000;
            lastFrameTime = currentTime;

            if (pauseUntil > currentTime) {
                return;
            }

            if (isGrowing) {
                currentScale += growSpeed * deltaTime;

                if (currentScale >= maxScales[currentColorIndex]) {
                    isGrowing = false;

                    const outlineDoll = new Image();
                    outlineDoll.src = this.imagesCache[colors[currentColorIndex]].outline;
                    outlineDoll.className = 'preview-doll doll-outline';
                    outlineDoll.style.transform = `translate(-50%, -50%) scale(${currentScale * 0.8})`;
                    outlineDoll.style.zIndex = (3 + currentColorIndex).toString();
                    outlineDoll.setAttribute('data-outline-color', colors[currentColorIndex]);

                    container.appendChild(outlineDoll);
                    outlines.push(outlineDoll);

                    container.removeChild(currentDoll);
                    currentColorIndex++;

                    if (currentColorIndex < colors.length) {
                        pauseUntil = currentTime + pauseBetweenDolls;
                    } else {
                        pauseUntil = currentTime + 500;
                    }
                }
            } else {
                if (currentColorIndex < colors.length) {
                    currentScale = startScales[currentColorIndex];
                    isGrowing = true;

                    currentDoll = new Image();
                    currentDoll.src = this.imagesCache[colors[currentColorIndex]].full;
                    currentDoll.className = 'preview-doll';
                    currentDoll.style.transform = `translate(-50%, -50%) scale(${currentScale})`;
                    currentDoll.style.zIndex = '2';

                    container.appendChild(currentDoll);
                } else {
                    outlines.forEach((outline, index) => {
                        if (index > 0) { 
                            container.removeChild(outline);
                        }
                    });

                    outlines.splice(1);

                    currentColorIndex = 0;
                    currentScale = startScales[currentColorIndex];
                    isGrowing = true;

                    currentDoll = new Image();
                    currentDoll.src = this.imagesCache[colors[currentColorIndex]].full;
                    currentDoll.className = 'preview-doll';
                    currentDoll.style.transform = `translate(-50%, -50%) scale(${currentScale})`;
                    currentDoll.style.zIndex = '2';

                    container.appendChild(currentDoll);
                }
            }

            if (currentDoll && currentDoll.parentNode === container) {
                currentDoll.style.transform = `translate(-50%, -50%) scale(${currentScale})`;
            }
        };

        preview.animationFrame = requestAnimationFrame(animate);
    }

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
            blackDoll.setAttribute('data-index', index);
            blackDoll.setAttribute('data-position', ['left-top', 'right-top', 'left-bottom', 'right-bottom'][index]);

            container.appendChild(blackDoll);
        });
    }

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
            colorDoll.setAttribute('data-flipped', 'true');
            colorDoll.setAttribute('data-color', color);

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
            const timeSinceLastStep = now - lastStepTime;

            // Управление анимацией по шагам
            switch (animationStep) {
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
                    animationId = setTimeout(animateStep, 800);
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
                    animationId = setTimeout(animateStep, 800);
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
                    animationId = setTimeout(animateStep, 1000);
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

    animateLevel3Preview(preview) {
        const container = preview.canvas;
        container.innerHTML = '';

        const dolls = this.getLevel3Dolls();

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
                letter: letterDiv,
                order: doll.order,
                isOpened: false
            };
        });

        let currentStep = 0;
        let animationId = null;
        const dollsByOrder = [...dollElements].sort((a, b) => a.order - b.order);

        const openDoll = (doll) => {
            if (doll.isOpened) return;
            doll.isOpened = true;
            doll.top.style.transform = 'translateY(-50%) rotate(-10deg)';
            setTimeout(() => {
                doll.letter.style.opacity = '1';
                doll.letter.style.transform = 'translate(-50%, -60%)';
            }, 100);
        };

        const closeAllDolls = () => {
            dollElements.forEach(doll => {
                doll.isOpened = false;
                doll.top.style.transform = 'translateY(0) rotate(0deg)';
                doll.letter.style.opacity = '0';
                doll.letter.style.transform = 'translate(-50%, -50%)';
            });
        };

        const animateStep = () => {
            if (!preview.isAnimating) {
                if (animationId) clearTimeout(animationId);
                return;
            }

            if (currentStep < dollsByOrder.length) {
                openDoll(dollsByOrder[currentStep]);
                currentStep++;
                animationId = setTimeout(animateStep, 500);
            } else {
                currentStep = 0;
                closeAllDolls();
                animationId = setTimeout(animateStep, 1000);
            }
        };

        animationId = setTimeout(animateStep, 500);
        preview.animationFrame = animationId;
    }

    createLevel3StaticPreview(container) {
        container.innerHTML = '';

        const dolls = this.getLevel3Dolls();

        dolls.forEach((doll, index) => {
            const dollItem = document.createElement('div');
            dollItem.className = 'doll-preview-container';
            dollItem.style.position = 'absolute';
            dollItem.style.width = '20%';
            dollItem.style.height = '80%';
            dollItem.style.bottom = '-45%';
            dollItem.style.left = `${15 + index * 23}%`;
            dollItem.style.transform = 'translate(-50%, -50%)';
            dollItem.style.zIndex = '1';

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

        this.createLevel4StaticPreview(container);

        const dollElements = Array.from(container.querySelectorAll('.preview-level4-doll'));

        if (dollElements.length === 0) return;

        const dolls = dollElements.map((element, index) => {
            const rect = element.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const currentTop = parseFloat(element.style.top);
            const currentLeft = parseFloat(element.style.left);

            const top = (currentTop / 100) * containerRect.height;
            const left = (currentLeft / 100) * containerRect.width;

            const size = parseFloat(element.style.width) / 100 * containerRect.width;

            const speed = 1.8; 
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

            const containerRect = container.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const containerHeight = containerRect.height;

            dolls.forEach(doll => {
                doll.x += doll.vx * (deltaTime / 16); 
                doll.y += doll.vy * (deltaTime / 16);

                const halfWidth = doll.width * 0.5;
                const halfHeight = doll.height * 0.85;

                if (doll.x - halfWidth <= 0) {
                    doll.x = halfWidth;
                    doll.vx = Math.abs(doll.vx); 
                }
                if (doll.x + halfWidth >= containerWidth) {
                    doll.x = containerWidth - halfWidth;
                    doll.vx = -Math.abs(doll.vx); 
                }
                if (doll.y - halfHeight <= 0) {
                    doll.y = halfHeight;
                    doll.vy = Math.abs(doll.vy); 
                }
                if (doll.y + halfHeight >= containerHeight) {
                    doll.y = containerHeight - halfHeight;
                    doll.vy = -Math.abs(doll.vy); 
                }

                const topPercent = (doll.y / containerHeight) * 100;
                const leftPercent = (doll.x / containerWidth) * 100;

                doll.element.style.top = `${topPercent}%`;
                doll.element.style.left = `${leftPercent}%`;
            });

            animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);
        preview.animationFrame = animationId;
    }

    createLevel4StaticPreview(container) {
        container.innerHTML = '';

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

    showLoading(container) {
        container.innerHTML = `
            <div class="preview-loading">
                <div class="preview-loading-spinner"></div>
                <span>Загрузка...</span>
            </div>
        `;
    }

    showError(container) {
        container.innerHTML = `
            <div style="color: var(--color-danger); font-size: 12px; text-align: center; padding: 20px;">
                Ошибка загрузки превью
            </div>
        `;
    }
}

window.PreviewManager = new PreviewManager();

window.initPreviews = function () {
    if (window.PreviewManager) {
        window.PreviewManager.init();
    }
};

window.addEventListener('load', () => {
    setTimeout(() => {
        if (window.PreviewManager && !window.PreviewManager.isInitialized) {
            window.PreviewManager.init();
        }
    }, 300);
});