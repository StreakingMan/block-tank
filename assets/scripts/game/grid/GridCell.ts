/**
 * 网格单元格 - 最小数据单元
 * 新增: decayTimer / owner / blockShape 用于地形衰减和矩形检测
 */
import { CellType, TerrainOwner, BlockShape } from '../../core/Constants';

export class GridCell {
    row: number;
    col: number;
    type: CellType;
    hp: number;
    /** 地形归属 */
    owner: TerrainOwner;
    /** 来源方块形状（用于渲染颜色） */
    blockShape: BlockShape | null;
    /** 衰减倒计时（秒），<=0表示不衰减 */
    decayTimer: number;
    /** 颜色索引 */
    colorIndex: number;

    constructor(row: number, col: number, type: CellType = CellType.EMPTY) {
        this.row = row;
        this.col = col;
        this.type = type;
        this.hp = type === CellType.EMPTY ? 0 : 1;
        this.owner = TerrainOwner.NONE;
        this.blockShape = null;
        this.decayTimer = 0;
        this.colorIndex = 0;
    }

    get isEmpty(): boolean {
        return this.type === CellType.EMPTY;
    }

    get isSolid(): boolean {
        return this.type !== CellType.EMPTY && this.type !== CellType.GRASS;
    }

    get isWalkable(): boolean {
        return this.type === CellType.EMPTY || this.type === CellType.GRASS;
    }

    get isTerrain(): boolean {
        return this.type === CellType.TERRAIN;
    }

    get isDestructible(): boolean {
        return this.type === CellType.TERRAIN || this.type === CellType.BRICK;
    }

    clear(): void {
        this.type = CellType.EMPTY;
        this.hp = 0;
        this.owner = TerrainOwner.NONE;
        this.blockShape = null;
        this.decayTimer = 0;
        this.colorIndex = 0;
    }

    setTerrain(owner: TerrainOwner, shape: BlockShape, decayTime: number, colorIndex: number): void {
        this.type = CellType.TERRAIN;
        this.hp = 1;
        this.owner = owner;
        this.blockShape = shape;
        this.decayTimer = decayTime;
        this.colorIndex = colorIndex;
    }

    takeDamage(damage: number = 1): boolean {
        if (!this.isDestructible) return false;
        this.hp -= damage;
        if (this.hp <= 0) {
            this.clear();
            return true;
        }
        return false;
    }
}
