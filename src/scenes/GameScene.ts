import Phaser from 'phaser';
import { AudioManager } from '../game/AudioManager';
import { Grid } from '../game/Grid';
import { GroupRegistry } from '../game/GroupRegistry';
import { InputManager } from '../game/InputManager';
import { MatchChecker } from '../game/MatchChecker';
import { PhysicsSimulator } from '../game/PhysicsSimulator';
import { Movement } from '../game/PhysicsSimulator';
import { ScoreManager } from '../game/ScoreManager';
import { TextureFactory } from '../game/TextureFactory';
import { Tetromino, TetrominoType } from '../game/Tetromino';
import { getStoredLanguage, Language, t, toggleLanguage } from '../i18n';

type UiKey = 'score' | 'level' | 'lines' | 'high' | 'combo' | 'next' | 'controls';

interface HoldState {
    startedAt: number;
    lastRepeat: number;
}

export class GameScene extends Phaser.Scene {
    // Layout
    private static readonly CELL_SIZE = 30;
    private static readonly BOARD_X = 20;
    private static readonly BOARD_Y = 28;
    private static readonly SIDE_X = 392;

    // Input timing
    private static readonly HOLD_THRESHOLD = 300;
    private static readonly REPEAT_RATE = 50;

    // Game state
    private language: Language = 'zh';
    private readonly grid = new Grid();
    private readonly groupRegistry = new GroupRegistry();
    private readonly scoreManager = new ScoreManager();
    private readonly matchChecker = new MatchChecker();
    private readonly physicsSimulator = new PhysicsSimulator();
    private inputManager!: InputManager;
    private audioManager!: AudioManager;

    private currentPiece: Tetromino | null = null;
    private nextPieceType: TetrominoType = TetrominoType.I;
    private fallTimer = 0;
    private paused = false;
    private gameEnded = false;
    private isAnimating = false;
    private selectedCell: { x: number; y: number } | null = null;

    // Pointer hold state
    private leftHoldState: HoldState | null = null;
    private rightHoldState: HoldState | null = null;

    // Rendering
    private boardBgGraphics!: Phaser.GameObjects.Graphics;
    private boardOverlayGraphics!: Phaser.GameObjects.Graphics;
    private boardSprites: Phaser.GameObjects.Image[][] = [];
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
        // PNG block images no longer used; textures generated in create()
    }

    public create(): void {
        this.language = getStoredLanguage();
        this.cameras.main.setBackgroundColor('#151827');

        // Generate foreground textures before anything else
        TextureFactory.create(this);

        this.scoreManager.reset();
        this.grid.clear();
        this.groupRegistry.clear();
        this.fallTimer = 0;
        this.paused = false;
        this.gameEnded = false;
        this.isAnimating = false;
        this.selectedCell = null;
        this.leftHoldState = null;
        this.rightHoldState = null;

        this.audioManager = new AudioManager(this.sound.context as AudioContext | null);
        void this.audioManager.unlock();

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
            this.input.off('pointerdown', this.handlePointerDown, this);
            this.input.off('pointerup', this.handlePointerUp, this);
        });
    }

    public update(_time: number, delta: number): void {
        this.inputManager.update();
        this.updatePointerHold(this.time.now);

        if (this.paused || this.gameEnded || !this.currentPiece || this.isAnimating) {
            return;
        }

        const stepSeconds = delta / 1000;
        this.fallTimer += stepSeconds;
        const targetSpeed = this.scoreManager.getFallSpeed();

        while (this.fallTimer >= targetSpeed) {
            this.fallTimer -= targetSpeed;
            if (!this.tryMovePiece(0, -1, false)) {
                break;
            }
        }
    }

    // ─── Input ────────────────────────────────────────────────────────────────

    private setupInput(): void {
        this.inputManager = new InputManager(this);

        this.inputManager.on('rotateCW', () => {
            if (!this.paused && !this.isAnimating) this.rotatePiece(true);
        });
        this.inputManager.on('stepDown', () => {
            if (!this.paused && !this.isAnimating) this.tryMovePiece(0, -1, true);
        });
        this.inputManager.on('pause', () => this.togglePause());

        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointerup', this.handlePointerUp, this);
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer): void {
        const now = this.time.now;

        if (pointer.leftButtonDown()) {
            // Determine if the click lands on a settled board cell
            const col = Math.floor((pointer.x - GameScene.BOARD_X) / GameScene.CELL_SIZE);
            const row = Grid.HEIGHT - 1 - Math.floor((pointer.y - GameScene.BOARD_Y) / GameScene.CELL_SIZE);
            const onSettledCell =
                col >= 0 && col < Grid.WIDTH &&
                row >= 0 && row < Grid.HEIGHT &&
                this.grid.cells[row][col].filled;

            if (onSettledCell && !this.isAnimating && !this.gameEnded && !this.paused) {
                this.handleBoardCellClick(col, row);
            } else if (!this.isAnimating && !this.gameEnded && !this.paused) {
                this.leftHoldState = { startedAt: now, lastRepeat: now };
                this.tryMovePiece(-1, 0, false);
            }
        } else if (pointer.rightButtonDown()) {
            if (!this.isAnimating && !this.gameEnded && !this.paused) {
                this.rightHoldState = { startedAt: now, lastRepeat: now };
                this.tryMovePiece(1, 0, false);
            }
        }
    }

    private handlePointerUp(pointer: Phaser.Input.Pointer): void {
        if (pointer.leftButtonReleased()) this.leftHoldState = null;
        if (pointer.rightButtonReleased()) this.rightHoldState = null;
    }

    private updatePointerHold(now: number): void {
        if (this.isAnimating || this.paused || this.gameEnded || !this.currentPiece) {
            this.leftHoldState = null;
            this.rightHoldState = null;
            return;
        }
        this.processHold(this.leftHoldState, -1, 0, now);
        this.processHold(this.rightHoldState, 1, 0, now);
    }

    private processHold(state: HoldState | null, dx: number, dy: number, now: number): void {
        if (!state) return;
        if (now - state.startedAt < GameScene.HOLD_THRESHOLD) return;
        if (now - state.lastRepeat >= GameScene.REPEAT_RATE) {
            state.lastRepeat = now;
            this.tryMovePiece(dx, dy, false);
        }
    }

    // ─── Board cell click / swap ───────────────────────────────────────────────

    private handleBoardCellClick(x: number, y: number): void {
        if (!this.selectedCell) {
            this.selectedCell = { x, y };
            this.renderBoard();
            return;
        }

        if (this.selectedCell.x === x && this.selectedCell.y === y) {
            this.selectedCell = null;
            this.renderBoard();
            return;
        }

        const dx = Math.abs(x - this.selectedCell.x);
        const dy = Math.abs(y - this.selectedCell.y);

        if (dx + dy === 1) {
            const from = this.selectedCell;
            this.selectedCell = null;
            void this.executeSwap(from.x, from.y, x, y);
        } else {
            this.selectedCell = { x, y };
            this.renderBoard();
        }
    }

    private async executeSwap(x1: number, y1: number, x2: number, y2: number): Promise<void> {
        this.isAnimating = true;
        await this.animateSwap(x1, y1, x2, y2);
        this.grid.swapCells(x1, y1, x2, y2, this.groupRegistry);
        this.audioManager.play('move');
        this.renderBoard();
        await this.runCascade();
    }

    // ─── Piece movement ────────────────────────────────────────────────────────

    private tryMovePiece(dx: number, dy: number, rewardSoftDrop: boolean): boolean {
        if (!this.currentPiece || this.gameEnded) return false;

        if (this.grid.canPlacePieceAt(this.currentPiece, dx, dy)) {
            this.currentPiece.x += dx;
            this.currentPiece.y += dy;
            if (dx !== 0) this.audioManager.play('move');
            if (dy < 0 && rewardSoftDrop) this.scoreManager.addSoftDropScore();
            this.renderBoard();
            return true;
        }

        if (dy < 0) {
            void this.doLockPiece();
        }
        return false;
    }

    private rotatePiece(clockwise: boolean): void {
        if (!this.currentPiece || this.gameEnded) return;

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

    private async doLockPiece(): Promise<void> {
        if (!this.currentPiece) return;
        this.isAnimating = true;
        this.scoreManager.resetCombo();
        this.grid.lockPiece(this.currentPiece, this.groupRegistry);
        this.currentPiece = null;
        this.audioManager.play('lock');
        this.renderBoard();
        await this.runCascade();
        if (this.grid.isGameOver()) {
            this.handleGameOver();
            return;
        }
        this.spawnPiece();
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
        this.isAnimating = false;
        this.renderBoard();
        this.renderUi();
    }

    // ─── Cascade (match + gravity) ─────────────────────────────────────────────

    private async runCascade(): Promise<void> {
        this.renderBoard();

        while (true) {
            const matchedCells = this.matchChecker.findMatches(this.grid.cells, Grid.WIDTH, Grid.HEIGHT);
            const completedRows = this.grid.getCompletedRows();

            if (matchedCells.length === 0 && completedRows.length === 0) break;

            // Build unified clear list (de-duplicated)
            const clearSet = new Set<string>();
            const allToClear: { x: number; y: number }[] = [];

            const addToClears = (x: number, y: number) => {
                const key = `${x},${y}`;
                if (!clearSet.has(key)) { clearSet.add(key); allToClear.push({ x, y }); }
            };

            for (const c of matchedCells) addToClears(c.x, c.y);
            for (const rowY of completedRows) {
                for (let x = 0; x < Grid.WIDTH; x++) {
                    if (this.grid.cells[rowY][x].filled) addToClears(x, rowY);
                }
            }

            // Animate disappear → clear data → score
            await this.animateDisappear(allToClear);
            const cleared = this.grid.clearCells(allToClear, this.groupRegistry);
            this.scoreManager.addCellsCleared(cleared);
            this.audioManager.play('lineClear');
            this.renderBoard();
            this.renderUi();

            // Gravity loop
            let gravityActive = true;
            while (gravityActive) {
                const { moved, movements } = this.physicsSimulator.step(
                    this.grid.cells, this.groupRegistry, Grid.WIDTH, Grid.HEIGHT
                );
                gravityActive = moved;
                if (moved) {
                    await this.animateDrop(movements);
                    this.renderBoard();
                }
            }
        }

        this.renderBoard();
        this.renderUi();
        this.isAnimating = false;
    }

    // ─── Animations ───────────────────────────────────────────────────────────

    private async animateSwap(x1: number, y1: number, x2: number, y2: number): Promise<void> {
        const s1 = this.boardSprites[y1][x1];
        const s2 = this.boardSprites[y2][x2];
        const cell1 = this.grid.cells[y1][x1];
        const cell2 = this.grid.cells[y2][x2];

        const p1 = { x: this.cellCenterX(x1), y: this.cellCenterY(y1) };
        const p2 = { x: this.cellCenterX(x2), y: this.cellCenterY(y2) };

        // Prepare sprites
        if (cell1.filled && cell1.fgColorId !== null) {
            s1.setTexture(`fg_${cell1.fgColorId}`).setPosition(p1.x, p1.y).setVisible(true).setScale(1);
        }
        if (cell2.filled && cell2.fgColorId !== null) {
            s2.setTexture(`fg_${cell2.fgColorId}`).setPosition(p2.x, p2.y).setVisible(true).setScale(1);
        }

        return new Promise<void>((resolve) => {
            let done = 0;
            const onDone = () => { if (++done === 2) resolve(); };
            this.tweens.add({ targets: s1, x: p2.x, y: p2.y, duration: 100, ease: 'Sine.easeInOut', onComplete: onDone });
            this.tweens.add({ targets: s2, x: p1.x, y: p1.y, duration: 100, ease: 'Sine.easeInOut', onComplete: onDone });
        });
    }

    private async animateDisappear(cells: { x: number; y: number }[]): Promise<void> {
        const sprites = cells
            .filter(({ x, y }) => this.grid.isValidPosition(x, y))
            .map(({ x, y }) => this.boardSprites[y][x])
            .filter((s) => s.visible);

        if (sprites.length === 0) return;

        return new Promise<void>((resolve) => {
            this.tweens.add({
                targets: sprites,
                scaleX: 0,
                scaleY: 0,
                duration: 150,
                ease: 'Sine.easeIn',
                onComplete: () => {
                    for (const s of sprites) s.setScale(1).setVisible(false);
                    resolve();
                }
            });
        });
    }

    private async animateDrop(movements: Movement[]): Promise<void> {
        if (movements.length === 0) return;

        // Identify source positions; hide destinations that are not also sources
        const sourceKeys = new Set(movements.map((m) => `${m.fromX},${m.fromY}`));
        for (const { toX, toY } of movements) {
            if (!sourceKeys.has(`${toX},${toY}`)) {
                this.boardSprites[toY][toX].setVisible(false);
            }
        }

        const tweenTargets: Array<{ sprite: Phaser.GameObjects.Image; toY: number }> = [];
        for (const { fromX, fromY, toY } of movements) {
            tweenTargets.push({ sprite: this.boardSprites[fromY][fromX], toY: this.cellCenterY(toY) });
        }

        return new Promise<void>((resolve) => {
            let done = 0;
            const total = tweenTargets.length;
            for (const { sprite, toY } of tweenTargets) {
                this.tweens.add({
                    targets: sprite,
                    y: toY,
                    duration: 120,
                    ease: 'Quad.easeOut',
                    onComplete: () => { if (++done === total) resolve(); }
                });
            }
        });
    }

    // ─── Rendering ────────────────────────────────────────────────────────────

    private renderBoard(): void {
        const CS = GameScene.CELL_SIZE;

        // Reset all sprites to their pool positions
        for (let y = 0; y < Grid.HEIGHT; y++) {
            for (let x = 0; x < Grid.WIDTH; x++) {
                this.boardSprites[y][x]
                    .setVisible(false)
                    .setScale(1)
                    .setPosition(this.cellCenterX(x), this.cellCenterY(y));
            }
        }

        this.boardBgGraphics.clear();
        this.boardOverlayGraphics.clear();

        // Ghost piece background
        if (this.currentPiece && !this.gameEnded) {
            const ghostY = this.grid.getGhostPiecePosition(this.currentPiece);
            if (ghostY !== this.currentPiece.y) {
                const ghost = this.currentPiece.clone();
                ghost.y = ghostY;
                for (const pos of ghost.getBlockPositions()) {
                    if (this.grid.isValidPosition(pos.x, pos.y)) {
                        this.boardBgGraphics.fillStyle(0x334488, 0.3);
                        this.boardBgGraphics.fillRect(this.cellX(pos.x), this.cellY(pos.y), CS - 1, CS - 1);
                    }
                }
            }
        }

        // Settled cells
        for (let y = 0; y < Grid.HEIGHT; y++) {
            for (let x = 0; x < Grid.WIDTH; x++) {
                const cell = this.grid.cells[y][x];
                if (!cell.filled) continue;

                // Background rect
                if (cell.groupId !== null) {
                    const bgColor = this.groupRegistry.getColor(cell.groupId);
                    this.boardBgGraphics.fillStyle(bgColor, 0.55);
                } else {
                    this.boardBgGraphics.fillStyle(0x1a2040, 0.9);
                }
                this.boardBgGraphics.fillRect(this.cellX(x), this.cellY(y), CS - 1, CS - 1);

                // Foreground sprite
                this.boardSprites[y][x]
                    .setTexture(`fg_${cell.fgColorId!}`)
                    .setVisible(true);
            }
        }

        // Current falling piece
        if (this.currentPiece && !this.gameEnded) {
            for (const pos of this.currentPiece.getBlockPositions()) {
                if (this.grid.isValidPosition(pos.x, pos.y)) {
                    this.boardBgGraphics.fillStyle(0x2a3a6a, 0.6);
                    this.boardBgGraphics.fillRect(this.cellX(pos.x), this.cellY(pos.y), CS - 1, CS - 1);
                    this.boardSprites[pos.y][pos.x]
                        .setTexture(`fg_${this.currentPiece.type}`)
                        .setVisible(true);
                }
            }
        }

        // Selected cell highlight
        if (this.selectedCell) {
            this.boardOverlayGraphics.lineStyle(2, 0xffffff, 1);
            this.boardOverlayGraphics.strokeRect(
                this.cellX(this.selectedCell.x), this.cellY(this.selectedCell.y), CS - 1, CS - 1
            );
        }

        this.renderNextPiece();
    }

    private renderNextPiece(): void {
        for (const s of this.nextSprites) s.setVisible(false);

        const previewPiece = new Tetromino(this.nextPieceType);
        const shape = previewPiece.getShapeAtRotation(0);
        const positions: { x: number; y: number }[] = [];
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] === 1) positions.push({ x: col, y: row });
            }
        }
        if (positions.length === 0) return;

        const minX = Math.min(...positions.map((p) => p.x));
        const maxX = Math.max(...positions.map((p) => p.x));
        const minY = Math.min(...positions.map((p) => p.y));
        const maxY = Math.max(...positions.map((p) => p.y));
        const w = maxX - minX + 1;
        const h = maxY - minY + 1;
        const cell = 24;
        const panelCenterX = GameScene.SIDE_X + (560 - GameScene.SIDE_X) / 2;
        const startX = panelCenterX - (w * cell) / 2;
        const startY = 148 - (h * cell) / 2;

        positions.forEach((pos, i) => {
            const s = this.nextSprites[i];
            s.setTexture(`fg_${previewPiece.type}`)
                .setPosition(startX + (pos.x - minX) * cell + cell / 2, startY + (pos.y - minY) * cell + cell / 2)
                .setScale(0.8)
                .setVisible(true);
        });
    }

    private renderUi(): void {
        this.uiValues.get('score')?.setText(String(this.scoreManager.score));
        this.uiValues.get('level')?.setText(String(this.scoreManager.level));
        this.uiValues.get('lines')?.setText(String(this.scoreManager.lines));
        this.uiValues.get('high')?.setText(String(ScoreManager.getHighScore()));
        this.uiValues.get('combo')?.setText(this.scoreManager.combo > 0 ? `x${this.scoreManager.combo}` : '0');
    }

    // ─── UI construction ──────────────────────────────────────────────────────

    private drawStaticBackground(): void {
        const bg = this.add.graphics();
        const boardW = Grid.WIDTH * GameScene.CELL_SIZE;
        const boardH = Grid.HEIGHT * GameScene.CELL_SIZE;
        const bx = GameScene.BOARD_X;
        const by = GameScene.BOARD_Y;
        const sx = GameScene.SIDE_X;
        const sw = 560 - sx - 8;

        // Board border + fill
        bg.fillStyle(0x0d1120, 1);
        bg.fillRoundedRect(bx - 10, by - 10, boardW + 20, boardH + 20, 14);
        bg.fillStyle(0x161b2e, 1);
        bg.fillRect(bx, by, boardW, boardH);

        // Grid lines
        bg.lineStyle(1, 0x26314f, 1);
        for (let x = 0; x <= Grid.WIDTH; x++) {
            bg.moveTo(bx + x * GameScene.CELL_SIZE, by);
            bg.lineTo(bx + x * GameScene.CELL_SIZE, by + boardH);
        }
        for (let y = 0; y <= Grid.HEIGHT; y++) {
            bg.moveTo(bx, by + y * GameScene.CELL_SIZE);
            bg.lineTo(bx + boardW, by + y * GameScene.CELL_SIZE);
        }
        bg.strokePath();

        // Side panel cards
        bg.fillStyle(0x0d1120, 1);
        bg.fillRoundedRect(sx - 4, 38, sw, 200, 12);  // next
        bg.fillRoundedRect(sx - 4, 254, sw, 290, 12); // stats
        bg.fillRoundedRect(sx - 4, 560, sw, 190, 12); // controls

        // Background graphics layers (cleared each frame)
        this.boardBgGraphics = this.add.graphics();
        this.boardBgGraphics.setDepth(1);
        this.boardOverlayGraphics = this.add.graphics();
        this.boardOverlayGraphics.setDepth(3);
    }

    private createBoardPool(): void {
        for (let y = 0; y < Grid.HEIGHT; y++) {
            this.boardSprites[y] = [];
            for (let x = 0; x < Grid.WIDTH; x++) {
                const sprite = this.add.image(this.cellCenterX(x), this.cellCenterY(y), 'fg_0');
                sprite.setVisible(false).setDepth(2);
                this.boardSprites[y][x] = sprite;
            }
        }
    }

    private createNextPool(): void {
        for (let i = 0; i < 4; i++) {
            this.nextSprites.push(this.add.image(0, 0, 'fg_0').setVisible(false).setDepth(2));
        }
    }

    private createUi(): void {
        const sx = GameScene.SIDE_X;
        const lStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '16px',
            color: '#8ea2ff'
        };
        const vStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '22px',
            color: '#f4f7ff',
            fontStyle: 'bold'
        };

        this.uiLabels.set('next', this.add.text(sx, 46, '', lStyle));
        this.uiLabels.set('score', this.add.text(sx, 262, '', lStyle));
        this.uiValues.set('score', this.add.text(sx, 282, '0', vStyle));
        this.uiLabels.set('level', this.add.text(sx, 316, '', lStyle));
        this.uiValues.set('level', this.add.text(sx, 336, '1', vStyle));
        this.uiLabels.set('lines', this.add.text(sx, 370, '', lStyle));
        this.uiValues.set('lines', this.add.text(sx, 390, '0', vStyle));
        this.uiLabels.set('high', this.add.text(sx, 424, '', lStyle));
        this.uiValues.set('high', this.add.text(sx, 444, '0', vStyle));
        this.uiLabels.set('combo', this.add.text(sx, 478, '', lStyle));
        this.uiValues.set('combo', this.add.text(sx, 498, '0', vStyle));
        this.uiLabels.set('controls', this.add.text(sx, 568, '', lStyle));
        this.controlsText = this.add.text(sx, 590, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '13px',
            color: '#d4dcff',
            lineSpacing: 6
        });

        this.langButton = this.add.text(this.scale.width - 16, 8, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '14px',
            color: '#11152a',
            backgroundColor: '#d6e0ff',
            padding: { left: 8, right: 8, top: 6, bottom: 6 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        this.pauseButton = this.add.text(this.scale.width - 16, 44, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '14px',
            color: '#11152a',
            backgroundColor: '#ffe1a6',
            padding: { left: 8, right: 8, top: 6, bottom: 6 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        this.langButton.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, e: Phaser.Types.Input.EventData) => {
            e.stopPropagation();
            this.language = toggleLanguage(this.language);
            this.refreshLanguage();
        });
        this.pauseButton.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, e: Phaser.Types.Input.EventData) => {
            e.stopPropagation();
            this.togglePause();
        });
    }

    private createPauseOverlay(): void {
        const { width } = this.scale;
        const shade = this.add.rectangle(width / 2, 390, width, 780, 0x04060c, 0.68);
        const title = this.add.text(width / 2, 330, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '36px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        const hint = this.add.text(width / 2, 384, '', {
            fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
            fontSize: '18px',
            color: '#d3dcff',
            align: 'center'
        }).setOrigin(0.5);
        this.pauseOverlay = this.add.container(0, 0, [shade, title, hint]).setVisible(false).setDepth(1000);
        this.pauseOverlay.setData('title', title);
        this.pauseOverlay.setData('hint', hint);
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

    // ─── Pause / Game over ────────────────────────────────────────────────────

    private togglePause(): void {
        if (this.gameEnded) return;
        this.paused = !this.paused;
        this.pauseOverlay.setVisible(this.paused);
    }

    private handleGameOver(): void {
        if (this.gameEnded) return;
        this.gameEnded = true;
        this.isAnimating = false;
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

    // ─── Coordinate helpers ───────────────────────────────────────────────────

    private cellX(x: number): number {
        return GameScene.BOARD_X + x * GameScene.CELL_SIZE;
    }

    private cellY(y: number): number {
        return GameScene.BOARD_Y + (Grid.HEIGHT - 1 - y) * GameScene.CELL_SIZE;
    }

    private cellCenterX(x: number): number {
        return this.cellX(x) + GameScene.CELL_SIZE / 2;
    }

    private cellCenterY(y: number): number {
        return this.cellY(y) + GameScene.CELL_SIZE / 2;
    }
}
