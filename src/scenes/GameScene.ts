import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Ball } from '../objects/Ball';
import { Scoreboard } from '../ui/Scoreboard';
import { VolleyballSimulation } from '../../shared/VolleyballSimulation';
import type { PlayerInput, PlayerSide, GameSnapshot } from '../../shared/types';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  HUD_HEIGHT,
  FLOOR_Y,
  COURT_TOP_Y,
  LEFT_WALL,
  RIGHT_WALL,
  NET_X,
  NET_WIDTH,
  NET_HEIGHT,
  NET_TOP_Y,
  C_BG,
  C_COURT_BORDER,
  C_NET,
  C_NOSE_P1,
  C_NOSE_P2,
  C_HEAD,
} from '../constants';

const TICK_MS = 1000 / 60;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class GameScene extends Phaser.Scene {
  private sim!: VolleyballSimulation;

  private player1!: Player;
  private player2!: Player;
  private ball!: Ball;
  private scoreboard!: Scoreboard;
  private g!: Phaser.GameObjects.Graphics;

  private serveHintText!: Phaser.GameObjects.Text;
  private pointFlashText!: Phaser.GameObjects.Text;

  private keys!: {
    p1Left: Phaser.Input.Keyboard.Key;
    p1Right: Phaser.Input.Keyboard.Key;
    p1Jump: Phaser.Input.Keyboard.Key;
    p2Left: Phaser.Input.Keyboard.Key;
    p2Right: Phaser.Input.Keyboard.Key;
    p2Jump: Phaser.Input.Keyboard.Key;
  };

  private accumulator = 0;
  private pendingJump1 = false;
  private pendingJump2 = false;

  /** State saved just before the last simulation tick — used for render interpolation. */
  private prevSnapshot: GameSnapshot | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.g = this.add.graphics();

    this.player1 = new Player(1, LEFT_WALL + (NET_X - LEFT_WALL) * 0.3, {
      head: C_HEAD,
      nose: C_NOSE_P1,
    });
    this.player2 = new Player(2, NET_X + (RIGHT_WALL - NET_X) * 0.7, {
      head: C_HEAD,
      nose: C_NOSE_P2,
    });
    this.ball = new Ball();

    this.scoreboard = new Scoreboard(this);

    this.serveHintText = this.add
      .text(GAME_WIDTH / 2, COURT_TOP_Y + 18, '', {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#ffff44',
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.pointFlashText = this.add
      .text(GAME_WIDTH / 2, FLOOR_Y - NET_HEIGHT / 2, '', {
        fontSize: '28px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0);

    const kb = this.input.keyboard!;
    this.keys = {
      p1Left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      p1Right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      p1Jump: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      p2Left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      p2Right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      p2Jump: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
    };

    kb.on('keydown-W',  () => { this.pendingJump1 = true; });
    kb.on('keydown-UP', () => { this.pendingJump2 = true; });

    this.sim = new VolleyballSimulation();
    this.accumulator = 0;
    this.prevSnapshot = null;

    this.sim.onPointScored = (_side, label, score, servingPlayer) => {
      this.scoreboard.updateScore(score.p1, score.p2, servingPlayer);
      this.flashPointMessage(label, _side);
    };

    this.sim.onGameOver = (winner, score) => {
      this.time.delayedCall(1400, () => {
        this.scene.start('GameOverScene', { winner, score });
      });
    };

    this.sim.onServeStarted = (servingPlayer) => {
      this.showServeHint(servingPlayer);
      this.pointFlashText.setAlpha(0);
    };

    const initServing = this.sim.getServingPlayer();
    this.scoreboard.updateScore(0, 0, initServing);
    this.showServeHint(initServing);

    this.prevSnapshot = this.sim.getSnapshot();
    this.applySnapshot(this.prevSnapshot);
  }

  update(_time: number, delta: number): void {
    const j1 = this.pendingJump1;
    const j2 = this.pendingJump2;
    this.pendingJump1 = false;
    this.pendingJump2 = false;

    if (this.sim.getMatchState() === 'serve') {
      if (j1 && this.sim.getServingPlayer() === 1) this.serveHintText.setText('');
      if (j2 && this.sim.getServingPlayer() === 2) this.serveHintText.setText('');
    }

    this.accumulator += delta;

    let usedJump1 = false;
    let usedJump2 = false;

    while (this.accumulator >= TICK_MS) {
      // Save state immediately before this tick so we can interpolate toward it
      this.prevSnapshot = this.sim.getSnapshot();

      const p1Input: PlayerInput = {
        left: this.keys.p1Left.isDown,
        right: this.keys.p1Right.isDown,
        jump: j1 && !usedJump1,
      };
      const p2Input: PlayerInput = {
        left: this.keys.p2Left.isDown,
        right: this.keys.p2Right.isDown,
        jump: j2 && !usedJump2,
      };

      usedJump1 = usedJump1 || p1Input.jump;
      usedJump2 = usedJump2 || p2Input.jump;

      this.sim.tick(TICK_MS / 1000, [p1Input, p2Input]);
      this.accumulator -= TICK_MS;
    }

    // Only interpolate during an active rally; outside of it entities are
    // stationary or resetting so we want the exact sim position, not a blend.
    const inRally = this.sim.getMatchState() === 'rally';
    const alpha = inRally ? this.accumulator / TICK_MS : 0;
    this.renderInterpolated(alpha);
    this.drawFrame();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Render interpolation
  // ─────────────────────────────────────────────────────────────────────────────

  private renderInterpolated(alpha: number): void {
    const prev = this.prevSnapshot;
    if (!prev) {
      this.applySnapshot(this.sim.getSnapshot());
      return;
    }

    const p1c = this.sim.player1;
    const p2c = this.sim.player2;
    const bc  = this.sim.ball;
    const p1p = prev.players[0];
    const p2p = prev.players[1];
    const bp  = prev.ball;

    this.player1.x         = lerp(p1p.x, p1c.x, alpha);
    this.player1.y         = lerp(p1p.y, p1c.y, alpha);
    this.player1.facing    = p1c.facing;
    this.player1.isGrounded = p1c.isGrounded;
    this.player1.walkCycle = lerp(p1p.walkCycle, p1c.walkCycle, alpha);

    this.player2.x         = lerp(p2p.x, p2c.x, alpha);
    this.player2.y         = lerp(p2p.y, p2c.y, alpha);
    this.player2.facing    = p2c.facing;
    this.player2.isGrounded = p2c.isGrounded;
    this.player2.walkCycle = lerp(p2p.walkCycle, p2c.walkCycle, alpha);

    this.ball.x          = lerp(bp.x, bc.x, alpha);
    this.ball.y          = lerp(bp.y, bc.y, alpha);
    this.ball.spinAngle  = lerp(bp.spinAngle, bc.spinAngle, alpha);
  }

  private applySnapshot(s: GameSnapshot): void {
    this.player1.loadSnapshot(s.players[0]);
    this.player2.loadSnapshot(s.players[1]);
    this.ball.loadSnapshot(s.ball);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UI helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private flashPointMessage(label: string, side: PlayerSide): void {
    const xPos = side === 1 ? NET_X / 2 : NET_X + (GAME_WIDTH - NET_X) / 2;
    this.pointFlashText.setX(xPos).setText(label).setAlpha(1);
    this.tweens.add({
      targets: this.pointFlashText,
      alpha: 0,
      duration: 800,
      delay: 600,
    });
  }

  private showServeHint(servingPlayer: PlayerSide): void {
    const key = servingPlayer === 1 ? 'W' : '↑';
    this.serveHintText.setText(
      `PLAYER ${servingPlayer} SERVES  —  press ${key} to serve`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────────

  private drawFrame(): void {
    this.g.clear();

    this.g.fillStyle(C_BG);
    this.g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.g.lineStyle(2, C_COURT_BORDER, 1);
    this.g.strokeRect(
      LEFT_WALL,
      COURT_TOP_Y,
      RIGHT_WALL - LEFT_WALL,
      FLOOR_Y - COURT_TOP_Y
    );

    this.g.fillStyle(C_NET);
    this.g.fillRect(NET_X - NET_WIDTH / 2, NET_TOP_Y, NET_WIDTH, NET_HEIGHT);

    this.ball.draw(this.g);
    this.player1.draw(this.g);
    this.player2.draw(this.g);
  }
}
