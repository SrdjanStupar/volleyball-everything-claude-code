import Phaser from 'phaser';
import type * as Colyseus from 'colyseus.js';
import { Player } from '../objects/Player';
import { Ball } from '../objects/Ball';
import { Scoreboard } from '../ui/Scoreboard';
import type { Facing, PlayerSide } from '../../shared/types';
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

interface SceneData {
  room: Colyseus.Room;
  slot: 0 | 1;
}

// Maps Colyseus string state to display
const STATE_LABELS: Record<string, string> = {
  serve: 'SERVE',
  rally: '',
  point_over: '',
  game_over: 'GAME OVER',
};

export class OnlineGameScene extends Phaser.Scene {
  private room!: Colyseus.Room;
  private mySlot!: 0 | 1;

  private player1!: Player;
  private player2!: Player;
  private ball!: Ball;
  private scoreboard!: Scoreboard;
  private g!: Phaser.GameObjects.Graphics;

  private serveHintText!: Phaser.GameObjects.Text;
  private pointFlashText!: Phaser.GameObjects.Text;
  private pingText!: Phaser.GameObjects.Text;

  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    jump: Phaser.Input.Keyboard.Key;
  };

  private pendingJump = false;
  private lastSentInput = '';

  /** Timestamp (ms) of the last received server state patch. */
  private lastStateTime = 0;

  constructor() {
    super({ key: 'OnlineGameScene' });
  }

  create(data: SceneData): void {
    this.room = data.room;
    this.mySlot = data.slot ?? 0;

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

    // Ping indicator
    this.pingText = this.add
      .text(GAME_WIDTH - 8, 4, '', {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#444444',
      })
      .setOrigin(1, 0)
      .setDepth(20);

    // Player label: tell the user which player they are
    const playerColor = this.mySlot === 0 ? '#88ccff' : '#ffaacc';
    this.add
      .text(GAME_WIDTH / 2, COURT_TOP_Y + 36, `YOU ARE PLAYER ${this.mySlot + 1}`, {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: playerColor,
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0.7);

    // Keyboard — only the local player's controls
    const kb = this.input.keyboard!;
    if (this.mySlot === 0) {
      this.keys = {
        left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        jump:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      };
      kb.on('keydown-W', () => { this.pendingJump = true; });
    } else {
      this.keys = {
        left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        jump:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      };
      kb.on('keydown-UP', () => { this.pendingJump = true; });
    }

    // Colyseus server events
    this.room.onMessage('game_over', (msg: { winner: PlayerSide; score: { p1: number; p2: number } }) => {
      this.time.delayedCall(1400, () => {
        this.room.leave();
        this.scene.start('GameOverScene', { winner: msg.winner, score: msg.score });
      });
    });

    // State change listeners for UI hints
    this.room.state.listen('matchState', (newVal: string) => {
      this.onMatchStateChanged(newVal);
    });

    this.room.state.listen('servingPlayer', (newVal: number) => {
      if (this.room.state.matchState === 'serve') {
        this.updateServeHint(newVal as PlayerSide);
      }
    });

    // Reset extrapolation clock each time the server pushes a new patch
    this.room.onStateChange(() => {
      this.lastStateTime = performance.now();
    });

    this.lastStateTime = performance.now();

    // Scoreboard initial
    this.scoreboard.updateScore(0, 0, 1);
  }

  update(): void {
    const jump = this.pendingJump;
    this.pendingJump = false;

    const input = {
      left:  this.keys.left.isDown,
      right: this.keys.right.isDown,
      jump,
    };

    // Only send if something changed (or jump is pressed) to reduce traffic
    const serialized = `${input.left}${input.right}${input.jump}`;
    if (serialized !== this.lastSentInput || input.jump) {
      this.room.send('input', input);
      this.lastSentInput = serialized;
    }

    this.applyServerState();
    this.drawFrame();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Apply Colyseus state → render proxies (with forward extrapolation)
  // ─────────────────────────────────────────────────────────────────────────────

  private applyServerState(): void {
    const s = this.room.state;

    // Only extrapolate during an active rally — during serve/point_over/game_over
    // the ball and players are stationary or resetting, so extrapolation would
    // cause visible drift.
    const inRally = s.matchState === 'rally';
    const dt = inRally
      ? Math.min((performance.now() - this.lastStateTime) / 1000, 1 / 30)
      : 0;

    // Extrapolate player positions using last-known velocity
    this.player1.x          = s.player1.x + s.player1.vx * dt;
    this.player1.y          = s.player1.y + s.player1.vy * dt;
    this.player1.vx         = s.player1.vx;
    this.player1.vy         = s.player1.vy;
    this.player1.facing     = s.player1.facing as Facing;
    this.player1.isGrounded = s.player1.isGrounded;
    this.player1.walkCycle  = s.player1.walkCycle + (s.player1.isGrounded && Math.abs(s.player1.vx) > 10 ? dt * 9 : 0);

    this.player2.x          = s.player2.x + s.player2.vx * dt;
    this.player2.y          = s.player2.y + s.player2.vy * dt;
    this.player2.vx         = s.player2.vx;
    this.player2.vy         = s.player2.vy;
    this.player2.facing     = s.player2.facing as Facing;
    this.player2.isGrounded = s.player2.isGrounded;
    this.player2.walkCycle  = s.player2.walkCycle + (s.player2.isGrounded && Math.abs(s.player2.vx) > 10 ? dt * 9 : 0);

    // Extrapolate ball — include gravity so the arc looks right between patches
    this.ball.x         = s.ball.x + s.ball.vx * dt;
    this.ball.y         = s.ball.y + s.ball.vy * dt + 0.5 * 900 * dt * dt;
    this.ball.vx        = s.ball.vx;
    this.ball.vy        = s.ball.vy;
    this.ball.spinAngle = s.ball.spinAngle + (s.ball.vx >= 0 ? 1 : -1) *
                          (Math.sqrt(s.ball.vx ** 2 + s.ball.vy ** 2) / 220) * dt;

    this.scoreboard.updateScore(
      s.score.p1,
      s.score.p2,
      s.servingPlayer as PlayerSide,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // State-change UI reactions
  // ─────────────────────────────────────────────────────────────────────────────

  private onMatchStateChanged(newState: string): void {
    if (newState === 'serve') {
      this.updateServeHint(this.room.state.servingPlayer as PlayerSide);
      this.pointFlashText.setAlpha(0);
    } else if (newState === 'point_over') {
      this.serveHintText.setText('');
      const winningSide = this.room.state.ball.x < NET_X ? 2 : 1;
      this.flashPointMessage('POINT', winningSide as PlayerSide);
    } else if (newState === 'game_over') {
      this.serveHintText.setText('');
    }
  }

  private updateServeHint(servingPlayer: PlayerSide): void {
    const isMe = (servingPlayer - 1) === this.mySlot;
    const keyLabel = this.mySlot === 0 ? 'W' : '↑';
    if (isMe) {
      this.serveHintText.setText(`YOUR SERVE  —  press ${keyLabel}`);
    } else {
      this.serveHintText.setText(`PLAYER ${servingPlayer} SERVES`);
    }
  }

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
