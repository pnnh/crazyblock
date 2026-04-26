import type { Cell } from './Grid';

export class GroupRegistry {
    private nextId = 1;
    private readonly groups = new Map<number, { cells: Set<string>; bgColor: number }>();

    public createGroup(positions: { x: number; y: number }[], bgColor: number): number {
        const id = this.nextId++;
        const cells = new Set(positions.map((p) => `${p.x},${p.y}`));
        this.groups.set(id, { cells, bgColor });
        return id;
    }

    public dissolveGroup(groupId: number): Set<string> | null {
        const group = this.groups.get(groupId);
        if (!group) return null;
        this.groups.delete(groupId);
        return group.cells;
    }

    public getColor(groupId: number): number {
        return this.groups.get(groupId)?.bgColor ?? 0x1a1f35;
    }

    public updateCellPosition(groupId: number, oldX: number, oldY: number, newX: number, newY: number): void {
        const group = this.groups.get(groupId);
        if (!group) return;
        group.cells.delete(`${oldX},${oldY}`);
        group.cells.add(`${newX},${newY}`);
    }

    public dissolveAll(boardCells: Cell[][], height: number, width: number): void {
        for (const [, group] of this.groups) {
            for (const key of group.cells) {
                const [x, y] = key.split(',').map(Number);
                if (y >= 0 && y < height && x >= 0 && x < width) {
                    boardCells[y][x].groupId = null;
                }
            }
        }
        this.groups.clear();
    }

    public clear(): void {
        this.groups.clear();
        this.nextId = 1;
    }
}
