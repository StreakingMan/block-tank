/**
 * 坦克基类 - 四向移动 / 射程 / HP / 射击构筑
 */
import { _decorator, Component, Vec3, Node, Graphics, Color, UITransform } from 'cc';
import {
    Direction, TankType, GameEvent, DIR_OFFSET, DIR_ANGLE,
    BLOCK_HIT_DAMAGE
} from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { GridManager } from '../grid/GridManager';

const { ccclass } = _decorator;

@ccclass('TankBase')
export class TankBase extends Component {
    tankType: TankType = TankType.PLAYER;

    protected _direction: Direction = Direction.UP;
    protected _gridRow: number = 0;
    protected _gridCol: number = 0;
    protected _speed: number = 4;
    protected _hp: number = 5;
    protected _maxHp: number = 5;
    protected _range: number = 4;
    protected _fireCooldown: number = 0.5;
    protected _fireTimer: number = 0;
    protected _isMoving: boolean = false;
    protected _isInvincible: boolean = false;
    protected _invincibleTimer: number = 0;

    get direction(): Direction { return this._direction; }
    get gridRow(): number { return this._gridRow; }
    get gridCol(): number { return this._gridCol; }
    get hp(): number { return this._hp; }
    get maxHp(): number { return this._maxHp; }
    get range(): number { return this._range; }
    get isAlive(): boolean { return this._hp > 0; }
    get isMoving(): boolean { return this._isMoving; }

    init(row: number, col: number, direction: Direction = Direction.UP): void {
        this._gridRow = row;
        this._gridCol = col;
        this._direction = direction;
        this._hp = this._maxHp;
        this._fireTimer = 0;
        this._isMoving = false;
        this._isInvincible = false;

        this._syncPositionToGrid();
        this._syncRotation();
        this._renderTank();
    }

    tryMove(dir: Direction): boolean {
        if (this._isMoving || !this.isAlive) return false;

        this._direction = dir;
        this._syncRotation();

        const offset = DIR_OFFSET[dir];
        const newRow = this._gridRow + offset.dr;
        const newCol = this._gridCol + offset.dc;

        const grid = GridManager.instance;
        if (!grid || !grid.isWalkable(newRow, newCol)) return false;

        this._gridRow = newRow;
        this._gridCol = newCol;
        this._startMoveAnimation();
        return true;
    }

    /** 持续移动：按住方向键时每帧调用 */
    tryContinuousMove(dir: Direction, dt: number): void {
        if (!this._isMoving) {
            this.tryMove(dir);
        }
    }

    canFire(): boolean {
        return this.isAlive && this._fireTimer <= 0;
    }

    resetFireCooldown(): void {
        this._fireTimer = this._fireCooldown;
    }

    takeDamage(damage: number = 1): boolean {
        if (this._isInvincible || !this.isAlive) return false;

        this._hp -= damage;
        EventManager.instance.emit(GameEvent.TANK_HIT, this);

        if (this._hp <= 0) {
            this._hp = 0;
            this._onDestroyed();
            return true;
        }
        return false;
    }

    setInvincible(duration: number): void {
        this._isInvincible = true;
        this._invincibleTimer = duration;
    }

    update(dt: number): void {
        if (this._fireTimer > 0) {
            this._fireTimer -= dt;
        }

        if (this._isInvincible) {
            this._invincibleTimer -= dt;
            if (this._invincibleTimer <= 0) {
                this._isInvincible = false;
            }
        }
    }

    protected _onDestroyed(): void {
        EventManager.instance.emit(GameEvent.TANK_DESTROYED, this);
    }

    protected _startMoveAnimation(): void {
        this._isMoving = true;
        const gm = GridManager.instance;
        const targetPos = gm.gridToPixel(this._gridRow, this._gridCol);

        const duration = 1 / this._speed;
        const startPos = new Vec3(this.node.position);
        const endPos = new Vec3(targetPos.x, targetPos.y, 0);

        let elapsed = 0;
        const moveAction = (dtFrame: number) => {
            elapsed += dtFrame;
            const t = Math.min(elapsed / duration, 1);
            this.node.setPosition(
                startPos.x + (endPos.x - startPos.x) * t,
                startPos.y + (endPos.y - startPos.y) * t,
                0
            );
            if (t >= 1) {
                this._isMoving = false;
                this.unschedule(moveAction);
            }
        };

        this.schedule(moveAction, 0);
    }

    protected _syncPositionToGrid(): void {
        const gm = GridManager.instance;
        if (!gm) return;
        const pos = gm.gridToPixel(this._gridRow, this._gridCol);
        this.node.setPosition(pos.x, pos.y, 0);
    }

    protected _syncRotation(): void {
        this.node.setRotationFromEuler(0, 0, DIR_ANGLE[this._direction]);
    }

    /** 用Graphics绘制坦克外观（占满一整格） */
    protected _renderTank(): void {
        const gm = GridManager.instance;
        if (!gm) return;
        const size = gm.cellSize;
        const half = size / 2;

        let g = this.node.getComponent(Graphics);
        if (!g) g = this.node.addComponent(Graphics);

        let transform = this.node.getComponent(UITransform);
        if (!transform) transform = this.node.addComponent(UITransform);
        transform.setContentSize(size, size);

        g.clear();

        const isPlayer = this.tankType === TankType.PLAYER;
        const bodyColor = isPlayer
            ? new Color(60, 200, 60, 255)
            : new Color(220, 60, 60, 255);
        const trackColor = isPlayer
            ? new Color(40, 120, 40, 255)
            : new Color(140, 40, 40, 255);
        const turretColor = isPlayer
            ? new Color(80, 240, 80, 255)
            : new Color(255, 90, 60, 255);

        // 履带（左右两条）
        g.fillColor = trackColor;
        g.roundRect(-half + 1, -half + 2, size * 0.22, size - 4, 2);
        g.fill();
        g.roundRect(half - 1 - size * 0.22, -half + 2, size * 0.22, size - 4, 2);
        g.fill();

        // 车体
        g.fillColor = bodyColor;
        g.roundRect(-half * 0.55, -half * 0.75, size * 0.55, size * 0.75, 3);
        g.fill();

        // 炮塔（圆形）
        g.fillColor = turretColor;
        g.circle(0, -half * 0.1, size * 0.2);
        g.fill();

        // 炮管（朝上，会被node旋转）
        g.fillColor = turretColor;
        g.roundRect(-size * 0.07, 0, size * 0.14, half * 0.85, 2);
        g.fill();
    }
}
