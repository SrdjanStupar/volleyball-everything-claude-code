import {
  LEFT_WALL,
  RIGHT_WALL,
  COURT_TOP_Y,
  FLOOR_Y,
  NET_X,
  NET_WIDTH,
  NET_TOP_Y,
  HEAD_RADIUS,
  BALL_RADIUS,
  SERVE_BALL_Y,
  SERVE_BALL_X_P1,
  SERVE_BALL_X_P2,
  BALL_GRAVITY,
  BALL_WALL_BOUNCE,
  BALL_NET_BOUNCE,
  BALL_NET_SIDE_BOUNCE,
  WIN_SCORE,
  MAX_CONSECUTIVE_TOUCHES,
} from '../src/constants';
import { SimPlayer } from './SimPlayer';
import { SimBall } from './SimBall';
import type { PlayerInput, GameSnapshot, MatchState, PlayerSide } from './types';

export class VolleyballSimulation {
  readonly player1: SimPlayer;
  readonly player2: SimPlayer;
  readonly ball: SimBall;

  private score = { p1: 0, p2: 0 };
  private servingPlayer: PlayerSide = 1;
  private matchState: MatchState = 'serve';
  private pointOverTimer = 0;

  /** Called when a point is awarded during a rally. */
  onPointScored?: (winningSide: PlayerSide, label: string, score: { p1: number; p2: number }, servingPlayer: PlayerSide) => void;
  /** Called once when one side reaches WIN_SCORE. */
  onGameOver?: (winner: PlayerSide, score: { p1: number; p2: number }) => void;
  /** Called when a new serve phase begins (after point_over timer). */
  onServeStarted?: (servingPlayer: PlayerSide) => void;

  constructor() {
    this.player1 = new SimPlayer(1, LEFT_WALL + (NET_X - LEFT_WALL) * 0.3);
    this.player2 = new SimPlayer(2, NET_X + (RIGHT_WALL - NET_X) * 0.7);
    this.ball = new SimBall();
    this.servingPlayer = Math.random() < 0.5 ? 1 : 2;
    this.respawnPlayers();
    this.placeBallForServe();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Public API
  // ─────────────────────────────────────────────────────────────────────────────

  tick(dtSeconds: number, inputs: [PlayerInput, PlayerInput]): void {
    const dt = dtSeconds;

    if (this.matchState === 'point_over') {
      this.pointOverTimer -= dt * 1000;
      if (this.pointOverTimer <= 0) {
        this.matchState = 'serve';
        this.respawnPlayers();
        this.placeBallForServe();
        this.onServeStarted?.(this.servingPlayer);
      }
    }

    if (this.matchState !== 'game_over') {
      this.player1.update(dt, inputs[0].left, inputs[0].right, inputs[0].jump);
      this.player2.update(dt, inputs[1].left, inputs[1].right, inputs[1].jump);
    }

    if (this.matchState === 'rally') {
      this.ball.vy += BALL_GRAVITY * dt;
      this.ball.x += this.ball.vx * dt;
      this.ball.y += this.ball.vy * dt;
      this.ball.updateSpin(dt);

      this.ball.hitCooldown[0] = Math.max(0, this.ball.hitCooldown[0] - dt * 1000);
      this.ball.hitCooldown[1] = Math.max(0, this.ball.hitCooldown[1] - dt * 1000);

      this.resolveCollisions();
    }

    if (this.matchState === 'serve') {
      this.checkServeContact();
    }
  }

  getSnapshot(): GameSnapshot {
    return {
      players: [this.player1.getSnapshot(), this.player2.getSnapshot()],
      ball: this.ball.getSnapshot(),
      score: { ...this.score },
      matchState: this.matchState,
      servingPlayer: this.servingPlayer,
      pointOverTimer: this.pointOverTimer,
    };
  }

  loadSnapshot(s: GameSnapshot): void {
    this.player1.loadSnapshot(s.players[0]);
    this.player2.loadSnapshot(s.players[1]);
    this.ball.loadSnapshot(s.ball);
    this.score = { ...s.score };
    this.matchState = s.matchState;
    this.servingPlayer = s.servingPlayer;
    this.pointOverTimer = s.pointOverTimer;
  }

  getServingPlayer(): PlayerSide { return this.servingPlayer; }
  getMatchState(): MatchState { return this.matchState; }
  getScore(): { p1: number; p2: number } { return { ...this.score }; }

  // ─────────────────────────────────────────────────────────────────────────────
  // Collision resolution
  // ─────────────────────────────────────────────────────────────────────────────

  private resolveCollisions(): void {
    const b = this.ball;

    if (b.x - BALL_RADIUS <= LEFT_WALL) {
      b.x = LEFT_WALL + BALL_RADIUS;
      b.vx = Math.abs(b.vx) * BALL_WALL_BOUNCE;
    }
    if (b.x + BALL_RADIUS >= RIGHT_WALL) {
      b.x = RIGHT_WALL - BALL_RADIUS;
      b.vx = -Math.abs(b.vx) * BALL_WALL_BOUNCE;
    }
    if (b.y - BALL_RADIUS <= COURT_TOP_Y) {
      b.y = COURT_TOP_Y + BALL_RADIUS;
      b.vy = Math.abs(b.vy) * BALL_WALL_BOUNCE;
    }
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

    const ballAboveNetTop = b.y - BALL_RADIUS < NET_TOP_Y;
    const approachingDown = b.vy > 0;

    if (ballAboveNetTop && approachingDown) {
      b.y = NET_TOP_Y - BALL_RADIUS;
      b.vy = -Math.abs(b.vy) * BALL_NET_BOUNCE;
      b.vx *= 0.85;
    } else {
      if (b.vx > 0) {
        b.x = netLeft - BALL_RADIUS;
        b.vx = -Math.abs(b.vx) * BALL_NET_SIDE_BOUNCE;
      } else {
        b.x = netRight + BALL_RADIUS;
        b.vx = Math.abs(b.vx) * BALL_NET_SIDE_BOUNCE;
      }
    }
  }

  private resolvePlayerCollision(player: SimPlayer, playerNum: PlayerSide): void {
    const b = this.ball;
    const dx = b.x - player.x;
    const dy = b.y - player.y;
    const distSq = dx * dx + dy * dy;
    const minDist = BALL_RADIUS + HEAD_RADIUS;

    if (distSq >= minDist * minDist || distSq < 1) return;
    if (b.hitCooldown[playerNum - 1] > 0) return;

    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;

    const relVx = b.vx - player.vx;
    const relVy = b.vy - player.vy;
    const closingSpeed = -(relVx * nx + relVy * ny);
    if (closingSpeed <= 0) return;

    if (b.lastTouchedBy === playerNum) {
      b.consecutiveTouches++;
    } else {
      b.consecutiveTouches = 1;
      b.lastTouchedBy = playerNum;
    }

    if (b.consecutiveTouches > MAX_CONSECUTIVE_TOUCHES) {
      const opponent: PlayerSide = playerNum === 1 ? 2 : 1;
      this.awardRally(opponent, `P${playerNum} FAULT`);
      return;
    }

    b.x = player.x + nx * (minDist + 1);
    b.y = player.y + ny * (minDist + 1);

    const hitV = player.getHitVelocity(dx, dy);
    b.vx = hitV.vx;
    b.vy = hitV.vy;
    b.hitCooldown[playerNum - 1] = 250;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Scoring
  // ─────────────────────────────────────────────────────────────────────────────

  private onBallHitFloor(): void {
    const losingSide: PlayerSide = this.ball.x < NET_X ? 1 : 2;
    const winningSide: PlayerSide = losingSide === 1 ? 2 : 1;

    // Park the ball cleanly on the floor so velocity-based extrapolation
    // on the client doesn't push it below the surface during point_over.
    this.ball.y  = FLOOR_Y - BALL_RADIUS;
    this.ball.vy = 0;
    this.ball.vx = 0;

    this.awardRally(winningSide, 'POINT');
  }

  private awardRally(winningSide: PlayerSide, flashLabel: string): void {
    if (this.matchState !== 'rally') return;

    if (winningSide === this.servingPlayer) {
      if (winningSide === 1) this.score.p1++;
      else this.score.p2++;
    } else {
      this.servingPlayer = winningSide;
    }

    this.onPointScored?.(winningSide, flashLabel, { ...this.score }, this.servingPlayer);

    if (this.score.p1 >= WIN_SCORE || this.score.p2 >= WIN_SCORE) {
      this.matchState = 'game_over';
      const winner: PlayerSide = this.score.p1 >= WIN_SCORE ? 1 : 2;
      this.onGameOver?.(winner, { ...this.score });
      return;
    }

    this.matchState = 'point_over';
    this.pointOverTimer = 1600;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Serve helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private checkServeContact(): void {
    const server = this.servingPlayer === 1 ? this.player1 : this.player2;
    const b = this.ball;
    const dx = b.x - server.x;
    const dy = b.y - server.y;
    const minDist = BALL_RADIUS + HEAD_RADIUS;
    if (dx * dx + dy * dy >= minDist * minDist) return;

    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const closingSpeed = server.vx * nx + server.vy * ny;
    if (closingSpeed <= 0) return;

    b.x = server.x + nx * (minDist + 1);
    b.y = server.y + ny * (minDist + 1);
    const hitV = server.getHitVelocity(dx, dy);
    b.vx = hitV.vx;
    b.vy = hitV.vy;
    b.consecutiveTouches = 1;
    b.lastTouchedBy = this.servingPlayer;
    b.hitCooldown[this.servingPlayer - 1] = 250;
    this.matchState = 'rally';
  }

  private placeBallForServe(): void {
    this.ball.x = this.servingPlayer === 1 ? SERVE_BALL_X_P1 : SERVE_BALL_X_P2;
    this.ball.y = SERVE_BALL_Y;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.consecutiveTouches = 0;
    this.ball.lastTouchedBy = null;
    this.ball.hitCooldown[0] = 0;
    this.ball.hitCooldown[1] = 0;
  }

  private respawnPlayers(): void {
    this.player1.respawn();
    this.player2.respawn();
  }
}
