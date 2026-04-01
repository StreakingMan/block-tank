/**
 * 矩形检测器 - 查找地形方块构成的完整矩形
 * 遍历所有可能的矩形左上角 + 宽高组合，找到最大矩形
 */
import { GRID_COLS, GRID_ROWS, CellType, GameEvent } from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { GridManager } from '../grid/GridManager';

export interface RectResult {
    row: number;     // 左下角行
    col: number;     // 左下角列
    width: number;
    height: number;
    area: number;
    cells: { row: number; col: number }[];
}

export class RectDetector {
    private static _instance: RectDetector;

    static get instance(): RectDetector {
        if (!this._instance) {
            this._instance = new RectDetector();
        }
        return this._instance;
    }

    /**
     * 检测并消除所有矩形（每次放置方块后调用）
     * @returns 检测到的矩形列表
     */
    detectAndClear(): RectResult[] {
        const results: RectResult[] = [];
        let found = true;

        while (found) {
            const rect = this._findLargestRect();
            if (rect) {
                results.push(rect);
                this._clearRect(rect);
            } else {
                found = false;
            }
        }

        return results;
    }

    /**
     * 查找当前网格中最大的地形矩形（>=2x2）
     */
    private _findLargestRect(): RectResult | null {
        const gm = GridManager.instance;
        if (!gm) return null;

        let best: RectResult | null = null;

        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                if (!gm.isTerrain(r, c)) continue;

                // 以 (r, c) 为左下角，尝试所有宽高组合
                const maxW = GRID_COLS - c;
                const maxH = GRID_ROWS - r;

                for (let w = 2; w <= maxW; w++) {
                    for (let h = 2; h <= maxH; h++) {
                        if (this._isFilledRect(gm, r, c, w, h)) {
                            const area = w * h;
                            if (!best || area > best.area) {
                                const cells: { row: number; col: number }[] = [];
                                for (let dr = 0; dr < h; dr++) {
                                    for (let dc = 0; dc < w; dc++) {
                                        cells.push({ row: r + dr, col: c + dc });
                                    }
                                }
                                best = { row: r, col: c, width: w, height: h, area, cells };
                            }
                        }
                    }
                }
            }
        }

        return best;
    }

    /** 检查指定区域是否全为地形 */
    private _isFilledRect(gm: GridManager, row: number, col: number, width: number, height: number): boolean {
        for (let r = row; r < row + height; r++) {
            for (let c = col; c < col + width; c++) {
                if (!gm.isTerrain(r, c)) return false;
            }
        }
        return true;
    }

    /** 清除矩形中的所有地形格子 */
    private _clearRect(rect: RectResult): void {
        const gm = GridManager.instance;
        for (const { row, col } of rect.cells) {
            gm.clearCell(row, col);
        }
        EventManager.instance.emit(GameEvent.RECT_DETECTED, rect);
    }

    /**
     * 获取爆炸等级
     */
    static getExplosionLevel(area: number): string {
        if (area >= 12) return 'huge';
        if (area >= 8) return 'large';
        if (area >= 6) return 'medium';
        return 'small';
    }
}
