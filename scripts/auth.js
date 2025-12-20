document.addEventListener('DOMContentLoaded', function () {
    const authScreen = document.getElementById('auth-screen');
    const loadingScreen = document.getElementById('loading-screen');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const messageDiv = document.getElementById('auth-message');

    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');

    const loginUsername = document.getElementById('login-username');
    const loginPassword = document.getElementById('login-password');
    const registerUsername = document.getElementById('register-username');
    const registerPassword = document.getElementById('register-password');
    const registerConfirm = document.getElementById('register-confirm');

    function init() {
        const currentUser = dataManager.getCurrentUser();
        if (currentUser) {
            showMessage(`С возвращением, ${currentUser}!`, 'success');
            setTimeout(showLoadingScreen, 1000);
            return;
        }

        setupEventListeners();
        setupInputValidations();
        preloadMatreshkas();
    }

    function setupEventListeners() {
        switchToRegister.addEventListener('click', (e) => { e.preventDefault(); switchToRegisterForm(); });
        switchToLogin.addEventListener('click', (e) => { e.preventDefault(); switchToLoginForm(); });

        loginBtn.addEventListener('click', handleLogin);
        loginPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

        registerBtn.addEventListener('click', handleRegister);
        registerConfirm.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleRegister(); });
    }

    function setupInputValidations() {
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', function () {
                this.style.borderColor = 'var(--color-border)';
                const errorSpan = this.parentElement.querySelector('.input-error');
                if (errorSpan) errorSpan.remove();
            });
        });
    }

    function preloadMatreshkas() {
        const colors = ['red', 'blue', 'green', 'yellow', 'pink'];
        colors.forEach(color => {
            const up = new Image(); up.src = DollManager.getAvatarUrl(color, 'up');
            const down = new Image(); down.src = DollManager.getAvatarUrl(color, 'down');
        });
    }

    function switchToRegisterForm() {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        clearMessage();
        registerUsername.focus();
    }

    function switchToLoginForm() {
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
        clearMessage();
        loginUsername.focus();
    }

    function handleLogin() {
        const username = loginUsername.value.trim();
        const password = loginPassword.value;
        if (!validateLoginForm(username, password)) return;

        loginBtn.innerHTML = '<span>Вход...</span>';
        loginBtn.disabled = true;

        setTimeout(() => {
            const result = dataManager.login(username, password);
            if (result.success) {
                showMessage(`Добро пожаловать, ${username}!`, 'success');
                showLoadingScreen();
            } else {
                showMessage(result.message, 'error');
                loginPassword.value = '';
                loginPassword.focus();
            }
            loginBtn.innerHTML = '<span>Войти в игру</span>';
            loginBtn.disabled = false;
        }, 300);
    }

    function handleRegister() {
        const username = registerUsername.value.trim();
        const password = registerPassword.value;
        const confirmPassword = registerConfirm.value;
        if (!validateRegisterForm(username, password, confirmPassword)) return;

        registerBtn.innerHTML = '<span>Регистрация...</span>';
        registerBtn.disabled = true;

        setTimeout(() => {
            const result = dataManager.register(username, password);
            if (result.success) {
                showMessage('Регистрация успешна! Теперь вы можете войти.', 'success');
                setTimeout(() => {
                    const loginResult = dataManager.login(username, password);
                    if (loginResult.success) showLoadingScreen();
                    else {
                        switchToLoginForm();
                        loginUsername.value = username;
                        loginPassword.value = '';
                    }
                }, 1500);
            } else {
                showMessage(result.message, 'error');
            }
            registerBtn.innerHTML = '<span>Создать аккаунт</span>';
            registerBtn.disabled = false;
        }, 300);
    }

    function validateLoginForm(username, password) {
        let isValid = true;
        if (!username) { showInputError(loginUsername, 'Введите логин'); isValid = false; }
        if (!password) { showInputError(loginPassword, 'Введите пароль'); isValid = false; }
        return isValid;
    }

    function validateRegisterForm(username, password, confirmPassword) {
        let isValid = true;
        if (!username) { showInputError(registerUsername, 'Введите логин'); isValid = false; }
        else if (username.length < 3) { showInputError(registerUsername, 'Логин должен быть не менее 3 символов'); isValid = false; }
        else if (!/^[a-zA-Z0-9_]+$/.test(username)) { showInputError(registerUsername, 'Только латинские буквы, цифры и подчеркивания'); isValid = false; }

        if (!password) { showInputError(registerPassword, 'Введите пароль'); isValid = false; }
        else if (password.length < 4) { showInputError(registerPassword, 'Пароль должен быть не менее 4 символов'); isValid = false; }

        if (!confirmPassword) { showInputError(registerConfirm, 'Подтвердите пароль'); isValid = false; }
        else if (password !== confirmPassword) { showInputError(registerConfirm, 'Пароли не совпадают'); isValid = false; }

        return isValid;
    }

    function showInputError(input, message) {
        input.style.borderColor = 'var(--color-danger)';
        const errorSpan = document.createElement('span');
        errorSpan.className = 'input-error';
        errorSpan.style.cssText = 'display:block;color:var(--color-danger);font-size:var(--font-size-sm);margin-top:var(--spacing-xs);';
        errorSpan.textContent = message;
        const parent = input.parentElement;
        if (!parent.querySelector('.input-error')) parent.appendChild(errorSpan);
    }

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.style.opacity = '0';
                setTimeout(() => { messageDiv.style.display = 'none'; messageDiv.style.opacity = '1'; }, 300);
            }, 3000);
        }
    }

    function clearMessage() {
        messageDiv.className = 'message';
        messageDiv.textContent = '';
        messageDiv.style.display = 'none';
    }

    function showLoadingScreen() {
        authScreen.classList.remove('active');
        loadingScreen.classList.add('active');
        document.getElementById('loading-doll-top').src = DollManager.getAvatarUrl('red', 'up');
        document.getElementById('loading-doll-bottom').src = DollManager.getAvatarUrl('red', 'down');
        simulateProgress();
    }

    function simulateProgress() {
        let progress = 0;
        const progressBar = document.getElementById('progress-bar');
        const percentage = document.getElementById('loading-percentage');
        const totalTime = 3200;
        const intervalTime = 50;
        const totalSteps = totalTime / intervalTime;
        const stepValue = 100 / totalSteps;

        const interval = setInterval(() => {
            progress += stepValue;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                progressBar.style.width = '100%';
                percentage.textContent = '100%';
                setTimeout(() => { window.location.href = 'pages/menu.html'; }, 500);
            } else {
                progressBar.style.width = `${progress}%`;
                percentage.textContent = `${Math.round(progress)}%`;
            }

            if (progress >= 25 && progress < 30) changeMatreshka('blue');
            else if (progress >= 50 && progress < 55) changeMatreshka('pink');
            else if (progress >= 75 && progress < 80) changeMatreshka('yellow');
            else if (progress >= 95 && progress < 100) changeMatreshka('green');
        }, intervalTime);
    }

    function changeMatreshka(color) {
        if (!DollManager.isValidColor(color)) color = 'red';
        document.getElementById('loading-doll-top').src = DollManager.getAvatarUrl(color, 'up');
        document.getElementById('loading-doll-bottom').src = DollManager.getAvatarUrl(color, 'down');
    }

    init();
});