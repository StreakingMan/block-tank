# Ammo & Projectile System

## Overview

弹药系统将俄罗斯方块的 7 种标准形状作为坦克的弹药。采用 Bag7 算法保证公平随机，玩家需要策略性地利用不同形状构建矩形。

## Block Shapes

7 种标准俄罗斯方块形状，每种有 4 个旋转状态：

```
I: ████     O: ██    T: ███    S:  ██    Z: ██     L: █      J:   █
                ██       █        ██        ██       █         █
                                                     ██       ██
```

### Color Mapping

| Shape | Color | RGB |
|-------|-------|-----|
| I | Cyan（青色） | (0, 255, 255) |
| O | Yellow（黄色） | (255, 255, 0) |
| T | Purple（紫色） | (128, 0, 255) |
| S | Green（绿色） | (0, 255, 0) |
| Z | Red（红色） | (255, 0, 0) |
| L | Orange（橙色） | (255, 165, 0) |
| J | Blue（蓝色） | (0, 0, 255) |

## Ammo Queue

### Structure
- **3 个槽位**：当前弹药 + 下一个 + 再下一个
- 当前弹药消耗后，队列前移，尾部从 Bag 补充

### Bag7 Algorithm

标准俄罗斯方块随机算法：
1. 将 7 种形状放入一个 "袋子"
2. 随机打乱顺序
3. 按顺序逐个取出
4. 袋子空后重新装入 7 种形状并打乱
5. **保证**：每 7 个方块中，每种形状恰好出现 1 次

### Operations

| 操作 | 方法 | 事件 |
|------|------|------|
| 初始化 | `init()` | AMMO_CHANGED |
| 旋转当前 | `rotateCurrent()` | AMMO_ROTATED |
| 消耗当前 | `consumeCurrent()` | AMMO_CHANGED |
| 获取形状数据 | `getCurrentCells()` | - |

## BlockProjectile

### Specs

| 参数 | 值 |
|------|-----|
| 飞行速度 | 12 cells/sec |
| 玩家射程 | 4 cells（+10 bonus = 14 max） |
| 敌人射程 | 4-6 cells |
| 渲染大小 | 格子的 40% |

### Lifecycle

```
fire(row, col, dir, shape, rotation, owner)
  → 从坦克前方 1 格出发
  → 每帧沿方向移动
  → 碰撞检测：
     ├── 碰到固体地形 → 在前一个可通行格子嵌入积木
     ├── 碰到敌方坦克 → onHitEntity() 造成伤害
     └── 超出射程 → 在当前位置嵌入积木
  → _destroy() 销毁节点
```

### Embedding

弹药落地后调用 `GridManager.embedBlock()`：
- 积木形状的每个格子变为 TERRAIN 类型
- 设置 owner（PLAYER 或 ENEMY）
- 设置 decayTimer = 8.0s
- 触发 `GRID_TERRAIN_PLACED` 事件 → 启动矩形检测

## GhostPreview

### Purpose
为 BUILD 模式提供视觉预览，显示积木将放置的位置。

### Algorithm
1. 从坦克朝向的最大射程位置开始
2. 向坦克方向逐格回退
3. 检查每个位置是否所有格子都为空且在边界内
4. 找到第一个合法位置 → 绿色预览
5. 找不到合法位置 → 红色预览（不可放置）

### Visual
- 有效位置：绿色半透明填充 + 亮绿边框
- 无效位置：红色半透明填充 + 红色边框
