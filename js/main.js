import { DungeonMap } from './map.js';
import { Player } from './player.js';
import { AimSystem } from './weapon.js';
import { BulletManager } from './bullet.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;

const map = new DungeonMap();
const player = new Player(canvas.width / 2, canvas.height / 2, canvas);
const aimSystem = new AimSystem(canvas);
const bulletManager = new BulletManager();

// Bia tap ban tam thoi de test Auto-Aim o Chuong 4, se thay bang quai that o Chuong 5
const testTargets = [
  { x: 208, y: 112, radius: 14, hitFlashTimer: 0 },
  { x: 752, y: 208, radius: 14, hitFlashTimer: 0 },
  { x: 464, y: 464, radius: 14, hitFlashTimer: 0 },
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

    if (target.hitFlashTimer > 0) {
      // Nhấp nháy trắng nổi bật khi bia bị đạn bắn trúng
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(target.x, target.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffe082';
      ctx.beginPath();
      ctx.arc(target.x, target.y, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
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
    }

    ctx.restore();
  }
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

  for (const target of testTargets) {
    if (target.hitFlashTimer > 0) {
      target.hitFlashTimer = Math.max(0, target.hitFlashTimer - dt);
    }
  }

  player.update(dt, map, bulletManager);
  aimSystem.update(player, testTargets);
  player.aimAngle = aimSystem.aimAngle;
  bulletManager.update(dt, map, testTargets);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  map.draw(ctx);
  drawTestTargets(ctx, testTargets);
  bulletManager.draw(ctx);
  player.draw(ctx);
  aimSystem.draw(ctx, player);
  drawHud(ctx, player);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
console.log('Game loop initialized');
