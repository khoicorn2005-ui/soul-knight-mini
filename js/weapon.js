// Quản lý vũ khí, ngắm bắn, tiêu hao năng lượng và chuyển đổi giữa 2 vũ khí.

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
   * Vẽ khung khóa mục tiêu hoặc tâm ngắm chữ thập cùng nhãn chế độ ngắm hiện tại.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ x: number, y: number }} player
   */
  draw(ctx, player) {
    if (this.lockedTarget !== null) {
      this.#drawLockOn(ctx, player, this.lockedTarget);
    } else {
      this.#drawCrosshair(ctx, this.mouseX, this.mouseY);
    }

    this.#drawStatusBadge(ctx);
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

  #drawStatusBadge(ctx) {
    const label = this.autoAim
      ? 'Aim: AUTO-LOCK [Phím T: Ngắm chuột]'
      : 'Aim: MOUSE [Phím T: Bật Auto-Aim]';

    ctx.save();
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const textWidth = ctx.measureText
      ? ctx.measureText(label).width
      : label.length * 7;
    const x = 10;
    const y = 5;
    const width = Math.ceil(textWidth) + 16;
    const height = 22;

    ctx.fillStyle = 'rgba(14, 16, 26, 0.78)';
    ctx.fillRect(x, y, width, height);

    ctx.strokeStyle = this.autoAim ? '#ff5252' : '#4fc3f7';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);

    ctx.fillStyle = this.autoAim ? '#ff8a80' : '#e0f7fa';
    ctx.fillText(label, x + 8, y + height / 2);
    ctx.restore();
  }
}

/**
 * Cấu hình 2 vũ khí đặc trưng của Soul Knight.
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
  }

  /**
   * Trả về cấu hình vũ khí đang cầm ở ô hiện tại.
   * @returns {object}
   */
  getCurrentWeapon() {
    return this.weapons[this.currentIndex];
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

    return true;
  }
}
