import Phaser from 'phaser';
import * as Colyseus from 'colyseus.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants';

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:2567';

// Unambiguous uppercase alphanumeric alphabet (no O/0, I/1, S/5, etc.)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';
const CODE_LENGTH = 3;

function generateRoomCode(): string {
  return Array.from(
    { length: CODE_LENGTH },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('');
}

export class OnlineLobbyScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private roomCodeText!: Phaser.GameObjects.Text;
  private copyBtn!: Phaser.GameObjects.Text;
  private inputDisplay!: Phaser.GameObjects.Text;
  private typedCode = '';
  private currentCode = '';
  private client!: Colyseus.Client;
  private busy = false;

  constructor() {
    super({ key: 'OnlineLobbyScene' });
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.client = new Colyseus.Client(SERVER_URL);
    this.typedCode = '';
    this.currentCode = '';
    this.busy = false;

    this.add
      .text(cx, GAME_HEIGHT * 0.12, 'ONLINE LOBBY', {
        fontSize: '28px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // ── Create room ───────────────────────────────────────────────────────────

    this.add
      .text(cx - 160, GAME_HEIGHT * 0.28, '[ CREATE ROOM ]', {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#ffff44',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.createRoom())
      .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setColor('#ffffff'); })
      .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setColor('#ffff44'); });

    // ── Join room ─────────────────────────────────────────────────────────────

    this.add
      .text(cx + 160, GAME_HEIGHT * 0.28, '[ JOIN ROOM ]', {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#44ffaa',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.joinRoom())
      .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setColor('#ffffff'); })
      .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setColor('#44ffaa'); });

    // ── Room code display (shown after CREATE) ────────────────────────────────

    this.add
      .text(cx, GAME_HEIGHT * 0.42, 'YOUR ROOM CODE', {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#555555',
      })
      .setOrigin(0.5);

    this.roomCodeText = this.add
      .text(cx, GAME_HEIGHT * 0.51, '', {
        fontSize: '52px',
        fontFamily: 'monospace',
        color: '#ffff44',
        align: 'center',
      })
      .setOrigin(0.5);

    this.copyBtn = this.add
      .text(cx, GAME_HEIGHT * 0.615, '', {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#888888',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.copyRoomCode())
      .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setColor('#ffffff'); })
      .on('pointerout',  function (this: Phaser.GameObjects.Text) { this.setColor('#888888'); });

    // ── Join input ────────────────────────────────────────────────────────────

    this.add
      .text(cx, GAME_HEIGHT * 0.70, 'ENTER CODE TO JOIN', {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#555555',
      })
      .setOrigin(0.5);

    this.inputDisplay = this.add
      .text(cx, GAME_HEIGHT * 0.79, '_ _ _', {
        fontSize: '40px',
        fontFamily: 'monospace',
        color: '#44ffaa',
        letterSpacing: 8,
      })
      .setOrigin(0.5);

    // ── Status ────────────────────────────────────────────────────────────────

    this.statusText = this.add
      .text(cx, GAME_HEIGHT * 0.90, 'Create a room or type a code to join.', {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#666666',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 80 },
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT * 0.97, 'ESC — back to menu', {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#333333',
      })
      .setOrigin(0.5);

    // ── Keyboard ──────────────────────────────────────────────────────────────

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (this.busy) return;

      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        navigator.clipboard.readText().then((text) => {
          this.typedCode = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
          this.updateCodeDisplay();
        }).catch(() => {});
        return;
      }

      if (event.key === 'Backspace') {
        this.typedCode = this.typedCode.slice(0, -1);
      } else if (event.key === 'Enter') {
        this.joinRoom();
        return;
      } else if (event.key === 'Escape') {
        this.scene.start('MenuScene');
        return;
      } else if (/^[a-zA-Z0-9]$/.test(event.key) && this.typedCode.length < CODE_LENGTH) {
        this.typedCode += event.key.toUpperCase();
      }
      this.updateCodeDisplay();
    });

    this.game.canvas.addEventListener('paste', (event: ClipboardEvent) => {
      if (this.busy || !this.scene.isActive('OnlineLobbyScene')) return;
      const text = event.clipboardData?.getData('text') ?? '';
      this.typedCode = text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
      this.updateCodeDisplay();
      event.preventDefault();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────

  private updateCodeDisplay(): void {
    const slots = Array.from({ length: CODE_LENGTH }, (_, i) => this.typedCode[i] ?? '_');
    this.inputDisplay.setText(slots.join(' '));
  }

  private setStatus(msg: string, color = '#666666'): void {
    this.statusText.setText(msg).setColor(color);
  }

  private copyRoomCode(): void {
    if (!this.currentCode) return;
    navigator.clipboard.writeText(this.currentCode).then(() => {
      this.copyBtn.setText('[ ✓ COPIED ]').setColor('#44ffaa');
      this.time.delayedCall(1500, () => {
        this.copyBtn.setText('[ COPY ]').setColor('#888888');
      });
    }).catch(() => {
      this.copyBtn.setText('use Ctrl+C on the code above').setColor('#ff4444');
    });
  }

  private async createRoom(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const code = generateRoomCode();
    this.setStatus('Creating room…', '#ffff44');

    try {
      const room = await this.client.create<Colyseus.Room>('volleyball', { code });

      this.currentCode = code;
      this.roomCodeText.setText(code);
      this.copyBtn.setText('[ COPY ]');
      this.setStatus('Share this code with your opponent.\nWaiting for them to join…', '#ffff44');

      let mySlot: 0 | 1 = 0;
      room.onMessage('slot', (msg: { slot: 0 | 1 }) => { mySlot = msg.slot; });

      room.onMessage('start', () => {
        this.setStatus('Opponent joined! Starting…', '#44ffaa');
        this.time.delayedCall(500, () => {
          this.scene.start('OnlineGameScene', { room, slot: mySlot });
        });
      });
    } catch (err) {
      this.setStatus(`Could not create room: ${(err as Error).message}`, '#ff4444');
      this.busy = false;
    }
  }

  private async joinRoom(): Promise<void> {
    if (this.busy) return;
    const code = this.typedCode.trim();
    if (code.length < CODE_LENGTH) {
      this.setStatus(`Enter a ${CODE_LENGTH}-character code first.`, '#ff4444');
      return;
    }
    this.busy = true;
    this.setStatus(`Joining room ${code}…`, '#44ffaa');

    try {
      const room = await this.client.join<Colyseus.Room>('volleyball', { code });

      let mySlot: 0 | 1 = 1;
      room.onMessage('slot', (msg: { slot: 0 | 1 }) => { mySlot = msg.slot; });

      this.setStatus('Connected! Starting…', '#44ffaa');
      this.time.delayedCall(500, () => {
        this.scene.start('OnlineGameScene', { room, slot: mySlot });
      });
    } catch (err) {
      this.setStatus(`Room not found. Check the code and try again.`, '#ff4444');
      this.busy = false;
    }
  }
}
