import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, WIN_SCORE } from '../constants';

export class MenuScene extends Phaser.Scene {
  private selectedMode: 'local' | 'online' = 'local';
  private localBtn!: Phaser.GameObjects.Text;
  private onlineBtn!: Phaser.GameObjects.Text;
  private ready = false;

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

    // Mode selector
    this.add
      .text(cx, GAME_HEIGHT * 0.36, 'SELECT MODE', {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#888888',
      })
      .setOrigin(0.5);

    this.localBtn = this.add
      .text(cx - 100, GAME_HEIGHT * 0.46, '[ LOCAL ]', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.setMode('local'))
      .on('pointerover', () => { if (this.selectedMode !== 'local') this.localBtn.setColor('#aaaaaa'); })
      .on('pointerout',  () => this.refreshButtons());

    this.onlineBtn = this.add
      .text(cx + 100, GAME_HEIGHT * 0.46, '[ ONLINE ]', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#555555',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.setMode('online'))
      .on('pointerover', () => { if (this.selectedMode !== 'online') this.onlineBtn.setColor('#aaaaaa'); })
      .on('pointerout',  () => this.refreshButtons());

    this.refreshButtons();

    // Controls legend (local)
    this.add
      .text(cx * 0.5, GAME_HEIGHT * 0.6, 'PLAYER 1', {
        fontSize: '15px',
        fontFamily: 'monospace',
        color: '#88ccff',
      })
      .setOrigin(0.5);

    this.add
      .text(cx * 0.5, GAME_HEIGHT * 0.7, 'A / D  —  move\nW  —  jump / serve', {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#6699cc',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(cx * 1.5, GAME_HEIGHT * 0.6, 'PLAYER 2', {
        fontSize: '15px',
        fontFamily: 'monospace',
        color: '#ffaacc',
      })
      .setOrigin(0.5);

    this.add
      .text(cx * 1.5, GAME_HEIGHT * 0.7, '← / →  —  move\n↑  —  jump / serve', {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#cc8899',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    // Rules
    this.add
      .text(cx, GAME_HEIGHT * 0.85, `first to ${WIN_SCORE}  ·  side-out scoring  ·  max 3 touches`, {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#555555',
      })
      .setOrigin(0.5);

    // Start prompt
    const prompt = this.add
      .text(cx, GAME_HEIGHT * 0.93, 'PRESS ENTER OR CLICK A MODE', {
        fontSize: '15px',
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

    this.time.delayedCall(300, () => {
      this.ready = true;
      this.input.keyboard!.on('keydown-ENTER', () => this.launch());
      this.input.keyboard!.on('keydown-SPACE', () => this.launch());
      this.input.keyboard!.on('keydown-LEFT',  () => { this.setMode('local'); });
      this.input.keyboard!.on('keydown-RIGHT', () => { this.setMode('online'); });
    });
  }

  private setMode(mode: 'local' | 'online'): void {
    this.selectedMode = mode;
    this.refreshButtons();
    if (this.ready) this.launch();
  }

  private refreshButtons(): void {
    this.localBtn.setColor(this.selectedMode === 'local' ? '#ffff44' : '#555555');
    this.onlineBtn.setColor(this.selectedMode === 'online' ? '#ffff44' : '#555555');
  }

  private launch(): void {
    if (this.selectedMode === 'local') {
      this.scene.start('GameScene');
    } else {
      this.scene.start('OnlineLobbyScene');
    }
  }
}
