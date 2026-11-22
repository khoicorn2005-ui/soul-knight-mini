import { DungeonMap } from './map.js';
import { Player } from './player.js';
import { AimSystem } from './weapon.js';
import { BulletManager } from './bullet.js';
import { EnemyManager } from './enemy.js';
import { LootManager } from './loot.js';
import { Boss } from './boss.js';
import { GameHUD, ScreenManager } from './ui.js';
import { assets } from './assets.js';
import { audioManager } from './audio.js';
import { vfxManager } from './vfx.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = false;

const GAME_STATES = Object.freeze({
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  VICTORY: 'VICTORY',
  GAME_OVER: 'GAME_OVER',
});

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

const BLOCKED_KEYS_WHEN_NOT_PLAYING = new Set([
  'Space',
  'KeyQ',
  'KeyE',
  'KeyT',
]);

const map = new DungeonMap();
const player = new Player(128, 288, canvas);
const aimSystem = new AimSystem(canvas);
const bulletManager = new BulletManager();
const enemyManager = new EnemyManager();
const lootManager = new LootManager();
const hud = new GameHUD();

let gameState = GAME_STATES.MENU;
let runTime = 0;
let enemiesDefeated = 0;
let bossDefeatCounted = false;

let currentRoomIndex = 0;
let currentWaveIndex = 0;
let roomCleared = false;
let roomBannerText = '';
let roomBannerTimer = 0;
let toastMessage = '';
let toastTimer = 0;

let boss = null;
let victoryDelayTimer = 0;
let lastTime = null;

const screenManager = new ScreenManager({
  onStart: () => startNewGame(),
  onResume: () => togglePause(),
  onRestart: () => startNewGame(),
  onMainMenu: () => openMainMenu(),
});

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
  bossDefeatCounted = false;
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
  vfxManager.clear();

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

/**
 * Bắt đầu một lượt chơi mới từ Phòng 1-1 và đặt lại toàn bộ chỉ số + thống kê.
 */
function startNewGame() {
  player.resetStats();
  player.resetInputs();
  player.weaponSystem.resetWeapons();
  player.inputEnabled = true;

  runTime = 0;
  enemiesDefeated = 0;
  bossDefeatCounted = false;
  victoryDelayTimer = 0;
  toastMessage = '';
  toastTimer = 0;

  startRoom(0);
  vfxManager.clear();

  gameState = GAME_STATES.PLAYING;
  lastTime = performance.now();
  screenManager.showScreen(GAME_STATES.PLAYING);
}

/**
 * Quay lại Start Menu và dựng sẵn nền phòng hầm ngục sạch đẹp phía sau.
 */
function openMainMenu() {
  player.resetInputs();
  player.inputEnabled = false;

  currentRoomIndex = 0;
  currentWaveIndex = 0;
  roomCleared = false;
  roomBannerText = '';
  roomBannerTimer = 0;
  toastMessage = '';
  toastTimer = 0;

  boss = null;
  bossDefeatCounted = false;
  victoryDelayTimer = 0;

  map.loadRoom(0);
  map.isLocked = false;
  bulletManager.clear();
  enemyManager.clearAll();
  lootManager.clearAll();
  vfxManager.clear();

  gameState = GAME_STATES.MENU;
  screenManager.showScreen(GAME_STATES.MENU);
}

/**
 * Chuyển đổi qua lại giữa đang chơi (PLAYING) và tạm dừng (PAUSED) bằng phím Esc hoặc nút Resume.
 */
function togglePause() {
  if (gameState === GAME_STATES.PLAYING) {
    player.resetInputs();
    player.inputEnabled = false;
    gameState = GAME_STATES.PAUSED;
    screenManager.showScreen(GAME_STATES.PAUSED);
  } else if (gameState === GAME_STATES.PAUSED) {
    player.inputEnabled = true;
    gameState = GAME_STATES.PLAYING;
    lastTime = performance.now();
    screenManager.showScreen(GAME_STATES.PLAYING);
  }
}

player.inputEnabled = false;

const muteBtn =
  typeof document !== 'undefined' ? document.getElementById('btn-mute') : null;

function updateMuteButton() {
  if (!muteBtn) {
    return;
  }
  const muted = audioManager.getMuted();
  muteBtn.textContent = muted ? '🔇 [M]' : '🔊 [M]';
  muteBtn.classList.toggle('muted', muted);
}

updateMuteButton();

if (muteBtn) {
  muteBtn.addEventListener('click', () => {
    audioManager.unlock();
    audioManager.toggleMute();
    updateMuteButton();
    muteBtn.blur();
  });
}

if (typeof window !== 'undefined') {
  // Chặn các phím gameplay (Space, Q, E, T) ở pha capture khi không ở trạng thái PLAYING
  window.addEventListener(
    'keydown',
    (e) => {
      if (
        gameState !== GAME_STATES.PLAYING &&
        BLOCKED_KEYS_WHEN_NOT_PLAYING.has(e.code)
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM' && !e.repeat) {
      e.preventDefault();
      audioManager.unlock();
      audioManager.toggleMute();
      updateMuteButton();
      return;
    }

    if (e.code === 'Escape' && !e.repeat) {
      if (
        gameState === GAME_STATES.PLAYING ||
        gameState === GAME_STATES.PAUSED
      ) {
        e.preventDefault();
        togglePause();
      }
      return;
    }

    if (e.code === 'Enter' && !e.repeat) {
      if (
        gameState === GAME_STATES.MENU ||
        gameState === GAME_STATES.VICTORY ||
        gameState === GAME_STATES.GAME_OVER
      ) {
        e.preventDefault();
        startNewGame();
      }
      return;
    }

    if (
      e.code === 'KeyE' &&
      !e.repeat &&
      gameState === GAME_STATES.PLAYING &&
      player.hp > 0
    ) {
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
  });
}

function gameLoop(timestamp) {
  if (lastTime === null) {
    lastTime = timestamp;
  }

  const dt = Math.max(0, Math.min((timestamp - lastTime) / 1000, 0.05));
  lastTime = timestamp;

  if (gameState === GAME_STATES.PLAYING) {
    runTime += dt;
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
      enemiesDefeated += 1;
      const orbCount = Math.random() < 0.5 ? 2 : 3;
      lootManager.spawnEnergyOrbs(deadEnemy.x, deadEnemy.y, orbCount);
    });

    if (boss !== null) {
      boss.update(dt, map, player, bulletManager, (x, y, count) => {
        lootManager.spawnEnergyOrbs(x, y, count);
      });

      if (!boss.active) {
        if (!bossDefeatCounted) {
          bossDefeatCounted = true;
          enemiesDefeated += 1;
        }
        if (!roomCleared) {
          roomCleared = true;
          map.isLocked = false;
          bulletManager.bullets = bulletManager.bullets.filter(
            (bullet) => bullet.owner !== 'enemy',
          );
        }
        victoryDelayTimer += dt;
      }
    }

    lootManager.update(dt, player);
    vfxManager.update(dt);

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

    // Kiểm tra điều kiện kết thúc trận: Gục ngã (Game Over) hoặc Hạ Boss xong (Victory)
    if (player.hp <= 0) {
      player.resetInputs();
      player.inputEnabled = false;
      gameState = GAME_STATES.GAME_OVER;
      audioManager.play('hurt', { volume: 0.6, pitch: 0.6, minInterval: 0 });
      screenManager.showScreen(GAME_STATES.GAME_OVER, {
        roomLabel: ROOM_CONFIGS[currentRoomIndex].label,
        kills: enemiesDefeated,
        time: runTime,
      });
    } else if (boss && !boss.active && victoryDelayTimer >= 1.1) {
      player.resetInputs();
      player.inputEnabled = false;
      gameState = GAME_STATES.VICTORY;
      audioManager.play('chest', { volume: 0.6, pitch: 1.35, minInterval: 0 });
      screenManager.showScreen(GAME_STATES.VICTORY, {
        time: runTime,
        kills: enemiesDefeated,
        weaponName:
          player.weaponSystem.getCurrentWeapon()?.name ?? 'Súng Lục',
      });
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#121218';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (gameState === GAME_STATES.MENU) {
    map.draw(ctx);
  } else {
    const shake = vfxManager.getShakeOffset();

    ctx.save();
    ctx.translate(shake.x, shake.y);

    map.draw(ctx);
    lootManager.draw(ctx, player);
    enemyManager.draw(ctx);
    if (boss) {
      boss.draw(ctx);
    }
    bulletManager.draw(ctx);
    player.draw(ctx);
    vfxManager.drawWorld(ctx);

    if (gameState === GAME_STATES.PLAYING) {
      aimSystem.draw(ctx, player);
    }

    ctx.restore();

    vfxManager.drawScreenOverlay(ctx, canvas.width, canvas.height);
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
  }

  requestAnimationFrame(gameLoop);
}

function drawLoadingScreen() {
  ctx.fillStyle = '#121218';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#a8b0c4';
  ctx.fillText('Đang tải đồ họa hầm ngục...', canvas.width / 2, canvas.height / 2);
  ctx.restore();
}

async function init() {
  screenManager.showScreen(GAME_STATES.PLAYING);
  drawLoadingScreen();
  await Promise.all([assets.loadAll(), audioManager.loadAll()]);
  openMainMenu();
  requestAnimationFrame(gameLoop);
  console.log('Game loop initialized');
}

init();
