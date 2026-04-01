# Tank System

## Overview

坦克系统包含基类 `TankBase` 和两个子类 `PlayerTank`、`EnemyTank`。所有坦克基于网格移动，四方向操控，支持射击和积木放置。

## TankBase

所有坦克的基类，提供通用能力：

### Properties

| 属性 | 类型 | 说明 |
|------|------|------|
| gridRow / gridCol | number | 当前网格坐标 |
| direction | Direction | 朝向（UP/DOWN/LEFT/RIGHT） |
| hp / maxHp | number | 当前/最大生命值 |
| speed | number | 移动速度（cells/sec） |
| range | number | 射程（cells） |
| fireCD / fireTimer | number | 射击冷却时间 |
| invincible | boolean | 是否无敌状态 |

### Movement

- **四方向移动**：UP / DOWN / LEFT / RIGHT
- 移动前检查目标格子是否 `isWalkable()`
- 平滑移动动画：lerp 过渡，耗时 `1/speed` 秒
- 朝向自动旋转：DIR_ANGLE 映射表控制节点角度

### Visual

纯代码绘制（`cc.Graphics`）：
- 坦克主体矩形
- 履带（两侧深色条）
- 炮塔（中心圆 + 炮管矩形）
- 玩家=绿色系，敌人=红色系

---

## PlayerTank

### Specs

| 参数 | 值 |
|------|-----|
| 速度 | 4 cells/sec |
| 初始 HP | 5 |
| 初始射程 | 4 cells |
| 射击冷却 | 0.4s |
| 出生点 | (1, 4) |
| 出生无敌 | 3 秒 |

### Input Events

| 事件 | 行为 |
|------|------|
| INPUT_MOVE | 持续朝指定方向移动 |
| INPUT_MOVE_END | 停止移动 |
| INPUT_SHOOT | 发射积木弹 |
| INPUT_BUILD | 在预览位置放置积木 |
| INPUT_ROTATE | 旋转当前弹药 |

### Two Fire Modes

1. **SHOOT（射击）**
   - 在坦克前方 1 格生成 `BlockProjectile`
   - 弹药飞行至碰撞或射程尽头
   - 嵌入为 TERRAIN 格子

2. **BUILD（建造）**
   - 直接在 `GhostPreview` 标记的位置放置积木
   - 无需飞行过程，即时生效
   - 需要所有目标格子为空且在范围内

### Ghost Preview

- 从最大射程向回搜索，找到第一个合法放置位置
- 绿色 = 可放置，红色 = 不可放置
- 每次移动/旋转/消耗弹药后更新

---

## EnemyTank

### Enemy Types

| 类型 | 速度 | HP | 射击CD | 射程 |
|------|------|-----|--------|------|
| ENEMY_BASIC | 2 | 2 | 2.0s | 6 |
| ENEMY_FAST | 4 | 1 | 1.5s | 4 |

### AI Behavior (TankAI)

每 **0.5 秒** 执行一次 AI Tick：

```
1. 检查视线 (hasLineOfSight)
   ├── 有视线 → 开火
   └── 无视线 → 2. BFS 寻路
       ├── 找到路径 → 沿路径移动
       └── 无路径 → 随机方向移动
2. 20% 概率随机开火（无论视线）
```

- **视线检测**：仅水平/垂直直线，中间无阻挡
- **BFS 寻路**：最大 80 步，寻找到玩家的最短路径
- **随机射击**：使用随机 BlockShape 和旋转角度
- **死亡**：触发 `ENEMY_KILLED` 事件，得分 +50
