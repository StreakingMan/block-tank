/**
 * UI面板基类
 */
import { _decorator, Component, Node } from 'cc';

const { ccclass } = _decorator;

@ccclass('UIBase')
export class UIBase extends Component {
    show(): void {
        this.node.active = true;
    }

    hide(): void {
        this.node.active = false;
    }

    get isVisible(): boolean {
        return this.node.active;
    }
}
