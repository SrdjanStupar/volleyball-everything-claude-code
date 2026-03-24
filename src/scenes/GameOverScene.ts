import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

interface GameOverData {
  winner: 1 | 2;
  score: { p1: number; p2: number };
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, GAME_HEIGHT * 0.28, `PLAYER ${data.winner} WINS!`, {
        fontSize: '42px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT * 0.46, `${data.score.p1}  —  ${data.score.p2}`, {
        fontSize: '30px',
        fontFamily: 'monospace',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, GAME_HEIGHT * 0.68, 'PRESS ANY KEY TO PLAY AGAIN', {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0,
      duration: 480,
      yoyo: true,
      repeat: -1,
    });

    this.time.delayedCall(600, () => {
      this.input.keyboard!.once('keydown', () => {
        this.scene.start('GameScene');
      });
    });
  }
}
