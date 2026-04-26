import { Tetromino, TetrominoType } from './Tetromino';

export interface Cell {
    filled: boolean;
    color: number | null;
    pieceType: TetrominoType | -1;
}

export class Grid {
    public static readonly WIDTH = 10;
    public static readonly HEIGHT = 20;

    private boardCells: Cell[][] = [];

    constructor() {
        this.clear();
    }

    public clear(): void {
        this.boardCells = [];
        for (let y = 0; y < Grid.HEIGHT; y++) {
            this.boardCells[y] = [];
            for (let x = 0; x < Grid.WIDTH; x++) {
                this.boardCells[y][x] = { filled: false, color: null, pieceType: -1 };
            }
        }
    }

    public getCell(x: number, y: number): Cell | null {
        return this.isValidPosition(x, y) ? this.boardCells[y][x] : null;
    }

    public isValidPosition(x: number, y: number): boolean {
        return x >= 0 && x < Grid.WIDTH && y >= 0 && y < Grid.HEIGHT;
    }

    public canPlacePiece(piece: Tetromino): boolean {
        return piece.getBlockPositions().every((pos) => this.canOccupy(pos.x, pos.y));
    }

    public canPlacePieceAt(piece: Tetromino, offsetX: number, offsetY: number): boolean {
        const originalX = piece.x;
        const originalY = piece.y;
        piece.x += offsetX;
        piece.y += offsetY;
        const canPlace = this.canPlacePiece(piece);
        piece.x = originalX;
        piece.y = originalY;
        return canPlace;
    }

    public canRotatePiece(piece: Tetromino, clockwise: boolean = true): boolean {
        return piece.getRotatedBlockPositions(clockwise).every((pos) => this.canOccupy(pos.x, pos.y));
    }

    public lockPiece(piece: Tetromino): void {
        for (const pos of piece.getBlockPositions()) {
            if (this.isValidPosition(pos.x, pos.y)) {
                this.boardCells[pos.y][pos.x] = {
                    filled: true,
                    color: piece.color,
                    pieceType: piece.type
                };
            }
        }
    }

    public clearLines(): { linesCleared: number; lines: number[] } {
        const completedLines: number[] = [];

        for (let y = 0; y < Grid.HEIGHT; y++) {
            if (this.boardCells[y].every((cell) => cell.filled)) {
                completedLines.push(y);
            }
        }

        for (const y of [...completedLines].sort((a, b) => b - a)) {
            this.removeLine(y);
        }

        return { linesCleared: completedLines.length, lines: completedLines };
    }

    public getGhostPiecePosition(piece: Tetromino): number {
        let dropDistance = 0;
        while (this.canPlacePieceAt(piece, 0, -dropDistance - 1)) {
            dropDistance++;
        }
        return piece.y - dropDistance;
    }

    public isGameOver(): boolean {
        for (let y = Grid.HEIGHT - 4; y < Grid.HEIGHT; y++) {
            for (let x = 0; x < Grid.WIDTH; x++) {
                if (this.boardCells[y][x].filled) {
                    return true;
                }
            }
        }
        return false;
    }

    public get cells(): Cell[][] {
        return this.boardCells;
    }

    public getFilledCells(): Array<{ x: number; y: number; color: number; pieceType: TetrominoType }> {
        const filled: Array<{ x: number; y: number; color: number; pieceType: TetrominoType }> = [];
        for (let y = 0; y < Grid.HEIGHT; y++) {
            for (let x = 0; x < Grid.WIDTH; x++) {
                const cell = this.boardCells[y][x];
                if (cell.filled && cell.color !== null && cell.pieceType !== -1) {
                    filled.push({ x, y, color: cell.color, pieceType: cell.pieceType });
                }
            }
        }
        return filled;
    }

    private canOccupy(x: number, y: number): boolean {
        return this.isValidPosition(x, y) && !this.boardCells[y][x].filled;
    }

    private removeLine(lineY: number): void {
        for (let y = lineY; y < Grid.HEIGHT - 1; y++) {
            for (let x = 0; x < Grid.WIDTH; x++) {
                const source = this.boardCells[y + 1][x];
                this.boardCells[y][x] = { ...source };
            }
        }

        for (let x = 0; x < Grid.WIDTH; x++) {
            this.boardCells[Grid.HEIGHT - 1][x] = { filled: false, color: null, pieceType: -1 };
        }
    }
}