import Phaser from 'phaser';
import { SimPlayer } from '../../shared/SimPlayer';
import type { PlayerSide } from '../../shared/types';
import {
  HEAD_RADIUS,
  NOSE_LENGTH,
  LEG_HEIGHT,
  LEG_WIDTH,
  C_LEGS,
  C_EYE_PUPIL,
  C_EYE_SHINE,
} from '../constants';

export type { PlayerSide, Facing } from '../../shared/types';

export interface PlayerColors {
  head: number;
  nose: number;
}

export class Player extends SimPlayer {
  private colors: PlayerColors;

  constructor(playerNum: PlayerSide, startX: number, colors: PlayerColors) {
    super(playerNum, startX);
    this.colors = colors;
  }

  draw(g: Phaser.GameObjects.Graphics): void {
    const { x, y } = this;
    const dir = this.facing === 'right' ? 1 : -1;

    const swing =
      this.isGrounded && Math.abs(this.vx) > 10
        ? Math.sin(this.walkCycle) * 7
        : 0;

    g.fillStyle(C_LEGS);
    const legBaseY = y + HEAD_RADIUS;
    g.fillRect(x - LEG_WIDTH * 1.4, legBaseY, LEG_WIDTH, LEG_HEIGHT + swing);
    g.fillRect(x + LEG_WIDTH * 0.4, legBaseY, LEG_WIDTH, LEG_HEIGHT - swing);

    g.fillStyle(this.colors.head);
    g.fillCircle(x, y, HEAD_RADIUS);

    g.fillStyle(this.colors.nose);
    const noseBaseX = x + dir * HEAD_RADIUS * 0.6;
    const noseTipX = x + dir * (HEAD_RADIUS + NOSE_LENGTH);
    const noseTipY = y + HEAD_RADIUS * 0.1;
    g.fillTriangle(
      noseTipX, noseTipY,
      noseBaseX, y - HEAD_RADIUS * 0.22,
      noseBaseX, y + HEAD_RADIUS * 0.44
    );

    const eyeX = x + dir * HEAD_RADIUS * 0.38;
    const eyeY = y - HEAD_RADIUS * 0.18;
    g.fillStyle(C_EYE_PUPIL);
    g.fillCircle(eyeX, eyeY, 5);
    g.fillStyle(C_EYE_SHINE);
    g.fillCircle(eyeX + dir * 1.5, eyeY - 1.5, 2);
  }
}
