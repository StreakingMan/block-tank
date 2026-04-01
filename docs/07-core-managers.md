# Core Managers

## Overview

核心管理器层为游戏提供基础设施服务。所有管理器遵循单例模式，通过 `ClassName.instance` 访问。

## GameManager

### Responsibility
游戏生命周期管理、玩家状态追踪、得分系统。

### Game States

```
NONE → LOADING → MENU → PLAYING → PAUSED → GAME_OVER
                          ↑                    │
                          └────── restart ──────┘
```

### Key Methods

| 方法 | 行为 | 事件 |
|------|------|------|
| startGame() | 状态→PLAYING，重置分数/HP | GAME_START |
| gameOver() | 状态→GAME_OVER，保存最高分 | GAME_OVER |
| restart() | 清理状态，重新开始 | GAME_RESTART |
| addScore(n) | 累加分数 | SCORE_CHANGED |
| damagePlayer(n) | 扣减 HP，HP<=0 触发死亡 | HP_CHANGED / PLAYER_DEAD |
| healPlayer(n) | 恢复 HP（不超过上限） | HP_CHANGED |

### Persistence
- 最高分通过 StorageManager 持久化
- 其他状态不持久化（每局重置）

---

## EventManager

### Responsibility
中央事件总线，所有系统间通信的唯一通道。

### Pattern
Observer 模式，支持去重保护。

### API

```typescript
on(event, callback, target)    // 持久监听
once(event, callback, target)  // 一次性监听
off(event, callback, target)   // 取消特定监听
offTarget(target)              // 取消 target 的所有监听（用于 onDestroy 清理）
emit(event, ...args)           // 触发事件
```

### Best Practices
- 在 `onLoad()` 或 `start()` 中注册事件
- 在 `onDestroy()` 中调用 `offTarget(this)` 清理
- 使用 `Constants.Events.XXX` 常量，不硬编码字符串
- emit 时传递结构化数据对象

---

## AudioManager

### Responsibility
管理 BGM 和 SFX 的播放、音量、静音。

### Architecture
- 1 个 BGM AudioSource（背景音乐）
- 8 个 SFX AudioSource 通道（轮询复用）
- AudioClip 缓存避免重复加载

### API

| 方法 | 说明 |
|------|------|
| playBGM(clip) | 播放背景音乐（自动循环） |
| stopBGM() | 停止 BGM |
| pauseBGM() / resumeBGM() | 暂停/恢复 BGM |
| playSFX(clip) | 播放音效（自动选择空闲通道） |
| setBGMVolume(v) / setSFXVolume(v) | 设置音量 (0~1) |
| muteBGM() / muteSFX() | 静音切换 |

### Storage Keys
- `audio_bgm_volume`, `audio_sfx_volume`
- `audio_bgm_mute`, `audio_sfx_mute`

---

## StorageManager

### Responsibility
封装本地存储，提供类型安全的读写接口。

### Backend
- Web: `cc.sys.localStorage`
- WeChat: `wx.setStorageSync` / `wx.getStorageSync`

### Key Prefix
所有 key 自动添加 `"bt_"` 前缀，避免与其他应用冲突。

### API

```typescript
getString(key, defaultVal?)  / setString(key, val)
getNumber(key, defaultVal?)  / setNumber(key, val)
getBool(key, defaultVal?)    / setBool(key, val)
clearAll()                   // 清除所有 bt_ 前缀的数据
```

---

## ResManager

### Responsibility
异步资源加载，封装 Cocos Creator 的资源管理 API。

### API

```typescript
await loadPrefab(path)        // 加载 Prefab
await loadJson(path)          // 加载 JSON
await loadSpriteFrame(path)   // 加载图片
await loadAsset(path, type)   // 通用加载
await loadDir(path, type)     // 加载目录
await loadBundle(name)        // 加载 AssetBundle（缓存）
```

### Notes
- 所有方法返回 Promise
- Bundle 加载结果缓存在 Map 中
- 路径相对于 `resources/` 目录

---

## ObjectPool

### Responsibility
节点对象池，复用 Prefab 实例减少 GC 和实例化开销。

### API

```typescript
registerPrefab(key, prefab, preloadCount?)  // 注册并预创建
get(key): Node | null                       // 从池中取出
put(key, node)                              // 归还到池中
clearPool(key)                              // 清空指定池
clearAll()                                  // 清空所有池
```

### Current Usage
- AudioSource 通道（8 个 SFX 播放器）
- 扩展点：BlockProjectile、EnemyTank 等可接入对象池
