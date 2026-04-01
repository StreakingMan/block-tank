/**
 * 幽灵方块预览 - 在射程内显示半透明落点预览
 */
import { _decorator, Component, Graphics, Color, Node } from 'cc';
import { Direction, DIR_OFFSET, BlockShape, GameEvent, GRID_COLS, GRID_ROWS, TANK_SIZE } from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { GridManager } from '../grid/GridManager';
import { getBlockCells } from './BlockData';
import { AmmoManager } from './AmmoManager';

const { ccclass } = _decorator;

/** 方块形状对应颜色（与 GridRenderer 一致） */
const GHOST_BLOCK_COLORS: Record<string, Color> = {
    [BlockShape.I]: new Color(0, 240, 240),
    [BlockShape.O]: new Color(240, 240, 0),
    [BlockShape.T]: new Color(160, 0, 240),
    [BlockShape.S]: new Color(0, 240, 0),
    [BlockShape.Z]: new Color(240, 0, 0),
    [BlockShape.L]: new Color(240, 160, 0),
    [BlockShape.J]: new Color(0, 0, 240),
};

@ccclass('GhostPreview')
export class GhostPreview extends Component {
    private _graphics: Graphics | null = null;
    private _visible: boolean = false;

    /** 当前预览目标网格位置 */
    private _targetRow: number = 0;
    private _targetCol: number = 0;
    private _isValid: boolean = false;

    onLoad(): void {
        this._graphics = this.node.getComponent(Graphics) || this.node.addComponent(Graphics);
        this._registerEvents();
    }

    onDestroy(): void {
        EventManager.instance.offTarget(this);
    }

    /**
     * 更新幽灵预览位置
     * @param tankRow 坦克行
     * @param tankCol 坦克列
     * @param direction 面朝方向
     * @param range 射程
     */
    updatePreview(tankRow: number, tankCol: number, direction: Direction, range: number): void {
        const ammo = AmmoManager.instance.currentAmmo;
        if (!ammo) {
            this.hide();
            return;
        }

        const cells = getBlockCells(ammo.shape, ammo.rotation);
        const offset = DIR_OFFSET[direction];

        // 从 2x2 坦克边缘开始搜索：向前偏移 TANK_SIZE
        let edgeRow = tankRow;
        let edgeCol = tankCol;
        if (offset.dr > 0) edgeRow += TANK_SIZE;
        else if (offset.dr < 0) edgeRow -= 1;
        if (offset.dc > 0) edgeCol += TANK_SIZE;
        else if (offset.dc < 0) edgeCol -= 1;

        // 沿方向查找射程内的落点
        let targetRow = edgeRow + offset.dr * range;
        let targetCol = edgeCol + offset.dc * range;

        // 从远到近找第一个可放置的位置
        const gm = GridManager.instance;
        let found = false;

        for (let dist = range; dist >= 1; dist--) {
            const r = edgeRow + offset.dr * dist;
            const c = edgeCol + offset.dc * dist;

            if (this._canPlace(r, c, cells, gm)) {
                targetRow = r;
                targetCol = c;
                found = true;
                break;
            }
        }

        if (!found) {
            // 射程内无空位，显示为红色
            targetRow = edgeRow + offset.dr;
            targetCol = edgeCol + offset.dc;
        }

        this._targetRow = targetRow;
        this._targetCol = targetCol;
        this._isValid = found && this._canPlace(targetRow, targetCol, cells, gm);
        this._visible = true;

        this._render(cells);
    }

    hide(): void {
        this._visible = false;
        if (this._graphics) {
            this._graphics.clear();
        }
    }

    get targetRow(): number { return this._targetRow; }
    get targetCol(): number { return this._targetCol; }
    get isValid(): boolean { return this._isValid; }

    private _canPlace(anchorRow: number, anchorCol: number, cells: [number, number][], gm: GridManager): boolean {
        for (const [dr, dc] of cells) {
            const r = anchorRow + dr;
            const c = anchorCol + dc;
            if (!gm.isValidPos(r, c) || !gm.isEmpty(r, c)) {
                return false;
            }
        }
        return true;
    }

    private _render(cells: [number, number][]): void {
        if (!this._graphics) return;
        const g = this._graphics;
        const gm = GridManager.instance;
        const cellSize = gm.cellSize;
        const ammo = AmmoManager.instance.currentAmmo;

        g.clear();

        // 获取方块对应颜色
        const baseColor = ammo ? (GHOST_BLOCK_COLORS[ammo.shape] || new Color(200, 200, 200)) : new Color(200, 200, 200);
        const fillAlpha = this._isValid ? 100 : 60;
        const borderColor = this._isValid ? new Color(255, 255, 255, 220) : new Color(255, 80, 80, 220);

        const pad = 1;
        const s = cellSize - pad * 2;

        for (const [dr, dc] of cells) {
            const r = this._targetRow + dr;
            const c = this._targetCol + dc;
            const pos = gm.gridToPixel(r, c);
            const x = pos.x - cellSize / 2 + pad;
            const y = pos.y - cellSize / 2 + pad;

            // 1. 半透明方块色填充
            g.fillColor = new Color(baseColor.r, baseColor.g, baseColor.b, fillAlpha);
            g.rect(x, y, s, s);
            g.fill();

            // 2. 内部十字标记（区分于实体地形）
            g.strokeColor = new Color(baseColor.r, baseColor.g, baseColor.b, 140);
            g.lineWidth = 1;
            const cx = x + s / 2;
            const cy = y + s / 2;
            const m = s * 0.3;
            g.moveTo(cx - m, cy);
            g.lineTo(cx + m, cy);
            g.moveTo(cx, cy - m);
            g.lineTo(cx, cy + m);
            g.stroke();

            // 3. 粗边框
            g.strokeColor = borderColor;
            g.lineWidth = 2;
            g.rect(x, y, s, s);
            g.stroke();
        }
    }

    private _registerEvents(): void {
        const em = EventManager.instance;
        em.on(GameEvent.AMMO_CHANGED, () => {
            // 弹药变化时清除预览，等待下次更新
        }, this);
        em.on(GameEvent.AMMO_ROTATED, () => {
            // 旋转后立刻触发更新（由PlayerTank负责调用updatePreview）
        }, this);
    }
}
