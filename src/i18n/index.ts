export type Language = 'zh' | 'en';

export type TranslationKey =
    | 'title'
    | 'subtitle'
    | 'start'
    | 'startHint'
    | 'score'
    | 'level'
    | 'lines'
    | 'high'
    | 'next'
    | 'combo'
    | 'pause'
    | 'resume'
    | 'gameOver'
    | 'restart'
    | 'lang'
    | 'controls'
    | 'controlsBody'
    | 'pauseButton';

const STORAGE_KEY = 'crazyblock_lang';

const translations: Record<Language, Record<TranslationKey, string>> = {
    zh: {
        title: '疯狂方块',
        subtitle: 'CRAZY BLOCK',
        start: '点击空白处或按空格开始',
        startHint: '按住左/右键持续移动 | 点击单步 | 下滚快降 | 上滚顺时针',
        score: '分数',
        level: '等级',
        lines: '消行',
        high: '最高分',
        next: '下一个',
        combo: '连击',
        pause: '暂停中',
        resume: '点击暂停按钮或按 P 继续',
        gameOver: '游戏结束',
        restart: '点击空白处或按空格重新开始',
        lang: '中文 / EN',
        controls: '操作',
        controlsBody: 'A/D 左右移动\nW 顺时针\nS 点按逆时针\nS 长按快降\n↓滚轮 极速落地',
        pauseButton: '暂停'
    },
    en: {
        title: 'Crazy Block',
        subtitle: '疯狂方块',
        start: 'Click empty space or press Space to start',
        startHint: 'Hold L/R click to move | Click = 1 step | Scroll↓ fast drop | Scroll↑ rotate CW',
        score: 'Score',
        level: 'Level',
        lines: 'Lines',
        high: 'High',
        next: 'Next',
        combo: 'Combo',
        pause: 'Paused',
        resume: 'Click pause button or press P to resume',
        gameOver: 'Game Over',
        restart: 'Click empty space or press Space to restart',
        lang: 'EN / 中文',
        controls: 'Controls',
        controlsBody: 'A/D move  W rotate CW\nS tap CCW  S hold drop\nScroll\u2193 fast drop',
        pauseButton: 'Pause'
    }
};

export function getStoredLanguage(): Language {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'zh';
}

export function setStoredLanguage(language: Language): void {
    window.localStorage.setItem(STORAGE_KEY, language);
}

export function toggleLanguage(language: Language): Language {
    const next = language === 'zh' ? 'en' : 'zh';
    setStoredLanguage(next);
    return next;
}

export function t(key: TranslationKey, language: Language): string {
    return translations[language][key];
}