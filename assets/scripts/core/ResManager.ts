/**
 * 资源加载管理器 - 封装 Cocos 资源加载接口
 *
 * 职责：
 * - 统一管理 resources / AssetBundle 加载
 * - 资源引用计数与释放
 * - 加载进度回调（用于 Loading 界面）
 */
import { _decorator, resources, Asset, Prefab, SpriteFrame, JsonAsset, AssetManager, assetManager } from 'cc';

type ProgressCallback = (finished: number, total: number) => void;
type CompleteCallback<T extends Asset> = (err: Error | null, asset: T) => void;

export class ResManager {
    private static _instance: ResManager;
    private _bundleCache: Map<string, AssetManager.Bundle> = new Map();

    static get instance(): ResManager {
        if (!this._instance) {
            this._instance = new ResManager();
        }
        return this._instance;
    }

    // ======================== resources 目录加载 ========================

    /**
     * 加载单个资源
     */
    load<T extends Asset>(path: string, type: new () => T): Promise<T> {
        return new Promise((resolve, reject) => {
            resources.load(path, type as any, (err, asset) => {
                if (err) {
                    console.error(`[ResManager] load failed: ${path}`, err);
                    reject(err);
                } else {
                    resolve(asset as T);
                }
            });
        });
    }

    /**
     * 加载目录下所有资源
     */
    loadDir<T extends Asset>(path: string, type: new () => T, onProgress?: ProgressCallback): Promise<T[]> {
        return new Promise((resolve, reject) => {
            resources.loadDir(path, type as any, onProgress ?? null!, (err, assets) => {
                if (err) {
                    console.error(`[ResManager] loadDir failed: ${path}`, err);
                    reject(err);
                } else {
                    resolve(assets as T[]);
                }
            });
        });
    }

    /**
     * 加载预制体
     */
    loadPrefab(path: string): Promise<Prefab> {
        return this.load(path, Prefab);
    }

    /**
     * 加载 JSON 配置
     */
    loadJson(path: string): Promise<JsonAsset> {
        return this.load(path, JsonAsset);
    }

    /**
     * 加载 SpriteFrame
     */
    loadSpriteFrame(path: string): Promise<SpriteFrame> {
        return this.load(path, SpriteFrame);
    }

    // ======================== AssetBundle ========================

    /**
     * 加载 AssetBundle
     */
    loadBundle(name: string): Promise<AssetManager.Bundle> {
        return new Promise((resolve, reject) => {
            const cached = this._bundleCache.get(name);
            if (cached) {
                resolve(cached);
                return;
            }

            assetManager.loadBundle(name, (err, bundle) => {
                if (err) {
                    console.error(`[ResManager] loadBundle failed: ${name}`, err);
                    reject(err);
                } else {
                    this._bundleCache.set(name, bundle);
                    resolve(bundle);
                }
            });
        });
    }

    /**
     * 从 Bundle 加载资源
     */
    loadFromBundle<T extends Asset>(bundleName: string, path: string, type: new () => T): Promise<T> {
        return new Promise(async (resolve, reject) => {
            try {
                const bundle = await this.loadBundle(bundleName);
                bundle.load(path, type as any, (err, asset) => {
                    if (err) reject(err);
                    else resolve(asset as T);
                });
            } catch (e) {
                reject(e);
            }
        });
    }

    // ======================== 释放 ========================

    /**
     * 释放单个资源
     */
    release(path: string): void {
        resources.release(path);
    }

    /**
     * 释放 Bundle
     */
    releaseBundle(name: string): void {
        const bundle = this._bundleCache.get(name);
        if (bundle) {
            bundle.releaseAll();
            assetManager.removeBundle(bundle);
            this._bundleCache.delete(name);
        }
    }
}
