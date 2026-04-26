import Phaser from 'phaser';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { StartScene } from './scenes/StartScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 580,
    height: 730,
    parent: 'game-container',
    backgroundColor: '#10121d',
    scene: [StartScene, GameScene, GameOverScene],
    input: {
        mouse: {
            preventDefaultWheel: true
        }
    }
};

new Phaser.Game(config);
