export interface ScoreData {
    score: number;
    level: number;
    cleared: number;
    combo: number;
}

export class ScoreManager {
    private static readonly HIGH_SCORE_KEY = 'crazyblock_highscore';
    private static readonly CELLS_PER_LEVEL = 10;
    private static readonly SOFT_DROP_SCORE = 1;

    private currentScore = 0;
    private currentLevel = 1;
    private totalCellsCleared = 0;
    private currentCombo = -1;

    public reset(): void {
        this.currentScore = 0;
        this.currentLevel = 1;
        this.totalCellsCleared = 0;
        this.currentCombo = -1;
    }

    public get score(): number {
        return this.currentScore;
    }

    public get level(): number {
        return this.currentLevel;
    }

    public get lines(): number {
        return this.totalCellsCleared;
    }

    public get combo(): number {
        return Math.max(0, this.currentCombo);
    }

    public getScoreData(): ScoreData {
        return {
            score: this.currentScore,
            level: this.currentLevel,
            cleared: this.totalCellsCleared,
            combo: this.combo
        };
    }

    public addCellsCleared(count: number): void {
        if (count <= 0) return;
        this.currentCombo++;
        this.currentScore += count;
        this.totalCellsCleared += count;
        this.currentLevel = Math.floor(this.totalCellsCleared / ScoreManager.CELLS_PER_LEVEL) + 1;
    }

    public resetCombo(): void {
        this.currentCombo = -1;
    }

    public addSoftDropScore(cells: number = 1): void {
        this.currentScore += cells * ScoreManager.SOFT_DROP_SCORE;
    }

    public getFallSpeed(): number {
        if (this.currentLevel >= 15) return 0.05;
        if (this.currentLevel >= 10) return 0.1;
        if (this.currentLevel >= 5) return 0.3 - (this.currentLevel - 5) * 0.04;
        return 1.0 - (this.currentLevel - 1) * 0.15;
    }

    public static getHighScore(): number {
        return Number(window.localStorage.getItem(ScoreManager.HIGH_SCORE_KEY) ?? '0') || 0;
    }

    public static saveHighScore(score: number): void {
        const current = ScoreManager.getHighScore();
        if (score > current) {
            window.localStorage.setItem(ScoreManager.HIGH_SCORE_KEY, String(score));
        }
    }
}