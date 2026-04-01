/**
 * 游戏结算面板 - 结算/重开
 * 父节点在canvas下，所有元素相对于屏幕中心(0,0)布局
 */
import { _decorator, Component, Node, Label, Graphics, Color, UITransform } from 'cc';
import { GameEvent, DESIGN_WIDTH, DESIGN_HEIGHT } from '../../core/Constants';
import { EventManager } from '../../core/EventManager';
import { GameManager } from '../../core/GameManager';
import { UIBase } from '../base/UIBase';

const { ccclass } = _decorator;

@ccclass('GameOverPanel')
export class GameOverPanel extends UIBase {
    private _scoreLabel: Label | null = null;
    private _highScoreLabel: Label | null = null;
    private _roomLabel: Label | null = null;

    onLoad(): void {
        this._createPanel();
        this._registerEvents();
        this.hide();
    }

    onDestroy(): void {
        EventManager.instance.offTarget(this);
    }

    private _createPanel(): void {
        // 半透明遮罩（全屏）
        const mask = new Node('Mask');
        mask.parent = this.node;
        mask.setPosition(0, 0, 0);
        const maskTransform = mask.addComponent(UITransform);
        maskTransform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
        const maskG = mask.addComponent(Graphics);
        maskG.fillColor = new Color(0, 0, 0, 160);
        maskG.rect(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT);
        maskG.fill();

        // 面板（屏幕中央偏上）
        const panelW = 400;
        const panelH = 350;
        const panel = new Node('Panel');
        panel.parent = this.node;
        panel.setPosition(0, 50, 0);
        const panelTransform = panel.addComponent(UITransform);
        panelTransform.setContentSize(panelW, panelH);
        const panelG = panel.addComponent(Graphics);
        panelG.fillColor = new Color(25, 25, 50, 240);
        panelG.roundRect(-panelW / 2, -panelH / 2, panelW, panelH, 12);
        panelG.fill();
        panelG.strokeColor = new Color(100, 100, 160, 200);
        panelG.lineWidth = 2;
        panelG.roundRect(-panelW / 2, -panelH / 2, panelW, panelH, 12);
        panelG.stroke();

        // 标题
        const titleNode = new Node('Title');
        titleNode.parent = panel;
        titleNode.setPosition(0, 120, 0);
        titleNode.addComponent(UITransform).setContentSize(300, 50);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = 'GAME OVER';
        titleLabel.fontSize = 36;
        titleLabel.color = new Color(255, 80, 80, 255);

        // 分数
        const scoreNode = new Node('ScoreText');
        scoreNode.parent = panel;
        scoreNode.setPosition(0, 50, 0);
        scoreNode.addComponent(UITransform).setContentSize(300, 35);
        this._scoreLabel = scoreNode.addComponent(Label);
        this._scoreLabel.string = 'Score: 0';
        this._scoreLabel.fontSize = 26;
        this._scoreLabel.color = new Color(255, 255, 255, 255);

        // 最高分
        const highNode = new Node('HighScoreText');
        highNode.parent = panel;
        highNode.setPosition(0, 10, 0);
        highNode.addComponent(UITransform).setContentSize(300, 30);
        this._highScoreLabel = highNode.addComponent(Label);
        this._highScoreLabel.string = 'Best: 0';
        this._highScoreLabel.fontSize = 20;
        this._highScoreLabel.color = new Color(200, 200, 220, 200);

        // 房间
        const roomTextNode = new Node('RoomText');
        roomTextNode.parent = panel;
        roomTextNode.setPosition(0, -30, 0);
        roomTextNode.addComponent(UITransform).setContentSize(300, 30);
        this._roomLabel = roomTextNode.addComponent(Label);
        this._roomLabel.string = 'Room: 1';
        this._roomLabel.fontSize = 20;
        this._roomLabel.color = new Color(200, 200, 220, 200);

        // 重新开始按钮
        const restartBtn = new Node('RestartBtn');
        restartBtn.parent = panel;
        restartBtn.setPosition(0, -100, 0);
        restartBtn.addComponent(UITransform).setContentSize(200, 50);
        const btnG = restartBtn.addComponent(Graphics);
        btnG.fillColor = new Color(60, 160, 60, 230);
        btnG.roundRect(-100, -25, 200, 50, 8);
        btnG.fill();
        btnG.strokeColor = new Color(100, 220, 100, 200);
        btnG.lineWidth = 2;
        btnG.roundRect(-100, -25, 200, 50, 8);
        btnG.stroke();

        const restartLabel = new Node('RestartLabel');
        restartLabel.parent = restartBtn;
        restartLabel.addComponent(UITransform).setContentSize(180, 40);
        const rl = restartLabel.addComponent(Label);
        rl.string = 'RESTART';
        rl.fontSize = 24;
        rl.color = new Color(255, 255, 255, 255);

        restartBtn.on(Node.EventType.TOUCH_START, () => {
            this.hide();
            GameManager.instance?.restart();
        }, this);
    }

    showResult(data: any): void {
        if (this._scoreLabel) this._scoreLabel.string = `Score: ${data.score || 0}`;
        if (this._highScoreLabel) this._highScoreLabel.string = `Best: ${data.highScore || 0}`;
        if (this._roomLabel) this._roomLabel.string = `Room: ${data.room || 1}`;
        this.show();
    }

    private _registerEvents(): void {
        EventManager.instance.on(GameEvent.GAME_OVER, (data: any) => {
            this.scheduleOnce(() => {
                this.showResult(data);
            }, 0.5);
        }, this);
    }
}
