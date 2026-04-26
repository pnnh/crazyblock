import Phaser from 'phaser';
import { AudioManager } from '../game/AudioManager';
import { Grid } from '../game/Grid';
import { InputManager } from '../game/InputManager';
import { ScoreManager } from '../game/ScoreManager';
import { Tetromino, TetrominoType } from '../game/Tetromino';
import { getStoredLanguage, Language, t, toggleLanguage } from '../i18n';

type UiKey = 'score' | 'level' | 'lines' | 'high' | 'combo' | 'next' | 'controls';

export class GameScene extends Phaser.Scene {
    private static readonly CELL_SIZE = 32;
    private static readonly BOARD_X = 20;
    private static readonly BOARD_Y = 28;
    private static readonly SIDE_X = 372;
    private static readonly FAST_DROP_SPEED = 0.03;

    private language: Language = 'zh';
    private readonly grid = new Grid();
    private readonly scoreManager = new ScoreManager();
    private inputManager!: InputManager;
    private audioManager!: AudioManager;
    private currentPiece: Tetromino | null = null;
    private nextPieceType: TetrominoType = TetrominoType.I;
    private fallTimer = 0;
    private fastDropActive = false;
    private paused = false;
    private gameEnded = false;

    private boardGraphics!: Phaser.GameObjects.Graphics;
    private boardSprites: Phaser.GameObjects.Image[][] = [];
    private ghostSprites: Phaser.GameObjects.Image[] = [];
    private nextSprites: Phaser.GameObjects.Image[] = [];
    private uiLabels = new Map<UiKey, Phaser.GameObjects.Text>();
    private uiValues = new Map<Exclude<UiKey, 'next' | 'controls'>, Phaser.GameObjects.Text>();
    private controlsText!: Phaser.GameObjects.Text;
    private langButton!: Phaser.GameObjects.Text;
    private pauseButton!: Phaser.GameObjects.Text;
    private pauseOverlay!: Phaser.GameObjects.Container;

    constructor() {
        super('GameScene');
    }

    public init(data: { language?: Language }): void {
        this.language = data.language ?? getStoredLanguage();
    }

    public preload(): void {
        this.load.image('block_I', 'assets/blocks/block_I.png');
        this.load.image('block_O', 'assets/blocks/block_O.png');
        this.load.image('block_T', 'assets/blocks/block_T.png');
        this.load.image('block_S', 'assets/blocks/block_S.png');
        this.load.image('block_Z', 'assets/blocks/block_Z.png');
        this.load.image('block_J', 'assets/blocks/block_J.png');
        this.load.image('block_L', 'assets/blocks/block_L.png');
    }

    public create(): void {
        this.language = getStoredLanguage();
        this.cameras.main.setBackgroundColor('#151827');
        this.scoreManager.reset();
        this.grid.clear();
        this.fallTimer = 0;
        this.fastDropActive = false;
        this.paused = false;
        this.gameEnded = false;

        this.audioManager = new AudioManager(this.sound.context as AudioContext | null);
        void this.audioManager.unlock();

        this.createGhostTexture();
        this.drawStaticBackground();
        this.createBoardPool();
        this.createNextPool();
        this.createUi();
        this.createPauseOverlay();
        this.setupInput();

        this.nextPieceType = Tetromino.getRandomType();
        this.spawnPiece();
        this.refreshLanguage();
        this.renderBoard();
        this.renderUi();

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.inputManager.destroy();
        });
    }

    public update(_time: number, delta: number): void {
        this.inputManager.update();
        if (this.paused || this.gameEnded || !this.currentPiece) {
            return;
        }

        const stepSeconds = delta / 1000;
        this.fallTimer += stepSeconds;
        const targetSpeed = this.fastDropActive ? GameScene.FAST_DROP_SPEED : this.scoreManager.getFallSpeed();

        while (this.fallTimer >= targetSpeed) {
            this.fallTimer -= targetSpeed;
            if (!this.movePiece(0, -1, this.fastDropActive)) {
                break;
            }
        }
    }

    private setupInput(): void {
        this.inputManager = new InputManager(this);
        this.inputManager.on('left', () => {
            if (!this.paused) {
                this.movePiece(-1, 0, false);
            }
        });
        this.inputManager.on('right', () => {
            if (!this.paused) {
                this.movePiece(1, 0, false);
            }
        });
        this.inputManager.on('rotateCW', () => {
            if (!this.paused) {
                this.rotatePiece(true);
            }
        });
        this.inputManager.on('rotateCCW', () => {
            if (!this.paused) {
                this.rotatePiece(false);
            }
        });
        this.inputManager.on('fastDropStart', () => {
            this.fastDropActive = true;
        });
        this.inputManager.on('fastDropEnd', () => {
            this.fastDropActive = false;
        });
        this.inputManager.on('pause', () => this.togglePause());
    }

    private createGhostTexture(): void {
        if (this.textures.exists('ghost')) {
            return;
        }

        const graphics = this.make.graphics({ x: 0, y: 0 }, false);
        graphics.lineStyle(3, 0xe7ecff, 0.45);
        graphics.strokeRect(2, 2, GameScene.CELL_SIZE - 4, GameScene.CELL_SIZE - 4);
        graphics.generateTexture('ghost', GameScene.CELL_SIZE, GameScene.CELL_SIZE);
        graphics.destroy();
    }

    private drawStaticBackground(): void {
        this.boardGraphics = this.add.graphics();
        const boardWidth = Grid.WIDTH * GameScene.CELL_SIZE;
        const boardHeight = Grid.HEIGHT * GameScene.CELL_SIZE;

        this.boardGraphics.fillStyle(0x0d1120, 1);
        this.boardGraphics.fillRoundedRect(GameScene.BOARD_X - 10, GameScene.BOARD_Y - 10, boardWidth + 20, boardHeight + 20, 14);
        this.boardGraphics.fillStyle(0x161b2e, 1);
        this.boardGraphics.fillRect(GameScene.BOARD_X, GameScene.BOARD_Y, boardWidth, boardHeight);

        this.boardGraphics.lineStyle(1, 0x26314f, 1);
        for (let x = 0; x <= Grid.WIDTH; x++) {
            const px = GameScene.BOARD_X + x * GameScene.CELL_SIZE;
            this.boardGraphics.moveTo(px, GameScene.BOARD_Y);
            this.boardGraphics.lineTo(px, GameScene.BOARD_Y + boardHeight);
        }
        for (let y = 0; y <= Grid.HEIGHT; y++) {
            const py = GameScene.BOARD_Y + y * GameScene.CELL_SIZE;
            this.boardGraphics.moveTo(GameScene.BOARD_X, py);
            this.boardGraphics.lineTo(GameScene.BOARD_X + boardWidth, py);
        }
        this.boardGraphics.strokePath();

        this.boardGraphics.fillStyle(0x0d1120, 1);
        this.boardGraphics.fillRoundedRect(GameScene.SIDE_X - 14, 28, 112, 128, 14);
        this.boardGraphics.fillRoundedRect(GameScene.SIDE_X - 14, 176, 112, 244, 14);
    }

    private createBoardPool(): void {
        for (let y = 0; y < Grid.HEIGHT; y++) {
            this.boardSprites[y] = [];
            for (let x = 0; x < Grid.WIDTH; x++) {
                const sprite = this.add.image(this.cellCenterX(x), this.cellCenterY(y), 'block_I');
                sprite.setVisible(false);
                this.boardSprites[y][x] = sprite;
            }
        }

        for (let index = 0; index < 4; index++) {
            const ghost = this.add.image(0, 0, 'ghost').setVisible(false);
            this.ghostSprites.push(ghost);
        }
    }

    private createNextPool(): void {
        for (let index = 0; index < 4; index++) {
            const sprite = this.add.image(0, 0, 'block_I').setVisible(false);
            sprite.setScale(0.76);
            this.nextSprites.push(sprite);
        }
    }

    private createUi(): void {
        const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '18px',
            color: '#8ea2ff'
        };
        const valueStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '24px',
            color: '#f4f7ff',
            fontStyle: 'bold'
        };

        this.uiLabels.set('next', this.add.text(GameScene.SIDE_X, 40, '', labelStyle));
        this.uiLabels.set('score', this.add.text(GameScene.SIDE_X, 190, '', labelStyle));
        this.uiValues.set('score', this.add.text(GameScene.SIDE_X, 214, '0', valueStyle));
        this.uiLabels.set('level', this.add.text(GameScene.SIDE_X, 258, '', labelStyle));
        this.uiValues.set('level', this.add.text(GameScene.SIDE_X, 282, '1', valueStyle));
        this.uiLabels.set('lines', this.add.text(GameScene.SIDE_X, 326, '', labelStyle));
        this.uiValues.set('lines', this.add.text(GameScene.SIDE_X, 350, '0', valueStyle));
        this.uiLabels.set('high', this.add.text(GameScene.SIDE_X, 394, '', labelStyle));
        this.uiValues.set('high', this.add.text(GameScene.SIDE_X, 418, '0', valueStyle));
        this.uiLabels.set('combo', this.add.text(GameScene.SIDE_X, 462, '', labelStyle));
        this.uiValues.set('combo', this.add.text(GameScene.SIDE_X, 486, '0', valueStyle));
        this.uiLabels.set('controls', this.add.text(GameScene.SIDE_X, 536, '', labelStyle));
        this.controlsText = this.add.text(GameScene.SIDE_X, 562, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '15px',
            color: '#d4dcff',
            lineSpacing: 8
        });

        this.langButton = this.add.text(this.scale.width - 18, 18, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '16px',
            color: '#11152a',
            backgroundColor: '#d6e0ff',
            padding: { left: 10, right: 10, top: 8, bottom: 8 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        this.pauseButton = this.add.text(this.scale.width - 18, 62, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '16px',
            color: '#11152a',
            backgroundColor: '#ffe1a6',
            padding: { left: 10, right: 10, top: 8, bottom: 8 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        this.langButton.on('pointerdown', (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
            event.stopPropagation();
            this.language = toggleLanguage(this.language);
            this.refreshLanguage();
        });
        this.pauseButton.on('pointerdown', (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
            event.stopPropagation();
            this.togglePause();
        });
    }

    private createPauseOverlay(): void {
        const shade = this.add.rectangle(250, 350, 500, 700, 0x04060c, 0.68);
        const title = this.add.text(250, 300, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '36px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        const hint = this.add.text(250, 352, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '18px',
            color: '#d3dcff',
            align: 'center'
        }).setOrigin(0.5);
        this.pauseOverlay = this.add.container(0, 0, [shade, title, hint]).setVisible(false);
        this.pauseOverlay.setDepth(1000);
        this.pauseOverlay.setData('title', title);
        this.pauseOverlay.setData('hint', hint);
    }

    private spawnPiece(): void {
        this.currentPiece = new Tetromino(this.nextPieceType);
        this.currentPiece.x = Math.floor(Grid.WIDTH / 2) - 2;
        this.currentPiece.y = Grid.HEIGHT - 4;
        this.nextPieceType = Tetromino.getRandomType();

        if (!this.grid.canPlacePiece(this.currentPiece)) {
            this.handleGameOver();
            return;
        }

        this.fallTimer = 0;
        this.renderBoard();
        this.renderUi();
    }

    private movePiece(dx: number, dy: number, rewardSoftDrop: boolean): boolean {
        if (!this.currentPiece || this.gameEnded) {
            return false;
        }

        if (this.grid.canPlacePieceAt(this.currentPiece, dx, dy)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            if (dx !== 0) {
                this.audioManager.play('move');
            }
            if (dy < 0 && rewardSoftDrop) {
                this.scoreManager.addSoftDropScore();
            }
            this.renderBoard();
            this.renderUi();
            return true;
        }

        if (dy < 0) {
            this.lockPiece();
        }

        return false;
    }

    private rotatePiece(clockwise: boolean): void {
        if (!this.currentPiece || this.gameEnded) {
            return;
        }

        if (this.grid.canRotatePiece(this.currentPiece, clockwise)) {
            this.currentPiece.rotate(clockwise);
            this.audioManager.play('rotate');
            this.renderBoard();
            return;
        }

        const kicks = [-1, 1, -2, 2];
        for (const kick of kicks) {
            this.currentPiece.x += kick;
            if (this.grid.canRotatePiece(this.currentPiece, clockwise)) {
                this.currentPiece.rotate(clockwise);
                this.audioManager.play('rotate');
                this.renderBoard();
                return;
            }
            this.currentPiece.x -= kick;
        }
    }

    private lockPiece(): void {
        if (!this.currentPiece) {
            return;
        }

        this.grid.lockPiece(this.currentPiece);
        this.audioManager.play('lock');
        const result = this.grid.clearLines();
        if (result.linesCleared > 0) {
            this.scoreManager.addLineClearScore(result.linesCleared);
            this.audioManager.play('lineClear');
        }

        if (this.grid.isGameOver()) {
            this.handleGameOver();
            return;
        }

        this.spawnPiece();
    }

    private handleGameOver(): void {
        if (this.gameEnded) {
            return;
        }

        this.gameEnded = true;
        this.fastDropActive = false;
        this.audioManager.play('gameOver');
        ScoreManager.saveHighScore(this.scoreManager.score);
        this.time.delayedCall(650, () => {
            this.scene.start('GameOverScene', {
                language: this.language,
                score: this.scoreManager.score,
                level: this.scoreManager.level,
                lines: this.scoreManager.lines,
                highScore: ScoreManager.getHighScore()
            });
        });
    }

    private togglePause(): void {
        if (this.gameEnded) {
            return;
        }

        this.paused = !this.paused;
        this.pauseOverlay.setVisible(this.paused);
    }

    private renderBoard(): void {
        for (let y = 0; y < Grid.HEIGHT; y++) {
            for (let x = 0; x < Grid.WIDTH; x++) {
                this.boardSprites[y][x].setVisible(false);
            }
        }

        for (const ghost of this.ghostSprites) {
            ghost.setVisible(false);
        }

        for (const cell of this.grid.getFilledCells()) {
            const sprite = this.boardSprites[cell.y][cell.x];
            sprite.setTexture(Tetromino.getTextureKey(cell.pieceType));
            sprite.setVisible(true);
        }

        if (this.currentPiece) {
            const ghostY = this.grid.getGhostPiecePosition(this.currentPiece);
            const activePositions = this.currentPiece.getBlockPositions();
            const ghostPositions = this.currentPiece.clone();
            ghostPositions.y = ghostY;
            const blocks = ghostPositions.getBlockPositions();

            let ghostIndex = 0;
            for (const pos of blocks) {
                const overlapsActive = activePositions.some((active) => active.x === pos.x && active.y === pos.y);
                const occupied = this.grid.getCell(pos.x, pos.y)?.filled ?? true;
                if (!overlapsActive && !occupied && ghostIndex < this.ghostSprites.length) {
                    const ghost = this.ghostSprites[ghostIndex++];
                    ghost.setPosition(this.cellCenterX(pos.x), this.cellCenterY(pos.y));
                    ghost.setVisible(true);
                }
            }

            for (const pos of activePositions) {
                const sprite = this.boardSprites[pos.y][pos.x];
                sprite.setTexture(this.currentPiece.textureKey);
                sprite.setVisible(true);
            }
        }

        this.renderNextPiece();
    }

    private renderNextPiece(): void {
        for (const sprite of this.nextSprites) {
            sprite.setVisible(false);
        }

        const previewPiece = new Tetromino(this.nextPieceType);
        const shape = previewPiece.getShapeAtRotation(0);
        const positions: Array<{ x: number; y: number }> = [];
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] === 1) {
                    positions.push({ x: col, y: row });
                }
            }
        }

        if (positions.length === 0) {
            return;
        }

        const minX = Math.min(...positions.map((pos) => pos.x));
        const maxX = Math.max(...positions.map((pos) => pos.x));
        const minY = Math.min(...positions.map((pos) => pos.y));
        const maxY = Math.max(...positions.map((pos) => pos.y));
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;
        const cell = 24;
        const startX = GameScene.SIDE_X + 46 - width * cell / 2;
        const startY = 108 - height * cell / 2;

        positions.forEach((pos, index) => {
            const sprite = this.nextSprites[index];
            sprite.setTexture(previewPiece.textureKey);
            sprite.setPosition(startX + (pos.x - minX) * cell + cell / 2, startY + (pos.y - minY) * cell + cell / 2);
            sprite.setVisible(true);
        });
    }

    private renderUi(): void {
        this.uiValues.get('score')?.setText(String(this.scoreManager.score));
        this.uiValues.get('level')?.setText(String(this.scoreManager.level));
        this.uiValues.get('lines')?.setText(String(this.scoreManager.lines));
        this.uiValues.get('high')?.setText(String(ScoreManager.getHighScore()));
        this.uiValues.get('combo')?.setText(this.scoreManager.combo > 0 ? `x${this.scoreManager.combo}` : '0');
    }

    private refreshLanguage(): void {
        this.uiLabels.get('next')?.setText(t('next', this.language));
        this.uiLabels.get('score')?.setText(t('score', this.language));
        this.uiLabels.get('level')?.setText(t('level', this.language));
        this.uiLabels.get('lines')?.setText(t('lines', this.language));
        this.uiLabels.get('high')?.setText(t('high', this.language));
        this.uiLabels.get('combo')?.setText(t('combo', this.language));
        this.uiLabels.get('controls')?.setText(t('controls', this.language));
        this.controlsText?.setText(t('controlsBody', this.language));
        this.langButton?.setText(t('lang', this.language));
        this.pauseButton?.setText(t('pauseButton', this.language));
        const pauseTitle = this.pauseOverlay.getData('title') as Phaser.GameObjects.Text;
        const pauseHint = this.pauseOverlay.getData('hint') as Phaser.GameObjects.Text;
        pauseTitle.setText(t('pause', this.language));
        pauseHint.setText(t('resume', this.language));
        this.renderUi();
    }

    private cellCenterX(x: number): number {
        return GameScene.BOARD_X + x * GameScene.CELL_SIZE + GameScene.CELL_SIZE / 2;
    }

    private cellCenterY(y: number): number {
        return GameScene.BOARD_Y + (Grid.HEIGHT - 1 - y) * GameScene.CELL_SIZE + GameScene.CELL_SIZE / 2;
    }
}