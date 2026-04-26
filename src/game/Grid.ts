import { Tetromino } from './Tetromino';
import { GroupRegistry } from './GroupRegistry';

export interface Cell {
    filled: boolean;
    fgColorId: number | null;   // 0-6 = TetrominoType; null if empty
    groupId: number | null;     // null = split state; non-null = whole-group id
}

export class Grid {
    public static readonly WIDTH = 12;
    public static readonly HEIGHT = 22;

    private boardCells: Cell[][] = [];

    constructor() {
        this.clear();
    }

    public clear(): void {
        this.boardCells = [];
        for (let y = 0; y < Grid.HEIGHT; y++) {
            this.boardCells[y] = [];
            for (let x = 0; x < Grid.WIDTH; x++) {
                this.boardCells[y][x] = { filled: false, fgColorId: null, groupId: null };
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

    public lockPiece(piece: Tetromino, registry: GroupRegistry): void {
        const positions = piece.getBlockPositions().filter((pos) => this.isValidPosition(pos.x, pos.y));
        const groupId = registry.createGroup(positions, piece.color);
        for (const pos of positions) {
            this.boardCells[pos.y][pos.x] = {
                filled: true,
                fgColorId: piece.type,
                groupId
            };
        }
    }

    public swapCells(x1: number, y1: number, x2: number, y2: number, registry: GroupRegistry): void {
        const gidsToDissolve = new Set<number>();
        const g1 = this.boardCells[y1][x1].groupId;
        const g2 = this.boardCells[y2][x2].groupId;
        if (g1 !== null) gidsToDissolve.add(g1);
        if (g2 !== null) gidsToDissolve.add(g2);
        for (const gid of gidsToDissolve) {
            this.dissolveGroupInBoard(gid, registry);
        }
        const temp = { ...this.boardCells[y1][x1] };
        this.boardCells[y1][x1] = { ...this.boardCells[y2][x2] };
        this.boardCells[y2][x2] = temp;
    }

    public getCompletedRows(): number[] {
        const rows: number[] = [];
        for (let y = 0; y < Grid.HEIGHT; y++) {
            if (this.boardCells[y].every((cell) => cell.filled)) {
                rows.push(y);
            }
        }
        return rows;
    }

    public clearCells(cells: { x: number; y: number }[], registry: GroupRegistry): number {
        const dissolvedGroups = new Set<number>();
        for (const { x, y } of cells) {
            const cell = this.boardCells[y]?.[x];
            if (!cell?.filled) continue;
            const gid = cell.groupId;
            if (gid !== null && !dissolvedGroups.has(gid)) {
                dissolvedGroups.add(gid);
                this.dissolveGroupInBoard(gid, registry);
            }
        }
        let count = 0;
        const seen = new Set<string>();
        for (const { x, y } of cells) {
            const key = `${x},${y}`;
            if (seen.has(key)) continue;
            seen.add(key);
            if (this.isValidPosition(x, y) && this.boardCells[y][x].filled) {
                this.boardCells[y][x] = { filled: false, fgColorId: null, groupId: null };
                count++;
            }
        }
        return count;
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

    private canOccupy(x: number, y: number): boolean {
        return this.isValidPosition(x, y) && !this.boardCells[y][x].filled;
    }

    private dissolveGroupInBoard(groupId: number, registry: GroupRegistry): void {
        const groupCells = registry.dissolveGroup(groupId);
        if (!groupCells) return;
        for (const key of groupCells) {
            const [cx, cy] = key.split(',').map(Number);
            if (this.isValidPosition(cx, cy)) {
                this.boardCells[cy][cx].groupId = null;
            }
        }
    }
}