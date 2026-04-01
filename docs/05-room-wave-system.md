# Room & Wave System

## Overview

关卡系统管理敌人波次和房间推进。每个房间包含多个敌人波次，难度随房间编号递增。

## Room Structure

```
Room N
├── Wave 1: 基础敌人（最多 3 个）
├── Wave 2: 混合敌人（剩余数量，含 FAST 类型）
└── All Cleared → ROOM_CLEARED → Room N+1
```

## Wave Generation (EnemyConfig)

### Scaling Formula

```
总敌人数 = min(2 + floor(roomNum / 2), 6)

Wave 1: min(总数, 3) 个 ENEMY_BASIC
Wave 2: 剩余数量，混合 BASIC 和 FAST
```

### Examples

| Room | Total Enemies | Wave 1 | Wave 2 |
|------|--------------|--------|--------|
| 1 | 2 | 2 BASIC | - |
| 2 | 3 | 3 BASIC | - |
| 3 | 3 | 3 BASIC | - |
| 4 | 4 | 3 BASIC | 1 mixed |
| 6 | 5 | 3 BASIC | 2 mixed |
| 8 | 6 | 3 BASIC | 3 mixed |
| 10+ | 6 (cap) | 3 BASIC | 3 mixed |

### Spawn Positions

- 敌人在底部行生成，水平间隔排列
- 若目标位置被占，BFS 搜索附近可通行格子
- 生成时有短暂无敌时间

## Room Flow

```
startRoom(roomNum)
  → 清除所有存活敌人
  → 加载波次配置 (getWavesForRoom)
  → 放置初始地形障碍（~10 块砖墙/钢墙作为掩体）
  → _startNextWave()
     → 生成当前波次所有敌人
     → WAVE_START 事件
     → 等待所有敌人被击杀
     → WAVE_CLEARED 事件
     → 3.0 秒延迟
     → 检查是否还有下一波
        ├── Yes → _startNextWave()
        └── No → ROOM_CLEARED 事件
            → GameManager 记录 room++
            → 开始下一个 Room
```

## Initial Terrain

每个房间开始时放置地形障碍：
- ~10 个格子的砖墙 (BRICK) 和钢墙 (STEEL)
- 提供战术掩体
- 位置预设，分布在战场中部

## Enemy Tracking

RoomManager 维护当前存活敌人列表：
- 监听 `ENEMY_KILLED` 事件，从列表移除
- 存活数为 0 时触发波次清除
- 支持在 restart 时批量清理
