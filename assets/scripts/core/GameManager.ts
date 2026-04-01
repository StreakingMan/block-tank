/**
 * 游戏管理器 - 全局单例，控制游戏生命周期与状态
 * HP制、积分、房间流程
 */
import { _decorator, Component, director } from 'cc';
import { GameState, GameEvent, PLAYER_INITIAL_HP } from './Constants';
import { EventManager } from './EventManager';
import { StorageManager } from './StorageManager';

const { ccclass } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    private static _instance: GameManager;

    private _state: GameState = GameState.NONE;
    private _score: number = 0;
    private _highScore: number = 0;
    private _currentRoom: number = 1;
    private _playerHp: number = PLAYER_INITIAL_HP;
    private _playerMaxHp: number = PLAYER_INITIAL_HP;
    private _totalEnemiesKilled: number = 0;

    static get instance(): GameManager {
        return this._instance;
    }

    get state(): GameState { return this._state; }
    get score(): number { return this._score; }
    get highScore(): number { return this._highScore; }
    get currentRoom(): number { return this._currentRoom; }
    get playerHp(): number { return this._playerHp; }
    get playerMaxHp(): number { return this._playerMaxHp; }

    onLoad(): void {
        if (GameManager._instance) {
            this.node.destroy();
            return;
        }
        GameManager._instance = this;
        director.addPersistRootNode(this.node);

        this._highScore = StorageManager.instance.getNumber('high_score', 0);
        this._registerEvents();
    }

    onDestroy(): void {
        EventManager.instance.offTarget(this);
    }

    startGame(): void {
        this._currentRoom = 1;
        this._score = 0;
        this._playerHp = PLAYER_INITIAL_HP;
        this._playerMaxHp = PLAYER_INITIAL_HP;
        this._totalEnemiesKilled = 0;

        this._changeState(GameState.PLAYING);
        EventManager.instance.emit(GameEvent.GAME_START);
    }

    gameOver(): void {
        if (this._state === GameState.GAME_OVER) return;
        this._changeState(GameState.GAME_OVER);

        if (this._score > this._highScore) {
            this._highScore = this._score;
            StorageManager.instance.setNumber('high_score', this._highScore);
        }

        EventManager.instance.emit(GameEvent.GAME_OVER, {
            score: this._score,
            highScore: this._highScore,
            room: this._currentRoom,
            enemiesKilled: this._totalEnemiesKilled,
        });
    }

    restart(): void {
        this._changeState(GameState.NONE);
        EventManager.instance.emit(GameEvent.GAME_RESTART);
        this.startGame();
    }

    addScore(amount: number): void {
        this._score += amount;
        EventManager.instance.emit(GameEvent.SCORE_CHANGED, this._score);
    }

    damagePlayer(damage: number): void {
        this._playerHp = Math.max(0, this._playerHp - damage);
        EventManager.instance.emit(GameEvent.PLAYER_HP_CHANGED, this._playerHp, this._playerMaxHp);
        if (this._playerHp <= 0) {
            EventManager.instance.emit(GameEvent.PLAYER_DEAD);
        }
    }

    healPlayer(amount: number): void {
        this._playerHp = Math.min(this._playerMaxHp, this._playerHp + amount);
        EventManager.instance.emit(GameEvent.PLAYER_HP_CHANGED, this._playerHp, this._playerMaxHp);
    }

    private _changeState(newState: GameState): void {
        const oldState = this._state;
        this._state = newState;
        console.log(`[GameManager] State: ${GameState[oldState]} -> ${GameState[newState]}`);
    }

    private _registerEvents(): void {
        const em = EventManager.instance;

        em.on(GameEvent.ENEMY_KILLED, () => {
            this._totalEnemiesKilled++;
        }, this);

        em.on(GameEvent.PLAYER_DEAD, () => {
            this.scheduleOnce(() => {
                if (this._state === GameState.PLAYING) {
                    this.gameOver();
                }
            }, 1.0);
        }, this);

        em.on(GameEvent.ROOM_CLEARED, () => {
            this._currentRoom++;
        }, this);
    }
}
