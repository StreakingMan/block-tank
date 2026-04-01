# Combat System

## Overview

战斗系统由三个核心组件协作：DamageSystem（伤害分配）、RectDetector（矩形检测）、ExplosionManager（爆炸效果）。它们通过事件链联动，实现"积木嵌入 → 矩形消除 → 范围爆炸"的核心玩法。

## Damage Chain

```
积木嵌入地形
  → GRID_TERRAIN_PLACED
  → RectDetector.detectAndClear()
     ├── 找到矩形 → 清除格子 → RECT_DETECTED
     │   → ExplosionManager.createRectExplosion()
     │      → 播放爆炸动画
     │      → RECT_EXPLODED
     │      → DamageSystem: 范围内坦克受伤
     └── 未找到 → 无事发生
  → 级联检测（清除后可能产生新矩形）

地形衰减 (8s后)
  → GRID_TERRAIN_DECAYED
  → ExplosionManager: 坍塌烟雾效果
  → DamageSystem: 相邻坦克受坍塌伤害（曼哈顿距离 ≤ 1）
```

## Rectangle Detection (RectDetector)

### Algorithm

暴力搜索所有可能的矩形（>= 2x2）：

1. 遍历所有格子作为矩形左下角
2. 对每个起点，尝试所有宽高组合
3. 检查矩形内所有格子是否为 TERRAIN
4. 找到最大面积的矩形
5. 清除该矩形内所有格子
6. **级联**：重复步骤 1-5 直到无新矩形

### Output

```typescript
interface RectResult {
  row: number;      // 左下角行
  col: number;      // 左下角列
  width: number;    // 宽（列数）
  height: number;   // 高（行数）
  area: number;     // 面积
  cells: [number, number][]; // 所有格子坐标
}
```

## Explosion Levels

矩形面积决定爆炸等级：

| 等级 | 面积 | 半径 | 伤害 | 对应矩形 |
|------|------|------|------|----------|
| Small | 4-5 | 1 | 2 | 2x2 |
| Medium | 6-7 | 2 | 3 | 2x3, 3x2 |
| Large | 8-11 | 3 | 5 | 2x4, 4x2, 3x3 |
| Huge | 12+ | 5 | 8 | 3x4, 4x3+ |

### Damage Distribution

- 爆炸中心 = 矩形区域
- 伤害范围 = 矩形边界向外扩展 `radius` 格
- 判定方式：曼哈顿距离 ≤ radius
- 范围内所有坦克受到等级对应伤害
- 范围内可破坏地形被摧毁

## Scoring

| 行为 | 得分 |
|------|------|
| 击杀敌人 | 50 points |
| 矩形消除 | area × 30 points |
| 示例：3x3 消除 | 9 × 30 = 270 points |
| 示例：4x3 消除 | 12 × 30 = 360 points |

## Direct Hit Damage

积木弹直接命中坦克：
- 造成 `BLOCK_DIRECT_HIT_DAMAGE`（1 点）伤害
- 积木不嵌入，直接消失
- 玩家射中敌人 / 敌人射中玩家 均适用

## Terrain Collapse Damage

地形衰减消失时：
- 检查消失格子周围曼哈顿距离 ≤ 1 的坦克
- 对这些坦克造成坍塌伤害
- 配合视觉烟雾效果

## Explosion Visual

```
Phase 1 (0 ~ 0.15s): 圆形扩张到最大半径
Phase 2 (0.15 ~ 0.45s): 透明度渐出至消失
Total duration: 0.45 seconds
```
