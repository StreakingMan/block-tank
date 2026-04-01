/**
 * 敌人配置 - 波次定义
 */
import { TankType, GRID_COLS, GRID_ROWS } from '../../core/Constants';

export interface EnemyDef {
    type: TankType;
    row: number;
    col: number;
}

export interface WaveConfig {
    enemies: EnemyDef[];
}

export class EnemyConfig {
    /**
     * 获取指定房间的波次配置
     */
    static getWavesForRoom(roomNumber: number): WaveConfig[] {
        // Demo：简单的波次配置，房间越大敌人越多
        const baseCount = Math.min(2 + Math.floor(roomNumber / 2), 6);

        const waves: WaveConfig[] = [];

        // 第一波
        const wave1: EnemyDef[] = [];
        for (let i = 0; i < Math.min(baseCount, 3); i++) {
            wave1.push({
                type: TankType.ENEMY_BASIC,
                row: GRID_ROWS - 2,
                col: 2 + i * 3,
            });
        }
        waves.push({ enemies: wave1 });

        // 第二波（如果敌人数量足够）
        if (baseCount > 3) {
            const wave2: EnemyDef[] = [];
            for (let i = 0; i < baseCount - 3; i++) {
                wave2.push({
                    type: i % 2 === 0 ? TankType.ENEMY_FAST : TankType.ENEMY_BASIC,
                    row: GRID_ROWS - 2,
                    col: 1 + i * 4,
                });
            }
            waves.push({ enemies: wave2 });
        }

        return waves;
    }
}
