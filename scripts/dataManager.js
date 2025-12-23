class DataManager {
    constructor() {
        this.dataKey = 'matreshka_game_data';
        this.defaultData = { users: {}, scores: {}, currentUser: null };
        this.load();
    }

    load() {
        const saved = localStorage.getItem(this.dataKey);
        if (saved) {
            try { this.data = { ...this.defaultData, ...JSON.parse(saved) }; }
            catch (e) { 
                console.error('Ошибка загрузки данных:', e); 
                this.data = { ...this.defaultData }; 
            }
        } 
        else 
            this.data = { ...this.defaultData };
    }

    save() {
        try { 
            localStorage.setItem(this.dataKey, JSON.stringify(this.data)); 
            return true; 
        }
        catch (e) { 
            console.error('Ошибка сохранения данных:', e); 
            return false; 
        }
    }

    register(username, password) {
        if (this.data.users[username]) return { success: false, message: 'Пользователь уже существует' };
        if (username.length < 3) return { success: false, message: 'Логин должен быть не менее 3 символов' };
        if (password.length < 4) return { success: false, message: 'Пароль должен быть не менее 4 символов' };

        this.data.users[username] = { password, difficulty: 'medium', registeredAt: new Date().toISOString(), avatarColor: 'red' };
        this.data.scores[username] = {};
        return this.save() ? { success: true, message: 'Регистрация успешна' } : { success: false, message: 'Ошибка сохранения данных' };
    }

    login(username, password) {
        const user = this.data.users[username];
        if (!user) return { success: false, message: 'Пользователь не найден' };
        if (user.password !== password) return { success: false, message: 'Неверный пароль' };
        this.data.currentUser = username; this.save();
        return { success: true, message: 'Вход успешен' };
    }

    logout() { this.data.currentUser = null; this.save(); }
    getCurrentUser() { return this.data.currentUser; }
    getUserData(username) { return this.data.users[username]; }

    getSafeUserData(username) {
        const user = this.getUserData(username); if (!user) return null; const { password, ...safe } = user; return safe;
    }

    updateUserData(username, newData) {
        if (!this.data.users[username]) return false;
        this.data.users[username] = { ...this.data.users[username], ...newData }; return this.save();
    }

    setScore(level, score) {
        if (!this.data.currentUser) return false;
        const curr = this.getScore(level);
        if (score > curr) { this.data.scores[this.data.currentUser][level] = score; return this.save(); }
        return false;
    }

    getScore(level) { if (!this.data.currentUser) return 0; return this.data.scores[this.data.currentUser][level] || 0; }
    getAllScores() { return this.data.scores; }
    getUserAvatar(username) { return this.getUserData(username)?.avatarColor || 'red'; }

    setUserAvatar(username, color) { if (this.isValidAvatarColor(color)) return this.updateUserData(username, { avatarColor: color }); return false; }

    isValidAvatarColor(color) {
        const valid = ['black', 'red', 'pink', 'orange', 'bordo', 'sea', 'blue', 'green', 'yellow', 'turquoise'];
        return valid.includes(color);
    }

    debugData() { console.log('Текущие данные:', this.data); }
    clearAllData() { this.data = { ...this.defaultData }; this.save(); }
}

const dataManager = new DataManager();