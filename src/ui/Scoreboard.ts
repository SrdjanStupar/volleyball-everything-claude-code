import Phaser from 'phaser';
import { GAME_WIDTH, HUD_HEIGHT } from '../constants';

export class Scoreboard {
  private p1Score: Phaser.GameObjects.Text;
  private p2Score: Phaser.GameObjects.Text;
  private p1ServeDot: Phaser.GameObjects.Text;
  private p2ServeDot: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const cy = HUD_HEIGHT / 2;
    const scoreX1 = 64;
    const scoreX2 = GAME_WIDTH - 64;

    // Title
    scene.add
      .text(GAME_WIDTH / 2, cy, 'ARCADE VOLLEYBALL', {
        fontSize: '17px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Scores
    this.p1Score = scene.add
      .text(scoreX1, cy, '0', {
        fontSize: '22px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.p2Score = scene.add
      .text(scoreX2, cy, '0', {
        fontSize: '22px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Serve indicator dots  (·7 means player 2 is serving with 7 points, like the original)
    this.p1ServeDot = scene.add
      .text(scoreX1 - 14, cy, '·', {
        fontSize: '22px',
        fontFamily: 'monospace',
        color: '#ffff44',
      })
      .setOrigin(0.5);

    this.p2ServeDot = scene.add
      .text(scoreX2 + 14, cy, '·', {
        fontSize: '22px',
        fontFamily: 'monospace',
        color: '#ffff44',
      })
      .setOrigin(0.5);

    this.updateScore(0, 0, 1);
  }

  updateScore(p1: number, p2: number, serving: 1 | 2): void {
    this.p1Score.setText(String(p1));
    this.p2Score.setText(String(p2));
    this.p1ServeDot.setVisible(serving === 1);
    this.p2ServeDot.setVisible(serving === 2);
  }
}
