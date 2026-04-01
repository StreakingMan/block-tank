---
name: cocos-dev
description: Cocos Creator 3.8 TypeScript development guide based on official documentation. TRIGGER when writing, reviewing, or modifying .ts component files, creating nodes, loading assets, handling events, optimizing UI performance, or working with Cocos Creator APIs.
---

# Cocos Creator 3.8 Development Guide

Reference for Cocos Creator 3.8.x TypeScript development, sourced from official documentation.

## Component Lifecycle

Execution order: `onLoad → onEnable → start → update → lateUpdate → [loop] → onDisable → onDestroy`

| Hook | Timing | Use For |
|------|--------|---------|
| `onLoad()` | Node first activated | Get node references, init resources, setup other components depend on |
| `onEnable()` | `enabled` flips true or node activates | Register event listeners |
| `start()` | Once, before first `update()` | Init state that depends on other components being ready |
| `update(dt)` | Every frame, before animation/physics | Movement, state changes, per-frame logic |
| `lateUpdate(dt)` | After all `update()`, animation, physics | Camera follow, post-animation corrections |
| `onDisable()` | Component/node deactivated | Unregister event listeners |
| `onDestroy()` | `destroy()` called | Final cleanup, release persistent resources |

- Control order with `@executionOrder(-1)` — smaller values execute first
- `onLoad` always runs before any `start` in the scene
- After `destroy()`, node is recycled at frame end — check with `isValid`

## Decorators

```typescript
import { _decorator, Component, Node, Sprite, CCInteger, CCFloat } from 'cc';
const { ccclass, property, menu, executeInEditMode, requireComponent, executionOrder, disallowMultiple } = _decorator;

@ccclass('MyComponent')
@menu('Game/MyComponent')              // Editor component menu path
@requireComponent(Sprite)              // Auto-add dependency
@executionOrder(-1)                    // Execute before default (0)
@disallowMultiple(true)                // One instance per node
export class MyComponent extends Component {

    @property({ type: Node })
    targetNode: Node | null = null;

    @property(CCInteger)
    count: number = 0;

    @property({
        group: { name: 'Settings', id: 'settings', style: 'tab' },
        type: CCFloat
    })
    speed: number = 1.0;

    @property({ visible(this: MyComponent) { return this.count > 0; } })
    bonus: number = 0;
}
```

- `@ccclass` name must be globally unique
- Properties starting with `_` are hidden from Inspector by default
- Always specify `type` for non-primitive properties
- Use `serializable: false` for runtime-only data
- Use `override: true` when subclass redefines parent property

## TypeScript Standards (Official)

**Naming:**
- Variables, functions, instances: `camelCase`
- Classes, modules: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private properties: `_` prefix — `private _firstName: string;`
- File names: official recommends `kebab-case` (e.g. `foo-bar.ts`)

**Key rules:**
- Use `declare` for uninitialized class properties: `public declare a: number;` (avoids hidden `undefined` that hurts performance)
- Use `export type { Foo }` when re-exporting types (`isolatedModules` requirement)
- Const enums are prohibited (due to `isolatedModules`)
- Use `globalThis` instead of `window` or `global` for cross-platform
- 4 spaces indentation, semicolons, single quotes, strict equality (`===`)

**Imports:**
```typescript
// ESM only — CommonJS (require/module.exports) NOT supported
import { Node, Component, _decorator, Vec3, Prefab } from 'cc';
const { ccclass, property } = _decorator;
```

## Node Creation & Destruction

```typescript
// From constructor
const node = new Node('MyNode');
node.setPosition(0, 0, 0);
node.parent = this.node;

// From prefab (recommended for complex nodes)
const node = instantiate(this.prefab);
node.parent = director.getScene();

// Clone existing
const clone = instantiate(existingNode);
clone.parent = scene;
```

**CRITICAL**: Always use `node.destroy()` for cleanup. Never use `removeFromParent()` alone — it does NOT release memory and causes leaks.

## Event System

```typescript
import { EventTarget } from 'cc';

// Custom events via EventTarget
const eventTarget = new EventTarget();
eventTarget.on('event-name', this._handler, this);
eventTarget.off('event-name', this._handler, this);
eventTarget.emit('event-name', arg1, arg2);  // max 5 args for performance
eventTarget.once('event-name', this._handler, this);  // one-time

// Node touch/mouse events
this.node.on(Node.EventType.TOUCH_START, this._onTouch, this);
this.node.on(Node.EventType.TOUCH_END, this._onTouchEnd, this);
this.node.on(Node.EventType.TOUCH_CANCEL, this._onCancel, this);
```

- Always unregister in `onDisable()` / `onDestroy()` with matching `off()` parameters
- Node implements EventTarget but is NOT recommended for custom game events (efficiency)
- `emit()` supports max 5 arguments — more causes performance degradation
- Event propagation: capturing → target → bubbling

## Resource Loading

```typescript
// Static: use @property + editor drag-and-drop (preferred)
@property(Prefab)
myPrefab: Prefab | null = null;

// Dynamic: from resources/ folder only
resources.load('prefabs/enemy', Prefab, (err, prefab) => {
    const node = instantiate(prefab);
    node.parent = this.node;
});

// Preload (download without deserialize — reduces runtime impact)
resources.preload('textures/large-bg', SpriteFrame);

// Remote assets (textures, audio, text only)
assetManager.loadRemote('https://example.com/image.png', (err, asset) => {});
```

**Asset Bundles:**
```typescript
assetManager.loadBundle('my-bundle', (err, bundle) => {
    bundle.load('path/to/asset', Prefab, (err, prefab) => {});
});
// Always release before removing
bundle.releaseAll();
assetManager.removeBundle(bundle);
```

- Do not nest bundles. Do not use reserved names (resources, main, internal, start-scene)
- Higher priority bundles hold shared resources

## Memory Management

**Reference Counting:**
```typescript
// Retain dynamically loaded asset
asset.addRef();
// Release when done
asset.decRef();
myRef = null;
```

- `addRef()` essential for dynamically loaded resources you retain
- Always `decRef()` and nullify references when done
- Enable "Auto Release Assets" per scene for automatic cleanup on scene switch
- Manual release: `assetManager.releaseAsset(asset)` — skips release checks

**Object Pooling:**
```typescript
// Use NodePool for frequently spawned/destroyed objects
const pool = new NodePool();
pool.put(node);          // Return to pool (instead of destroy)
const node = pool.get(); // Reuse (instead of instantiate)
pool.clear();            // Clear before scene switch to prevent leaks
```

## UI Performance Optimization

**Batching rules** (reducing draw calls):
- Batching requires: same material, blend state, depth state, buffer
- Components that **break batching**: `Mask`, `Graphics`, `UIMeshRenderer`
- Structure node tree to keep batchable items adjacent in hierarchy
- Use Auto Atlas and Dynamic Atlas for sprites
- Create bitmap caches for Labels to batch with Sprites
- Minimize `Mask` usage (dramatically increases draw calls)

**Widget optimization:**
- Set `AlignMode` to `ON_WINDOW_RESIZE` (not `ALWAYS`) for scenes with many widgets
- `ALWAYS` mode refreshes alignment every frame and overrides manual position changes

**Canvas:**
- All UI must be under a Canvas node
- Multiple Canvas supported but must NOT be nested
- Rendering order = child node order under Canvas

## Scheduler

```typescript
// Repeat every interval
this.schedule(callback, interval, repeat, delay);
// Every frame
this.schedule(callback, 0);
// Once after delay
this.scheduleOnce(callback, delay);
// Stop
this.unschedule(callback);
this.unscheduleAllCallbacks();
```

## Common Pitfalls

- `removeFromParent()` without `destroy()` → memory leak
- Accessing `this.node` in component constructor → crash (not yet attached)
- Components cannot be instantiated via `new` — must use `addComponent()`
- Forgetting to `off()` event listeners → ghost callbacks after node destroyed
- Using `window.localStorage` directly → breaks on native/mini-game platforms
- `emit()` with >5 args → performance degradation
- Nested Canvas nodes → undefined behavior
- Widget `ALWAYS` mode + manual position changes → position resets every frame
