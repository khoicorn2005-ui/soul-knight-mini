import { DungeonMap } from './map.js';
import { Player } from './player.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;

const map = new DungeonMap();
const player = new Player(canvas.width / 2, canvas.height / 2);

let lastTime = null;

function gameLoop(timestamp) {
  if (lastTime === null) {
    lastTime = timestamp;
  }

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  player.update(dt, map);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  map.draw(ctx);
  player.draw(ctx);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
console.log('Game loop initialized');
