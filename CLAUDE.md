# BlockTank - Cocos Creator Project

## Project Overview

BlockTank is a hybrid mobile game combining classic Tank Battle with Tetris-style block mechanics, built on **Cocos Creator 3.8.8** (TypeScript). Players control a tank that fires Tetris-shaped blocks as projectiles; blocks embed into a grid and form rectangles to trigger area explosions.

- **Design Resolution**: 720 x 1280 (portrait)
- **Target Platforms**: Web, WeChat Mini Game
- **Language**: TypeScript (strict: false)

## Architecture

**Event-Driven + Singleton** architecture. All inter-system communication goes through `EventManager`. Core managers are singletons accessed via `ClassName.instance`.

```
Core Layer (Singletons)
├── GameManager      — Game lifecycle, score, HP, room progression
├── EventManager     — Central event bus (Observer pattern)
├── AudioManager     — BGM (1 channel) + SFX (8 channels)
├── StorageManager   — localStorage with "bt_" prefix
├── ResManager       — Async asset loading (Promise-based)
└── ObjectPool       — cc.NodePool wrapper for prefab reuse

Game Systems
├── GridManager      — 10x16 grid data, coordinate conversion
├── GridRenderer     — Graphics-based grid visualization
├── AmmoManager      — Bag7 queue (current + next 2)
├── DamageSystem     — Collision detection, rect elimination, AOE
├── ExplosionManager — Visual effects + radius damage
├── RectDetector     — Rectangle detection algorithm (>=2x2)
├── RoomManager      — Wave spawning, room progression
└── InputManager     — Touch input routing

Entities
├── TankBase → PlayerTank / EnemyTank
├── BlockProjectile
└── GhostPreview

UI
├── GameHUD, GameOverPanel
├── DPadControl, ActionButtons
└── AmmoQueueDisplay
```

## Directory Structure

```
assets/
├── scripts/
│   ├── core/         # Singleton managers (GameManager, EventManager, etc.)
│   ├── game/
│   │   ├── grid/     # GridManager, GridCell, GridRenderer
│   │   ├── tank/     # TankBase, PlayerTank, EnemyTank, TankAI
│   │   ├── ammo/     # BlockData, AmmoManager, BlockProjectile, GhostPreview
│   │   ├── combat/   # DamageSystem, ExplosionManager, RectDetector
│   │   ├── input/    # InputManager
│   │   ├── level/    # RoomManager
│   │   └── GameScene.ts   # Scene entry point, wires all systems
│   ├── data/configs/      # EnemyConfig (wave generation)
│   └── ui/
│       ├── base/     # UIBase
│       ├── panels/   # GameHUD, GameOverPanel
│       └── components/  # DPadControl, ActionButtons, AmmoQueueDisplay
├── resources/        # Runtime-loaded assets (audio, configs, textures)
├── prefabs/          # Prefab templates (block, effect, tank, ui)
└── scenes/           # Scene files (currently programmatic)
settings/v2/packages/ # Cocos project settings
```

## Coding Conventions

### General
- All game systems are **singletons** — access via `ClassName.instance`
- Systems communicate through **events only** — never hold direct references between systems
- Event names are defined as constants in `Constants.ts` — always use constants, never hardcode strings
- Grid coordinates: origin at **bottom-left**, row 0 = bottom, col 0 = left
- All positions in gameplay are **integer grid coordinates** — no sub-cell float positions

### TypeScript
- Use Cocos Creator component decorators: `@ccclass`, `@property`
- Extend `cc.Component` for scene-attached scripts
- Use `cc.v2()` / `cc.v3()` for vector operations
- Async asset loading returns `Promise` — use `await`
- `tsconfig.json` extends `temp/tsconfig.cocos.json`, strict mode is off

### Naming
- Files: PascalCase (e.g., `GameManager.ts`, `BlockProjectile.ts`)
- Classes: PascalCase
- Methods/variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Enums: PascalCase names, UPPER_SNAKE_CASE values
- Private methods: prefixed with `_` (e.g., `_aiTick()`, `_startNextWave()`)
- Event constants: UPPER_SNAKE_CASE grouped by domain (e.g., `GRID_CELL_CHANGED`, `TANK_HIT`)

### Event System
```typescript
// Listen
EventManager.instance.on(Constants.Events.TANK_HIT, this._onTankHit, this);
// Emit
EventManager.instance.emit(Constants.Events.TANK_HIT, { tank, damage });
// Cleanup (important — call in onDestroy)
EventManager.instance.offTarget(this);
```

### Grid Operations
```typescript
// Coordinate conversion
const pixel = GridManager.instance.gridToPixel(row, col);
const grid = GridManager.instance.pixelToGrid(x, y);
// Cell queries
GridManager.instance.isWalkable(row, col);
GridManager.instance.isEmpty(row, col);
```

## Key Game Constants

| Constant | Value | Notes |
|----------|-------|-------|
| GRID_COLS / GRID_ROWS | 10 / 16 | Grid dimensions |
| CELL_SIZE | ~40px | Dynamic, based on resolution |
| PLAYER_TANK_SPEED | 4 | cells/sec |
| PROJECTILE_SPEED | 12 | cells/sec |
| TERRAIN_DECAY_TIME | 8.0 | seconds |
| PLAYER_INITIAL_HP | 5 | |
| PLAYER_INITIAL_RANGE | 4 | cells |
| ENEMY_KILL_SCORE | 50 | points |
| RECT_CLEAR_SCORE | 30 | points per cell |
| Bag size | 7 | Standard Tetris Bag7 |

## Game Flow

1. **GameScene.onLoad()** — Build scene hierarchy, attach all components
2. **GameScene.start()** — Init ammo queue, spawn player at (1,4), start game
3. **Gameplay loop** — Input → Tank actions → Projectiles → Collisions → Rect detection → Explosions → Grid decay
4. **Room progression** — Waves of enemies → all cleared → next room
5. **Game Over** — Player HP=0 → save high score → show panel → restart

## Development Notes

- **No external dependencies** — pure Cocos Creator APIs
- **Scene built programmatically** in `GameScene.ts` — not via editor scene files
- **WeChat Mini Game** support: `StorageManager` has `wx.setStorageSync` fallback
- **Object Pool** ready but currently only used for AudioSource channels
- **Pathfinding**: BFS with max 80 steps in `TankAI`
- **Rectangle detection**: Brute-force all possible rects >= 2x2, finds largest first, supports cascading

## Common Tasks

### Adding a new event
1. Add constant to `Constants.ts` under `Events`
2. Emit via `EventManager.instance.emit()`
3. Listen via `EventManager.instance.on()` — always clean up in `onDestroy()`

### Adding a new enemy type
1. Add entry to `TankType` enum in `Constants.ts` with stats
2. Update `EnemyConfig.ts` wave generation logic
3. Optionally customize AI behavior in `EnemyTank.ts`

### Adding a new block shape
1. Add shape definition in `BlockData.ts` (4 rotation states)
2. Add color mapping in `BLOCK_COLORS`
3. `AmmoManager` Bag7 will automatically include it

### Adding a new cell type
1. Add to `CellType` enum in `Constants.ts`
2. Define walkability/destructibility rules in `GridCell.ts`
3. Add rendering color in `GridRenderer.ts`
