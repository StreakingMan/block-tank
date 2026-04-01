/**
 * 虚拟十字键组件 - 触控输入
 */
import { _decorator, Component, Node, EventTouch, UITransform, Vec2, Vec3, Graphics, Color } from 'cc';
import { Direction } from '../../core/Constants';
import { InputManager } from '../../game/input/InputManager';

const { ccclass } = _decorator;

@ccclass('DPadControl')
export class DPadControl extends Component {
    private _pressing: boolean = false;
    private _currentDir: Direction | null = null;

    /** 十字键按钮节点 */
    private _btnUp: Node | null = null;
    private _btnDown: Node | null = null;
    private _btnLeft: Node | null = null;
    private _btnRight: Node | null = null;

    onLoad(): void {
        this._createDPad();
    }

    private _createDPad(): void {
        const btnSize = 60;
        const gap = 5;
        const centerOffset = btnSize + gap;

        // 上
        this._btnUp = this._createButton('DPadUp', 0, centerOffset, btnSize, '^');
        // 下
        this._btnDown = this._createButton('DPadDown', 0, -centerOffset, btnSize, 'v');
        // 左
        this._btnLeft = this._createButton('DPadLeft', -centerOffset, 0, btnSize, '<');
        // 右
        this._btnRight = this._createButton('DPadRight', centerOffset, 0, btnSize, '>');

        // 中心装饰
        const center = this._createButton('DPadCenter', 0, 0, btnSize * 0.5, '');
        if (center) {
            const g = center.getComponent(Graphics);
            if (g) {
                g.clear();
                g.fillColor = new Color(40, 40, 60, 200);
                g.circle(0, 0, btnSize * 0.2);
                g.fill();
            }
        }

        this._bindTouchEvents(this._btnUp!, Direction.UP);
        this._bindTouchEvents(this._btnDown!, Direction.DOWN);
        this._bindTouchEvents(this._btnLeft!, Direction.LEFT);
        this._bindTouchEvents(this._btnRight!, Direction.RIGHT);
    }

    private _createButton(name: string, x: number, y: number, size: number, label: string): Node {
        const btn = new Node(name);
        btn.parent = this.node;
        btn.setPosition(x, y, 0);

        const transform = btn.addComponent(UITransform);
        transform.setContentSize(size, size);

        const g = btn.addComponent(Graphics);
        g.fillColor = new Color(50, 50, 80, 200);
        g.roundRect(-size / 2, -size / 2, size, size, 8);
        g.fill();

        g.strokeColor = new Color(100, 100, 140, 255);
        g.lineWidth = 1.5;
        g.roundRect(-size / 2, -size / 2, size, size, 8);
        g.stroke();

        // 方向箭头
        if (label) {
            g.fillColor = new Color(200, 200, 220, 255);
            const arrowSize = size * 0.25;
            if (label === '^') {
                g.moveTo(0, arrowSize);
                g.lineTo(-arrowSize, -arrowSize * 0.5);
                g.lineTo(arrowSize, -arrowSize * 0.5);
                g.close();
                g.fill();
            } else if (label === 'v') {
                g.moveTo(0, -arrowSize);
                g.lineTo(-arrowSize, arrowSize * 0.5);
                g.lineTo(arrowSize, arrowSize * 0.5);
                g.close();
                g.fill();
            } else if (label === '<') {
                g.moveTo(-arrowSize, 0);
                g.lineTo(arrowSize * 0.5, -arrowSize);
                g.lineTo(arrowSize * 0.5, arrowSize);
                g.close();
                g.fill();
            } else if (label === '>') {
                g.moveTo(arrowSize, 0);
                g.lineTo(-arrowSize * 0.5, -arrowSize);
                g.lineTo(-arrowSize * 0.5, arrowSize);
                g.close();
                g.fill();
            }
        }

        return btn;
    }

    private _bindTouchEvents(btn: Node, direction: Direction): void {
        btn.on(Node.EventType.TOUCH_START, () => {
            this._pressing = true;
            this._currentDir = direction;
            InputManager.instance?.onDPadDown(direction);
        }, this);

        btn.on(Node.EventType.TOUCH_END, () => {
            this._pressing = false;
            this._currentDir = null;
            InputManager.instance?.onDPadUp();
        }, this);

        btn.on(Node.EventType.TOUCH_CANCEL, () => {
            this._pressing = false;
            this._currentDir = null;
            InputManager.instance?.onDPadUp();
        }, this);
    }
}
