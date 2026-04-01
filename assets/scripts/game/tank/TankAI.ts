/**
 * 坦克AI系统 - BFS移动 + 方块射击AI
 */
import { Direction, GRID_COLS, GRID_ROWS, TANK_SIZE } from '../../core/Constants';
import { GridManager } from '../grid/GridManager';

interface GridPos {
    row: number;
    col: number;
}

const DIR_DELTAS: Record<Direction, GridPos> = {
    [Direction.UP]: { row: 1, col: 0 },
    [Direction.DOWN]: { row: -1, col: 0 },
    [Direction.LEFT]: { row: 0, col: -1 },
    [Direction.RIGHT]: { row: 0, col: 1 },
};

export class TankAI {
    static findNextDirection(start: GridPos, target: GridPos): Direction | null {
        if (start.row === target.row && start.col === target.col) return null;

        const grid = GridManager.instance;
        if (!grid) return null;

        const visited = new Set<string>();
        const queue: { pos: GridPos; firstDir: Direction }[] = [];

        const key = (r: number, c: number) => `${r},${c}`;
        visited.add(key(start.row, start.col));

        for (const dir of [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT]) {
            const delta = DIR_DELTAS[dir];
            const nr = start.row + delta.row;
            const nc = start.col + delta.col;
            if (grid.isAreaWalkable(nr, nc, TANK_SIZE) && !visited.has(key(nr, nc))) {
                if (nr === target.row && nc === target.col) return dir;
                visited.add(key(nr, nc));
                queue.push({ pos: { row: nr, col: nc }, firstDir: dir });
            }
        }

        const maxSteps = 80;
        let steps = 0;

        while (queue.length > 0 && steps < maxSteps) {
            const { pos, firstDir } = queue.shift()!;
            steps++;

            for (const dir of [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT]) {
                const delta = DIR_DELTAS[dir];
                const nr = pos.row + delta.row;
                const nc = pos.col + delta.col;

                if (!grid.isAreaWalkable(nr, nc, TANK_SIZE)) continue;
                if (visited.has(key(nr, nc))) continue;

                if (nr === target.row && nc === target.col) {
                    return firstDir;
                }

                visited.add(key(nr, nc));
                queue.push({ pos: { row: nr, col: nc }, firstDir });
            }
        }

        return null;
    }

    static hasLineOfSight(from: GridPos, to: GridPos): Direction | null {
        const grid = GridManager.instance;
        if (!grid) return null;

        if (from.row === to.row) {
            const dir = from.col < to.col ? Direction.RIGHT : Direction.LEFT;
            const step = from.col < to.col ? 1 : -1;
            for (let c = from.col + step; c !== to.col; c += step) {
                if (!grid.isEmpty(from.row, c)) return null;
            }
            return dir;
        }

        if (from.col === to.col) {
            const dir = from.row < to.row ? Direction.UP : Direction.DOWN;
            const step = from.row < to.row ? 1 : -1;
            for (let r = from.row + step; r !== to.row; r += step) {
                if (!grid.isEmpty(r, from.col)) return null;
            }
            return dir;
        }

        return null;
    }
}
