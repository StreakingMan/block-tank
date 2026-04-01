/**
 * 网格管理器 - 10×16 战场核心数据结构
 * 动态格子大小适配、地形嵌入、衰减管理
 */
import { _decorator, Component, Vec2 } from 'cc';
import {
    GRID_COLS, GRID_ROWS, CellType, GameEvent, TerrainOwner,
    BlockShape, TERRAIN_DECAY_TIME, TERRAIN_COLLAPSE_DAMAGE,
    DESIGN_WIDTH, DESIGN_HEIGHT, HUD_HEIGHT, CONTROL_HEIGHT, TANK_SIZE
} from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { GridCell } from './GridCell';

const { ccclass } = _decorator;

@ccclass('GridManager')
export class GridManager extends Component {
    private static _instance: GridManager;

    private _grid: GridCell[][] = [];
    private _cellSize: number = 40;

    /** 网格在场景中的原点偏移（左下角） */
    private _originX: number = 0;
    private _originY: number = 0;

    static get instance(): GridManager {
        return this._instance;
    }

    get cols(): number { return GRID_COLS; }
    get rows(): number { return GRID_ROWS; }
    get cellSize(): number { return this._cellSize; }
    get originX(): number { return this._originX; }
    get originY(): number { return this._originY; }
    get gridWidthPx(): number { return GRID_COLS * this._cellSize; }
    get gridHeightPx(): number { return GRID_ROWS * this._cellSize; }

    onLoad(): void {
        GridManager._instance = this;
        this._calculateCellSize();
        this._initGrid();
    }

    onDestroy(): void {
        GridManager._instance = null!;
    }

    /** 计算动态格子大小（Canvas 原点在屏幕中心） */
    private _calculateCellSize(): void {
        const padding = 20;
        const availableWidth = DESIGN_WIDTH - padding * 2;
        const availableHeight = DESIGN_HEIGHT - HUD_HEIGHT - CONTROL_HEIGHT - padding * 2;
        this._cellSize = Math.floor(Math.min(availableWidth / GRID_COLS, availableHeight / GRID_ROWS));

        const halfW = DESIGN_WIDTH / 2;
        const halfH = DESIGN_HEIGHT / 2;

        // 网格水平居中
        this._originX = -this.gridWidthPx / 2;
        // 网格垂直居中于 HUD 和控制区之间
        const areaBottom = -halfH + CONTROL_HEIGHT + padding;
        const areaTop = halfH - HUD_HEIGHT - padding;
        this._originY = areaBottom + (areaTop - areaBottom - this.gridHeightPx) / 2;
    }

    private _initGrid(): void {
        this._grid = [];
        for (let row = 0; row < GRID_ROWS; row++) {
            this._grid[row] = [];
            for (let col = 0; col < GRID_COLS; col++) {
                this._grid[row][col] = new GridCell(row, col, CellType.EMPTY);
            }
        }
    }

    reset(): void {
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                this._grid[row][col].clear();
            }
        }
    }

    getCell(row: number, col: number): GridCell | null {
        if (!this.isValidPos(row, col)) return null;
        return this._grid[row][col];
    }

    setCell(row: number, col: number, type: CellType, hp: number = 1): void {
        if (!this.isValidPos(row, col)) return;
        const cell = this._grid[row][col];
        cell.type = type;
        cell.hp = hp;
        EventManager.instance.emit(GameEvent.GRID_CELL_CHANGED, row, col, type);
    }

    clearCell(row: number, col: number): void {
        if (!this.isValidPos(row, col)) return;
        this._grid[row][col].clear();
        EventManager.instance.emit(GameEvent.GRID_CELL_CHANGED, row, col, CellType.EMPTY);
    }

    /**
     * 嵌入方块为地形
     * @param cells 网格坐标数组 [{row, col}]
     * @param owner 归属
     * @param shape 方块形状
     * @param colorIndex 颜色
     * @returns 实际嵌入的格子数
     */
    embedBlock(cells: { row: number; col: number }[], owner: TerrainOwner, shape: BlockShape, colorIndex: number): number {
        let count = 0;
        for (const { row, col } of cells) {
            if (!this.isValidPos(row, col)) continue;
            const cell = this._grid[row][col];
            if (!cell.isEmpty) continue;

            cell.setTerrain(owner, shape, TERRAIN_DECAY_TIME, colorIndex);
            EventManager.instance.emit(GameEvent.GRID_CELL_CHANGED, row, col, CellType.TERRAIN);
            count++;
        }

        if (count > 0) {
            EventManager.instance.emit(GameEvent.GRID_TERRAIN_PLACED, cells, owner, shape);
        }
        return count;
    }

    isWalkable(row: number, col: number): boolean {
        if (!this.isValidPos(row, col)) return false;
        return this._grid[row][col].isWalkable;
    }

    isValidPos(row: number, col: number): boolean {
        return row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS;
    }

    isEmpty(row: number, col: number): boolean {
        if (!this.isValidPos(row, col)) return false;
        return this._grid[row][col].isEmpty;
    }

    /** 检查区域是否全空 */
    isAreaEmpty(row: number, col: number, width: number, height: number): boolean {
        for (let r = row; r < row + height; r++) {
            for (let c = col; c < col + width; c++) {
                if (!this.isEmpty(r, c)) return false;
            }
        }
        return true;
    }

    /** 检查区域是否全部可通行（用于坦克 2x2 移动检测） */
    isAreaWalkable(row: number, col: number, size: number = TANK_SIZE): boolean {
        for (let r = row; r < row + size; r++) {
            for (let c = col; c < col + size; c++) {
                if (!this.isWalkable(r, c)) return false;
            }
        }
        return true;
    }

    /** 获取多格实体的中心像素坐标 */
    gridToPixelCenter(row: number, col: number, size: number): Vec2 {
        const halfOffset = (size - 1) * this._cellSize / 2;
        const base = this.gridToPixel(row, col);
        return new Vec2(base.x + halfOffset, base.y + halfOffset);
    }

    /** 检查指定位置是否有地形方块 */
    isTerrain(row: number, col: number): boolean {
        if (!this.isValidPos(row, col)) return false;
        return this._grid[row][col].isTerrain;
    }

    /** 更新地形衰减（每帧调用） */
    updateDecay(dt: number): void {
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const cell = this._grid[row][col];
                if (cell.type === CellType.TERRAIN && cell.decayTimer > 0) {
                    cell.decayTimer -= dt;
                    if (cell.decayTimer <= 0) {
                        cell.clear();
                        EventManager.instance.emit(GameEvent.GRID_CELL_CHANGED, row, col, CellType.EMPTY);
                        EventManager.instance.emit(GameEvent.GRID_TERRAIN_DECAYED, row, col, TERRAIN_COLLAPSE_DAMAGE);
                    }
                }
            }
        }
    }

    // ======================== 坐标转换 ========================

    gridToPixel(row: number, col: number): Vec2 {
        const x = this._originX + col * this._cellSize + this._cellSize / 2;
        const y = this._originY + row * this._cellSize + this._cellSize / 2;
        return new Vec2(x, y);
    }

    pixelToGrid(x: number, y: number): { row: number; col: number } {
        return {
            col: Math.floor((x - this._originX) / this._cellSize),
            row: Math.floor((y - this._originY) / this._cellSize),
        };
    }

    /** 获取所有地形格子（用于矩形检测） */
    getAllTerrainCells(): GridCell[] {
        const result: GridCell[] = [];
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (this._grid[row][col].isTerrain) {
                    result.push(this._grid[row][col]);
                }
            }
        }
        return result;
    }
}
