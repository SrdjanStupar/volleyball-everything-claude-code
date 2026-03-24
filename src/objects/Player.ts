import Phaser from 'phaser';
import {
  HEAD_RADIUS,
  NOSE_LENGTH,
  LEG_HEIGHT,
  LEG_WIDTH,
  PLAYER_FOOT_OFFSET,
  PLAYER_SPEED,
  PLAYER_JUMP_VELOCITY,
  GRAVITY,
  FLOOR_Y,
  LEFT_WALL,
  RIGHT_WALL,
  NET_X,
  HIT_UPWARD_BASE,
  HIT_SIDE_NOSE,
  HIT_PLAYER_MOMENTUM,
  C_LEGS,
  C_EYE_PUPIL,
  C_EYE_SHINE,
} from '../constants';

export type PlayerSide = 1 | 2;
export type Facing = 'left' | 'right';

export interface PlayerColors {
  head: number;
  nose: number;
}

export class Player {
  readonly playerNum: PlayerSide;

  x: number;
  y: number; // centre of the head circle
  vx = 0;
  vy = 0;

  facing: Facing;
  isGrounded = false;

  private colors: PlayerColors;
  private walkCycle = 0; // drives the leg swing animation

  constructor(playerNum: PlayerSide, startX: number, colors: PlayerColors) {
    this.playerNum = playerNum;
    this.x = startX;
    this.y = FLOOR_Y - PLAYER_FOOT_OFFSET;
    this.facing = playerNum === 1 ? 'right' : 'left';
    this.colors = colors;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Physics update  (called every frame from GameScene)
  // ─────────────────────────────────────────────────────────────────────────────

  update(dt: number, moveLeft: boolean, moveRight: boolean, jumpPressed: boolean): void {
    // Horizontal input
    if (moveLeft && !moveRight) {
      this.vx = -PLAYER_SPEED;
      this.facing = 'left';
    } else if (moveRight && !moveLeft) {
      this.vx = PLAYER_SPEED;
      this.facing = 'right';
    } else {
      this.vx = 0;
    }

    // Jump
    if (jumpPressed && this.isGrounded) {
      this.vy = -PLAYER_JUMP_VELOCITY;
      this.isGrounded = false;
    }

    // Gravity
    this.vy += GRAVITY * dt;

    // Integrate position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Clamp to the player's half of the court
    const minX = (this.playerNum === 1 ? LEFT_WALL : NET_X) + HEAD_RADIUS + 2;
    const maxX = (this.playerNum === 1 ? NET_X : RIGHT_WALL) - HEAD_RADIUS - 2;
    this.x = Math.min(Math.max(this.x, minX), maxX);

    // Floor
    const groundHeadY = FLOOR_Y - PLAYER_FOOT_OFFSET;
    if (this.y >= groundHeadY) {
      this.y = groundHeadY;
      this.vy = 0;
      this.isGrounded = true;
    }

    // Leg-swing animation
    if (this.isGrounded && Math.abs(this.vx) > 10) {
      this.walkCycle += dt * 9;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Respawn at default position
  // ─────────────────────────────────────────────────────────────────────────────

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
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Hit calculation  (called when ball touches this player's head)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * dx, dy — vector from player centre to ball centre at moment of contact.
   * Returns the velocity the ball should receive.
   */
  getHitVelocity(dx: number, dy: number): { vx: number; vy: number } {
    const dir = this.facing === 'right' ? 1 : -1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / len; // normal pointing toward ball

    // How aligned is the contact with the nose direction?
    const noseAlignment = nx * dir; // –1…+1

    let vx = this.vx * HIT_PLAYER_MOMENTUM;
    let vy = -HIT_UPWARD_BASE;

    if (noseAlignment > 0.2) {
      // Front (nose) contact — spike: extra horizontal, slightly less upward
      vx += dir * HIT_SIDE_NOSE * noseAlignment;
      if (this.vx * dir > 0) {
        // Moving into the ball → harder spike
        vx += dir * 70;
        vy += 90; // flatter arc
      }
    } else if (dy / len < -0.45) {
      // Top-of-head contact — lob: more upward, less horizontal
      vy -= 110;
      vx *= 0.45;
    }

    return { vx, vy };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────────

  draw(g: Phaser.GameObjects.Graphics): void {
    const { x, y } = this;
    const dir = this.facing === 'right' ? 1 : -1;

    // Leg animation: offset one leg forward, the other back
    const swing = this.isGrounded && Math.abs(this.vx) > 10
      ? Math.sin(this.walkCycle) * 7
      : 0;

    // Legs (drawn behind the head)
    g.fillStyle(C_LEGS);
    const legBaseY = y + HEAD_RADIUS;
    g.fillRect(x - LEG_WIDTH * 1.4, legBaseY, LEG_WIDTH, LEG_HEIGHT + swing);
    g.fillRect(x + LEG_WIDTH * 0.4, legBaseY, LEG_WIDTH, LEG_HEIGHT - swing);

    // Head
    g.fillStyle(this.colors.head);
    g.fillCircle(x, y, HEAD_RADIUS);

    // Nose (large beak)
    g.fillStyle(this.colors.nose);
    const noseBaseX = x + dir * HEAD_RADIUS * 0.6;
    const noseTipX = x + dir * (HEAD_RADIUS + NOSE_LENGTH);
    const noseTipY = y + HEAD_RADIUS * 0.1;
    g.fillTriangle(
      noseTipX, noseTipY,
      noseBaseX, y - HEAD_RADIUS * 0.22,
      noseBaseX, y + HEAD_RADIUS * 0.44
    );

    // Eye (on the nose side, towards the front of the head)
    const eyeX = x + dir * HEAD_RADIUS * 0.38;
    const eyeY = y - HEAD_RADIUS * 0.18;
    g.fillStyle(C_EYE_PUPIL);
    g.fillCircle(eyeX, eyeY, 5);
    g.fillStyle(C_EYE_SHINE);
    g.fillCircle(eyeX + dir * 1.5, eyeY - 1.5, 2);
  }
}
