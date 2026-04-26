import Phaser from 'phaser';
import { getStoredLanguage, Language, t, toggleLanguage } from '../i18n';

interface FallingTile {
    rect: Phaser.GameObjects.Rectangle;
    speed: number;
    rotationSpeed: number;
}

export class StartScene extends Phaser.Scene {
    private language: Language = 'zh';
    private readonly tiles: FallingTile[] = [];
    private titleText!: Phaser.GameObjects.Text;
    private subtitleText!: Phaser.GameObjects.Text;
    private startText!: Phaser.GameObjects.Text;
    private hintText!: Phaser.GameObjects.Text;
    private langButton!: Phaser.GameObjects.Text;

    constructor() {
        super('StartScene');
    }

    public create(): void {
        this.language = getStoredLanguage();
        this.cameras.main.setBackgroundColor('#10121d');
        this.createBackground();
        this.createTexts();
        this.createLanguageButton();

        this.input.keyboard?.on('keydown-SPACE', this.startGame, this);
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.keyboard?.off('keydown-SPACE', this.startGame, this);
            this.input.off('pointerdown', this.handlePointerDown, this);
        });
    }

    public update(_time: number, delta: number): void {
        const { width, height } = this.scale;
        for (const tile of this.tiles) {
            tile.rect.y += tile.speed * delta / 1000;
            tile.rect.rotation += tile.rotationSpeed * delta / 1000;
            if (tile.rect.y > height + 40) {
                tile.rect.y = -40;
                tile.rect.x = Phaser.Math.Between(-20, width + 20);
            }
        }
    }

    private createBackground(): void {
        const { width, height } = this.scale;
        this.add.rectangle(width / 2, height / 2, width, height, 0x10121d).setAlpha(0.96);
        this.add.circle(width * 0.2, height * 0.18, 120, 0x3856d6, 0.12);
        this.add.circle(width * 0.82, height * 0.85, 160, 0xff9d3b, 0.08);

        const palette = [0x44b3ff, 0xf4c542, 0xff7a59, 0x65d36e, 0xb08cff];
        for (let index = 0; index < 24; index++) {
            const size = Phaser.Math.Between(18, 32);
            const rect = this.add.rectangle(
                Phaser.Math.Between(-20, width + 20),
                Phaser.Math.Between(-height, height),
                size,
                size,
                Phaser.Utils.Array.GetRandom(palette),
                0.24
            );
            rect.setStrokeStyle(2, 0xf4f7ff, 0.08);
            this.tiles.push({
                rect,
                speed: Phaser.Math.Between(22, 90),
                rotationSpeed: Phaser.Math.FloatBetween(-0.8, 0.8)
            });
        }
    }

    private createTexts(): void {
        const { width, height } = this.scale;
        this.titleText = this.add.text(width / 2, 160, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '44px',
            color: '#f6f7ff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.subtitleText = this.add.text(width / 2, 212, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '20px',
            color: '#94a6ff'
        }).setOrigin(0.5);

        this.startText = this.add.text(width / 2, 430, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '24px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        this.hintText = this.add.text(width / 2, 500, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '18px',
            color: '#cbd3ff',
            align: 'center',
            wordWrap: { width: width - 80 }
        }).setOrigin(0.5);

        this.refreshTexts();
        this.tweens.add({
            targets: this.startText,
            alpha: 0.4,
            duration: 900,
            yoyo: true,
            repeat: -1
        });
    }

    private createLanguageButton(): void {
        this.langButton = this.add.text(this.scale.width - 20, 20, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '18px',
            color: '#10121d',
            backgroundColor: '#d6e0ff',
            padding: { left: 12, right: 12, top: 8, bottom: 8 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        this.langButton.on('pointerdown', (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
            event.stopPropagation();
            this.language = toggleLanguage(this.language);
            this.refreshTexts();
        });

        this.refreshTexts();
    }

    private refreshTexts(): void {
        this.titleText?.setText(t('title', this.language));
        this.subtitleText?.setText(t('subtitle', this.language));
        this.startText?.setText(t('start', this.language));
        this.hintText?.setText(t('startHint', this.language));
        this.langButton?.setText(t('lang', this.language));
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer): void {
        if (pointer.leftButtonDown()) {
            this.startGame();
        }
    }

    private startGame(): void {
        this.scene.start('GameScene', { language: this.language });
    }
}