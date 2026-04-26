import Phaser from 'phaser';
import { getStoredLanguage, Language, t, toggleLanguage } from '../i18n';

interface GameOverData {
    language?: Language;
    score?: number;
    level?: number;
    lines?: number;
    highScore?: number;
}

export class GameOverScene extends Phaser.Scene {
    private language: Language = 'zh';
    private score = 0;
    private level = 1;
    private lines = 0;
    private highScore = 0;
    private titleText!: Phaser.GameObjects.Text;
    private bodyText!: Phaser.GameObjects.Text;
    private restartText!: Phaser.GameObjects.Text;
    private langButton!: Phaser.GameObjects.Text;

    constructor() {
        super('GameOverScene');
    }

    public init(data: GameOverData): void {
        this.language = data.language ?? getStoredLanguage();
        this.score = data.score ?? 0;
        this.level = data.level ?? 1;
        this.lines = data.lines ?? 0;
        this.highScore = data.highScore ?? 0;
    }

    public create(): void {
        this.cameras.main.setBackgroundColor('#0e1020');
        const { width, height } = this.scale;
        this.add.circle(width * 0.24, height * 0.22, 120, 0xd8515b, 0.12);
        this.add.circle(width * 0.82, height * 0.84, 160, 0x4c8cff, 0.12);

        this.titleText = this.add.text(width / 2, 180, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '42px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.bodyText = this.add.text(width / 2, 320, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '24px',
            color: '#d7dfff',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);

        this.restartText = this.add.text(width / 2, 520, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '22px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: this.titleText,
            scale: 1.08,
            duration: 900,
            yoyo: true,
            repeat: -1
        });

        this.langButton = this.add.text(width - 18, 18, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '16px',
            color: '#11152a',
            backgroundColor: '#d6e0ff',
            padding: { left: 10, right: 10, top: 8, bottom: 8 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        this.langButton.on('pointerdown', (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
            event.stopPropagation();
            this.language = toggleLanguage(this.language);
            this.refreshTexts();
        });

        this.input.keyboard?.on('keydown-SPACE', this.restart, this);
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.keyboard?.off('keydown-SPACE', this.restart, this);
            this.input.off('pointerdown', this.handlePointerDown, this);
        });

        this.refreshTexts();
    }

    private refreshTexts(): void {
        this.titleText.setText(t('gameOver', this.language));
        this.bodyText.setText([
            `${t('score', this.language)}: ${this.score}`,
            `${t('level', this.language)}: ${this.level}`,
            `${t('lines', this.language)}: ${this.lines}`,
            `${t('high', this.language)}: ${this.highScore}`
        ].join('\n'));
        this.restartText.setText(t('restart', this.language));
        this.langButton.setText(t('lang', this.language));
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer): void {
        if (pointer.leftButtonDown()) {
            this.restart();
        }
    }

    private restart(): void {
        this.scene.start('GameScene', { language: this.language });
    }
}