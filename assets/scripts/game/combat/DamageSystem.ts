/**
 * 统一伤害处理系统
 * 处理方块命中、矩形爆炸伤害、地形崩裂伤害
 */
import { _decorator, Component, Node } from 'cc';
import {
    GameEvent, BLOCK_HIT_DAMAGE, TERRAIN_COLLAPSE_DAMAGE,
    GRID_COLS, GRID_ROWS, TerrainOwner, TANK_SIZE
} from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { GameManager } from '../../core/GameManager';
import { GridManager } from '../grid/GridManager';
import { TankBase } from '../tank/TankBase';
import { PlayerTank } from '../tank/PlayerTank';
import { EnemyTank } from '../tank/EnemyTank';
import { BlockProjectile } from '../ammo/BlockProjectile';
import { RectDetector, RectResult } from './RectDetector';
import { ExplosionManager } from './ExplosionManager';

const { ccclass } = _decorator;

@ccclass('DamageSystem')
export class DamageSystem extends Component {
    private _playerTank: PlayerTank | null = null;
    private _enemies: EnemyTank[] = [];
    private _projectiles: BlockProjectile[] = [];
    private _explosionManager: ExplosionManager | null = null;

    setPlayerTank(tank: PlayerTank): void {
        this._playerTank = tank;
    }

    setExplosionManager(em: ExplosionManager): void {
        this._explosionManager = em;
    }

    addEnemy(enemy: EnemyTank): void {
        this._enemies.push(enemy);
    }

    removeEnemy(enemy: EnemyTank): void {
        const idx = this._enemies.indexOf(enemy);
        if (idx >= 0) this._enemies.splice(idx, 1);
    }

    clearEnemies(): void {
        this._enemies = [];
    }

    onLoad(): void {
        this._registerEvents();
    }

    onDestroy(): void {
        EventManager.instance.offTarget(this);
    }

    update(dt: number): void {
        // 收集场景中活跃的飞行方块
        this._checkProjectileCollisions();
    }

    /** 检测点是否在坦克 2x2 区域内 */
    private _isInsideTank(tank: TankBase, row: number, col: number): boolean {
        return row >= tank.gridRow && row < tank.gridRow + TANK_SIZE
            && col >= tank.gridCol && col < tank.gridCol + TANK_SIZE;
    }

    private _checkProjectileCollisions(): void {
        // 获取ProjectileLayer下所有BlockProjectile
        const projLayer = this.node.parent?.getChildByName('ProjectileLayer');
        if (!projLayer) return;

        const projectiles = projLayer.getComponentsInChildren(BlockProjectile);
        for (const proj of projectiles) {
            if (!proj.isAlive) continue;

            const pr = proj.currentGridRow;
            const pc = proj.currentGridCol;

            // 检测是否命中坦克（2x2 区域判定）
            if (proj.owner === TerrainOwner.ENEMY && this._playerTank && this._playerTank.isAlive) {
                if (this._isInsideTank(this._playerTank, pr, pc)) {
                    GameManager.instance.damagePlayer(BLOCK_HIT_DAMAGE);
                    proj.onHitEntity();
                    continue;
                }
            }

            if (proj.owner === TerrainOwner.PLAYER) {
                for (const enemy of this._enemies) {
                    if (!enemy.isAlive) continue;
                    if (this._isInsideTank(enemy, pr, pc)) {
                        enemy.takeDamage(BLOCK_HIT_DAMAGE);
                        proj.onHitEntity();
                        break;
                    }
                }
            }
        }
    }

    /** 计算点到 2x2 坦克的最短曼哈顿距离 */
    private _distToTank(tank: TankBase, row: number, col: number): number {
        // 计算到坦克占据的 2x2 区域最近边的距离
        const clampedRow = Math.max(tank.gridRow, Math.min(row, tank.gridRow + TANK_SIZE - 1));
        const clampedCol = Math.max(tank.gridCol, Math.min(col, tank.gridCol + TANK_SIZE - 1));
        return Math.abs(row - clampedRow) + Math.abs(col - clampedCol);
    }

    /** 处理矩形消除后的爆炸伤害 */
    private _handleRectExplosion(data: any): void {
        const { centerRow, centerCol, radius, damage } = data;

        if (this._playerTank && this._playerTank.isAlive) {
            if (this._distToTank(this._playerTank, centerRow, centerCol) <= radius) {
                GameManager.instance.damagePlayer(damage);
            }
        }

        for (const enemy of this._enemies) {
            if (!enemy.isAlive) continue;
            if (this._distToTank(enemy, centerRow, centerCol) <= radius) {
                enemy.takeDamage(damage);
            }
        }
    }

    /** 处理地形崩裂的保底伤害 */
    private _handleTerrainCollapse(row: number, col: number, damage: number): void {
        if (this._playerTank && this._playerTank.isAlive) {
            if (this._distToTank(this._playerTank, row, col) <= 1) {
                GameManager.instance.damagePlayer(damage);
            }
        }

        for (const enemy of this._enemies) {
            if (!enemy.isAlive) continue;
            if (this._distToTank(enemy, row, col) <= 1) {
                enemy.takeDamage(damage);
            }
        }
    }

    private _registerEvents(): void {
        const em = EventManager.instance;

        // 地形放置后检测矩形
        em.on(GameEvent.GRID_TERRAIN_PLACED, () => {
            const rects = RectDetector.instance.detectAndClear();
            for (const rect of rects) {
                if (this._explosionManager) {
                    this._explosionManager.createRectExplosion(rect);
                }
                GameManager.instance.addScore(rect.area * 30);
            }
        }, this);

        // 矩形爆炸伤害
        em.on(GameEvent.RECT_EXPLODED, (data: any) => {
            this._handleRectExplosion(data);
        }, this);

        // 地形崩裂伤害
        em.on(GameEvent.GRID_TERRAIN_DECAYED, (row: number, col: number, damage: number) => {
            this._handleTerrainCollapse(row, col, damage);
        }, this);
    }
}
