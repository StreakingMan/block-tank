/**
 * 弹药队列显示 - 显示当前3个弹药方块
 */
import { _decorator, Component, Node, Graphics, Color, UITransform } from 'cc';
import { BlockShape, GameEvent } from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { AmmoManager, AmmoSlot } from '../../game/ammo/AmmoManager';
import { getBlockCells } from '../../game/ammo/BlockData';

const { ccclass } = _decorator;

const SHAPE_COLORS: Record<string, Color> = {
    [BlockShape.I]: new Color(0, 240, 240, 255),
    [BlockShape.O]: new Color(240, 240, 0, 255),
    [BlockShape.T]: new Color(160, 0, 240, 255),
    [BlockShape.S]: new Color(0, 240, 0, 255),
    [BlockShape.Z]: new Color(240, 0, 0, 255),
    [BlockShape.L]: new Color(240, 160, 0, 255),
    [BlockShape.J]: new Color(0, 0, 240, 255),
};

@ccclass('AmmoQueueDisplay')
export class AmmoQueueDisplay extends Component {
    private _slotNodes: Node[] = [];
    private _miniCellSize: number = 12;

    onLoad(): void {
        this._createSlots();
        this._registerEvents();
    }

    onDestroy(): void {
        EventManager.instance.offTarget(this);
    }

    private _createSlots(): void {
        const slotHeight = 70;

        // 背景
        const bg = new Node('AmmoBg');
        bg.parent = this.node;
        const bgTransform = bg.addComponent(UITransform);
        bgTransform.setContentSize(70, slotHeight * 3 + 20);
        const bgG = bg.addComponent(Graphics);
        bgG.fillColor = new Color(20, 20, 40, 180);
        bgG.roundRect(-35, -(slotHeight * 1.5 + 10), 70, slotHeight * 3 + 20, 6);
        bgG.fill();

        for (let i = 0; i < 3; i++) {
            const slot = new Node(`AmmoSlot_${i}`);
            slot.parent = this.node;
            slot.setPosition(0, (1 - i) * slotHeight, 0);

            const transform = slot.addComponent(UITransform);
            transform.setContentSize(60, slotHeight);

            slot.addComponent(Graphics);

            // 当前弹药高亮边框
            if (i === 0) {
                const border = new Node('CurrentBorder');
                border.parent = slot;
                const bG = border.addComponent(Graphics);
                bG.strokeColor = new Color(255, 255, 100, 200);
                bG.lineWidth = 2;
                bG.roundRect(-30, -slotHeight / 2 + 5, 60, slotHeight - 10, 4);
                bG.stroke();
            }

            this._slotNodes.push(slot);
        }
    }

    refreshDisplay(queue: AmmoSlot[]): void {
        for (let i = 0; i < this._slotNodes.length; i++) {
            const slotNode = this._slotNodes[i];
            const g = slotNode.getComponent(Graphics);
            if (!g) continue;
            g.clear();

            if (i < queue.length) {
                const ammo = queue[i];
                const cells = getBlockCells(ammo.shape, ammo.rotation);
                const color = SHAPE_COLORS[ammo.shape] || new Color(200, 200, 200, 255);
                const size = i === 0 ? this._miniCellSize : this._miniCellSize * 0.8;
                const alpha = i === 0 ? 255 : 150;

                g.fillColor = new Color(color.r, color.g, color.b, alpha);

                // 居中绘制
                let sumR = 0, sumC = 0;
                for (const [dr, dc] of cells) { sumR += dr; sumC += dc; }
                const avgR = sumR / cells.length;
                const avgC = sumC / cells.length;

                for (const [dr, dc] of cells) {
                    const x = (dc - avgC) * size - size / 2;
                    const y = (dr - avgR) * size - size / 2;
                    g.rect(x, y, size - 1, size - 1);
                }
                g.fill();
            }
        }
    }

    private _registerEvents(): void {
        EventManager.instance.on(GameEvent.AMMO_CHANGED, (queue: AmmoSlot[]) => {
            this.refreshDisplay(queue);
        }, this);
    }
}
