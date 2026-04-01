# BlockTank

Cocos Creator 3.8.8 坦克+方块混合玩法游戏。720x1280 竖屏，目标平台 Web + 微信小游戏。

## Architecture

Event-Driven + Singleton。系统间通过自定义 `EventManager` 通信，禁止直接持有跨系统引用。

```
core/        — 单例管理器 (GameManager, EventManager, AudioManager, StorageManager, ResManager, ObjectPool)
game/grid/   — 20x32 网格系统 (GridManager, GridCell, GridRenderer)
game/tank/   — 坦克 (TankBase → PlayerTank / EnemyTank, TankAI)
game/ammo/   — 弹药 (BlockData, AmmoManager, BlockProjectile, GhostPreview)
game/combat/ — 战斗 (DamageSystem, ExplosionManager, RectDetector)
game/input/  — 输入路由 (InputManager)
game/level/  — 关卡 (RoomManager)
ui/          — UI组件和面板
data/configs/— 配置数据
GameScene.ts — 场景入口，程序化构建整个场景层级
```

## Project Conventions

- 文件名 PascalCase（与官方 kebab-case 建议不同，本项目已有惯例，保持一致）
- 单例用 `static _instance` + `static get instance()` 模式，在 `onLoad` 赋值，`onDestroy` 置空
- 事件名在 `Constants.ts` 中定义为 `GameEvent` 枚举，禁止硬编码字符串
- 事件监听必须传 `this` 作为 target，`onDestroy` 中必须调用 `EventManager.instance.offTarget(this)`
- 本项目不使用 `@property` 装饰器 —— 所有节点和组件通过代码动态创建 (`addComponent`)
- 场景完全程序化构建于 `GameScene._buildScene()`，不依赖 .scene 编辑器文件
- 网格坐标原点在左下角，row 0 = 底部，col 0 = 左侧，游戏逻辑中只用整数坐标
- 所有常量集中在 `Constants.ts`，禁止在组件中硬编码魔法数字
- 持久化通过 `StorageManager`（key 前缀 `bt_`），兼容微信小游戏 `wx.setStorageSync`
- 视觉渲染基于 `cc.Graphics` 代码绘制（注意：Graphics 组件会打断 UI 合批）

## Common Tasks

**添加事件**: Constants.ts 加枚举 → emit → on + offTarget 清理
**添加敌人类型**: Constants.ts 加 TankType → EnemyConfig.ts 配置波次 → EnemyTank.ts 定制 AI
**添加方块形状**: BlockData.ts 定义 4 旋转态 + 颜色 → AmmoManager Bag7 自动纳入
**添加格子类型**: Constants.ts 加 CellType → GridCell.ts 定义通行/破坏规则 → GridRenderer.ts 渲染

## Key Constants

Grid: 20x32, ~20px/cell | Tank: 2x2 cells | Player: speed=8, hp=5, range=8, fireCD=0.4s
Projectile: speed=24 | Terrain decay: 8s | Enemy kill: 50pts | Rect clear: 30pts/cell
