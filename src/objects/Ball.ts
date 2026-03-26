import Phaser from 'phaser';
import { BALL_RADIUS, C_BALL, C_BALL_LINES } from '../constants';

export class Ball {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;

  consecutiveTouches = 0;
  lastTouchedBy: 1 | 2 | null = null;

  /** Per-player cooldown (ms) — prevents re-contact for the same player right after a hit. */
  readonly hitCooldown: [number, number] = [0, 0]; // index 0 = player 1, index 1 = player 2

  private spinAngle = 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // Physics helpers
  // ─────────────────────────────────────────────────────────────────────────────

  /** Advance the visual spin based on current speed and direction. */
  updateSpin(dt: number): void {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const spinDir = this.vx >= 0 ? 1 : -1;
    this.spinAngle += spinDir * (speed / 220) * dt;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────────

  draw(g: Phaser.GameObjects.Graphics): void {
    const r = BALL_RADIUS;

    // Main ball body
    g.fillStyle(C_BALL);
    g.fillCircle(this.x, this.y, r);

    // Three rotating arcs to mimic volleyball panel seams
    g.lineStyle(1.5, C_BALL_LINES, 0.9);
    for (let i = 0; i < 3; i++) {
      const a = this.spinAngle + (i * Math.PI * 2) / 3;
      g.beginPath();
      g.arc(this.x, this.y, r, a, a + Math.PI, false);
      g.strokePath();
    }
  }
}
