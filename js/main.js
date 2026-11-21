import { DungeonMap } from './map.js';
import { Player } from './player.js';
import { AimSystem } from './weapon.js';
import { BulletManager } from './bullet.js';
import { EnemyManager } from './enemy.js';
import { LootManager } from './loot.js';
import { Boss } from './boss.js';
import { GameHUD } from './ui.js';

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
const hud = new GameHUD();

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

function getWaveStatusText() {
  if (currentRoomIndex === 3) {
    return boss && boss.active ? 'ĐANG ĐẤU BOSS' : 'ĐÃ HẠ BOSS';
  }
  if (roomCleared) {
    return 'ĐÃ DỌN SẠCH';
  }
  const totalWaves = ROOM_CONFIGS[currentRoomIndex].waves.length;
  const remaining = enemyManager.getRemainingCount();
  return `Đợt ${currentWaveIndex + 1}/${totalWaves} • Quái: ${remaining}`;
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

// Màn hình gục tạm thời, sẽ thay bằng màn hình Game Over đầy đủ ở Chặng 2 Chương 7
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

  hud.draw(ctx, {
    player,
    aimSystem,
    currentRoomIndex,
    roomLabel: ROOM_CONFIGS[currentRoomIndex].label,
    waveText: getWaveStatusText(),
    roomCleared,
    boss,
    roomBannerText,
    roomBannerTimer,
    toastMessage,
    toastTimer,
  });

  if (player.hp <= 0) {
    drawDownedOverlay(ctx);
  } else if (isVictory) {
    drawVictoryOverlay(ctx);
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
console.log('Game loop initialized');
