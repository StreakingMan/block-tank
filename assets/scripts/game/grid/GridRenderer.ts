/**
 * 网格渲染器 - 动态尺寸 + 地形衰减视觉
 * 使用 Graphics 绘制网格线 + 动态创建格子节点渲染
 */
import { _decorator, Component, Graphics, Color, Node, UITransform, Sprite, Vec3 } from 'cc';
import { GRID_COLS, GRID_ROWS, CellType, GameEvent, BlockShape, TERRAIN_DECAY_TIME } from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { GridManager } from './GridManager';

const { ccclass, property } = _decorator;

/** 方块形状对应颜色 */
const BLOCK_COLORS: Record<string, Color> = {
    [BlockShape.I]: new Color(0, 240, 240, 255),    // 青
    [BlockShape.O]: new Color(240, 240, 0, 255),     // 黄
    [BlockShape.T]: new Color(160, 0, 240, 255),     // 紫
    [BlockShape.S]: new Color(0, 240, 0, 255),       // 绿
    [BlockShape.Z]: new Color(240, 0, 0, 255),       // 红
    [BlockShape.L]: new Color(240, 160, 0, 255),     // 橙
    [BlockShape.J]: new Color(0, 0, 240, 255),       // 蓝
};

/** 格子类型颜色 */
const CELL_COLORS: Record<number, Color> = {
    [CellType.EMPTY]: new Color(15, 15, 25, 255),
    [CellType.STEEL]: new Color(160, 160, 160, 255),
    [CellType.WATER]: new Color(40, 80, 200, 200),
    [CellType.GRASS]: new Color(30, 140, 30, 180),
    [CellType.BRICK]: new Color(160, 80, 40, 255),
};

@ccclass('GridRenderer')
export class GridRenderer extends Component {
    private _cellNodes: Node[][] = [];
    private _graphics: Graphics | null = null;

    onLoad(): void {
        this._setupGraphics();
        this._createCellNodes();
        this._drawGridLines();
        this._registerEvents();
    }

    onDestroy(): void {
        EventManager.instance.offTarget(this);
    }

    private _setupGraphics(): void {
        let gNode = this.node.getChildByName('GridLines');
        if (!gNode) {
            gNode = new Node('GridLines');
            gNode.parent = this.node;
            gNode.setSiblingIndex(0);
        }
        this._graphics = gNode.getComponent(Graphics) || gNode.addComponent(Graphics);
    }

    private _createCellNodes(): void {
        const gm = GridManager.instance;
        const cellSize = gm.cellSize;

        // 清除已有子节点（除了GridLines）
        const children = this.node.children.slice();
        for (const child of children) {
            if (child.name !== 'GridLines') child.destroy();
        }

        this._cellNodes = [];
        for (let row = 0; row < GRID_ROWS; row++) {
            this._cellNodes[row] = [];
            for (let col = 0; col < GRID_COLS; col++) {
                const node = new Node(`Cell_${row}_${col}`);
                node.parent = this.node;

                const transform = node.addComponent(UITransform);
                transform.setContentSize(cellSize - 1, cellSize - 1);

                node.addComponent(Sprite);
                node.setPosition(
                    gm.originX + col * cellSize + cellSize / 2,
                    gm.originY + row * cellSize + cellSize / 2,
                    0
                );

                // 默认隐藏空格子
                node.active = false;
                this._cellNodes[row][col] = node;
            }
        }
    }

    private _drawGridLines(): void {
        if (!this._graphics) return;
        const gm = GridManager.instance;
        const cellSize = gm.cellSize;
        const g = this._graphics;

        g.clear();
        g.strokeColor = new Color(40, 40, 60, 80);
        g.lineWidth = 0.5;

        for (let col = 0; col <= GRID_COLS; col++) {
            const x = gm.originX + col * cellSize;
            g.moveTo(x, gm.originY);
            g.lineTo(x, gm.originY + GRID_ROWS * cellSize);
        }

        for (let row = 0; row <= GRID_ROWS; row++) {
            const y = gm.originY + row * cellSize;
            g.moveTo(gm.originX, y);
            g.lineTo(gm.originX + GRID_COLS * cellSize, y);
        }

        g.stroke();

        // 边框
        g.strokeColor = new Color(80, 80, 120, 200);
        g.lineWidth = 2;
        g.rect(gm.originX, gm.originY, GRID_COLS * cellSize, GRID_ROWS * cellSize);
        g.stroke();
    }

    refreshAll(): void {
        const gm = GridManager.instance;
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const cell = gm.getCell(row, col);
                if (cell) {
                    this._updateCellVisual(row, col, cell.type);
                }
            }
        }
    }

    private _updateCellVisual(row: number, col: number, type: CellType): void {
        const node = this._cellNodes[row]?.[col];
        if (!node) return;

        if (type === CellType.EMPTY) {
            node.active = false;
            return;
        }

        node.active = true;
        const sprite = node.getComponent(Sprite);
        if (!sprite) return;

        if (type === CellType.TERRAIN) {
            const cell = GridManager.instance.getCell(row, col);
            if (cell && cell.blockShape) {
                const baseColor = BLOCK_COLORS[cell.blockShape] || new Color(200, 200, 200, 255);
                // 衰减视觉：随时间变淡
                const ratio = cell.decayTimer / TERRAIN_DECAY_TIME;
                const alpha = Math.floor(100 + 155 * Math.max(0, ratio));
                sprite.color = new Color(baseColor.r, baseColor.g, baseColor.b, alpha);
            } else {
                sprite.color = new Color(200, 200, 200, 255);
            }
        } else {
            sprite.color = CELL_COLORS[type] ?? new Color(200, 200, 200, 255);
        }
    }

    /** 每帧更新衰减视觉 */
    update(dt: number): void {
        const gm = GridManager.instance;
        if (!gm) return;

        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const cell = gm.getCell(row, col);
                if (cell && cell.type === CellType.TERRAIN && cell.decayTimer > 0) {
                    this._updateCellVisual(row, col, CellType.TERRAIN);
                }
            }
        }
    }

    private _registerEvents(): void {
        const em = EventManager.instance;

        em.on(GameEvent.GRID_CELL_CHANGED, (row: number, col: number, type: CellType) => {
            this._updateCellVisual(row, col, type);
        }, this);

        em.on(GameEvent.GAME_START, () => {
            this.refreshAll();
        }, this);

        em.on(GameEvent.GAME_RESTART, () => {
            this.refreshAll();
        }, this);
    }
}
