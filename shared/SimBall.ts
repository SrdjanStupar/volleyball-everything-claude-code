import type { PlayerSide, BallSnapshot } from './types';

export class SimBall {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;

  consecutiveTouches = 0;
  lastTouchedBy: PlayerSide | null = null;

  /** Per-player cooldown (ms) — prevents re-contact for the same player right after a hit. */
  readonly hitCooldown: [number, number] = [0, 0];

  spinAngle = 0;

  updateSpin(dt: number): void {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const spinDir = this.vx >= 0 ? 1 : -1;
    this.spinAngle += spinDir * (speed / 220) * dt;
  }

  getSnapshot(): BallSnapshot {
    return {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      spinAngle: this.spinAngle,
      consecutiveTouches: this.consecutiveTouches,
      lastTouchedBy: this.lastTouchedBy,
      hitCooldown: [this.hitCooldown[0], this.hitCooldown[1]],
    };
  }

  loadSnapshot(s: BallSnapshot): void {
    this.x = s.x;
    this.y = s.y;
    this.vx = s.vx;
    this.vy = s.vy;
    this.spinAngle = s.spinAngle;
    this.consecutiveTouches = s.consecutiveTouches;
    this.lastTouchedBy = s.lastTouchedBy;
    this.hitCooldown[0] = s.hitCooldown[0];
    this.hitCooldown[1] = s.hitCooldown[1];
  }
}
