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
        start: '点击开始',
        startHint: '左键移左 右键移右 | 上滚旋转 | 点击已落方块可交换消除',
        score: '分数',
        level: '等级',
        lines: '消块',
        high: '最高分',
        next: '下一个',
        combo: '连击',
        pause: '暂停中',
        resume: '点击暂停按钮继续',
        gameOver: '游戏结束',
        restart: '点击空白处重新开始',
        lang: '中文 / EN',
        controls: '操作',
        controlsBody: '左键 左移  右键 右移\n上滚 顺时针旋转\n下滚 下移一格\n点击已落方块 选择交换',
        pauseButton: '暂停'
    },
    en: {
        title: 'Crazy Block',
        subtitle: '疯狂方块',
        start: 'Click to start',
        startHint: 'LClick=left  RClick=right | Scroll↑=rotate | Click blocks to swap & match',
        score: 'Score',
        level: 'Level',
        lines: 'Cleared',
        high: 'High',
        next: 'Next',
        combo: 'Combo',
        pause: 'Paused',
        resume: 'Click the pause button to resume',
        gameOver: 'Game Over',
        restart: 'Click empty space to restart',
        lang: 'EN / 中文',
        controls: 'Controls',
        controlsBody: 'LClick=left  RClick=right\nScroll↑=rotate CW\nScroll↓=step down\nClick block=swap & match',
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