import Phaser from 'phaser';

type ActionName = 'left' | 'right' | 'rotateCW' | 'rotateCCW' | 'fastDropStart' | 'fastDropEnd' | 'hardDrop' | 'pause';
type ActionCallback = () => void;

interface RepeatState {
    isDown: boolean;
    startedAt: number;
    lastRepeat: number;
}

interface ButtonMoveState {
    startedAt: number;
    lastRepeat: number;
}

export class InputManager {
    private static readonly HOLD_THRESHOLD = 300;
    private static readonly INITIAL_REPEAT_DELAY = 170;
    private static readonly REPEAT_RATE = 50;

    private readonly scene: Phaser.Scene;
    private readonly callbacks = new Map<ActionName, ActionCallback[]>();
    private readonly repeatStates = new Map<number, RepeatState>();
    private readonly moveKeys: Phaser.Input.Keyboard.Key[] = [];
    private leftMoveState: ButtonMoveState | null = null;
    private rightMoveState: ButtonMoveState | null = null;
    private wheelFastDropActive = false;
    private wheelFastDropTimer = 0;
    private sKeyHoldStart = 0;
    private sKeyFastDropActive = false;

    private readonly keyLeftA: Phaser.Input.Keyboard.Key;
    private readonly keyLeftArrow: Phaser.Input.Keyboard.Key;
    private readonly keyRightD: Phaser.Input.Keyboard.Key;
    private readonly keyRightArrow: Phaser.Input.Keyboard.Key;
    private readonly keyW: Phaser.Input.Keyboard.Key;
    private readonly keyUp: Phaser.Input.Keyboard.Key;
    private readonly keyS: Phaser.Input.Keyboard.Key;
    private readonly keyP: Phaser.Input.Keyboard.Key;
    private readonly keyEsc: Phaser.Input.Keyboard.Key;
    private readonly keySpace: Phaser.Input.Keyboard.Key;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        const keyboard = scene.input.keyboard;
        if (!keyboard) {
            throw new Error('Keyboard input is unavailable.');
        }

        this.keyLeftA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyLeftArrow = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.keyRightD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyRightArrow = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyUp = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keyP = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
        this.keyEsc = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.keySpace = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.moveKeys.push(this.keyLeftA, this.keyLeftArrow, this.keyRightD, this.keyRightArrow);
        scene.input.mouse?.disableContextMenu();
        this.bindEvents();
    }

    public on(action: ActionName, callback: ActionCallback): void {
        const existing = this.callbacks.get(action) ?? [];
        existing.push(callback);
        this.callbacks.set(action, existing);
    }

    public update(): void {
        const now = this.scene.time.now;

        for (const key of this.moveKeys) {
            this.updateRepeatKey(key, now);
        }

        this.updatePointerMove(this.leftMoveState, 'left', now);
        this.updatePointerMove(this.rightMoveState, 'right', now);

        if (this.wheelFastDropActive && now >= this.wheelFastDropTimer) {
            this.wheelFastDropActive = false;
            this.emit('fastDropEnd');
        }

        if (this.keyS.isDown && this.sKeyHoldStart > 0 && !this.sKeyFastDropActive && now - this.sKeyHoldStart >= InputManager.HOLD_THRESHOLD) {
            this.sKeyFastDropActive = true;
            this.emit('fastDropStart');
        }
    }

    public isStartPressed(): boolean {
        return Phaser.Input.Keyboard.JustDown(this.keySpace);
    }

    public destroy(): void {
        this.scene.input.off('pointerdown', this.handlePointerDown, this);
        this.scene.input.off('pointerup', this.handlePointerUp, this);
        this.scene.input.off('wheel', this.handleWheel, this);
        this.scene.input.keyboard?.off('keydown-W', this.handleRotateCW, this);
        this.scene.input.keyboard?.off('keydown-UP', this.handleRotateCW, this);
        this.scene.input.keyboard?.off('keydown-P', this.handlePause, this);
        this.scene.input.keyboard?.off('keydown-ESC', this.handlePause, this);
        this.scene.input.keyboard?.off('keydown-SPACE', this.handleSpace, this);
        this.scene.input.keyboard?.off('keydown-A', this.handleMoveKeyDown, this);
        this.scene.input.keyboard?.off('keyup-A', this.handleMoveKeyUp, this);
        this.scene.input.keyboard?.off('keydown-LEFT', this.handleMoveKeyDown, this);
        this.scene.input.keyboard?.off('keyup-LEFT', this.handleMoveKeyUp, this);
        this.scene.input.keyboard?.off('keydown-D', this.handleMoveKeyDown, this);
        this.scene.input.keyboard?.off('keyup-D', this.handleMoveKeyUp, this);
        this.scene.input.keyboard?.off('keydown-RIGHT', this.handleMoveKeyDown, this);
        this.scene.input.keyboard?.off('keyup-RIGHT', this.handleMoveKeyUp, this);
        this.scene.input.keyboard?.off('keydown-S', this.handleSDown, this);
        this.scene.input.keyboard?.off('keyup-S', this.handleSUp, this);
    }

    private bindEvents(): void {
        const keyboard = this.scene.input.keyboard;
        this.scene.input.on('pointerdown', this.handlePointerDown, this);
        this.scene.input.on('pointerup', this.handlePointerUp, this);
        this.scene.input.on('wheel', this.handleWheel, this);
        keyboard?.on('keydown-W', this.handleRotateCW, this);
        keyboard?.on('keydown-UP', this.handleRotateCW, this);
        keyboard?.on('keydown-P', this.handlePause, this);
        keyboard?.on('keydown-ESC', this.handlePause, this);
        keyboard?.on('keydown-SPACE', this.handleSpace, this);
        keyboard?.on('keydown-A', this.handleMoveKeyDown, this);
        keyboard?.on('keyup-A', this.handleMoveKeyUp, this);
        keyboard?.on('keydown-LEFT', this.handleMoveKeyDown, this);
        keyboard?.on('keyup-LEFT', this.handleMoveKeyUp, this);
        keyboard?.on('keydown-D', this.handleMoveKeyDown, this);
        keyboard?.on('keyup-D', this.handleMoveKeyUp, this);
        keyboard?.on('keydown-RIGHT', this.handleMoveKeyDown, this);
        keyboard?.on('keyup-RIGHT', this.handleMoveKeyUp, this);
        keyboard?.on('keydown-S', this.handleSDown, this);
        keyboard?.on('keyup-S', this.handleSUp, this);
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer): void {
        const now = this.scene.time.now;
        if (pointer.leftButtonDown()) {
            this.leftMoveState = { startedAt: now, lastRepeat: now };
            this.emit('left');
        } else if (pointer.rightButtonDown()) {
            this.rightMoveState = { startedAt: now, lastRepeat: now };
            this.emit('right');
        }
    }

    private handlePointerUp(pointer: Phaser.Input.Pointer): void {
        if (pointer.leftButtonReleased()) {
            this.leftMoveState = null;
        }
        if (pointer.rightButtonReleased()) {
            this.rightMoveState = null;
        }
    }

    private handleWheel(
        _pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number
    ): void {
        if (deltaY < 0) {
            this.emit('rotateCW');
        } else if (deltaY > 0) {
            this.wheelFastDropTimer = this.scene.time.now + 400;
            if (!this.wheelFastDropActive) {
                this.wheelFastDropActive = true;
                this.emit('fastDropStart');
            }
        }
    }

    private handleRotateCW(): void {
        this.emit('rotateCW');
    }

    private handlePause(): void {
        this.emit('pause');
    }

    private handleSpace(): void {
        this.emit('fastDropStart');
        this.emit('fastDropEnd');
    }

    private handleMoveKeyDown(event: KeyboardEvent): void {
        const keyCode = this.resolveMoveKeyCode(event.code);
        if (keyCode === null) {
            return;
        }

        if (!this.repeatStates.get(keyCode)?.isDown) {
            this.repeatStates.set(keyCode, {
                isDown: true,
                startedAt: this.scene.time.now,
                lastRepeat: this.scene.time.now
            });
            this.emit(keyCode === Phaser.Input.Keyboard.KeyCodes.A || keyCode === Phaser.Input.Keyboard.KeyCodes.LEFT ? 'left' : 'right');
        }
    }

    private handleMoveKeyUp(event: KeyboardEvent): void {
        const keyCode = this.resolveMoveKeyCode(event.code);
        if (keyCode !== null) {
            this.repeatStates.set(keyCode, { isDown: false, startedAt: 0, lastRepeat: 0 });
        }
    }

    private handleSDown(): void {
        if (this.sKeyHoldStart === 0) {
            this.sKeyHoldStart = this.scene.time.now;
        }
    }

    private handleSUp(): void {
        if (this.sKeyHoldStart === 0) {
            return;
        }

        if (this.sKeyFastDropActive) {
            this.emit('fastDropEnd');
        } else {
            this.emit('rotateCCW');
        }

        this.sKeyHoldStart = 0;
        this.sKeyFastDropActive = false;
    }

    private updatePointerMove(state: ButtonMoveState | null, direction: 'left' | 'right', now: number): void {
        if (!state) {
            return;
        }

        if (now - state.startedAt < InputManager.HOLD_THRESHOLD) {
            return;
        }

        if (now - state.lastRepeat >= InputManager.REPEAT_RATE) {
            state.lastRepeat = now;
            this.emit(direction);
        }
    }

    private updateRepeatKey(key: Phaser.Input.Keyboard.Key, now: number): void {
        const state = this.repeatStates.get(key.keyCode);
        if (!state || !state.isDown) {
            return;
        }

        if (now - state.startedAt < InputManager.INITIAL_REPEAT_DELAY) {
            return;
        }

        if (now - state.lastRepeat >= InputManager.REPEAT_RATE) {
            state.lastRepeat = now;
            this.repeatStates.set(key.keyCode, state);
            this.emit(key.keyCode === Phaser.Input.Keyboard.KeyCodes.A || key.keyCode === Phaser.Input.Keyboard.KeyCodes.LEFT ? 'left' : 'right');
        }
    }

    private resolveMoveKeyCode(code: string): number | null {
        switch (code) {
            case 'KeyA':
                return Phaser.Input.Keyboard.KeyCodes.A;
            case 'ArrowLeft':
                return Phaser.Input.Keyboard.KeyCodes.LEFT;
            case 'KeyD':
                return Phaser.Input.Keyboard.KeyCodes.D;
            case 'ArrowRight':
                return Phaser.Input.Keyboard.KeyCodes.RIGHT;
            default:
                return null;
        }
    }

    private emit(action: ActionName): void {
        const listeners = this.callbacks.get(action) ?? [];
        for (const callback of listeners) {
            callback();
        }
    }
}