/**
 * BlockTank - 全局常量与枚举定义
 * 坦克大战 × 俄罗斯方块融合玩法
 */

// ======================== 网格 ========================

/** 网格列数 */
export const GRID_COLS = 10;

/** 网格行数 */
export const GRID_ROWS = 16;

/** 设计分辨率 */
export const DESIGN_WIDTH = 720;
export const DESIGN_HEIGHT = 1280;

/** HUD 区域高度 */
export const HUD_HEIGHT = 100;

/** 底部控制区高度 */
export const CONTROL_HEIGHT = 260;

// ======================== 游戏 ========================

/** 玩家坦克速度（格/秒） */
export const PLAYER_TANK_SPEED = 4;

/** 玩家初始HP */
export const PLAYER_INITIAL_HP = 5;

/** 方块飞行速度（格/秒） */
export const PROJECTILE_SPEED = 12;

/** 玩家初始射程（格） */
export const PLAYER_INITIAL_RANGE = 4;

/** 地形衰减时间（秒） */
export const TERRAIN_DECAY_TIME = 8.0;

/** 地形崩裂保底伤害 */
export const TERRAIN_COLLAPSE_DAMAGE = 1;

/** 击杀敌人得分 */
export const ENEMY_KILL_SCORE = 50;

/** 矩形消除基础得分（每格） */
export const RECT_CLEAR_SCORE_PER_CELL = 30;

/** 方块直接命中伤害 */
export const BLOCK_HIT_DAMAGE = 1;

// ======================== 矩形爆炸 ========================

/** 矩形爆炸范围（格子外扩距离）按矩形面积分级 */
export const EXPLOSION_RADIUS: Record<string, number> = {
    'small': 1,    // 2×2 = 4格
    'medium': 2,   // 2×3/3×2 = 6格
    'large': 3,    // 2×4/4×2/3×3 = 8-9格
    'huge': 5,     // 3×4+ = 12+格
};

/** 矩形爆炸伤害按面积分级 */
export const EXPLOSION_DAMAGE: Record<string, number> = {
    'small': 2,
    'medium': 3,
    'large': 5,
    'huge': 8,
};

// ======================== 枚举 ========================

/** 游戏状态 */
export enum GameState {
    NONE,
    LOADING,
    MENU,
    PLAYING,
    PAUSED,
    GAME_OVER,
}

/** 网格单元格类型 */
export enum CellType {
    EMPTY = 0,
    /** 地形方块（玩家/敌人放置，可衰减） */
    TERRAIN = 1,
    /** 钢墙（不可摧毁） */
    STEEL = 2,
    /** 水域（不可通行） */
    WATER = 3,
    /** 草丛（隐身） */
    GRASS = 4,
    /** 砖墙（可破坏的初始地形） */
    BRICK = 5,
}

/** 地形归属 */
export enum TerrainOwner {
    NONE = 0,
    PLAYER = 1,
    ENEMY = 2,
    MAP = 3,
}

/** 坦克类型 */
export enum TankType {
    PLAYER,
    ENEMY_BASIC,
    ENEMY_FAST,
}

/** 方向 */
export enum Direction {
    UP = 0,
    RIGHT = 1,
    DOWN = 2,
    LEFT = 3,
}

/** 方块形状类型（标准7种） */
export enum BlockShape {
    I = 'I',
    O = 'O',
    T = 'T',
    S = 'S',
    Z = 'Z',
    L = 'L',
    J = 'J',
}

/** 弹药使用模式 */
export enum AmmoMode {
    /** 射击 - 方块飞出伤害敌人 */
    SHOOT,
    /** 构筑 - 方块放置为地形 */
    BUILD,
}

/** UI面板ID */
export enum PanelId {
    GAME_HUD = 'GameHUDPanel',
    GAME_OVER = 'GameOverPanel',
}

/** 游戏事件 */
export enum GameEvent {
    // --- 生命周期 ---
    GAME_INIT = 'GAME_INIT',
    GAME_START = 'GAME_START',
    GAME_PAUSE = 'GAME_PAUSE',
    GAME_RESUME = 'GAME_RESUME',
    GAME_OVER = 'GAME_OVER',
    GAME_RESTART = 'GAME_RESTART',

    // --- 网格 ---
    GRID_CELL_CHANGED = 'GRID_CELL_CHANGED',
    GRID_TERRAIN_PLACED = 'GRID_TERRAIN_PLACED',
    GRID_TERRAIN_DECAYED = 'GRID_TERRAIN_DECAYED',

    // --- 弹药 ---
    AMMO_CHANGED = 'AMMO_CHANGED',
    AMMO_ROTATED = 'AMMO_ROTATED',
    BLOCK_SPAWNED = 'BLOCK_SPAWNED',

    // --- 坦克 ---
    TANK_SPAWNED = 'TANK_SPAWNED',
    TANK_DESTROYED = 'TANK_DESTROYED',
    TANK_HIT = 'TANK_HIT',
    PLAYER_DEAD = 'PLAYER_DEAD',
    PLAYER_HP_CHANGED = 'PLAYER_HP_CHANGED',

    // --- 射击/构筑 ---
    PROJECTILE_FIRED = 'PROJECTILE_FIRED',
    PROJECTILE_HIT = 'PROJECTILE_HIT',
    BLOCK_PLACED = 'BLOCK_PLACED',

    // --- 矩形消除 ---
    RECT_DETECTED = 'RECT_DETECTED',
    RECT_EXPLODED = 'RECT_EXPLODED',

    // --- 战斗 ---
    ENEMY_KILLED = 'ENEMY_KILLED',
    WAVE_START = 'WAVE_START',
    WAVE_CLEARED = 'WAVE_CLEARED',
    ROOM_CLEARED = 'ROOM_CLEARED',
    DAMAGE_DEALT = 'DAMAGE_DEALT',

    // --- 分数 ---
    SCORE_CHANGED = 'SCORE_CHANGED',

    // --- 输入 ---
    INPUT_MOVE = 'INPUT_MOVE',
    INPUT_MOVE_END = 'INPUT_MOVE_END',
    INPUT_SHOOT = 'INPUT_SHOOT',
    INPUT_BUILD = 'INPUT_BUILD',
    INPUT_ROTATE = 'INPUT_ROTATE',
}

/** 方向对应的行列偏移 */
export const DIR_OFFSET: Record<Direction, { dr: number; dc: number }> = {
    [Direction.UP]: { dr: 1, dc: 0 },
    [Direction.DOWN]: { dr: -1, dc: 0 },
    [Direction.LEFT]: { dr: 0, dc: -1 },
    [Direction.RIGHT]: { dr: 0, dc: 1 },
};

/** 方向对应的旋转角度 */
export const DIR_ANGLE: Record<Direction, number> = {
    [Direction.UP]: 0,
    [Direction.RIGHT]: -90,
    [Direction.DOWN]: 180,
    [Direction.LEFT]: 90,
};
