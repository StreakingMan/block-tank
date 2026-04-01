/**
 * 爆炸管理器 - AOE爆炸生成 + 视觉效果
 */
import { _decorator, Component, Node, Graphics, Color, UITransform, tween, Vec3 } from 'cc';
import {
    GameEvent, EXPLOSION_RADIUS, EXPLOSION_DAMAGE,
    GRID_COLS, GRID_ROWS
} from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { GridManager } from '../grid/GridManager';
import { RectResult, RectDetector } from './RectDetector';

const { ccclass } = _decorator;

@ccclass('ExplosionManager')
export class ExplosionManager extends Component {
    private _effectLayer: Node | null = null;

    setEffectLayer(layer: Node): void {
        this._effectLayer = layer;
    }

    onLoad(): void {
        this._registerEvents();
    }

    onDestroy(): void {
        EventManager.instance.offTarget(this);
    }

    /**
     * 创建矩形爆炸
     */
    createRectExplosion(rect: RectResult): void {
        const level = RectDetector.getExplosionLevel(rect.area);
        const radius = EXPLOSION_RADIUS[level] || 1;
        const damage = EXPLOSION_DAMAGE[level] || 2;

        // 计算爆炸中心
        const centerRow = rect.row + rect.height / 2;
        const centerCol = rect.col + rect.width / 2;

        // 播放视觉效果
        this._playExplosionEffect(centerRow, centerCol, radius, level);

        // 发出爆炸伤害事件
        EventManager.instance.emit(GameEvent.RECT_EXPLODED, {
            centerRow,
            centerCol,
            radius,
            damage,
            level,
            rect,
        });

        // 清除爆炸范围内的地形
        const gm = GridManager.instance;
        const minR = Math.max(0, Math.floor(centerRow - radius));
        const maxR = Math.min(GRID_ROWS - 1, Math.ceil(centerRow + radius));
        const minC = Math.max(0, Math.floor(centerCol - radius));
        const maxC = Math.min(GRID_COLS - 1, Math.ceil(centerCol + radius));

        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                const cell = gm.getCell(r, c);
                if (cell && cell.isDestructible) {
                    cell.takeDamage(damage);
                    if (cell.isEmpty) {
                        EventManager.instance.emit(GameEvent.GRID_CELL_CHANGED, r, c, cell.type);
                    }
                }
            }
        }
    }

    /** 播放爆炸视觉效果 */
    private _playExplosionEffect(centerRow: number, centerCol: number, radius: number, level: string): void {
        if (!this._effectLayer) return;
        const gm = GridManager.instance;
        const cellSize = gm.cellSize;
        const pos = gm.gridToPixel(Math.floor(centerRow), Math.floor(centerCol));

        const effectNode = new Node('Explosion');
        effectNode.parent = this._effectLayer;
        effectNode.setPosition(pos.x, pos.y, 0);

        const transform = effectNode.addComponent(UITransform);
        const size = radius * 2 * cellSize;
        transform.setContentSize(size, size);

        const g = effectNode.addComponent(Graphics);

        // 颜色根据等级变化
        const colors: Record<string, Color> = {
            'small': new Color(255, 200, 50, 200),
            'medium': new Color(255, 150, 30, 200),
            'large': new Color(255, 100, 20, 220),
            'huge': new Color(255, 50, 10, 240),
        };

        g.fillColor = colors[level] || colors['small'];
        g.circle(0, 0, radius * cellSize * 0.3);
        g.fill();

        // 外圈
        g.fillColor = new Color(255, 255, 200, 100);
        g.circle(0, 0, radius * cellSize * 0.6);
        g.fill();

        // 动画：放大然后消失
        effectNode.setScale(0.2, 0.2, 1);
        tween(effectNode)
            .to(0.15, { scale: new Vec3(1.2, 1.2, 1) })
            .to(0.3, { scale: new Vec3(1.5, 1.5, 1) })
            .call(() => {
                effectNode.destroy();
            })
            .start();
    }

    /** 播放地形崩裂效果 */
    playCollapseEffect(row: number, col: number): void {
        if (!this._effectLayer) return;
        const gm = GridManager.instance;
        const pos = gm.gridToPixel(row, col);
        const cellSize = gm.cellSize;

        const effectNode = new Node('Collapse');
        effectNode.parent = this._effectLayer;
        effectNode.setPosition(pos.x, pos.y, 0);

        const transform = effectNode.addComponent(UITransform);
        transform.setContentSize(cellSize, cellSize);

        const g = effectNode.addComponent(Graphics);
        g.fillColor = new Color(200, 150, 50, 180);
        g.circle(0, 0, cellSize * 0.4);
        g.fill();

        effectNode.setScale(0.5, 0.5, 1);
        tween(effectNode)
            .to(0.2, { scale: new Vec3(1.0, 1.0, 1) })
            .to(0.2, { scale: new Vec3(0.1, 0.1, 1) })
            .call(() => {
                effectNode.destroy();
            })
            .start();
    }

    private _registerEvents(): void {
        const em = EventManager.instance;

        em.on(GameEvent.GRID_TERRAIN_DECAYED, (row: number, col: number) => {
            this.playCollapseEffect(row, col);
        }, this);
    }
}
