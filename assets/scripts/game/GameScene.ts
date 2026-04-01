/**
 * GameScene - 场景入口，组装所有子系统
 * 挂载到 Canvas 节点上，自动创建场景节点层级
 *
 * 场景层级：
 * Canvas (720×1280)
 * ├── BattleField
 * │   ├── GridContainer (GridManager + GridRenderer)
 * │   ├── GhostLayer
 * │   ├── TankLayer
 * │   ├── ProjectileLayer
 * │   └── EffectLayer
 * ├── UICanvas
 * │   ├── GameHUD
 * │   ├── AmmoPanel
 * │   ├── ControlPanel (DPad + ActionButtons)
 * │   └── GameOverPanel
 * └── Systems (GameManager, InputManager, DamageSystem, RoomManager, ExplosionManager)
 */
import { _decorator, Component, Node } from 'cc';
import { DESIGN_WIDTH, DESIGN_HEIGHT, HUD_HEIGHT, CONTROL_HEIGHT, GameEvent, GameState } from '../core/Constants';
import { EventManager } from '../core/EventManager';
import { GameManager } from '../core/GameManager';
import { GridManager } from './grid/GridManager';
import { GridRenderer } from './grid/GridRenderer';
import { PlayerTank } from './tank/PlayerTank';
import { GhostPreview } from './ammo/GhostPreview';
import { AmmoManager } from './ammo/AmmoManager';
import { InputManager } from './input/InputManager';
import { DamageSystem } from './combat/DamageSystem';
import { ExplosionManager } from './combat/ExplosionManager';
import { RoomManager } from './level/RoomManager';
import { GameHUD } from '../ui/panels/GameHUD';
import { GameOverPanel } from '../ui/panels/GameOverPanel';
import { DPadControl } from '../ui/components/DPadControl';
import { ActionButtons } from '../ui/components/ActionButtons';
import { AmmoQueueDisplay } from '../ui/components/AmmoQueueDisplay';

const { ccclass } = _decorator;

@ccclass('GameScene')
export class GameScene extends Component {
    private _gridManager: GridManager | null = null;
    private _playerTank: PlayerTank | null = null;
    private _roomManager: RoomManager | null = null;

    onLoad(): void {
        this._buildScene();
    }

    start(): void {
        // 初始化弹药系统
        AmmoManager.instance.init();

        // 延迟一帧开始游戏，确保所有组件已初始化
        this.scheduleOnce(() => {
            this._startGame();
        }, 0.1);
    }

    private _buildScene(): void {
        const canvas = this.node;

        // ======================== Systems Node ========================
        const systemsNode = new Node('Systems');
        systemsNode.parent = canvas;

        // GameManager (persist root)
        let gm = GameManager.instance;
        if (!gm) {
            const gmNode = new Node('GameManager');
            gmNode.parent = canvas;
            gm = gmNode.addComponent(GameManager);
        }

        // InputManager
        const inputNode = new Node('InputManager');
        inputNode.parent = systemsNode;
        inputNode.addComponent(InputManager);

        // ======================== BattleField ========================
        const battleField = new Node('BattleField');
        battleField.parent = canvas;

        // GridContainer
        const gridContainer = new Node('GridContainer');
        gridContainer.parent = battleField;
        this._gridManager = gridContainer.addComponent(GridManager);
        gridContainer.addComponent(GridRenderer);

        // GhostLayer
        const ghostLayer = new Node('GhostLayer');
        ghostLayer.parent = battleField;
        const ghostPreview = ghostLayer.addComponent(GhostPreview);

        // TankLayer
        const tankLayer = new Node('TankLayer');
        tankLayer.parent = battleField;

        // ProjectileLayer
        const projectileLayer = new Node('ProjectileLayer');
        projectileLayer.parent = battleField;

        // EffectLayer
        const effectLayer = new Node('EffectLayer');
        effectLayer.parent = battleField;

        // ======================== Combat Systems ========================
        const explosionNode = new Node('ExplosionManager');
        explosionNode.parent = systemsNode;
        const explosionMgr = explosionNode.addComponent(ExplosionManager);
        explosionMgr.setEffectLayer(effectLayer);

        const damageNode = new Node('DamageSystem');
        damageNode.parent = battleField;  // parent to battleField so it can find ProjectileLayer
        const damageSystem = damageNode.addComponent(DamageSystem);
        damageSystem.setExplosionManager(explosionMgr);

        // ======================== Player Tank ========================
        const playerNode = new Node('PlayerTank');
        playerNode.parent = tankLayer;
        this._playerTank = playerNode.addComponent(PlayerTank);
        this._playerTank.setGhostPreview(ghostPreview);
        this._playerTank.setProjectileLayer(projectileLayer);
        damageSystem.setPlayerTank(this._playerTank);

        // ======================== Room Manager ========================
        const roomNode = new Node('RoomManager');
        roomNode.parent = systemsNode;
        this._roomManager = roomNode.addComponent(RoomManager);
        this._roomManager.setLayers(tankLayer, projectileLayer);
        this._roomManager.setPlayerTank(this._playerTank);
        this._roomManager.setDamageSystem(damageSystem);

        // ======================== UI Canvas ========================
        const halfW = DESIGN_WIDTH / 2;
        const halfH = DESIGN_HEIGHT / 2;

        const uiCanvas = new Node('UICanvas');
        uiCanvas.parent = canvas;

        // GameHUD (顶部)
        const hudNode = new Node('GameHUD');
        hudNode.parent = uiCanvas;
        hudNode.setPosition(0, halfH - HUD_HEIGHT / 2, 0);
        hudNode.addComponent(GameHUD);

        // Ammo Panel (左下)
        const ammoPanel = new Node('AmmoPanel');
        ammoPanel.parent = uiCanvas;
        ammoPanel.setPosition(-halfW + 50, -halfH + CONTROL_HEIGHT / 2, 0);
        ammoPanel.addComponent(AmmoQueueDisplay);

        // Control Panel - DPad (左下方)
        const dpadNode = new Node('DPadControl');
        dpadNode.parent = uiCanvas;
        dpadNode.setPosition(-halfW + 190, -halfH + CONTROL_HEIGHT / 2 - 10, 0);
        dpadNode.addComponent(DPadControl);

        // Control Panel - Action Buttons (右下方)
        const actionsNode = new Node('ActionButtons');
        actionsNode.parent = uiCanvas;
        actionsNode.setPosition(halfW - 120, -halfH + CONTROL_HEIGHT / 2, 0);
        actionsNode.addComponent(ActionButtons);

        // GameOver Panel
        const gameOverNode = new Node('GameOverPanel');
        gameOverNode.parent = uiCanvas;
        gameOverNode.addComponent(GameOverPanel);

        // ======================== Event: Restart ========================
        EventManager.instance.on(GameEvent.GAME_RESTART, () => {
            this.scheduleOnce(() => {
                this._startGame();
            }, 0.1);
        }, this);
    }

    private _startGame(): void {
        if (!this._gridManager || !this._playerTank || !this._roomManager) return;

        // 重置网格
        this._gridManager.reset();

        // 初始化弹药
        AmmoManager.instance.init();

        // 生成玩家坦克（网格翻倍后位置对应调整）
        this._playerTank.spawn(2, 9);

        // 开始游戏
        GameManager.instance.startGame();

        // 开始房间
        this._roomManager.startRoom(1);

        // 启动地形衰减更新
        this.schedule(this._updateDecay, 0);
    }

    private _updateDecay(dt: number): void {
        if (GameManager.instance?.state !== GameState.PLAYING) return;
        this._gridManager?.updateDecay(dt);
    }
}
