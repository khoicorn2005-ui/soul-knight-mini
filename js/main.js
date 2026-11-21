import { DungeonMap } from './map.js';
import { Player } from './player.js';
import { AimSystem } from './weapon.js';
import { BulletManager } from './bullet.js';
import { EnemyManager } from './enemy.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;

const map = new DungeonMap();
const player = new Player(canvas.width / 2, canvas.height / 2, canvas);
const aimSystem = new AimSystem(canvas);
const bulletManager = new BulletManager();
const enemyManager = new EnemyManager();

enemyManager.spawnTestWave(map, player);

// Phim test tam thoi o Chuong 5 de goi lai quai, se bo khi lam vong lap phong o Chuong 6
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyN' && !e.repeat) {
      enemyManager.spawnTestWave(map, player);
    }
  });
}

function drawEnemyCounter(ctx, count) {
  const label = `Quái: ${count} | [N: Sinh lại quái]`;

  ctx.save();
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText
    ? ctx.measureText(label).width
    : label.length * 7;
  const width = Math.ceil(textWidth) + 16;
  const height = 22;
  const x = canvas.width - width - 10;
  const y = 5;

  ctx.fillStyle = 'rgba(14, 16, 26, 0.78)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = count > 0 ? '#e53935' : '#66bb6a';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

  ctx.fillStyle = count > 0 ? '#ffcdd2' : '#c8e6c9';
  ctx.fillText(label, x + 8, y + height / 2);
  ctx.restore();
}

function drawHud(ctx, player) {
  const panelX = 10;
  const panelWidth = 286;
  const panelHeight = 54;
  const panelY = canvas.height - panelHeight - 10;
  const padding = 6;
  const margin = 30;

  const isPlayerNearHud =
    player.x >= panelX - margin &&
    player.x <= panelX + panelWidth + margin &&
    player.y >= panelY - margin &&
    player.y <= panelY + panelHeight + margin;

  ctx.save();
  // Tự làm mờ HUD khi nhân vật đi gần hoặc đè vào góc dưới bên trái
  ctx.globalAlpha = isPlayerNearHud ? 0.28 : 0.85;

  // Khung nền tối gọn ở góc dưới bên trái
  ctx.fillStyle = '#0e101a';
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.strokeStyle = '#394056';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX + 0.5, panelY + 0.5, panelWidth - 1, panelHeight - 1);

  // Thanh Năng lượng màu xanh dương + chữ EN
  const barX = panelX + padding;
  const barY = panelY + padding;
  const barWidth = panelWidth - padding * 2;
  const barHeight = 14;
  const energyRatio = Math.max(0, Math.min(1, player.energy / player.maxEnergy));

  ctx.fillStyle = '#101522';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = '#1e88e5';
  ctx.fillRect(barX + 1, barY + 1, Math.round((barWidth - 2) * energyRatio), barHeight - 2);
  ctx.fillStyle = '#42a5f5';
  ctx.fillRect(barX + 1, barY + 1, Math.round((barWidth - 2) * energyRatio), 4);
  ctx.strokeStyle = '#394056';
  ctx.strokeRect(barX + 0.5, barY + 0.5, barWidth - 1, barHeight - 1);

  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e3f2fd';
  ctx.fillText(
    `EN: ${player.energy} / ${player.maxEnergy}`,
    barX + barWidth / 2,
    barY + barHeight / 2 + 0.5,
  );

  // 2 ô vũ khí gọn ngay bên dưới thanh Năng lượng
  const slotY = barY + barHeight + padding;
  const slotGap = 6;
  const slotWidth = 134;
  const slotHeight = 22;
  const weapons = player.weaponSystem.weapons;

  for (let i = 0; i < weapons.length; i++) {
    const weapon = weapons[i];
    const isActive = i === player.weaponSystem.currentIndex;
    const slotX = barX + i * (slotWidth + slotGap);

    ctx.fillStyle = isActive ? '#2a2414' : '#161a28';
    ctx.fillRect(slotX, slotY, slotWidth, slotHeight);

    ctx.strokeStyle = isActive ? '#ffd54f' : '#454d61';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.strokeRect(slotX + 0.5, slotY + 0.5, slotWidth - 1, slotHeight - 1);

    ctx.fillStyle = isActive ? '#fff8e1' : '#90a4ae';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${weapon.name} (${weapon.energyCost} EN)`,
      slotX + slotWidth / 2,
      slotY + slotHeight / 2 + 0.5,
    );
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

let lastTime = null;

function gameLoop(timestamp) {
  if (lastTime === null) {
    lastTime = timestamp;
  }

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  player.update(dt, map, bulletManager);
  const activeEnemies = enemyManager.getActiveEnemies();
  aimSystem.update(player, activeEnemies);
  player.aimAngle = aimSystem.aimAngle;
  enemyManager.update(dt, map, player, bulletManager);
  bulletManager.update(dt, map, activeEnemies, player);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  map.draw(ctx);
  enemyManager.draw(ctx);
  bulletManager.draw(ctx);
  player.draw(ctx);
  aimSystem.draw(ctx, player);
  drawHud(ctx, player);
  drawEnemyCounter(ctx, enemyManager.getActiveEnemies().length);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
console.log('Game loop initialized');
