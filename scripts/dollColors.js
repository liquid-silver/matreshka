const DOLL_COLORS = ['black','red','pink','orange','bordo','sea','blue','green','yellow','turquoise'];

const DOLLS_BASE_PATH = (() => {
    try {
        const scriptSrc = (document.currentScript && document.currentScript.src) || window.location.href;
        return new URL('../svg-dolls/', scriptSrc).href;
    } catch (e) { return 'svg-dolls/'; }
})();

class DollManager {
    static getUrl(color) { return `${DOLLS_BASE_PATH}${color}.svg`; }
    static getOutlineUrl(color) { return `${DOLLS_BASE_PATH}${color}-outline.svg`; }
    static getAvatarUrl(color, part = 'up') { return `${DOLLS_BASE_PATH}${color}-${part}.svg`; }
    static getAllAvatars() { return DOLL_COLORS.map(c => ({ color: c, url: this.getAvatarUrl(c, 'up'), fullUrl: this.getAvatarUrl(c) })); }
    static isValidColor(color) { return DOLL_COLORS.includes(color); }
    static getDefaultColor() { return 'red'; }
    static getRandomColor() { return DOLL_COLORS[Math.floor(Math.random() * DOLL_COLORS.length)]; }
    static getAllWithOutlines() { return DOLL_COLORS.map(c => ({ color: c, url: this.getUrl(c), outlineUrl: this.getOutlineUrl(c) })); }
}