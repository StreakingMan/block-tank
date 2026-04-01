/**
 * 事件管理器 - 全局事件总线（观察者模式）
 *
 * 所有模块间通信通过此总线解耦，避免模块直接引用。
 * 支持：on / once / off / emit / offTarget（按目标清理）
 */
import { GameEvent } from './Constants';

type EventCallback = (...args: any[]) => void;

interface EventEntry {
    callback: EventCallback;
    target: any;
    once: boolean;
}

export class EventManager {
    private static _instance: EventManager;
    private _listeners: Map<string, EventEntry[]> = new Map();

    static get instance(): EventManager {
        if (!this._instance) {
            this._instance = new EventManager();
        }
        return this._instance;
    }

    /**
     * 注册事件监听
     */
    on(event: GameEvent | string, callback: EventCallback, target?: any): void {
        this._addListener(event, callback, target, false);
    }

    /**
     * 注册一次性事件监听
     */
    once(event: GameEvent | string, callback: EventCallback, target?: any): void {
        this._addListener(event, callback, target, true);
    }

    /**
     * 移除特定事件监听
     */
    off(event: GameEvent | string, callback: EventCallback, target?: any): void {
        const entries = this._listeners.get(event);
        if (!entries) return;

        for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i];
            if (entry.callback === callback && entry.target === target) {
                entries.splice(i, 1);
            }
        }

        if (entries.length === 0) {
            this._listeners.delete(event);
        }
    }

    /**
     * 移除某个目标对象上的所有监听（用于组件销毁时清理）
     */
    offTarget(target: any): void {
        this._listeners.forEach((entries, event) => {
            for (let i = entries.length - 1; i >= 0; i--) {
                if (entries[i].target === target) {
                    entries.splice(i, 1);
                }
            }
            if (entries.length === 0) {
                this._listeners.delete(event);
            }
        });
    }

    /**
     * 触发事件
     */
    emit(event: GameEvent | string, ...args: any[]): void {
        const entries = this._listeners.get(event);
        if (!entries) return;

        // 拷贝一份，防止回调中修改列表
        const snapshot = entries.slice();
        for (const entry of snapshot) {
            entry.callback.apply(entry.target, args);
            if (entry.once) {
                this.off(event, entry.callback, entry.target);
            }
        }
    }

    /**
     * 清空所有事件
     */
    clear(): void {
        this._listeners.clear();
    }

    private _addListener(event: string, callback: EventCallback, target: any, once: boolean): void {
        let entries = this._listeners.get(event);
        if (!entries) {
            entries = [];
            this._listeners.set(event, entries);
        }
        entries.push({ callback, target, once });
    }
}
