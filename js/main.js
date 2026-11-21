import { DungeonMap } from './map.js';
import { Player } from './player.js';
import { AimSystem } from './weapon.js';
import { BulletManager } from './bullet.js';
import { EnemyManager } from './enemy.js';
import { LootManager } from './loot.js';
import { Boss } from './boss.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;

const ROOM_CONFIGS = [
  {
    label: '1-1',
    waves: [
      { melee: 2, ranged: 1 },
      { melee: 2, ranged: 2 },
    ],
  },
  {
    label: '1-2',
    waves: [
      { melee: 3, ranged: 2 },
      { melee: 2, ranged: 3 },
    ],
  },
  {
    label: '1-3',
    waves: [
      { melee: 3, ranged: 2 },
      { melee: 4, ranged: 3 },
    ],
  },
  {
    label: '1-4 BOSS',
    waves: [],
  },
];

const map = new DungeonMap();
const player = new Player(128, 288, canvas);
const aimSystem = new AimSystem(canvas);
const bulletManager = new BulletManager();
const enemyManager = new EnemyManager();
const lootManager = new LootManager();

let currentRoomIndex = 0;
let currentWaveIndex = 0;
let roomCleared = false;
let roomBannerText = '';
let roomBannerTimer = 0;
let toastMessage = '';
let toastTimer = 0;

let boss = null;
let isVictory = false;
let victoryDelayTimer = 0;

function showToast(message, duration = 2.0) {
  toastMessage = message;
  toastTimer = duration;
}

/**
 * Nạp bố cục phòng mới, đặt người chơi về điểm xuất phát và khởi động quái hoặc Boss.
 * @param {number} roomIndex
 */
function startRoom(roomIndex) {
  const safeIndex = Math.max(0, Math.min(ROOM_CONFIGS.length - 1, roomIndex));
  const roomConfig = ROOM_CONFIGS[safeIndex];

  currentRoomIndex = safeIndex;
  currentWaveIndex = 0;
  boss = null;
  isVictory = false;
  victoryDelayTimer = 0;

  map.loadRoom(safeIndex);

  player.x = 128;
  player.y = 288;
  player.isDashing = false;
  player.dashTimer = 0;
  player.dashTrail = [];

  bulletManager.clear();
  enemyManager.clearAll();
  lootManager.clearAll();

  if (safeIndex === 3) {
    roomCleared = false;
    map.isLocked = true;
    boss = new Boss(720, 288);
    roomBannerText = 'PHÒNG 1-4: VUA HẦM NGỤC';
    roomBannerTimer = 2.0;
  } else {
    roomBannerText = `PHÒNG ${roomConfig.label}`;
    roomBannerTimer = 1.8;

    roomCleared = false;
    map.isLocked = true;
    const firstWave = roomConfig.waves[0];
    enemyManager.spawnWave(map, player, firstWave.melee, firstWave.ranged);
  }
}

startRoom(0);

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE' && !e.repeat && player.hp > 0 && !isVictory) {
      const result = lootManager.tryInteract(player);
      if (result) {
        if (result.type === 'portal') {
          if (currentRoomIndex + 1 < ROOM_CONFIGS.length) {
            startRoom(currentRoomIndex + 1);
          }
        } else if (result.message) {
          showToast(result.message);
        }
      }
    }

    if (e.code === 'Enter' && !e.repeat && (player.hp <= 0 || isVictory)) {
      player.resetStats();
      player.weaponSystem.resetWeapons();
      toastMessage = '';
      toastTimer = 0;
      startRoom(0);
    }
  });
}

function drawRoomStatusBadge(ctx) {
  const roomConfig = ROOM_CONFIGS[currentRoomIndex];
  let label;
  let clearedStyle = roomCleared;

  if (currentRoomIndex === 3) {
    if (boss && boss.active) {
      label = 'Phòng 1-4 | BOSS';
      clearedStyle = false;
    } else {
      label = 'Phòng 1-4 | ĐÃ HẠ BOSS';
      clearedStyle = true;
    }
  } else if (roomCleared) {
    label = `Phòng ${roomConfig.label} | ĐÃ DỌN SẠCH`;
  } else {
    const totalWaves = roomConfig.waves.length;
    const remaining = enemyManager.getRemainingCount();
    label = `Phòng ${roomConfig.label} | Đợt ${currentWaveIndex + 1}/${totalWaves} | Quái: ${remaining}`;
  }

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
  ctx.strokeStyle = clearedStyle ? '#66bb6a' : '#e53935';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

  ctx.fillStyle = clearedStyle ? '#c8e6c9' : '#ffcdd2';
  ctx.fillText(label, x + 8, y + height / 2);
  ctx.restore();
}

function drawBossHealthBar(ctx, currentBoss) {
  const barWidth = 360;
  const barHeight = 16;
  const barX = Math.round((canvas.width - barWidth) / 2);
  const barY = 20;
  const ratio = Math.max(0, Math.min(1, currentBoss.hp / currentBoss.maxHp));
  const fillWidth = Math.round((barWidth - 4) * ratio);

  const title = currentBoss.isEnraged
    ? `${currentBoss.name} [CUỒNG NỘ]`
    : currentBoss.name;

  ctx.save();

  // Tên Boss phía trên chính giữa thanh máu
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0e101a';
  ctx.fillText(title, canvas.width / 2 + 1, 11 + 1);
  ctx.fillStyle = currentBoss.isEnraged ? '#ff8a80' : '#ffd54f';
  ctx.fillText(title, canvas.width / 2, 11);

  // Nền tối và dải máu đỏ rực của Boss
  ctx.fillStyle = 'rgba(14, 16, 26, 0.88)';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  if (fillWidth > 0) {
    ctx.fillStyle = currentBoss.isEnraged ? '#ff1744' : '#d32f2f';
    ctx.fillRect(barX + 2, barY + 2, fillWidth, barHeight - 4);
    ctx.fillStyle = currentBoss.isEnraged ? '#ff8a80' : '#ef5350';
    ctx.fillRect(barX + 2, barY + 2, fillWidth, 4);
  }

  // Viền vàng nổi bật
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX + 1, barY + 1, barWidth - 2, barHeight - 2);

  // Số máu hiện tại / tối đa
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(
    `${currentBoss.hp} / ${currentBoss.maxHp}`,
    canvas.width / 2,
    barY + barHeight / 2 + 0.5,
  );

  ctx.restore();
}

function drawRoomBanner(ctx) {
  if (roomBannerTimer <= 0 || !roomBannerText) {
    return;
  }

  const alpha = Math.min(1, roomBannerTimer / 0.45);
  const centerX = canvas.width / 2;
  const centerY = Math.round(canvas.height * 0.3);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText
    ? ctx.measureText(roomBannerText).width
    : roomBannerText.length * 16;
  const boxW = Math.ceil(textWidth) + 44;
  const boxH = 44;

  ctx.fillStyle = 'rgba(10, 12, 20, 0.82)';
  ctx.fillRect(centerX - boxW / 2, centerY - boxH / 2, boxW, boxH);
  ctx.strokeStyle = '#ffd54f';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    centerX - boxW / 2 + 1,
    centerY - boxH / 2 + 1,
    boxW - 2,
    boxH - 2,
  );

  ctx.fillStyle = '#fff8e1';
  ctx.fillText(roomBannerText, centerX, centerY + 1);
  ctx.restore();
}

function drawToastMessage(ctx) {
  if (toastTimer <= 0 || !toastMessage) {
    return;
  }

  const alpha = Math.min(1, toastTimer / 0.35);
  const centerX = canvas.width / 2;
  const y = 48;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText
    ? ctx.measureText(toastMessage).width
    : toastMessage.length * 8;
  const boxW = Math.ceil(textWidth) + 24;
  const boxH = 26;

  ctx.fillStyle = 'rgba(12, 16, 28, 0.86)';
  ctx.fillRect(centerX - boxW / 2, y - boxH / 2, boxW, boxH);
  ctx.strokeStyle = '#4fc3f7';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    centerX - boxW / 2 + 0.5,
    y - boxH / 2 + 0.5,
    boxW - 1,
    boxH - 1,
  );

  ctx.fillStyle = '#e0f7fa';
  ctx.fillText(toastMessage, centerX, y + 0.5);
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

// Màn hình gục tạm thời, sẽ thay bằng màn hình Game Over đầy đủ ở Chương 7
function drawDownedOverlay(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 18, 0.72)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const msg = 'HIỆP SĨ ĐÃ GỤC - Nhấn ENTER để chơi lại từ phòng 1-1';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#141824';
  ctx.fillText(msg, canvas.width / 2 + 2, canvas.height / 2 + 2);
  ctx.fillStyle = '#ff8a80';
  ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
  ctx.restore();
}

// Man hinh Chien thang tam thoi o Chuong 6, se nang cap thanh luong UI day du o Chuong 7
function drawVictoryOverlay(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 18, 0.76)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 38px monospace';
  ctx.fillStyle = '#141824';
  ctx.fillText('CHIẾN THẮNG!', centerX + 3, centerY - 36 + 3);
  ctx.fillStyle = '#ffd54f';
  ctx.fillText('CHIẾN THẮNG!', centerX, centerY - 36);

  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#e0f7fa';
  ctx.fillText('Bạn đã hạ gục Vua Hầm Ngục!', centerX, centerY + 8);

  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#a5d6a7';
  ctx.fillText('Nhấn ENTER để chơi lại từ Phòng 1-1', centerX, centerY + 46);

  ctx.restore();
}

let lastTime = null;

function gameLoop(timestamp) {
  if (lastTime === null) {
    lastTime = timestamp;
  }

  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (player.hp > 0 && !isVictory) {
    roomBannerTimer = Math.max(0, roomBannerTimer - dt);
    toastTimer = Math.max(0, toastTimer - dt);

    player.update(dt, map, bulletManager);

    const activeTargets = [...enemyManager.getActiveEnemies()];
    if (boss && boss.active) {
      activeTargets.push(boss);
    }

    aimSystem.update(player, activeTargets);
    player.aimAngle = aimSystem.aimAngle;

    bulletManager.update(dt, map, activeTargets, player);
    enemyManager.update(dt, map, player, bulletManager, (deadEnemy) => {
      const orbCount = Math.random() < 0.5 ? 2 : 3;
      lootManager.spawnEnergyOrbs(deadEnemy.x, deadEnemy.y, orbCount);
    });

    if (boss !== null) {
      boss.update(dt, map, player, bulletManager, (x, y, count) => {
        lootManager.spawnEnergyOrbs(x, y, count);
      });

      if (!boss.active && !isVictory) {
        if (!roomCleared) {
          roomCleared = true;
          map.isLocked = false;
          bulletManager.bullets = bulletManager.bullets.filter(
            (bullet) => bullet.owner !== 'enemy',
          );
        }
        victoryDelayTimer += dt;
        if (victoryDelayTimer >= 1.1) {
          isVictory = true;
          player.isFiring = false;
        }
      }
    }

    lootManager.update(dt, player);

    const roomConfig = ROOM_CONFIGS[currentRoomIndex];
    if (
      !roomCleared &&
      roomConfig.waves.length > 0 &&
      !enemyManager.hasEnemiesOrPending()
    ) {
      if (currentWaveIndex + 1 < roomConfig.waves.length) {
        currentWaveIndex += 1;
        const nextWave = roomConfig.waves[currentWaveIndex];
        enemyManager.spawnWave(map, player, nextWave.melee, nextWave.ranged);
      } else {
        roomCleared = true;
        map.isLocked = false;
        const nextRoomLabel = ROOM_CONFIGS[currentRoomIndex + 1]?.label ?? '';
        lootManager.spawnRoomRewards(currentRoomIndex, nextRoomLabel, player);
      }
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  map.draw(ctx);
  lootManager.draw(ctx, player);
  enemyManager.draw(ctx);
  if (boss) {
    boss.draw(ctx);
  }
  bulletManager.draw(ctx);
  player.draw(ctx);
  aimSystem.draw(ctx, player);
  drawHud(ctx, player);
  drawRoomStatusBadge(ctx);
  if (boss && boss.active) {
    drawBossHealthBar(ctx, boss);
  }
  drawRoomBanner(ctx);
  drawToastMessage(ctx);

  if (player.hp <= 0) {
    drawDownedOverlay(ctx);
  } else if (isVictory) {
    drawVictoryOverlay(ctx);
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
console.log('Game loop initialized');
