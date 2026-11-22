// Quản lý vũ khí, ngắm bắn, tiêu hao năng lượng và chuyển đổi giữa 2 vũ khí.

import { audioManager } from './audio.js';
import { vfxManager } from './vfx.js';

/**
 * Hệ thống ngắm bắn hỗ trợ ngắm chuột thủ công và tự khóa mục tiêu gần nhất (Auto-Aim).
 */
export class AimSystem {
  /**
   * @param {HTMLCanvasElement} canvas Canvas chính của game để quy đổi tọa độ chuột.
   */
  constructor(canvas) {
    this.canvas = canvas;
    const width = canvas?.width ?? 960;
    const height = canvas?.height ?? 576;

    this.mouseX = width / 2;
    this.mouseY = height / 2;

    // Mặc định tắt Auto-Aim để người chơi tự ngắm bằng chuột
    this.autoAim = false;
    this.autoAimRange = 360;
    this.lockedTarget = null;
    this.aimAngle = 0;

    this.#bindEvents();
  }

  /**
   * Cập nhật mục tiêu khóa (nếu bật Auto-Aim) và góc ngắm hiện tại từ phía player.
   * @param {{ x: number, y: number }} player
   * @param {Array<{ x: number, y: number, radius?: number, alive?: boolean }>} [targets=[]]
   */
  update(player, targets = []) {
    if (this.autoAim && Array.isArray(targets) && targets.length > 0) {
      let nearestTarget = null;
      let nearestDist = this.autoAimRange;

      for (const target of targets) {
        if (!target || target.alive === false) {
          continue;
        }
        const dist = Math.hypot(target.x - player.x, target.y - player.y);
        if (dist <= nearestDist) {
          nearestDist = dist;
          nearestTarget = target;
        }
      }

      if (nearestTarget !== null) {
        this.lockedTarget = nearestTarget;
        this.aimAngle = Math.atan2(
          nearestTarget.y - player.y,
          nearestTarget.x - player.x,
        );
        return;
      }
    }

    this.lockedTarget = null;
    this.aimAngle = Math.atan2(this.mouseY - player.y, this.mouseX - player.x);
  }

  /**
   * Vẽ khung khóa mục tiêu hoặc tâm ngắm chữ thập theo chuột.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ x: number, y: number }} player
   */
  draw(ctx, player) {
    if (this.lockedTarget !== null) {
      this.#drawLockOn(ctx, player, this.lockedTarget);
    } else {
      this.#drawCrosshair(ctx, this.mouseX, this.mouseY);
    }
  }

  #bindEvents() {
    if (this.canvas && typeof this.canvas.addEventListener === 'function') {
      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          return;
        }
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const rawX = (e.clientX - rect.left) * scaleX;
        const rawY = (e.clientY - rect.top) * scaleY;
        this.mouseX = Math.max(0, Math.min(this.canvas.width, rawX));
        this.mouseY = Math.max(0, Math.min(this.canvas.height, rawY));
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyT' && !e.repeat) {
          this.autoAim = !this.autoAim;
        }
      });
    }
  }

  #drawLockOn(ctx, player, target) {
    // Đường ngắm nét đứt mảnh, rất mờ nối từ nhân vật đến mục tiêu bị khóa
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 82, 82, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.restore();

    // Khung khóa 4 góc vuông kiểu Soul Knight co giãn nhẹ theo thời gian
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const pulse = Math.sin(now * 0.008) * 3;
    const half = (target.radius ?? 14) + 5 + pulse;
    const arm = 7;

    const left = Math.round(target.x - half);
    const right = Math.round(target.x + half);
    const top = Math.round(target.y - half);
    const bottom = Math.round(target.y + half);

    const drawCorners = (strokeStyle, lineWidth) => {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      // Góc trên-trái
      ctx.moveTo(left, top + arm);
      ctx.lineTo(left, top);
      ctx.lineTo(left + arm, top);
      // Góc trên-phải
      ctx.moveTo(right - arm, top);
      ctx.lineTo(right, top);
      ctx.lineTo(right, top + arm);
      // Góc dưới-trái
      ctx.moveTo(left, bottom - arm);
      ctx.lineTo(left, bottom);
      ctx.lineTo(left + arm, bottom);
      // Góc dưới-phải
      ctx.moveTo(right - arm, bottom);
      ctx.lineTo(right, bottom);
      ctx.lineTo(right, bottom - arm);
      ctx.stroke();
    };

    ctx.save();
    drawCorners('rgba(30, 0, 0, 0.7)', 4);
    drawCorners('#ff3b3b', 2);
    ctx.restore();
  }

  #drawCrosshair(ctx, x, y) {
    const cx = Math.round(x);
    const cy = Math.round(y);

    ctx.save();
    // Viền tối tạo độ tương phản rõ nét trên nền tối
    ctx.fillStyle = '#141824';
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
    ctx.fillRect(cx - 2, cy - 9, 4, 6);
    ctx.fillRect(cx - 2, cy + 3, 4, 6);
    ctx.fillRect(cx - 9, cy - 2, 6, 4);
    ctx.fillRect(cx + 3, cy - 2, 6, 4);

    // Chữ thập pixel màu trắng ở bên trong
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1, cy - 1, 2, 2);
    ctx.fillRect(cx - 1, cy - 8, 2, 4);
    ctx.fillRect(cx - 1, cy + 4, 2, 4);
    ctx.fillRect(cx - 8, cy - 1, 4, 2);
    ctx.fillRect(cx + 4, cy - 1, 4, 2);
    ctx.restore();
  }
}

/**
 * Cấu hình các vũ khí trong game (khởi đầu và rơi từ Rương vũ khí).
 */
export const WEAPONS = Object.freeze({
  pistol: Object.freeze({
    id: 'pistol',
    name: 'Súng Lục',
    energyCost: 0,
    fireRate: 0.25,
    bulletCount: 1,
    spread: 0.04,
    bulletSpeed: 540,
    bulletRadius: 4,
    damage: 3,
    bulletColor: '#ffeb3b',
    bodyColor: '#b0bec5',
    barrelLength: 16,
  }),
  shotgun: Object.freeze({
    id: 'shotgun',
    name: 'Shotgun',
    energyCost: 3,
    fireRate: 0.65,
    bulletCount: 5,
    spread: 0.38,
    bulletSpeed: 480,
    bulletRadius: 4,
    damage: 2,
    bulletColor: '#ff9800',
    bodyColor: '#8d6e63',
    barrelLength: 22,
  }),
  smg: Object.freeze({
    id: 'smg',
    name: 'Tiểu Liên',
    energyCost: 1,
    fireRate: 0.11,
    bulletCount: 1,
    spread: 0.12,
    bulletSpeed: 580,
    bulletRadius: 3.5,
    damage: 2,
    bulletColor: '#4dd0e1',
    bodyColor: '#546e7a',
    barrelLength: 20,
  }),
  staff: Object.freeze({
    id: 'staff',
    name: 'Pháp Trượng',
    energyCost: 4,
    fireRate: 0.55,
    bulletCount: 3,
    spread: 0.28,
    bulletSpeed: 450,
    bulletRadius: 6,
    damage: 5,
    bulletColor: '#e040fb',
    bodyColor: '#7b1fa2',
    barrelLength: 24,
  }),
});

/**
 * Hệ thống quản lý 2 ô vũ khí, tốc độ bắn, tiêu hao năng lượng và sinh đạn.
 */
export class WeaponSystem {
  /**
   * @param {Array<object>} [weapons=[WEAPONS.pistol, WEAPONS.shotgun]]
   */
  constructor(weapons = [WEAPONS.pistol, WEAPONS.shotgun]) {
    this.weapons = weapons.slice(0, 2);
    this.currentIndex = 0;
    this.cooldown = 0;
    this.outOfEnergyTimer = 0;
    this.switchFlashTimer = 0;
    this.recoilTimer = 0;
    this.recoilOffset = 0;
  }

  /**
   * Trả về cấu hình vũ khí đang cầm ở ô hiện tại.
   * @returns {object}
   */
  getCurrentWeapon() {
    return this.weapons[this.currentIndex];
  }

  /**
   * Kiểm tra xem người chơi có đang mang vũ khí có mã weaponId hay không.
   * @param {string} weaponId
   * @returns {boolean}
   */
  hasWeapon(weaponId) {
    return this.weapons.some((weapon) => weapon && weapon.id === weaponId);
  }

  /**
   * Thay thế khẩu súng ở ô đang cầm bằng newWeapon và trả về khẩu súng cũ.
   * @param {object} newWeapon
   * @returns {object | null}
   */
  swapCurrentWeapon(newWeapon) {
    if (!newWeapon) {
      return null;
    }

    const oldWeapon = this.weapons[this.currentIndex] ?? null;
    this.weapons[this.currentIndex] = newWeapon;
    this.cooldown = 0;
    this.switchFlashTimer = 0.18;
    this.outOfEnergyTimer = 0;
    this.recoilOffset = 0;
    return oldWeapon;
  }

  /**
   * Đưa kho vũ khí về mặc định ban đầu [Súng Lục, Shotgun], ô đang cầm = 0.
   */
  resetWeapons() {
    this.weapons = [WEAPONS.pistol, WEAPONS.shotgun];
    this.currentIndex = 0;
    this.cooldown = 0;
    this.outOfEnergyTimer = 0;
    this.switchFlashTimer = 0;
    this.recoilTimer = 0;
    this.recoilOffset = 0;
  }

  /**
   * Đổi qua lại giữa ô vũ khí 0 và ô 1, đặt lại nhẹ hiệu ứng chuyển súng.
   * @returns {object}
   */
  switchWeapon() {
    if (this.weapons.length > 1) {
      this.currentIndex = this.currentIndex === 0 ? 1 : 0;
    }
    this.switchFlashTimer = 0.15;
    this.outOfEnergyTimer = 0;
    return this.getCurrentWeapon();
  }

  /**
   * Giảm dần thời gian hồi bắn và các bộ đếm hiệu ứng.
   * @param {number} dt
   */
  update(dt) {
    if (dt <= 0) {
      return;
    }

    this.cooldown = Math.max(0, this.cooldown - dt);
    this.outOfEnergyTimer = Math.max(0, this.outOfEnergyTimer - dt);
    this.switchFlashTimer = Math.max(0, this.switchFlashTimer - dt);
    this.recoilTimer = Math.max(0, this.recoilTimer - dt);
    this.recoilOffset = Math.max(0, this.recoilOffset - 45 * dt);
  }

  /**
   * Kiểm tra hồi chiêu và năng lượng để bắn đạn từ đầu nòng súng theo aimAngle.
   * @param {{ x: number, y: number, energy: number }} player
   * @param {number} aimAngle
   * @param {import('./bullet.js').BulletManager} bulletManager
   * @returns {boolean}
   */
  tryFire(player, aimAngle, bulletManager) {
    if (!bulletManager || this.cooldown > 0) {
      return false;
    }

    const weapon = this.getCurrentWeapon();
    if (!weapon) {
      return false;
    }

    if (player.energy < weapon.energyCost) {
      this.outOfEnergyTimer = 0.8;
      return false;
    }

    player.energy = Math.max(0, player.energy - weapon.energyCost);
    this.cooldown = weapon.fireRate;
    this.recoilTimer = 0.08;

    const muzzleX = player.x + Math.cos(aimAngle) * weapon.barrelLength;
    const muzzleY = player.y + Math.sin(aimAngle) * weapon.barrelLength;

    if (weapon.bulletCount > 1) {
      const step = weapon.spread / (weapon.bulletCount - 1);
      const startAngle = aimAngle - weapon.spread / 2;
      for (let i = 0; i < weapon.bulletCount; i++) {
        const angle = startAngle + step * i;
        bulletManager.spawn(
          muzzleX,
          muzzleY,
          angle,
          weapon.bulletSpeed,
          weapon.damage,
          weapon.bulletRadius,
          weapon.bulletColor,
        );
      }
    } else {
      const angle = aimAngle + (Math.random() - 0.5) * weapon.spread;
      bulletManager.spawn(
        muzzleX,
        muzzleY,
        angle,
        weapon.bulletSpeed,
        weapon.damage,
        weapon.bulletRadius,
        weapon.bulletColor,
      );
    }

    if (weapon.id === 'pistol') {
      this.recoilOffset = 4;
      vfxManager.spawnMuzzleFlash(muzzleX, muzzleY, aimAngle, '#fff59d', 9);
      vfxManager.addShake(1.2, 0.06);
      audioManager.play('shoot', { volume: 0.4, pitch: 1.0 });
    } else if (weapon.id === 'smg') {
      this.recoilOffset = 3;
      vfxManager.spawnMuzzleFlash(muzzleX, muzzleY, aimAngle, '#80deea', 8);
      vfxManager.addShake(1.0, 0.05);
      audioManager.play('shoot', { volume: 0.32, pitch: 1.22, minInterval: 0.04 });
    } else if (weapon.id === 'shotgun') {
      this.recoilOffset = 7.5;
      vfxManager.spawnMuzzleFlash(muzzleX, muzzleY, aimAngle, '#ffb74d', 15);
      vfxManager.addShake(4.2, 0.12);
      audioManager.play('shotgun', { volume: 0.55, pitch: 0.92 });
    } else if (weapon.id === 'staff') {
      this.recoilOffset = 5;
      vfxManager.spawnMuzzleFlash(muzzleX, muzzleY, aimAngle, '#ea80fc', 13);
      vfxManager.addShake(2.5, 0.09);
      audioManager.play('shotgun', { volume: 0.45, pitch: 1.35 });
    }

    return true;
  }
}

/**
 * Vẽ 4 khẩu súng theo phong cách Pixel Art (hạt 2px, viền tối #141622) nằm ngang hướng +X từ gốc tay cầm (0, 0).
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} weapon
 * @param {import('./assets.js').AssetManager | null} [assets=null]
 */
export function drawPixelWeapon(ctx, weapon, assets = null) {
  if (!ctx || !weapon) {
    return;
  }

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  if (weapon.id === 'shotgun') {
    // Shotgun: báng gỗ nâu ấm + thân máy + nòng dài thép tối + ốp tay bơm
    // Viền tối #141622
    ctx.fillStyle = '#141622';
    ctx.fillRect(-4, -2, 8, 8);
    ctx.fillRect(2, -6, 22, 8);
    ctx.fillRect(10, 2, 10, 4);

    // Báng gỗ nâu ấm có mảng sáng tối
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(-2, 0, 6, 4);
    ctx.fillStyle = '#a1887f';
    ctx.fillRect(-2, 0, 5, 2);

    // Thân súng & nòng thép dài
    ctx.fillStyle = '#455a64';
    ctx.fillRect(4, -4, 18, 4);
    ctx.fillStyle = '#90a4ae';
    ctx.fillRect(6, -4, 16, 2);
    ctx.fillStyle = '#263238';
    ctx.fillRect(6, -2, 4, 2);

    // Ốp lót tay bơm bằng gỗ nâu
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(12, 0, 6, 4);
    ctx.fillStyle = '#bcaaa4';
    ctx.fillRect(12, 0, 6, 2);
  } else if (weapon.id === 'smg') {
    // Tiểu Liên: thân vuông gọn xanh xám quân đội + băng đạn dọc nhô xuống + đầu nòng ngắn
    ctx.fillStyle = '#141622';
    ctx.fillRect(-2, -6, 18, 10);
    ctx.fillRect(0, 2, 6, 6);
    ctx.fillRect(8, 2, 6, 8);
    ctx.fillRect(16, -4, 6, 6);

    // Tay cầm & băng đạn dọc nhô xuống
    ctx.fillStyle = '#37474f';
    ctx.fillRect(2, 2, 2, 4);
    ctx.fillStyle = '#263238';
    ctx.fillRect(10, 2, 2, 6);

    // Thân chính vuông gọn xanh xám quân đội
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(0, -4, 14, 6);
    ctx.fillStyle = '#90a4ae';
    ctx.fillRect(0, -4, 12, 2);

    // Đầu nòng ngắn + điểm sáng cyan
    ctx.fillStyle = '#37474f';
    ctx.fillRect(14, -2, 6, 2);
    ctx.fillStyle = '#4dd0e1';
    ctx.fillRect(18, -2, 2, 2);
  } else if (weapon.id === 'staff') {
    const staffImg = assets?.get?.('weapon_staff');
    if (staffImg) {
      const imgW = staffImg.naturalWidth || staffImg.width || 8;
      const imgH = staffImg.naturalHeight || staffImg.height || 30;
      const scale = 1.4;
      const drawW = Math.round(imgW * scale);
      const drawH = Math.round(imgH * scale);

      // Ảnh gốc dựng đứng (đỉnh hướng -Y), xoay +90 độ để hướng ngang +X từ gốc cầm tay
      ctx.save();
      ctx.translate(10, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(
        staffImg,
        -Math.round(drawW / 2),
        -Math.round(drawH * 0.65),
        drawW,
        drawH,
      );
      ctx.restore();

      // Ánh pha lê tím nhẹ hòa hợp màu đạn Pháp Trượng
      ctx.fillStyle = 'rgba(224, 64, 251, 0.35)';
      ctx.fillRect(22, -4, 6, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(24, -2, 2, 2);
    } else {
      // Trượng gỗ tím gắn viên pha lê #e040fb lõi trắng lấp lánh
      ctx.fillStyle = '#141622';
      ctx.fillRect(-4, -3, 22, 6);
      ctx.fillRect(16, -6, 10, 12);

      // Thân trượng gỗ tím + vòng cổ vàng
      ctx.fillStyle = '#6a1b9a';
      ctx.fillRect(-2, -1, 18, 2);
      ctx.fillStyle = '#ce93d8';
      ctx.fillRect(-2, -1, 14, 1);
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(14, -2, 2, 4);

      // Viên pha lê tím sáng #e040fb có lõi trắng
      ctx.fillStyle = '#e040fb';
      ctx.fillRect(18, -4, 6, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(20, -2, 2, 4);
    }
  } else {
    // Súng Lục (pistol): nhỏ gọn, thân thép bạc sáng, khe đẩy đạn, báng xám đậm
    ctx.fillStyle = '#141622';
    ctx.fillRect(0, 0, 6, 8);
    ctx.fillRect(0, -6, 16, 8);

    // Báng súng xám đậm
    ctx.fillStyle = '#455a64';
    ctx.fillRect(2, 0, 2, 6);

    // Thân thép bạc sáng
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(2, -4, 12, 4);
    ctx.fillStyle = '#eceff1';
    ctx.fillRect(2, -4, 12, 2);

    // Khe đẩy đạn & rãnh dưới nòng
    ctx.fillStyle = '#37474f';
    ctx.fillRect(6, -4, 4, 2);
    ctx.fillStyle = '#78909c';
    ctx.fillRect(4, -2, 8, 2);
  }

  ctx.restore();
}
