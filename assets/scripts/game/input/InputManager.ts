/**
 * 输入管理器 - 十字键/按钮事件分发
 * 接收UI组件的触控事件，转发为游戏事件
 */
import { _decorator, Component } from 'cc';
import { Direction, GameEvent } from '../../core/Constants';
import { EventManager } from '../../core/EventManager';

const { ccclass } = _decorator;

@ccclass('InputManager')
export class InputManager extends Component {
    private static _instance: InputManager;

    static get instance(): InputManager {
        return this._instance;
    }

    onLoad(): void {
        InputManager._instance = this;
    }

    onDestroy(): void {
        InputManager._instance = null!;
    }

    /** 方向键按下 */
    onDPadDown(direction: Direction): void {
        EventManager.instance.emit(GameEvent.INPUT_MOVE, direction);
    }

    /** 方向键抬起 */
    onDPadUp(): void {
        EventManager.instance.emit(GameEvent.INPUT_MOVE_END);
    }

    /** 射击按钮 */
    onShootPressed(): void {
        EventManager.instance.emit(GameEvent.INPUT_SHOOT);
    }

    /** 构筑按钮 */
    onBuildPressed(): void {
        EventManager.instance.emit(GameEvent.INPUT_BUILD);
    }

    /** 旋转按钮 */
    onRotatePressed(): void {
        EventManager.instance.emit(GameEvent.INPUT_ROTATE);
    }
}
