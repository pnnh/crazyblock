export enum TetrominoType {
    I = 0,
    O = 1,
    T = 2,
    S = 3,
    Z = 4,
    J = 5,
    L = 6
}

export interface PieceShape {
    type: TetrominoType;
    color: number;
    shapes: number[][][];
    textureKey: string;
}

export class Tetromino {
    private static readonly SHAPES: PieceShape[] = [
        {
            type: TetrominoType.I,
            color: 0x00b4b4,
            textureKey: 'block_I',
            shapes: [
                [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
                [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
                [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
                [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]]
            ]
        },
        {
            type: TetrominoType.O,
            color: 0xdcb400,
            textureKey: 'block_O',
            shapes: [
                [[1, 1], [1, 1]],
                [[1, 1], [1, 1]],
                [[1, 1], [1, 1]],
                [[1, 1], [1, 1]]
            ]
        },
        {
            type: TetrominoType.T,
            color: 0xa000a0,
            textureKey: 'block_T',
            shapes: [
                [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
                [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
                [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
                [[0, 1, 0], [1, 1, 0], [0, 1, 0]]
            ]
        },
        {
            type: TetrominoType.S,
            color: 0x00b400,
            textureKey: 'block_S',
            shapes: [
                [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
                [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
                [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
                [[1, 0, 0], [1, 1, 0], [0, 1, 0]]
            ]
        },
        {
            type: TetrominoType.Z,
            color: 0xdc0000,
            textureKey: 'block_Z',
            shapes: [
                [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
                [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
                [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
                [[0, 1, 0], [1, 1, 0], [1, 0, 0]]
            ]
        },
        {
            type: TetrominoType.J,
            color: 0x0000c8,
            textureKey: 'block_J',
            shapes: [
                [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
                [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
                [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
                [[0, 1, 0], [0, 1, 0], [1, 1, 0]]
            ]
        },
        {
            type: TetrominoType.L,
            color: 0xdc7800,
            textureKey: 'block_L',
            shapes: [
                [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
                [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
                [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
                [[1, 1, 0], [0, 1, 0], [0, 1, 0]]
            ]
        }
    ];

    private readonly pieceType: TetrominoType;
    private currentRotation = 0;
    private positionX = 0;
    private positionY = 0;

    constructor(type: TetrominoType) {
        this.pieceType = type;
    }

    public static getRandomType(): TetrominoType {
        return Math.floor(Math.random() * Tetromino.SHAPES.length) as TetrominoType;
    }

    public static createRandom(): Tetromino {
        return new Tetromino(Tetromino.getRandomType());
    }

    public static getTextureKey(type: TetrominoType): string {
        return Tetromino.SHAPES[type].textureKey;
    }

    public get type(): TetrominoType {
        return this.pieceType;
    }

    public get color(): number {
        return Tetromino.SHAPES[this.pieceType].color;
    }

    public get textureKey(): string {
        return Tetromino.SHAPES[this.pieceType].textureKey;
    }

    public get x(): number {
        return this.positionX;
    }

    public set x(value: number) {
        this.positionX = value;
    }

    public get y(): number {
        return this.positionY;
    }

    public set y(value: number) {
        this.positionY = value;
    }

    public get rotation(): number {
        return this.currentRotation;
    }

    public getCurrentShape(): number[][] {
        return Tetromino.SHAPES[this.pieceType].shapes[this.currentRotation];
    }

    public getShapeAtRotation(rotation: number): number[][] {
        const normalized = ((rotation % 4) + 4) % 4;
        return Tetromino.SHAPES[this.pieceType].shapes[normalized];
    }

    public rotate(clockwise: boolean = true): void {
        this.currentRotation = clockwise
            ? (this.currentRotation + 1) % 4
            : (this.currentRotation + 3) % 4;
    }

    public getRotatedShape(clockwise: boolean = true): number[][] {
        const nextRotation = clockwise
            ? (this.currentRotation + 1) % 4
            : (this.currentRotation + 3) % 4;
        return Tetromino.SHAPES[this.pieceType].shapes[nextRotation];
    }

    public getBlockPositions(): Array<{ x: number; y: number }> {
        return this.getPositionsForShape(this.getCurrentShape());
    }

    public getRotatedBlockPositions(clockwise: boolean = true): Array<{ x: number; y: number }> {
        return this.getPositionsForShape(this.getRotatedShape(clockwise));
    }

    public clone(): Tetromino {
        const cloned = new Tetromino(this.pieceType);
        cloned.currentRotation = this.currentRotation;
        cloned.positionX = this.positionX;
        cloned.positionY = this.positionY;
        return cloned;
    }

    private getPositionsForShape(shape: number[][]): Array<{ x: number; y: number }> {
        const positions: Array<{ x: number; y: number }> = [];

        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] === 1) {
                    positions.push({ x: this.positionX + col, y: this.positionY + row });
                }
            }
        }

        return positions;
    }
}