import type { Cell } from './Grid';

export class MatchChecker {
    public findMatches(cells: Cell[][], width: number, height: number): { x: number; y: number }[] {
        const matched = new Set<string>();

        // Horizontal scan
        for (let y = 0; y < height; y++) {
            let start = 0;
            while (start < width) {
                const cell = cells[y][start];
                if (!cell.filled || cell.fgColorId === null) {
                    start++;
                    continue;
                }
                let end = start + 1;
                while (end < width && cells[y][end].filled && cells[y][end].fgColorId === cell.fgColorId) {
                    end++;
                }
                if (end - start >= 3) {
                    for (let x = start; x < end; x++) matched.add(`${x},${y}`);
                }
                start = end;
            }
        }

        // Vertical scan
        for (let x = 0; x < width; x++) {
            let start = 0;
            while (start < height) {
                const cell = cells[start][x];
                if (!cell.filled || cell.fgColorId === null) {
                    start++;
                    continue;
                }
                let end = start + 1;
                while (end < height && cells[end][x].filled && cells[end][x].fgColorId === cell.fgColorId) {
                    end++;
                }
                if (end - start >= 3) {
                    for (let y = start; y < end; y++) matched.add(`${x},${y}`);
                }
                start = end;
            }
        }

        return Array.from(matched).map((key) => {
            const [x, y] = key.split(',').map(Number);
            return { x, y };
        });
    }
}
