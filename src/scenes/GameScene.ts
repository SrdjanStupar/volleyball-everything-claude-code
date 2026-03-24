import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { Ball } from '../objects/Ball';
import { Scoreboard } from '../ui/Scoreboard';
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
  HEAD_RADIUS,
  BALL_RADIUS,
  PLAYER_FOOT_OFFSET,
  SERVE_BALL_Y,
  SERVE_BALL_X_P1,
  SERVE_BALL_X_P2,
  BALL_GRAVITY,
  BALL_WALL_BOUNCE,
  BALL_NET_BOUNCE,
  BALL_NET_SIDE_BOUNCE,
  WIN_SCORE,
  MAX_CONSECUTIVE_TOUCHES,
  C_BG,
  C_COURT_BORDER,
  C_NET,
  C_NOSE_P1,
  C_NOSE_P2,
  C_HEAD,
} from '../constants';

type GameState = 'serve' | 'rally' | 'point_over' | 'game_over';

export class GameScene extends Phaser.Scene {
  private player1!: Player;
  private player2!: Player;
  private ball!: Ball;
  private scoreboard!: Scoreboard;
  private g!: Phaser.GameObjects.Graphics;

  private score = { p1: 0, p2: 0 };
  private servingPlayer: 1 | 2 = 1;
  private gameState: GameState = 'serve';
  private pointOverTimer = 0;

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

    this.score = { p1: 0, p2: 0 };
    this.servingPlayer = 1;
    this.gameState = 'serve';
    this.respawnPlayers();
    this.placeBallForServe();
    this.showServeHint();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    const p1Jump = Phaser.Input.Keyboard.JustDown(this.keys.p1Jump);
    const p2Jump = Phaser.Input.Keyboard.JustDown(this.keys.p2Jump);

    const p1Input = {
      left: this.keys.p1Left.isDown,
      right: this.keys.p1Right.isDown,
      jump: p1Jump,
    };
    const p2Input = {
      left: this.keys.p2Left.isDown,
      right: this.keys.p2Right.isDown,
      jump: p2Jump,
    };

    // ── Serve trigger ──────────────────────────────────────────────────────────
    // The server jumps toward the stationary ball; the rally only begins when
    // the player's head physically contacts the ball (checkServeContact below).
    if (this.gameState === 'serve') {
      const serverPressed =
        (this.servingPlayer === 1 && p1Input.jump) ||
        (this.servingPlayer === 2 && p2Input.jump);
      if (serverPressed) {
        this.serveHintText.setText('');
      }
    }

    // ── Point-over cooldown ────────────────────────────────────────────────────
    if (this.gameState === 'point_over') {
      this.pointOverTimer -= delta;
      if (this.pointOverTimer <= 0) {
        this.gameState = 'serve';
        this.respawnPlayers();
        this.placeBallForServe();
        this.showServeHint();
        this.pointFlashText.setAlpha(0);
      }
    }

    // ── Player updates (always except game_over) ───────────────────────────────
    if (this.gameState !== 'game_over') {
      this.player1.update(dt, p1Input.left, p1Input.right, p1Input.jump);
      this.player2.update(dt, p2Input.left, p2Input.right, p2Input.jump);
    }

    // ── Ball physics + collisions ─────────────────────────────────────────────
    if (this.gameState === 'rally') {
      this.ball.vy += BALL_GRAVITY * dt;
      this.ball.x += this.ball.vx * dt;
      this.ball.y += this.ball.vy * dt;
      this.ball.updateSpin(dt);
      this.resolveCollisions();
    }

    // During serve the ball is stationary; start the rally only on actual contact.
    if (this.gameState === 'serve') {
      this.checkServeContact();
    }

    this.drawFrame();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Collision resolution
  // ─────────────────────────────────────────────────────────────────────────────

  private resolveCollisions(): void {
    const b = this.ball;

    // Left wall
    if (b.x - BALL_RADIUS <= LEFT_WALL) {
      b.x = LEFT_WALL + BALL_RADIUS;
      b.vx = Math.abs(b.vx) * BALL_WALL_BOUNCE;
    }
    // Right wall
    if (b.x + BALL_RADIUS >= RIGHT_WALL) {
      b.x = RIGHT_WALL - BALL_RADIUS;
      b.vx = -Math.abs(b.vx) * BALL_WALL_BOUNCE;
    }
    // Ceiling
    if (b.y - BALL_RADIUS <= COURT_TOP_Y) {
      b.y = COURT_TOP_Y + BALL_RADIUS;
      b.vy = Math.abs(b.vy) * BALL_WALL_BOUNCE;
    }
    // Floor → point scored
    if (b.y + BALL_RADIUS >= FLOOR_Y) {
      this.onBallHitFloor();
      return;
    }

    this.resolveNetCollision();
    this.resolvePlayerCollision(this.player1, 1);
    this.resolvePlayerCollision(this.player2, 2);
  }

  private resolveNetCollision(): void {
    const b = this.ball;
    const netLeft = NET_X - NET_WIDTH / 2;
    const netRight = NET_X + NET_WIDTH / 2;

    const overlapX = b.x + BALL_RADIUS > netLeft && b.x - BALL_RADIUS < netRight;
    const overlapY = b.y + BALL_RADIUS > NET_TOP_Y && b.y - BALL_RADIUS < FLOOR_Y;

    if (!overlapX || !overlapY) return;

    // Estimate which face was hit: compare ball approach to net top vs sides
    const ballAboveNetTop = b.y - BALL_RADIUS < NET_TOP_Y;
    const approachingDown = b.vy > 0;

    if (ballAboveNetTop && approachingDown) {
      // Hit the top of the net
      b.y = NET_TOP_Y - BALL_RADIUS;
      b.vy = -Math.abs(b.vy) * BALL_NET_BOUNCE;
      b.vx *= 0.85;
    } else {
      // Hit the side of the net — push back to the side the ball came from
      if (b.vx > 0) {
        b.x = netLeft - BALL_RADIUS;
        b.vx = -Math.abs(b.vx) * BALL_NET_SIDE_BOUNCE;
      } else {
        b.x = netRight + BALL_RADIUS;
        b.vx = Math.abs(b.vx) * BALL_NET_SIDE_BOUNCE;
      }
    }
  }

  private resolvePlayerCollision(player: Player, playerNum: 1 | 2): void {
    const b = this.ball;
    const dx = b.x - player.x;
    const dy = b.y - player.y;
    const distSq = dx * dx + dy * dy;
    const minDist = BALL_RADIUS + HEAD_RADIUS;

    if (distSq >= minDist * minDist || distSq < 1) return;

    const dist = Math.sqrt(distSq);

    // Track consecutive touches
    if (b.lastTouchedBy === playerNum) {
      b.consecutiveTouches++;
    } else {
      b.consecutiveTouches = 1;
      b.lastTouchedBy = playerNum;
    }

    // 4th consecutive touch = fault
    if (b.consecutiveTouches > MAX_CONSECUTIVE_TOUCHES) {
      const opponent: 1 | 2 = playerNum === 1 ? 2 : 1;
      this.awardRally(opponent, `P${playerNum} FAULT`);
      return;
    }

    // Separate ball from player head
    const nx = dx / dist;
    const ny = dy / dist;
    b.x = player.x + nx * (minDist + 1);
    b.y = player.y + ny * (minDist + 1);

    // Apply hit velocity
    const hitV = player.getHitVelocity(dx, dy);
    b.vx = hitV.vx;
    b.vy = hitV.vy;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Scoring
  // ─────────────────────────────────────────────────────────────────────────────

  private onBallHitFloor(): void {
    // The side the ball lands on LOSES the rally
    const losingSide: 1 | 2 = this.ball.x < NET_X ? 1 : 2;
    const winningSide: 1 | 2 = losingSide === 1 ? 2 : 1;
    this.awardRally(winningSide, 'POINT');
  }

  /**
   * winningSide won the rally.
   * Side-out scoring: only the server scores a point.
   * If receiver wins, they get the serve but no point.
   */
  private awardRally(winningSide: 1 | 2, flashLabel: string): void {
    if (this.gameState !== 'rally') return;

    if (winningSide === this.servingPlayer) {
      // Server won → +1 point, keep serve
      if (winningSide === 1) this.score.p1++;
      else this.score.p2++;
    } else {
      // Receiver won → gain serve, no point
      this.servingPlayer = winningSide;
    }

    this.scoreboard.updateScore(this.score.p1, this.score.p2, this.servingPlayer);
    this.flashPointMessage(flashLabel, winningSide);

    // Check win
    if (this.score.p1 >= WIN_SCORE || this.score.p2 >= WIN_SCORE) {
      this.gameState = 'game_over';
      const winner = this.score.p1 >= WIN_SCORE ? 1 : 2;
      this.time.delayedCall(1400, () => {
        this.scene.start('GameOverScene', {
          winner,
          score: { p1: this.score.p1, p2: this.score.p2 },
        });
      });
      return;
    }

    this.gameState = 'point_over';
    this.pointOverTimer = 1600;
    this.serveHintText.setText('');
  }

  private flashPointMessage(label: string, side: 1 | 2): void {
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
  // Serve helpers
  // ─────────────────────────────────────────────────────────────────────────────

  /** Ball stays still until the server's head physically reaches it. */
  private checkServeContact(): void {
    const server = this.servingPlayer === 1 ? this.player1 : this.player2;
    const b = this.ball;
    const dx = b.x - server.x;
    const dy = b.y - server.y;
    const minDist = BALL_RADIUS + HEAD_RADIUS;

    if (dx * dx + dy * dy >= minDist * minDist) return;

    // Separate ball from head
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    b.x = server.x + (dx / dist) * (minDist + 1);
    b.y = server.y + (dy / dist) * (minDist + 1);

    // Hit velocity from the player's position and facing direction
    const hitV = server.getHitVelocity(dx, dy);
    b.vx = hitV.vx;
    b.vy = hitV.vy;
    b.consecutiveTouches = 1;
    b.lastTouchedBy = this.servingPlayer;

    this.gameState = 'rally';
    this.serveHintText.setText('');
  }

  private placeBallForServe(): void {
    this.ball.x = this.servingPlayer === 1 ? SERVE_BALL_X_P1 : SERVE_BALL_X_P2;
    this.ball.y = SERVE_BALL_Y;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.consecutiveTouches = 0;
    this.ball.lastTouchedBy = null;
  }

  private respawnPlayers(): void {
    this.player1.respawn();
    this.player2.respawn();
  }

  private showServeHint(): void {
    const key = this.servingPlayer === 1 ? 'W' : '↑';
    this.serveHintText.setText(
      `PLAYER ${this.servingPlayer} SERVES  —  press ${key} to serve`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rendering  (all drawing goes through the single Graphics object)
  // ─────────────────────────────────────────────────────────────────────────────

  private drawFrame(): void {
    this.g.clear();

    // Background
    this.g.fillStyle(C_BG);
    this.g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Court border
    this.g.lineStyle(2, C_COURT_BORDER, 1);
    this.g.strokeRect(
      LEFT_WALL,
      COURT_TOP_Y,
      RIGHT_WALL - LEFT_WALL,
      FLOOR_Y - COURT_TOP_Y
    );

    // Net
    this.g.fillStyle(C_NET);
    this.g.fillRect(NET_X - NET_WIDTH / 2, NET_TOP_Y, NET_WIDTH, NET_HEIGHT);

    // Ball
    this.ball.draw(this.g);

    // Players
    this.player1.draw(this.g);
    this.player2.draw(this.g);
  }
}
