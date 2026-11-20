import { DungeonMap } from './map.js';
import { Player } from './player.js';
import { AimSystem } from './weapon.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;

const map = new DungeonMap();
const player = new Player(canvas.width / 2, canvas.height / 2);
const aimSystem = new AimSystem(canvas);

// Bia tap ban tam thoi de test Auto-Aim o Chuong 4, se thay bang quai that o Chuong 5
const testTargets = [
  { x: 208, y: 112, radius: 14 },
  { x: 752, y: 208, radius: 14 },
  { x: 464, y: 464, radius: 14 },
];

function drawTestTargets(ctx, targets) {
  for (const target of targets) {
    const r = target.radius;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(target.x, target.y + r, r * 0.8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2a1215';
    ctx.beginPath();
    ctx.arc(target.x, target.y, r + 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.arc(target.x, target.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(target.x, target.y, r * 0.68, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.arc(target.x, target.y, r * 0.36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(target.x) - 1, Math.round(target.y) - 1, 2, 2);
    ctx.restore();
  }
}

let lastTime = null;

function gameLoop(timestamp) {
  if (lastTime === null) {
    lastTime = timestamp;
  }

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  player.update(dt, map);
  aimSystem.update(player, testTargets);
  player.aimAngle = aimSystem.aimAngle;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  map.draw(ctx);
  drawTestTargets(ctx, testTargets);
  player.draw(ctx);
  aimSystem.draw(ctx, player);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
console.log('Game loop initialized');
