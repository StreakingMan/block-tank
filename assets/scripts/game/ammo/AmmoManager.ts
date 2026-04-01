/**
 * 弹药管理器 - Bag7队列 / 当前+next / 旋转 / 消耗
 */
import { BlockShape, GameEvent } from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { ALL_SHAPES, getBlockCells } from './BlockData';

/** 弹药槽位信息 */
export interface AmmoSlot {
    shape: BlockShape;
    rotation: number;
}

export class AmmoManager {
    private static _instance: AmmoManager;

    /** 弹药队列（索引0=当前，1-2=next） */
    private _queue: AmmoSlot[] = [];
    private _queueSize = 3;

    /** Bag7 缓冲 */
    private _bag: BlockShape[] = [];

    static get instance(): AmmoManager {
        if (!this._instance) {
            this._instance = new AmmoManager();
        }
        return this._instance;
    }

    get currentAmmo(): AmmoSlot | null {
        return this._queue[0] || null;
    }

    get queue(): AmmoSlot[] {
        return this._queue.slice();
    }

    /** 初始化弹药队列 */
    init(): void {
        this._bag = [];
        this._queue = [];
        this._fillQueue();
        this._emitChanged();
    }

    /** 旋转当前弹药（顺时针） */
    rotateCurrent(): void {
        if (this._queue.length === 0) return;
        this._queue[0].rotation = (this._queue[0].rotation + 1) % 4;
        EventManager.instance.emit(GameEvent.AMMO_ROTATED, this._queue[0]);
        this._emitChanged();
    }

    /** 消耗当前弹药，返回被消耗的弹药信息 */
    consumeCurrent(): AmmoSlot | null {
        if (this._queue.length === 0) return null;
        const consumed = this._queue.shift()!;
        this._fillQueue();
        this._emitChanged();
        return consumed;
    }

    /** 获取当前弹药的格子布局 */
    getCurrentCells(): [number, number][] | null {
        const ammo = this.currentAmmo;
        if (!ammo) return null;
        return getBlockCells(ammo.shape, ammo.rotation);
    }

    private _fillQueue(): void {
        while (this._queue.length < this._queueSize) {
            if (this._bag.length === 0) {
                this._bag = this._generateBag();
            }
            const shape = this._bag.shift()!;
            this._queue.push({ shape, rotation: 0 });
        }
    }

    /** Bag7: 7种方块各一个，随机打乱 */
    private _generateBag(): BlockShape[] {
        const bag = [...ALL_SHAPES];
        for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        return bag;
    }

    private _emitChanged(): void {
        EventManager.instance.emit(GameEvent.AMMO_CHANGED, this._queue.slice());
    }
}
