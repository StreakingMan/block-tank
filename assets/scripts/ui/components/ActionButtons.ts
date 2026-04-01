/**
 * 射击/构筑/旋转按钮组件
 */
import { _decorator, Component, Node, UITransform, Graphics, Color } from 'cc';
import { InputManager } from '../../game/input/InputManager';

const { ccclass } = _decorator;

@ccclass('ActionButtons')
export class ActionButtons extends Component {
    onLoad(): void {
        this._createButtons();
    }

    private _createButtons(): void {
        const btnSize = 55;
        const spacing = 10;

        // 射击按钮（右下主按钮）
        const shootBtn = this._createCircleButton('ShootBtn', 0, btnSize * 0.5 + spacing, btnSize,
            new Color(220, 60, 60, 230), 'FIRE');
        shootBtn.on(Node.EventType.TOUCH_START, () => {
            InputManager.instance?.onShootPressed();
        }, this);

        // 构筑按钮
        const buildBtn = this._createCircleButton('BuildBtn', -(btnSize + spacing), -(btnSize * 0.3), btnSize * 0.85,
            new Color(60, 140, 220, 230), 'BUILD');
        buildBtn.on(Node.EventType.TOUCH_START, () => {
            InputManager.instance?.onBuildPressed();
        }, this);

        // 旋转按钮
        const rotateBtn = this._createCircleButton('RotateBtn', (btnSize + spacing), -(btnSize * 0.3), btnSize * 0.85,
            new Color(220, 180, 40, 230), 'ROT');
        rotateBtn.on(Node.EventType.TOUCH_START, () => {
            InputManager.instance?.onRotatePressed();
        }, this);
    }

    private _createCircleButton(name: string, x: number, y: number, size: number, color: Color, label: string): Node {
        const btn = new Node(name);
        btn.parent = this.node;
        btn.setPosition(x, y, 0);

        const transform = btn.addComponent(UITransform);
        transform.setContentSize(size, size);

        const g = btn.addComponent(Graphics);

        // 外圈
        g.fillColor = new Color(color.r, color.g, color.b, 60);
        g.circle(0, 0, size / 2);
        g.fill();

        // 内圈
        g.fillColor = color;
        g.circle(0, 0, size / 2 - 4);
        g.fill();

        // 边框
        g.strokeColor = new Color(255, 255, 255, 100);
        g.lineWidth = 1.5;
        g.circle(0, 0, size / 2 - 2);
        g.stroke();

        return btn;
    }
}
