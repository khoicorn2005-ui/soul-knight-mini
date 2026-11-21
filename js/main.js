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
    if (e.code === 'KeyN' && !e.repeat && player.hp > 0) {
      enemyManager.spawnTestWave(map, player);
    }
    if (e.code === 'Enter' && !e.repeat && player.hp <= 0) {
      player.resetStats();
      player.x = canvas.width / 2;
      player.y = canvas.height / 2;
      bulletManager.clear();
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

function drawStatBar(ctx, x, y, width, height, ratio, fillColor, highlightColor, label) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const fillWidth = Math.round((width - 2) * clamped);

  ctx.fillStyle = '#101522';
  ctx.fillRect(x, y, width, height);

  if (fillWidth > 0) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(x + 1, y + 1, fillWidth, height - 2);
    ctx.fillStyle = highlightColor;
    ctx.fillRect(x + 1, y + 1, fillWidth, 3);
  }

  ctx.strokeStyle = '#394056';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f5f7fa';
  ctx.fillText(label, x + width / 2, y + height / 2 + 0.5);
}

function drawHud(ctx, player) {
  const panelX = 10;
  const panelWidth = 302;
  const panelHeight = 72;
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

  // Cột trái: 3 thanh HP / SH / EN + thanh hồi chiêu Lướt
  const barX = panelX + padding;
  const barY = panelY + padding;
  const barWidth = 152;
  const barHeight = 12;
  const barGap = 4;

  drawStatBar(
    ctx,
    barX,
    barY,
    barWidth,
    barHeight,
    player.hp / player.maxHp,
    '#d32f2f',
    '#ef5350',
    `HP: ${player.hp}/${player.maxHp}`,
  );

  const shieldColor = player.shieldRegenFlash > 0 ? '#b3e5fc' : '#64b5f6';
  const shieldHighlight =
    player.shieldRegenFlash > 0 ? '#ffffff' : '#90caf9';
  const shieldSuffix =
    player.shield < player.maxShield && player.shieldRegenDelay <= 0 ? ' +' : '';
  drawStatBar(
    ctx,
    barX,
    barY + (barHeight + barGap),
    barWidth,
    barHeight,
    player.shield / player.maxShield,
    shieldColor,
    shieldHighlight,
    `SH: ${player.shield}/${player.maxShield}${shieldSuffix}`,
  );

  drawStatBar(
    ctx,
    barX,
    barY + (barHeight + barGap) * 2,
    barWidth,
    barHeight,
    player.energy / player.maxEnergy,
    '#0288d1',
    '#29b6f6',
    `EN: ${player.energy}/${player.maxEnergy}`,
  );

  const dashReady = player.dashCooldown <= 0;
  const dashRatio = dashReady
    ? 1
    : 1 - player.dashCooldown / player.dashMaxCooldown;
  const dashLabel = dashReady
    ? 'DASH: Sẵn sàng'
    : `DASH: ${player.dashCooldown.toFixed(1)}s`;
  drawStatBar(
    ctx,
    barX,
    barY + (barHeight + barGap) * 3,
    barWidth,
    barHeight,
    dashRatio,
    dashReady ? '#00897b' : '#546e7a',
    dashReady ? '#4db6ac' : '#78909c',
    dashLabel,
  );

  // Cột phải: 2 ô vũ khí xếp dọc gọn gàng ngay bên cạnh
  const slotX = barX + barWidth + 8;
  const slotWidth = panelWidth - padding * 2 - barWidth - 8;
  const slotHeight = 28;
  const slotGap = 4;
  const weapons = player.weaponSystem.weapons;

  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < weapons.length; i++) {
    const weapon = weapons[i];
    const isActive = i === player.weaponSystem.currentIndex;
    const slotY = barY + i * (slotHeight + slotGap);

    ctx.fillStyle = isActive ? '#2a2414' : '#161a28';
    ctx.fillRect(slotX, slotY, slotWidth, slotHeight);

    ctx.strokeStyle = isActive ? '#ffd54f' : '#454d61';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.strokeRect(slotX + 0.5, slotY + 0.5, slotWidth - 1, slotHeight - 1);

    ctx.fillStyle = isActive ? '#fff8e1' : '#90a4ae';
    ctx.fillText(
      `${weapon.name} (${weapon.energyCost} EN)`,
      slotX + slotWidth / 2,
      slotY + slotHeight / 2 + 0.5,
    );
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

// Man hinh guc tam thoi o Chuong 5, se thay bang man hinh Game Over day du o Chuong 7
function drawDownedOverlay(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 18, 0.72)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const msg = 'HIỆP SĨ ĐÃ GỤC (Test Chương 5) - Nhấn ENTER để hồi sinh';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#141824';
  ctx.fillText(msg, canvas.width / 2 + 2, canvas.height / 2 + 2);
  ctx.fillStyle = '#ff8a80';
  ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
  ctx.restore();
}

let lastTime = null;

function gameLoop(timestamp) {
  if (lastTime === null) {
    lastTime = timestamp;
  }

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (player.hp > 0) {
    player.update(dt, map, bulletManager);
    const activeEnemies = enemyManager.getActiveEnemies();
    aimSystem.update(player, activeEnemies);
    player.aimAngle = aimSystem.aimAngle;
    enemyManager.update(dt, map, player, bulletManager);
    bulletManager.update(dt, map, activeEnemies, player);
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  map.draw(ctx);
  enemyManager.draw(ctx);
  bulletManager.draw(ctx);
  player.draw(ctx);
  aimSystem.draw(ctx, player);
  drawHud(ctx, player);
  drawEnemyCounter(ctx, enemyManager.getActiveEnemies().length);

  if (player.hp <= 0) {
    drawDownedOverlay(ctx);
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
console.log('Game loop initialized');
