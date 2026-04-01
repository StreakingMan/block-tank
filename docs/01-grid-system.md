# Grid System

## Overview

网格系统是游戏的核心基础设施。所有游戏实体（坦克、积木、地形）都基于网格坐标定位和交互。

## Specifications

| 参数 | 值 | 说明 |
|------|-----|------|
| 列数 (GRID_COLS) | 10 | 水平格子数 |
| 行数 (GRID_ROWS) | 16 | 垂直格子数 |
| 格子大小 | ~40px | 动态计算，适配分辨率 |
| 网格面积 | 640x640px | 实际渲染尺寸 |
| 坐标原点 | 左下角 | row=0 在底部，col=0 在左侧 |

## Cell Types

| 类型 | 枚举值 | 可通行 | 可破坏 | 说明 |
|------|--------|--------|--------|------|
| EMPTY | 0 | Yes | - | 空格子 |
| TERRAIN | 1 | No | Yes | 积木嵌入生成的地形 |
| STEEL | 2 | No | No | 钢铁墙，不可破坏 |
| WATER | 3 | No | No | 水域，阻挡通行和子弹 |
| GRASS | 4 | Yes | No | 草地，可通行（隐蔽） |
| BRICK | 5 | No | Yes | 砖墙，可破坏 |

## GridCell Properties

每个格子包含以下属性：
- **type**: CellType — 格子类型
- **hp**: number — 生命值（可破坏格子）
- **owner**: TerrainOwner (NONE / PLAYER / ENEMY / MAP) — 归属
- **blockShape**: BlockShape — 生成该地形的方块形状
- **decayTimer**: number — 衰减倒计时（仅 TERRAIN）
- **colorIndex**: number — 渲染颜色索引

## Terrain Decay

玩家/敌人放置的 TERRAIN 类型格子会在 **8 秒**后自动衰减消失：
1. 积木嵌入 → decayTimer = 8.0
2. 每帧 decayTimer -= dt
3. 渲染透明度随 timer 递减（视觉反馈）
4. timer <= 0 → 格子清空 → 触发 `GRID_TERRAIN_DECAYED` 事件
5. 衰减时对相邻格子（曼哈顿距离 <= 1）的坦克造成坍塌伤害

## Coordinate System

```
Row 15  ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐  ← 顶部
        │ │ │ │ │ │ │ │ │ │ │
  ...   ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤
        │ │ │ │ │ │ │ │ │ │ │
Row 0   └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘  ← 底部
        C0 C1 C2 C3 C4 C5 C6 C7 C8 C9
```

## Key APIs

```typescript
GridManager.instance.getCell(row, col)      // 获取格子数据
GridManager.instance.setCell(row, col, type) // 设置格子类型
GridManager.instance.isWalkable(row, col)    // 是否可通行
GridManager.instance.isEmpty(row, col)       // 是否为空
GridManager.instance.embedBlock(row, col, shape, rotation, owner) // 嵌入积木
GridManager.instance.gridToPixel(row, col)   // 网格→像素坐标
GridManager.instance.pixelToGrid(x, y)       // 像素→网格坐标
```

## Rendering

- **GridRenderer** 基于 `cc.Graphics` 绘制网格线
- 仅渲染非空格子（空格子节点隐藏，节省性能）
- 每种 BlockShape 有对应颜色（I=青色, O=黄色, T=紫色, S=绿色, Z=红色, L=橙色, J=蓝色）
- 衰减中的格子透明度递减
- 响应 `GRID_CELL_CHANGED` 事件进行增量更新
