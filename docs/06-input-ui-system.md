# Input & UI System

## Input Architecture

```
Touch Events (Screen)
  → UI Components (DPadControl / ActionButtons)
    → InputManager (Singleton, routes events)
      → EventManager (Central bus)
        → PlayerTank (Responds to events)
```

所有输入通过事件解耦，UI 组件不直接引用游戏逻辑。

## Input Events

| 事件 | 触发源 | 数据 | 响应者 |
|------|--------|------|--------|
| INPUT_MOVE | DPadControl | Direction | PlayerTank |
| INPUT_MOVE_END | DPadControl | - | PlayerTank |
| INPUT_SHOOT | ActionButtons | - | PlayerTank |
| INPUT_BUILD | ActionButtons | - | PlayerTank |
| INPUT_ROTATE | ActionButtons | - | PlayerTank |

## Screen Layout

```
┌─────────────────────┐ 1280px
│     GameHUD (100px)  │  ← Score / HP / Room
├─────────────────────┤
│                     │
│                     │
│   BattleField       │  ← 10x16 Grid (~640px)
│   (Grid Area)       │
│                     │
│                     │
├─────────────────────┤
│                     │
│  Controls (260px)   │  ← DPad + Action Buttons
│  ┌─────┐  ┌──────┐ │
│  │DPad │  │Action│ │
│  └─────┘  └──────┘ │
│  AmmoQueue          │
└─────────────────────┘
        720px
```

## DPadControl

### Layout
- 5 个按钮：上、下、左、右 + 中心点
- 按钮直径：60px，间距：5px
- 位置：屏幕左下角

### Behavior
- **TOUCH_START** → 发送 `INPUT_MOVE(direction)`
- **TOUCH_END / TOUCH_CANCEL** → 发送 `INPUT_MOVE_END`
- 支持持续按住 → 坦克连续移动

### Visual
- 半透明蓝色圆形按钮
- 白色箭头指示方向
- 中心为小圆点

## ActionButtons

### Layout
3 个圆形按钮：

| 按钮 | 颜色 | 位置 | 大小 | 功能 |
|------|------|------|------|------|
| Fire | 红色 | 右侧中央 | 最大 | 发射积木弹 |
| Build | 蓝色 | 左下 | 中等 | 放置积木 |
| Rotate | 黄色 | 右下 | 中等 | 旋转弹药 |

### Behavior
- **TOUCH_START** 即触发（无需松手确认）
- 每个按钮有多层透明度渐变 + 白色边框

## GameHUD

### Layout
- 水平布局，高度 100px，位于屏幕顶部
- 左：HP 条（150x14px，颜色从绿→黄→红渐变）
- 中：Score 文本
- 右：Room 编号

### Event Listeners
- `HP_CHANGED` → 更新 HP 条长度和颜色
- `SCORE_CHANGED` → 更新分数显示
- `GAME_START` → 重置显示
- `ROOM_CLEARED` → 更新房间编号

## GameOverPanel

### Layout
- 全屏半透明遮罩
- 居中面板：400x350px，深蓝底色
- 内容：标题（红色）、分数、最高分、房间数、重启按钮（绿色）

### Trigger
- 监听 `GAME_OVER` 事件
- 延迟 0.5 秒后显示
- 重启按钮调用 `GameManager.restart()`

## AmmoQueueDisplay

### Layout
- 垂直排列，3 个槽位，每个 70px 高
- 位于控制区域左侧

### Slots
| Slot | 内容 | 样式 |
|------|------|------|
| 0 (顶部) | 当前弹药 | 高亮边框，完整大小 |
| 1 | 下一个 | 60% 透明度，缩小 |
| 2 | 再下一个 | 60% 透明度，缩小 |

### Rendering
- 每个槽位用 12px 小方格绘制方块形状
- 监听 `AMMO_CHANGED` 事件刷新显示
