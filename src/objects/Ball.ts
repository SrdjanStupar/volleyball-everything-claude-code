import Phaser from 'phaser';
import { SimBall } from '../../shared/SimBall';
import { BALL_RADIUS, C_BALL, C_BALL_LINES } from '../constants';

export class Ball extends SimBall {
  draw(g: Phaser.GameObjects.Graphics): void {
    const r = BALL_RADIUS;

    g.fillStyle(C_BALL);
    g.fillCircle(this.x, this.y, r);

    g.lineStyle(1.5, C_BALL_LINES, 0.9);
    for (let i = 0; i < 3; i++) {
      const a = this.spinAngle + (i * Math.PI * 2) / 3;
      g.beginPath();
      g.arc(this.x, this.y, r, a, a + Math.PI, false);
      g.strokePath();
    }
  }
}
