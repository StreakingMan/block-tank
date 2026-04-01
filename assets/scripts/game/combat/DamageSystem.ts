/**
 * 统一伤害处理系统
 * 处理方块命中、矩形爆炸伤害、地形崩裂伤害
 */
import { _decorator, Component, Node } from 'cc';
import {
    GameEvent, BLOCK_HIT_DAMAGE, TERRAIN_COLLAPSE_DAMAGE,
    GRID_COLS, GRID_ROWS, TerrainOwner
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

    private _checkProjectileCollisions(): void {
        // 获取ProjectileLayer下所有BlockProjectile
        const projLayer = this.node.parent?.getChildByName('ProjectileLayer');
        if (!projLayer) return;

        const projectiles = projLayer.getComponentsInChildren(BlockProjectile);
        for (const proj of projectiles) {
            if (!proj.isAlive) continue;

            const pr = proj.currentGridRow;
            const pc = proj.currentGridCol;

            // 检测是否命中坦克
            if (proj.owner === TerrainOwner.ENEMY && this._playerTank && this._playerTank.isAlive) {
                if (this._playerTank.gridRow === pr && this._playerTank.gridCol === pc) {
                    // 命中玩家
                    GameManager.instance.damagePlayer(BLOCK_HIT_DAMAGE);
                    proj.onHitEntity();
                    continue;
                }
            }

            if (proj.owner === TerrainOwner.PLAYER) {
                for (const enemy of this._enemies) {
                    if (!enemy.isAlive) continue;
                    if (enemy.gridRow === pr && enemy.gridCol === pc) {
                        enemy.takeDamage(BLOCK_HIT_DAMAGE);
                        proj.onHitEntity();
                        break;
                    }
                }
            }
        }
    }

    /** 处理矩形消除后的爆炸伤害 */
    private _handleRectExplosion(data: any): void {
        const { centerRow, centerCol, radius, damage } = data;

        // 对范围内的坦克造成伤害
        if (this._playerTank && this._playerTank.isAlive) {
            const dist = Math.abs(this._playerTank.gridRow - centerRow) + Math.abs(this._playerTank.gridCol - centerCol);
            if (dist <= radius) {
                GameManager.instance.damagePlayer(damage);
            }
        }

        for (const enemy of this._enemies) {
            if (!enemy.isAlive) continue;
            const dist = Math.abs(enemy.gridRow - centerRow) + Math.abs(enemy.gridCol - centerCol);
            if (dist <= radius) {
                enemy.takeDamage(damage);
            }
        }
    }

    /** 处理地形崩裂的保底伤害 */
    private _handleTerrainCollapse(row: number, col: number, damage: number): void {
        // 对相邻格子的坦克造成伤害
        if (this._playerTank && this._playerTank.isAlive) {
            const dist = Math.abs(this._playerTank.gridRow - row) + Math.abs(this._playerTank.gridCol - col);
            if (dist <= 1) {
                GameManager.instance.damagePlayer(damage);
            }
        }

        for (const enemy of this._enemies) {
            if (!enemy.isAlive) continue;
            const dist = Math.abs(enemy.gridRow - row) + Math.abs(enemy.gridCol - col);
            if (dist <= 1) {
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
