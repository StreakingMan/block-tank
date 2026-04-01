/**
 * 飞行方块实体 - 射击模式下方块的飞行逻辑
 * 沿坦克面朝方向飞行，命中敌人造成伤害，未命中嵌入地形
 */
import { _decorator, Component, Vec3, Node, UITransform, Graphics, Color } from 'cc';
import {
    Direction, DIR_OFFSET, BlockShape, PROJECTILE_SPEED,
    BLOCK_HIT_DAMAGE, GameEvent, TerrainOwner, CellType
} from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { GridManager } from '../grid/GridManager';
import { getBlockCells, BLOCK_COLOR_INDEX } from './BlockData';

const { ccclass } = _decorator;

/** 方块颜色表 */
const SHAPE_COLORS: Record<string, Color> = {
    [BlockShape.I]: new Color(0, 240, 240, 255),
    [BlockShape.O]: new Color(240, 240, 0, 255),
    [BlockShape.T]: new Color(160, 0, 240, 255),
    [BlockShape.S]: new Color(0, 240, 0, 255),
    [BlockShape.Z]: new Color(240, 0, 0, 255),
    [BlockShape.L]: new Color(240, 160, 0, 255),
    [BlockShape.J]: new Color(0, 0, 240, 255),
};

@ccclass('BlockProjectile')
export class BlockProjectile extends Component {
    private _direction: Direction = Direction.UP;
    private _shape: BlockShape = BlockShape.I;
    private _rotation: number = 0;
    private _owner: TerrainOwner = TerrainOwner.PLAYER;
    private _speed: number = PROJECTILE_SPEED;
    private _alive: boolean = false;

    /** 当前实际像素位置 */
    private _posX: number = 0;
    private _posY: number = 0;

    /** 出发时的网格坐标 */
    private _startRow: number = 0;
    private _startCol: number = 0;

    /** 已飞行格数 */
    private _distanceTraveled: number = 0;
    private _maxRange: number = 20;

    fire(
        startRow: number, startCol: number,
        direction: Direction, shape: BlockShape, rotation: number,
        owner: TerrainOwner, maxRange: number = 20
    ): void {
        this._direction = direction;
        this._shape = shape;
        this._rotation = rotation;
        this._owner = owner;
        this._startRow = startRow;
        this._startCol = startCol;
        this._distanceTraveled = 0;
        this._maxRange = maxRange;
        this._alive = true;

        const gm = GridManager.instance;
        const pixelPos = gm.gridToPixel(startRow, startCol);
        this._posX = pixelPos.x;
        this._posY = pixelPos.y;
        this.node.setPosition(this._posX, this._posY, 0);

        this._renderBlock();
        this.node.active = true;
    }

    update(dt: number): void {
        if (!this._alive) return;

        const gm = GridManager.instance;
        const offset = DIR_OFFSET[this._direction];
        const pixelSpeed = this._speed * gm.cellSize;

        this._posX += offset.dc * pixelSpeed * dt;
        this._posY += offset.dr * pixelSpeed * dt;
        this.node.setPosition(this._posX, this._posY, 0);

        this._distanceTraveled += this._speed * dt;

        // 检查是否飞出网格或超过射程
        const gridPos = gm.pixelToGrid(this._posX, this._posY);
        if (!gm.isValidPos(gridPos.row, gridPos.col) || this._distanceTraveled >= this._maxRange) {
            this._destroy();
            return;
        }

        // 检测碰撞：检查当前格子是否有障碍物
        const cell = gm.getCell(gridPos.row, gridPos.col);
        if (cell && cell.isSolid) {
            // 命中地形 - 嵌入到前一个空位
            this._embedAtCurrentPos();
            return;
        }
    }

    /** 命中实体时调用（由DamageSystem外部调用） */
    onHitEntity(): void {
        // 命中敌人 - 方块消失
        this._destroy();
    }

    /** 嵌入当前位置附近为地形 */
    private _embedAtCurrentPos(): void {
        const gm = GridManager.instance;
        const gridPos = gm.pixelToGrid(this._posX, this._posY);

        // 回退一格找到空位
        const offset = DIR_OFFSET[this._direction];
        let embedRow = gridPos.row - offset.dr;
        let embedCol = gridPos.col - offset.dc;

        if (!gm.isValidPos(embedRow, embedCol) || !gm.isEmpty(embedRow, embedCol)) {
            embedRow = gridPos.row;
            embedCol = gridPos.col;
        }

        const cells = getBlockCells(this._shape, this._rotation);
        const embedCells: { row: number; col: number }[] = [];

        for (const [dr, dc] of cells) {
            const r = embedRow + dr;
            const c = embedCol + dc;
            if (gm.isValidPos(r, c) && gm.isEmpty(r, c)) {
                embedCells.push({ row: r, col: c });
            }
        }

        if (embedCells.length > 0) {
            gm.embedBlock(embedCells, this._owner, this._shape, BLOCK_COLOR_INDEX[this._shape]);
        }

        this._destroy();
    }

    private _renderBlock(): void {
        const gm = GridManager.instance;
        const cellSize = gm.cellSize;
        // 飞行方块缩小为格子的40%显示，作为弹药视觉
        const miniSize = cellSize * 0.4;
        const cells = getBlockCells(this._shape, this._rotation);
        const color = SHAPE_COLORS[this._shape] || new Color(255, 255, 255, 255);

        this.node.removeAllChildren();

        let g = this.node.getComponent(Graphics);
        if (!g) g = this.node.addComponent(Graphics);

        g.clear();

        // 计算方块中心偏移，使整体居中
        let sumR = 0, sumC = 0;
        for (const [dr, dc] of cells) { sumR += dr; sumC += dc; }
        const avgR = sumR / cells.length;
        const avgC = sumC / cells.length;

        g.fillColor = color;
        for (const [dr, dc] of cells) {
            const x = (dc - avgC) * miniSize - miniSize / 2;
            const y = (dr - avgR) * miniSize - miniSize / 2;
            g.rect(x, y, miniSize - 1, miniSize - 1);
        }
        g.fill();

        // 发光轮廓
        g.strokeColor = new Color(255, 255, 255, 120);
        g.lineWidth = 1;
        for (const [dr, dc] of cells) {
            const x = (dc - avgC) * miniSize - miniSize / 2;
            const y = (dr - avgR) * miniSize - miniSize / 2;
            g.rect(x, y, miniSize - 1, miniSize - 1);
        }
        g.stroke();
    }

    get shape(): BlockShape { return this._shape; }
    get owner(): TerrainOwner { return this._owner; }
    get isAlive(): boolean { return this._alive; }
    get currentGridRow(): number { return GridManager.instance.pixelToGrid(this._posX, this._posY).row; }
    get currentGridCol(): number { return GridManager.instance.pixelToGrid(this._posX, this._posY).col; }

    private _destroy(): void {
        this._alive = false;
        this.node.active = false;
        this.node.destroy();
    }
}
