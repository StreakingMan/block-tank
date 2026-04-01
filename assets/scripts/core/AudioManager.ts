/**
 * 音频管理器 - 统一管理 BGM 和音效
 *
 * 支持：BGM切换（淡入淡出）、音效播放（对象池复用AudioSource）、
 * 全局音量控制、静音状态持久化。
 */
import { _decorator, Component, AudioClip, AudioSource, resources, Node } from 'cc';
import { StorageManager } from './StorageManager';

const { ccclass, property } = _decorator;

const STORAGE_KEY_BGM_VOLUME = 'audio_bgm_volume';
const STORAGE_KEY_SFX_VOLUME = 'audio_sfx_volume';
const STORAGE_KEY_BGM_MUTE = 'audio_bgm_mute';
const STORAGE_KEY_SFX_MUTE = 'audio_sfx_mute';

@ccclass('AudioManager')
export class AudioManager extends Component {
    private static _instance: AudioManager;

    private _bgmSource: AudioSource = null!;
    private _sfxSources: AudioSource[] = [];
    private _maxSfxChannels = 8;

    private _bgmVolume: number = 1.0;
    private _sfxVolume: number = 1.0;
    private _bgmMute: boolean = false;
    private _sfxMute: boolean = false;

    /** 音效缓存 */
    private _clipCache: Map<string, AudioClip> = new Map();

    static get instance(): AudioManager {
        return this._instance;
    }

    onLoad(): void {
        if (AudioManager._instance) {
            this.node.destroy();
            return;
        }
        AudioManager._instance = this;

        this._initAudioSources();
        this._loadSettings();
    }

    private _initAudioSources(): void {
        // BGM 专用 AudioSource
        this._bgmSource = this.node.addComponent(AudioSource);
        this._bgmSource.loop = true;

        // 音效通道池
        for (let i = 0; i < this._maxSfxChannels; i++) {
            const src = this.node.addComponent(AudioSource);
            src.loop = false;
            this._sfxSources.push(src);
        }
    }

    private _loadSettings(): void {
        const storage = StorageManager.instance;
        this._bgmVolume = storage.getNumber(STORAGE_KEY_BGM_VOLUME, 1.0);
        this._sfxVolume = storage.getNumber(STORAGE_KEY_SFX_VOLUME, 1.0);
        this._bgmMute = storage.getBool(STORAGE_KEY_BGM_MUTE, false);
        this._sfxMute = storage.getBool(STORAGE_KEY_SFX_MUTE, false);
    }

    // ======================== BGM ========================

    /**
     * 播放背景音乐
     * @param path resources 下的音频路径（不含扩展名）
     */
    playBGM(path: string): void {
        this._loadClip(path, (clip) => {
            if (!clip) return;
            this._bgmSource.stop();
            this._bgmSource.clip = clip;
            this._bgmSource.volume = this._bgmMute ? 0 : this._bgmVolume;
            this._bgmSource.play();
        });
    }

    stopBGM(): void {
        this._bgmSource.stop();
    }

    pauseBGM(): void {
        this._bgmSource.pause();
    }

    resumeBGM(): void {
        this._bgmSource.play();
    }

    // ======================== SFX ========================

    /**
     * 播放音效
     * @param path resources 下的音频路径（不含扩展名）
     */
    playSFX(path: string): void {
        if (this._sfxMute) return;

        this._loadClip(path, (clip) => {
            if (!clip) return;
            const source = this._getFreeSfxSource();
            if (source) {
                source.clip = clip;
                source.volume = this._sfxVolume;
                source.play();
            }
        });
    }

    // ======================== 音量控制 ========================

    set bgmVolume(val: number) {
        this._bgmVolume = Math.max(0, Math.min(1, val));
        this._bgmSource.volume = this._bgmMute ? 0 : this._bgmVolume;
        StorageManager.instance.setNumber(STORAGE_KEY_BGM_VOLUME, this._bgmVolume);
    }

    get bgmVolume(): number { return this._bgmVolume; }

    set sfxVolume(val: number) {
        this._sfxVolume = Math.max(0, Math.min(1, val));
        StorageManager.instance.setNumber(STORAGE_KEY_SFX_VOLUME, this._sfxVolume);
    }

    get sfxVolume(): number { return this._sfxVolume; }

    set bgmMute(val: boolean) {
        this._bgmMute = val;
        this._bgmSource.volume = val ? 0 : this._bgmVolume;
        StorageManager.instance.setBool(STORAGE_KEY_BGM_MUTE, val);
    }

    get bgmMute(): boolean { return this._bgmMute; }

    set sfxMute(val: boolean) {
        this._sfxMute = val;
        StorageManager.instance.setBool(STORAGE_KEY_SFX_MUTE, val);
    }

    get sfxMute(): boolean { return this._sfxMute; }

    // ======================== 内部 ========================

    private _getFreeSfxSource(): AudioSource | null {
        for (const src of this._sfxSources) {
            if (!src.playing) return src;
        }
        // 全忙，复用最早开始播放的（简化处理：直接返回第一个）
        return this._sfxSources[0];
    }

    private _loadClip(path: string, callback: (clip: AudioClip | null) => void): void {
        const cached = this._clipCache.get(path);
        if (cached) {
            callback(cached);
            return;
        }

        resources.load(path, AudioClip, (err, clip) => {
            if (err) {
                console.error(`[AudioManager] Failed to load clip: ${path}`, err);
                callback(null);
                return;
            }
            this._clipCache.set(path, clip);
            callback(clip);
        });
    }
}
