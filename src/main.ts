import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { OnlineLobbyScene } from './scenes/OnlineLobbyScene';
import { OnlineGameScene } from './scenes/OnlineGameScene';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#000000',
  scene: [BootScene, MenuScene, GameScene, GameOverScene, OnlineLobbyScene, OnlineGameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // No built-in physics — we roll our own for full control
};

window.addEventListener('load', () => {
  new Phaser.Game(config);
});
