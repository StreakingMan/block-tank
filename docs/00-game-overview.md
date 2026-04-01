# BlockTank - Game Overview

## Concept

BlockTank 是一款将经典坦克大战与俄罗斯方块机制融合的创新 2D 游戏。玩家操控坦克在网格战场上作战，发射的弹药是俄罗斯方块形状的积木块。积木嵌入地形后，若形成完整矩形区域，将触发爆炸对敌人造成范围伤害。

## Core Loop

```
移动 → 瞄准 → 发射/建造 → 积木嵌入网格 → 矩形检测 → 爆炸伤害 → 地形衰减 → 循环
```

## Pillars

1. **战术射击** — 坦克对坦克的经典战斗，四方向移动与射击
2. **方块策略** — 俄罗斯方块式的弹药系统，需要规划放置位置
3. **矩形消除** — 填满矩形区域触发连锁爆炸，是核心得分与输出手段
4. **波次挑战** — 逐步升级的敌人波次和房间，提供持续挑战

## Target Platform

- Mobile Web (主要)
- WeChat 小游戏
- 竖屏 720x1280

## Tech Stack

- **Engine**: Cocos Creator 3.8.8
- **Language**: TypeScript
- **Rendering**: 2D Graphics + Sprite
- **Physics**: 自定义网格碰撞（无物理引擎）
