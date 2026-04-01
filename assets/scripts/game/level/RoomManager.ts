/**
 * 房间管理器 - 敌人波次管理 / 房间清除检测
 */
import { _decorator, Component, Node } from 'cc';
import {
    GameEvent, TankType, CellType, GRID_COLS, GRID_ROWS, Direction
} from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { GridManager } from '../grid/GridManager';
import { EnemyTank } from '../tank/EnemyTank';
import { PlayerTank } from '../tank/PlayerTank';
import { DamageSystem } from '../combat/DamageSystem';
import { EnemyConfig, WaveConfig } from '../../data/configs/EnemyConfig';

const { ccclass } = _decorator;

@ccclass('RoomManager')
export class RoomManager extends Component {
    private _enemies: EnemyTank[] = [];
    private _currentWave: number = 0;
    private _waves: WaveConfig[] = [];
    private _tankLayer: Node | null = null;
    private _projectileLayer: Node | null = null;
    private _playerTank: PlayerTank | null = null;
    private _damageSystem: DamageSystem | null = null;
    private _waveTimer: number = 0;
    private _waveDelay: number = 3.0;
    private _waitingForWave: boolean = false;
    private _roomActive: boolean = false;

    setLayers(tankLayer: Node, projectileLayer: Node): void {
        this._tankLayer = tankLayer;
        this._projectileLayer = projectileLayer;
    }

    setPlayerTank(player: PlayerTank): void {
        this._playerTank = player;
    }

    setDamageSystem(ds: DamageSystem): void {
        this._damageSystem = ds;
    }

    onLoad(): void {
        this._registerEvents();
    }

    onDestroy(): void {
        EventManager.instance.offTarget(this);
    }

    /** 开始房间 */
    startRoom(roomNumber: number = 1): void {
        this._clearAllEnemies();
        this._waves = EnemyConfig.getWavesForRoom(roomNumber);
        this._currentWave = 0;
        this._roomActive = true;
        this._spawnInitialTerrain();
        this._startNextWave();
    }

    update(dt: number): void {
        if (!this._roomActive) return;

        // 检查当前波次是否清除
        this._enemies = this._enemies.filter(e => e.isAlive);

        if (this._enemies.length === 0 && !this._waitingForWave) {
            if (this._currentWave >= this._waves.length) {
                // 所有波次清除
                this._roomActive = false;
                EventManager.instance.emit(GameEvent.ROOM_CLEARED);
                return;
            }

            this._waitingForWave = true;
            this._waveTimer = 0;
        }

        if (this._waitingForWave) {
            this._waveTimer += dt;
            if (this._waveTimer >= this._waveDelay) {
                this._waitingForWave = false;
                this._startNextWave();
            }
        }
    }

    private _startNextWave(): void {
        if (this._currentWave >= this._waves.length) return;

        const wave = this._waves[this._currentWave];
        this._currentWave++;

        EventManager.instance.emit(GameEvent.WAVE_START, this._currentWave);

        for (const enemyDef of wave.enemies) {
            this._spawnEnemy(enemyDef.type, enemyDef.row, enemyDef.col);
        }
    }

    private _spawnEnemy(type: TankType, row: number, col: number): void {
        if (!this._tankLayer || !this._projectileLayer) return;

        const gm = GridManager.instance;
        if (!gm.isWalkable(row, col)) {
            // 找附近空位
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (gm.isWalkable(row + dr, col + dc)) {
                        row += dr;
                        col += dc;
                        break;
                    }
                }
            }
        }

        const enemyNode = new Node(`Enemy_${this._enemies.length}`);
        enemyNode.parent = this._tankLayer;

        const enemy = enemyNode.addComponent(EnemyTank);
        enemy.setProjectileLayer(this._projectileLayer);
        if (this._playerTank) enemy.setPlayerRef(this._playerTank);
        enemy.initEnemy(type, row, col);

        this._enemies.push(enemy);
        if (this._damageSystem) {
            this._damageSystem.addEnemy(enemy);
        }
    }

    /** 生成初始地形 */
    private _spawnInitialTerrain(): void {
        const gm = GridManager.instance;

        // 几个砖墙作为初始掩体
        const brickPositions = [
            { r: 4, c: 3 }, { r: 4, c: 4 }, { r: 4, c: 5 }, { r: 4, c: 6 },
            { r: 8, c: 1 }, { r: 8, c: 2 },
            { r: 8, c: 7 }, { r: 8, c: 8 },
            { r: 12, c: 4 }, { r: 12, c: 5 },
        ];

        for (const pos of brickPositions) {
            if (gm.isValidPos(pos.r, pos.c)) {
                gm.setCell(pos.r, pos.c, CellType.BRICK);
            }
        }

        // 钢墙
        const steelPositions = [
            { r: 6, c: 0 }, { r: 6, c: 9 },
            { r: 10, c: 4 }, { r: 10, c: 5 },
        ];
        for (const pos of steelPositions) {
            if (gm.isValidPos(pos.r, pos.c)) {
                gm.setCell(pos.r, pos.c, CellType.STEEL);
            }
        }
    }

    private _clearAllEnemies(): void {
        for (const enemy of this._enemies) {
            if (enemy.node && enemy.node.isValid) {
                enemy.node.destroy();
            }
        }
        this._enemies = [];
        if (this._damageSystem) {
            this._damageSystem.clearEnemies();
        }
    }

    private _registerEvents(): void {
        const em = EventManager.instance;

        em.on(GameEvent.ENEMY_KILLED, (enemy: EnemyTank) => {
            this.removeEnemy(enemy);
        }, this);

        em.on(GameEvent.GAME_RESTART, () => {
            this._clearAllEnemies();
            this._roomActive = false;
        }, this);
    }

    removeEnemy(enemy: EnemyTank): void {
        const idx = this._enemies.indexOf(enemy);
        if (idx >= 0) this._enemies.splice(idx, 1);
        if (this._damageSystem) this._damageSystem.removeEnemy(enemy);
    }
}
