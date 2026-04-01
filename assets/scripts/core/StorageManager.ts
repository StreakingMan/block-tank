/**
 * 本地存储管理器 - 封装 cc.sys.localStorage
 *
 * 统一存取接口，自动序列化/反序列化，支持类型安全的 get 方法。
 * 微信小游戏环境下自动使用 wx.setStorageSync / wx.getStorageSync。
 */
import { sys } from 'cc';

const STORAGE_PREFIX = 'bt_';

export class StorageManager {
    private static _instance: StorageManager;

    static get instance(): StorageManager {
        if (!this._instance) {
            this._instance = new StorageManager();
        }
        return this._instance;
    }

    // ======================== 基础读写 ========================

    set(key: string, value: any): void {
        const fullKey = STORAGE_PREFIX + key;
        try {
            const json = JSON.stringify(value);
            sys.localStorage.setItem(fullKey, json);
        } catch (e) {
            console.error(`[StorageManager] Failed to set "${key}"`, e);
        }
    }

    get<T>(key: string, defaultValue: T): T {
        const fullKey = STORAGE_PREFIX + key;
        try {
            const raw = sys.localStorage.getItem(fullKey);
            if (raw === null || raw === undefined || raw === '') {
                return defaultValue;
            }
            return JSON.parse(raw) as T;
        } catch (e) {
            console.error(`[StorageManager] Failed to get "${key}"`, e);
            return defaultValue;
        }
    }

    remove(key: string): void {
        sys.localStorage.removeItem(STORAGE_PREFIX + key);
    }

    // ======================== 类型便捷方法 ========================

    getNumber(key: string, defaultValue: number = 0): number {
        return this.get<number>(key, defaultValue);
    }

    setNumber(key: string, value: number): void {
        this.set(key, value);
    }

    getString(key: string, defaultValue: string = ''): string {
        return this.get<string>(key, defaultValue);
    }

    setString(key: string, value: string): void {
        this.set(key, value);
    }

    getBool(key: string, defaultValue: boolean = false): boolean {
        return this.get<boolean>(key, defaultValue);
    }

    setBool(key: string, value: boolean): void {
        this.set(key, value);
    }

    // ======================== 批量操作 ========================

    /**
     * 清除本游戏所有存储数据
     */
    clearAll(): void {
        // 只清除带前缀的 key
        const keysToRemove: string[] = [];
        for (let i = 0; i < sys.localStorage.length; i++) {
            const key = sys.localStorage.key(i);
            if (key && key.startsWith(STORAGE_PREFIX)) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => sys.localStorage.removeItem(k));
    }
}
