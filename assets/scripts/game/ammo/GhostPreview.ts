/**
 * 幽灵方块预览 - 在射程内显示半透明落点预览
 */
import { _decorator, Component, Graphics, Color, Node } from 'cc';
import { Direction, DIR_OFFSET, BlockShape, GameEvent, GRID_COLS, GRID_ROWS } from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { GridManager } from '../grid/GridManager';
import { getBlockCells } from './BlockData';
import { AmmoManager } from './AmmoManager';

const { ccclass } = _decorator;

const GHOST_COLOR_VALID = new Color(100, 255, 100, 80);
const GHOST_COLOR_INVALID = new Color(255, 60, 60, 80);

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

        // 沿方向查找射程内的落点
        let targetRow = tankRow + offset.dr * range;
        let targetCol = tankCol + offset.dc * range;

        // 从远到近找第一个可放置的位置
        const gm = GridManager.instance;
        let found = false;

        for (let dist = range; dist >= 1; dist--) {
            const r = tankRow + offset.dr * dist;
            const c = tankCol + offset.dc * dist;

            if (this._canPlace(r, c, cells, gm)) {
                targetRow = r;
                targetCol = c;
                found = true;
                break;
            }
        }

        if (!found) {
            // 射程内无空位，显示为红色
            targetRow = tankRow + offset.dr;
            targetCol = tankCol + offset.dc;
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

        g.clear();
        g.fillColor = this._isValid ? GHOST_COLOR_VALID : GHOST_COLOR_INVALID;

        for (const [dr, dc] of cells) {
            const r = this._targetRow + dr;
            const c = this._targetCol + dc;
            const pos = gm.gridToPixel(r, c);
            g.rect(
                pos.x - cellSize / 2 + 1,
                pos.y - cellSize / 2 + 1,
                cellSize - 2,
                cellSize - 2
            );
        }
        g.fill();

        // 轮廓
        g.strokeColor = this._isValid ? new Color(100, 255, 100, 160) : new Color(255, 60, 60, 160);
        g.lineWidth = 1.5;
        for (const [dr, dc] of cells) {
            const r = this._targetRow + dr;
            const c = this._targetCol + dc;
            const pos = gm.gridToPixel(r, c);
            g.rect(
                pos.x - cellSize / 2 + 1,
                pos.y - cellSize / 2 + 1,
                cellSize - 2,
                cellSize - 2
            );
        }
        g.stroke();
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
