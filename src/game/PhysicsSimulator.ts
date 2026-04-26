import type { Cell } from './Grid';
import type { GroupRegistry } from './GroupRegistry';

export interface Movement {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
}

export class PhysicsSimulator {
    public step(
        cells: Cell[][],
        registry: GroupRegistry,
        width: number,
        height: number
    ): { moved: boolean; movements: Movement[] } {
        const movements: Movement[] = [];

        // --- Collect all group cells from current board ---
        const groupCells = new Map<number, { x: number; y: number }[]>();
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const gid = cells[y][x].groupId;
                if (gid !== null) {
                    if (!groupCells.has(gid)) groupCells.set(gid, []);
                    groupCells.get(gid)!.push({ x, y });
                }
            }
        }

        // --- Determine which whole groups can fall ---
        const moveableGroups: number[] = [];
        for (const [gid, gcells] of groupCells) {
            // For each column occupied by this group, find its lowest cell
            const colMin = new Map<number, number>();
            for (const { x, y } of gcells) {
                if (!colMin.has(x) || y < colMin.get(x)!) colMin.set(x, y);
            }
            // Group can fall if every bottom cell has empty space directly below
            const canFall = [...colMin.entries()].every(([x, y]) => y > 0 && !cells[y - 1][x].filled);
            if (canFall) moveableGroups.push(gid);
        }

        // --- Apply group falls (process bottom-to-top within each group to avoid overwrite) ---
        for (const gid of moveableGroups) {
            const gcells = groupCells.get(gid)!.slice().sort((a, b) => a.y - b.y); // lowest y first
            for (const { x, y } of gcells) {
                cells[y - 1][x] = { ...cells[y][x] };
                cells[y][x] = { filled: false, fgColorId: null, groupId: null };
                registry.updateCellPosition(gid, x, y, x, y - 1);
                movements.push({ fromX: x, fromY: y, toX: x, toY: y - 1 });
            }
        }

        // --- Apply split-cell falls (bottom-to-top scan) ---
        for (let y = 1; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (cells[y][x].filled && cells[y][x].groupId === null && !cells[y - 1][x].filled) {
                    cells[y - 1][x] = { ...cells[y][x] };
                    cells[y][x] = { filled: false, fgColorId: null, groupId: null };
                    movements.push({ fromX: x, fromY: y, toX: x, toY: y - 1 });
                }
            }
        }

        return { moved: movements.length > 0, movements };
    }
}
