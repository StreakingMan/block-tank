/**
 * 通用对象池 - 用于子弹、特效、敌人等高频创建/销毁对象
 *
 * 微信小游戏对 GC 敏感，对象池是性能关键。
 */
import { _decorator, Node, Prefab, instantiate, NodePool } from 'cc';

export class ObjectPool {
    private static _instance: ObjectPool;
    private _pools: Map<string, NodePool> = new Map();
    private _prefabs: Map<string, Prefab> = new Map();

    static get instance(): ObjectPool {
        if (!this._instance) {
            this._instance = new ObjectPool();
        }
        return this._instance;
    }

    /**
     * 注册预制体到对象池
     * @param name 池名称
     * @param prefab 预制体
     * @param preloadCount 预加载数量
     */
    registerPrefab(name: string, prefab: Prefab, preloadCount: number = 0): void {
        this._prefabs.set(name, prefab);

        if (!this._pools.has(name)) {
            this._pools.set(name, new NodePool(name));
        }

        const pool = this._pools.get(name)!;
        for (let i = 0; i < preloadCount; i++) {
            const node = instantiate(prefab);
            pool.put(node);
        }
    }

    /**
     * 从池中获取节点
     * @param name 池名称
     * @returns 节点实例，池空时自动创建新实例
     */
    get(name: string): Node | null {
        const pool = this._pools.get(name);
        if (!pool) {
            console.warn(`[ObjectPool] Pool "${name}" not registered`);
            return null;
        }

        if (pool.size() > 0) {
            return pool.get()!;
        }

        // 池空，创建新实例
        const prefab = this._prefabs.get(name);
        if (!prefab) {
            console.warn(`[ObjectPool] Prefab "${name}" not found`);
            return null;
        }

        return instantiate(prefab);
    }

    /**
     * 回收节点到池中
     */
    put(name: string, node: Node): void {
        const pool = this._pools.get(name);
        if (pool) {
            pool.put(node);
        } else {
            node.destroy();
        }
    }

    /**
     * 获取指定池的当前大小
     */
    size(name: string): number {
        return this._pools.get(name)?.size() ?? 0;
    }

    /**
     * 清空指定池
     */
    clearPool(name: string): void {
        this._pools.get(name)?.clear();
        this._pools.delete(name);
        this._prefabs.delete(name);
    }

    /**
     * 清空所有池
     */
    clearAll(): void {
        this._pools.forEach(pool => pool.clear());
        this._pools.clear();
        this._prefabs.clear();
    }
}
