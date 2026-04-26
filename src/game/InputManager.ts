import Phaser from 'phaser';

type ActionName = 'rotateCW' | 'stepDown' | 'pause';
type ActionCallback = () => void;

export class InputManager {
    private static readonly SCROLL_STEP_INTERVAL = 30;

    private readonly scene: Phaser.Scene;
    private readonly callbacks = new Map<ActionName, ActionCallback[]>();
    private lastScrollStepAt = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        scene.input.mouse?.disableContextMenu();
        scene.input.on('wheel', this.handleWheel, this);
    }

    public on(action: ActionName, callback: ActionCallback): void {
        const existing = this.callbacks.get(action) ?? [];
        existing.push(callback);
        this.callbacks.set(action, existing);
    }

    public update(): void {
        // no-op: all events are interrupt-driven
    }

    public destroy(): void {
        this.scene.input.off('wheel', this.handleWheel, this);
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
            const now = this.scene.time.now;
            if (now - this.lastScrollStepAt >= InputManager.SCROLL_STEP_INTERVAL) {
                this.lastScrollStepAt = now;
                this.emit('stepDown');
            }
        }
    }

    private emit(action: ActionName): void {
        const listeners = this.callbacks.get(action) ?? [];
        for (const callback of listeners) {
            callback();
        }
    }
}