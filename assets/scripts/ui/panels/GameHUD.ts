/**
 * 游戏HUD - 分数/HP/房间号
 * 父节点已定位到屏幕顶部中央，内部元素相对于中心布局
 */
import { _decorator, Component, Node, Label, Graphics, Color, UITransform } from 'cc';
import { GameEvent, DESIGN_WIDTH, HUD_HEIGHT, PLAYER_INITIAL_HP } from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { GameManager } from '../../core/GameManager';

const { ccclass } = _decorator;

@ccclass('GameHUD')
export class GameHUD extends Component {
    private _scoreLabel: Label | null = null;
    private _hpGraphics: Graphics | null = null;
    private _roomLabel: Label | null = null;

    onLoad(): void {
        this._createHUD();
        this._registerEvents();
    }

    onDestroy(): void {
        EventManager.instance.offTarget(this);
    }

    private _createHUD(): void {
        // 背景（全宽横条）
        const bg = new Node('HUDBg');
        bg.parent = this.node;
        bg.setPosition(0, 0, 0);
        const bgTransform = bg.addComponent(UITransform);
        bgTransform.setContentSize(DESIGN_WIDTH, HUD_HEIGHT);
        const bgG = bg.addComponent(Graphics);
        bgG.fillColor = new Color(15, 15, 30, 220);
        bgG.rect(-DESIGN_WIDTH / 2, -HUD_HEIGHT / 2, DESIGN_WIDTH, HUD_HEIGHT);
        bgG.fill();

        // 分数（居中偏上）
        const scoreNode = new Node('Score');
        scoreNode.parent = this.node;
        scoreNode.setPosition(0, 15, 0);
        const scoreTransform = scoreNode.addComponent(UITransform);
        scoreTransform.setContentSize(200, 40);
        this._scoreLabel = scoreNode.addComponent(Label);
        this._scoreLabel.string = 'SCORE: 0';
        this._scoreLabel.fontSize = 22;
        this._scoreLabel.color = new Color(255, 255, 255, 255);

        // HP条（左侧偏下）
        const hpNode = new Node('HP');
        hpNode.parent = this.node;
        hpNode.setPosition(-120, -20, 0);
        hpNode.addComponent(UITransform);
        this._hpGraphics = hpNode.addComponent(Graphics);
        this._drawHP(PLAYER_INITIAL_HP, PLAYER_INITIAL_HP);

        // 房间号（右侧偏下）
        const roomNode = new Node('Room');
        roomNode.parent = this.node;
        roomNode.setPosition(200, -20, 0);
        const roomTransform = roomNode.addComponent(UITransform);
        roomTransform.setContentSize(120, 30);
        this._roomLabel = roomNode.addComponent(Label);
        this._roomLabel.string = 'ROOM 1';
        this._roomLabel.fontSize = 18;
        this._roomLabel.color = new Color(180, 180, 200, 255);
    }

    private _drawHP(current: number, max: number): void {
        if (!this._hpGraphics) return;
        const g = this._hpGraphics;
        g.clear();

        const barWidth = 150;
        const barHeight = 14;
        const x = -barWidth / 2;
        const y = -barHeight / 2;

        g.fillColor = new Color(40, 40, 40, 200);
        g.roundRect(x, y, barWidth, barHeight, 3);
        g.fill();

        const ratio = Math.max(0, current / max);
        const hpColor = ratio > 0.5 ? new Color(60, 200, 60, 255)
            : ratio > 0.25 ? new Color(220, 180, 30, 255)
            : new Color(220, 50, 50, 255);
        g.fillColor = hpColor;
        g.roundRect(x + 1, y + 1, (barWidth - 2) * ratio, barHeight - 2, 2);
        g.fill();

        g.strokeColor = new Color(100, 100, 120, 200);
        g.lineWidth = 1;
        g.roundRect(x, y, barWidth, barHeight, 3);
        g.stroke();
    }

    private _registerEvents(): void {
        const em = EventManager.instance;

        em.on(GameEvent.SCORE_CHANGED, (score: number) => {
            if (this._scoreLabel) {
                this._scoreLabel.string = `SCORE: ${score}`;
            }
        }, this);

        em.on(GameEvent.PLAYER_HP_CHANGED, (hp: number, maxHp: number) => {
            this._drawHP(hp, maxHp);
        }, this);

        em.on(GameEvent.ROOM_CLEARED, () => {
            const gm = GameManager.instance;
            if (this._roomLabel && gm) {
                this._roomLabel.string = `ROOM ${gm.currentRoom}`;
            }
        }, this);

        em.on(GameEvent.GAME_START, () => {
            if (this._scoreLabel) this._scoreLabel.string = 'SCORE: 0';
            if (this._roomLabel) this._roomLabel.string = 'ROOM 1';
            this._drawHP(PLAYER_INITIAL_HP, PLAYER_INITIAL_HP);
        }, this);
    }
}
