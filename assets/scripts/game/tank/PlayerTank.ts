/**
 * 玩家坦克 - 弹药队列消费者 / 输入响应 / 射击构筑
 */
import { _decorator, Node } from 'cc';
import { TankBase } from './TankBase';
import {
    TankType, Direction, GameEvent, PLAYER_TANK_SPEED,
    PLAYER_INITIAL_HP, PLAYER_INITIAL_RANGE, AmmoMode,
    BlockShape, TerrainOwner, BLOCK_HIT_DAMAGE, TANK_SIZE
} from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { GameManager } from '../../core/GameManager';
import { AmmoManager, AmmoSlot } from '../ammo/AmmoManager';
import { GhostPreview } from '../ammo/GhostPreview';
import { BlockProjectile } from '../ammo/BlockProjectile';
import { GridManager } from '../grid/GridManager';
import { getBlockCells, BLOCK_COLOR_INDEX } from '../ammo/BlockData';

const { ccclass } = _decorator;

@ccclass('PlayerTank')
export class PlayerTank extends TankBase {
    private _ghostPreview: GhostPreview | null = null;
    private _projectileLayer: Node | null = null;
    private _moveDir: Direction | null = null;

    onLoad(): void {
        this.tankType = TankType.PLAYER;
        this._speed = PLAYER_TANK_SPEED;
        this._maxHp = PLAYER_INITIAL_HP;
        this._hp = PLAYER_INITIAL_HP;
        this._range = PLAYER_INITIAL_RANGE;
        this._fireCooldown = 0.4;

        this._registerInputEvents();
    }

    onDestroy(): void {
        EventManager.instance.offTarget(this);
    }

    setGhostPreview(ghost: GhostPreview): void {
        this._ghostPreview = ghost;
    }

    setProjectileLayer(layer: Node): void {
        this._projectileLayer = layer;
    }

    spawn(row: number, col: number): void {
        this.init(row, col, Direction.UP);
        this.node.active = true;
        this.setInvincible(3);
        EventManager.instance.emit(GameEvent.TANK_SPAWNED, this);
        this._updateGhostPreview();
    }

    /** 射击：消耗弹药，发射飞行方块 */
    shoot(): void {
        if (!this.canFire()) return;
        const ammo = AmmoManager.instance.consumeCurrent();
        if (!ammo) return;

        this.resetFireCooldown();

        if (!this._projectileLayer) return;

        const projNode = new Node('Projectile');
        projNode.parent = this._projectileLayer;
        const proj = projNode.addComponent(BlockProjectile);

        // 从 2x2 坦克边缘发射：UP/RIGHT 从高侧出发，DOWN/LEFT 从低侧出发
        let startRow = this._gridRow;
        let startCol = this._gridCol;
        const d = this._direction;
        if (d === Direction.UP) { startRow += TANK_SIZE; }
        else if (d === Direction.DOWN) { startRow -= 1; }
        else if (d === Direction.LEFT) { startCol -= 1; }
        else if (d === Direction.RIGHT) { startCol += TANK_SIZE; }

        proj.fire(
            startRow,
            startCol,
            this._direction,
            ammo.shape,
            ammo.rotation,
            TerrainOwner.PLAYER,
            this._range + 10
        );

        EventManager.instance.emit(GameEvent.PROJECTILE_FIRED, this, ammo);
        this._updateGhostPreview();
    }

    /** 构筑：消耗弹药，在幽灵位置放置地形 */
    build(): void {
        if (!this.canFire()) return;
        if (!this._ghostPreview || !this._ghostPreview.isValid) return;

        const ammo = AmmoManager.instance.currentAmmo;
        if (!ammo) return;

        const cells = getBlockCells(ammo.shape, ammo.rotation);
        const gm = GridManager.instance;
        const targetRow = this._ghostPreview.targetRow;
        const targetCol = this._ghostPreview.targetCol;

        const embedCells: { row: number; col: number }[] = [];
        for (const [dr, dc] of cells) {
            const r = targetRow + dr;
            const c = targetCol + dc;
            if (gm.isValidPos(r, c) && gm.isEmpty(r, c)) {
                embedCells.push({ row: r, col: c });
            }
        }

        if (embedCells.length === 0) return;

        AmmoManager.instance.consumeCurrent();
        this.resetFireCooldown();

        gm.embedBlock(embedCells, TerrainOwner.PLAYER, ammo.shape, BLOCK_COLOR_INDEX[ammo.shape]);
        EventManager.instance.emit(GameEvent.BLOCK_PLACED, embedCells, ammo.shape);
        this._updateGhostPreview();
    }

    update(dt: number): void {
        super.update(dt);

        // 持续移动
        if (this._moveDir !== null && !this._isMoving && this.isAlive) {
            this.tryMove(this._moveDir);
            this._updateGhostPreview();
        }
    }

    protected _onDestroyed(): void {
        super._onDestroyed();
        this.node.active = false;
        GameManager.instance.damagePlayer(this._maxHp); // trigger player dead
    }

    private _updateGhostPreview(): void {
        if (this._ghostPreview) {
            this._ghostPreview.updatePreview(this._gridRow, this._gridCol, this._direction, this._range);
        }
    }

    private _registerInputEvents(): void {
        const em = EventManager.instance;

        em.on(GameEvent.INPUT_MOVE, (dir: Direction) => {
            this._moveDir = dir;
            if (!this._isMoving) {
                this.tryMove(dir);
                this._updateGhostPreview();
            }
        }, this);

        em.on(GameEvent.INPUT_MOVE_END, () => {
            this._moveDir = null;
        }, this);

        em.on(GameEvent.INPUT_SHOOT, () => {
            this.shoot();
        }, this);

        em.on(GameEvent.INPUT_BUILD, () => {
            this.build();
        }, this);

        em.on(GameEvent.INPUT_ROTATE, () => {
            AmmoManager.instance.rotateCurrent();
            this._updateGhostPreview();
        }, this);
    }
}
