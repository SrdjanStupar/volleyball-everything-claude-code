import {
  HEAD_RADIUS,
  PLAYER_FOOT_OFFSET,
  PLAYER_SPEED,
  PLAYER_GROUND_SPEED,
  PLAYER_JUMP_VELOCITY,
  GRAVITY,
  FLOOR_Y,
  LEFT_WALL,
  RIGHT_WALL,
  NET_X,
  HIT_BASE_SPEED,
  HIT_PLAYER_MOMENTUM,
} from '../src/constants';
import type { PlayerSide, Facing, PlayerSnapshot } from './types';

export class SimPlayer {
  readonly playerNum: PlayerSide;

  x: number;
  y: number;
  vx = 0;
  vy = 0;

  facing: Facing;
  isGrounded = false;
  walkCycle = 0;

  constructor(playerNum: PlayerSide, startX: number) {
    this.playerNum = playerNum;
    this.x = startX;
    this.y = FLOOR_Y - PLAYER_FOOT_OFFSET;
    this.facing = playerNum === 1 ? 'right' : 'left';
  }

  update(dt: number, moveLeft: boolean, moveRight: boolean, jumpPressed: boolean): void {
    const speed = this.isGrounded ? PLAYER_GROUND_SPEED : PLAYER_SPEED;
    if (moveLeft && !moveRight) {
      this.vx = -speed;
      this.facing = 'left';
    } else if (moveRight && !moveLeft) {
      this.vx = speed;
      this.facing = 'right';
    } else {
      this.vx = 0;
    }

    if (jumpPressed && this.isGrounded) {
      this.vy = -PLAYER_JUMP_VELOCITY;
      this.isGrounded = false;
    }

    this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const minX = (this.playerNum === 1 ? LEFT_WALL : NET_X) + HEAD_RADIUS + 2;
    const maxX = (this.playerNum === 1 ? NET_X : RIGHT_WALL) - HEAD_RADIUS - 2;
    this.x = Math.min(Math.max(this.x, minX), maxX);

    const groundHeadY = FLOOR_Y - PLAYER_FOOT_OFFSET;
    if (this.y >= groundHeadY) {
      this.y = groundHeadY;
      this.vy = 0;
      this.isGrounded = true;
    }

    if (this.isGrounded && Math.abs(this.vx) > 10) {
      this.walkCycle += dt * 9;
    }
  }

  respawn(): void {
    this.x =
      this.playerNum === 1
        ? LEFT_WALL + (NET_X - LEFT_WALL) * 0.3
        : NET_X + (RIGHT_WALL - NET_X) * 0.7;
    this.y = FLOOR_Y - PLAYER_FOOT_OFFSET;
    this.vx = 0;
    this.vy = 0;
    this.isGrounded = true;
    this.facing = this.playerNum === 1 ? 'right' : 'left';
    this.walkCycle = 0;
  }

  getHitVelocity(dx: number, dy: number): { vx: number; vy: number } {
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const vx = nx * HIT_BASE_SPEED + this.vx * HIT_PLAYER_MOMENTUM;
    const vy = ny * HIT_BASE_SPEED + this.vy * HIT_PLAYER_MOMENTUM;
    return { vx, vy };
  }

  getSnapshot(): PlayerSnapshot {
    return {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      facing: this.facing,
      isGrounded: this.isGrounded,
      walkCycle: this.walkCycle,
    };
  }

  loadSnapshot(s: PlayerSnapshot): void {
    this.x = s.x;
    this.y = s.y;
    this.vx = s.vx;
    this.vy = s.vy;
    this.facing = s.facing;
    this.isGrounded = s.isGrounded;
    this.walkCycle = s.walkCycle;
  }
}
