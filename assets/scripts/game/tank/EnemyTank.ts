/**
 * 敌方坦克 - 发射方块的敌人
 * AI驱动，可射击和构筑
 */
import { _decorator, Node } from 'cc';
import { TankBase } from './TankBase';
import {
    TankType, Direction, GameEvent, ENEMY_KILL_SCORE,
    BlockShape, TerrainOwner, TANK_SIZE
} from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { GameManager } from '../../core/GameManager';
import { GridManager } from '../grid/GridManager';
import { BlockProjectile } from '../ammo/BlockProjectile';
import { ALL_SHAPES, getBlockCells, BLOCK_COLOR_INDEX } from '../ammo/BlockData';
import { TankAI } from './TankAI';

const { ccclass } = _decorator;

/** 敌人属性表（网格翻倍后速度和射程翻倍） */
const ENEMY_STATS: Record<number, { speed: number; hp: number; fireCd: number; range: number }> = {
    [TankType.ENEMY_BASIC]: { speed: 4, hp: 2, fireCd: 2.0, range: 12 },
    [TankType.ENEMY_FAST]: { speed: 8, hp: 1, fireCd: 1.5, range: 8 },
};

@ccclass('EnemyTank')
export class EnemyTank extends TankBase {
    private _aiTickInterval: number = 0.5;
    private _aiTickTimer: number = 0;
    private _projectileLayer: Node | null = null;
    private _playerTankRef: TankBase | null = null;

    setProjectileLayer(layer: Node): void {
        this._projectileLayer = layer;
    }

    setPlayerRef(player: TankBase): void {
        this._playerTankRef = player;
    }

    initEnemy(type: TankType, row: number, col: number): void {
        this.tankType = type;

        const stats = ENEMY_STATS[type] ?? ENEMY_STATS[TankType.ENEMY_BASIC];
        this._speed = stats.speed;
        this._maxHp = stats.hp;
        this._hp = stats.hp;
        this._fireCooldown = stats.fireCd;
        this._range = stats.range;

        this.init(row, col, Direction.DOWN);
        EventManager.instance.emit(GameEvent.TANK_SPAWNED, this);
    }

    protected _onDestroyed(): void {
        super._onDestroyed();
        GameManager.instance.addScore(ENEMY_KILL_SCORE);
        EventManager.instance.emit(GameEvent.ENEMY_KILLED, this);
        this.node.active = false;
    }

    update(dt: number): void {
        super.update(dt);
        if (!this.isAlive) return;

        this._aiTickTimer += dt;
        if (this._aiTickTimer >= this._aiTickInterval) {
            this._aiTickTimer = 0;
            this._aiTick();
        }
    }

    private _aiTick(): void {
        if (!this._playerTankRef || !this._playerTankRef.isAlive) {
            this._randomMove();
            return;
        }

        const playerPos = { row: this._playerTankRef.gridRow, col: this._playerTankRef.gridCol };
        const myPos = { row: this._gridRow, col: this._gridCol };

        // 检查视线 - 如果能看到玩家就射击
        const losDir = TankAI.hasLineOfSight(myPos, playerPos);
        if (losDir !== null && this.canFire()) {
            this._direction = losDir;
            this._syncRotation();
            this._fireBlock();
            return;
        }

        // BFS向玩家移动
        const nextDir = TankAI.findNextDirection(myPos, playerPos);
        if (nextDir !== null) {
            this.tryMove(nextDir);
        } else {
            this._randomMove();
        }

        // 随机射击
        if (Math.random() < 0.2 && this.canFire()) {
            this._fireBlock();
        }
    }

    private _fireBlock(): void {
        if (!this.canFire() || !this._projectileLayer) return;
        this.resetFireCooldown();

        const shape = ALL_SHAPES[Math.floor(Math.random() * ALL_SHAPES.length)];
        const rotation = Math.floor(Math.random() * 4);

        const projNode = new Node('EnemyProjectile');
        projNode.parent = this._projectileLayer;
        const proj = projNode.addComponent(BlockProjectile);

        // 从 2x2 坦克边缘发射
        let startRow = this._gridRow;
        let startCol = this._gridCol;
        const d = this._direction;
        if (d === Direction.UP) startRow += TANK_SIZE;
        else if (d === Direction.DOWN) startRow -= 1;
        else if (d === Direction.LEFT) startCol -= 1;
        else if (d === Direction.RIGHT) startCol += TANK_SIZE;

        proj.fire(
            startRow,
            startCol,
            this._direction,
            shape,
            rotation,
            TerrainOwner.ENEMY,
            this._range
        );
    }

    private _randomMove(): void {
        if (this._isMoving) return;
        const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
        const shuffled = dirs.sort(() => Math.random() - 0.5);
        for (const dir of shuffled) {
            if (this.tryMove(dir)) break;
        }
    }
}
