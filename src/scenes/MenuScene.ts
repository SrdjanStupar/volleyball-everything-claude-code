import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, WIN_SCORE } from '../constants';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, GAME_HEIGHT * 0.18, 'ARCADE VOLLEYBALL', {
        fontSize: '36px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // Player 1 controls
    this.add
      .text(cx * 0.5, GAME_HEIGHT * 0.42, 'PLAYER 1', {
        fontSize: '15px',
        fontFamily: 'monospace',
        color: '#88ccff',
      })
      .setOrigin(0.5);

    this.add
      .text(cx * 0.5, GAME_HEIGHT * 0.54, 'A / D  —  move\nW  —  jump / serve', {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#6699cc',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    // Player 2 controls
    this.add
      .text(cx * 1.5, GAME_HEIGHT * 0.42, 'PLAYER 2', {
        fontSize: '15px',
        fontFamily: 'monospace',
        color: '#ffaacc',
      })
      .setOrigin(0.5);

    this.add
      .text(cx * 1.5, GAME_HEIGHT * 0.54, '← / →  —  move\n↑  —  jump / serve', {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#cc8899',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    // Rules
    this.add
      .text(cx, GAME_HEIGHT * 0.73, `first to ${WIN_SCORE}  ·  side-out scoring  ·  max 3 touches`, {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#555555',
      })
      .setOrigin(0.5);

    // Blinking start prompt
    const prompt = this.add
      .text(cx, GAME_HEIGHT * 0.86, 'PRESS ANY KEY TO START', {
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

    // Delay slightly so the keydown that opened the menu doesn't immediately start the game
    this.time.delayedCall(300, () => {
      this.input.keyboard!.once('keydown', () => {
        this.scene.start('GameScene');
      });
    });
  }
}
