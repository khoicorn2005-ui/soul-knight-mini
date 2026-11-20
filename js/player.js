// Quản lý nhân vật người chơi: di chuyển 8 hướng, lướt né (dash), HP, giáp (shield) và năng lượng.

import { WeaponSystem } from './weapon.js';

const MOVEMENT_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

const ARROW_CODES = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

/**
 * Đại diện cho nhân vật người chơi với cơ chế di chuyển 8 hướng, trượt tường và bắn vũ khí.
 */
export class Player {
  #aimAngle = 0;

  /**
   * @param {number} [x=480] Tọa độ tâm theo trục X (mặc định chính giữa canvas 960px).
   * @param {number} [y=288] Tọa độ tâm theo trục Y (mặc định chính giữa canvas 576px).
   * @param {HTMLCanvasElement | null} [canvas=null] Canvas để lắng nghe chuột bắn và cuộn đổi súng.
   */
  constructor(x = 960 / 2, y = 576 / 2, canvas = null) {
    this.x = x;
    this.y = y;
    this.canvas = canvas;

    // Hitbox nhỏ hơn ô gạch 32px để dễ lách qua khe hở giữa các cột/thùng
    this.width = 22;
    this.height = 22;
    this.speed = 210;

    // Chỉ số cơ bản theo GDD.md
    this.hp = 6;
    this.maxHp = 6;
    this.shield = 5;
    this.maxShield = 5;
    this.energy = 100;
    this.maxEnergy = 100;

    this.facingX = 1;
    this.aimAngle = 0;
    this.keys = new Set();
    this.isFiring = false;
    this.weaponSystem = new WeaponSystem();

    this.#bindInputEvents();
  }

  /** @returns {number} */
  get aimAngle() {
    return this.#aimAngle;
  }

  /**
   * Cập nhật góc ngắm và tự động xoay hướng nhìn nhân vật theo hướng chĩa súng.
   * @param {number} angle
   */
  set aimAngle(angle) {
    this.#aimAngle = angle;
    this.facingX = Math.cos(angle) >= 0 ? 1 : -1;
  }

  /**
   * Cập nhật vị trí nhân vật, trượt tường và xử lý bắn đạn khi đang giữ chuột trái.
   * @param {number} dt Thời gian trôi qua giữa hai khung hình (giây).
   * @param {import('./map.js').DungeonMap} map Bản đồ hiện tại.
   * @param {import('./bullet.js').BulletManager | null} [bulletManager=null]
   */
  update(dt, map, bulletManager = null) {
    if (dt <= 0) {
      return;
    }

    let dx = 0;
    let dy = 0;

    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      dx -= 1;
    }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      dx += 1;
    }
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      dy -= 1;
    }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      dy += 1;
    }

    if (dx !== 0 || dy !== 0) {
      // Chuẩn hóa vector khi đi chéo để tốc độ không vượt quá tốc độ đi thẳng
      if (dx !== 0 && dy !== 0) {
        const length = Math.hypot(dx, dy);
        dx /= length;
        dy /= length;
      }

      const stepX = dx * this.speed * dt;
      const stepY = dy * this.speed * dt;

      if (stepX !== 0) {
        this.#moveAxis('x', stepX, map);
      }
      if (stepY !== 0) {
        this.#moveAxis('y', stepY, map);
      }
    }

    this.weaponSystem.update(dt);
    if (this.isFiring && bulletManager) {
      this.weaponSystem.tryFire(this, this.#aimAngle, bulletManager);
    }
  }

  /**
   * Vẽ nhân vật hiệp sĩ, khẩu súng đang cầm và cảnh báo hết năng lượng (nếu có).
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const drawX = Math.round(this.x);
    const drawY = Math.round(this.y);
    const left = drawX - Math.floor(this.width / 2);
    const top = drawY - Math.floor(this.height / 2);

    // Bóng tròn mờ dưới chân nhân vật
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(drawX, top + this.height, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dải mũ đỏ nhỏ trên đỉnh mũ hiệp sĩ xoay nhẹ theo hướng nhìn
    const crestX = this.facingX > 0 ? left + 5 : left + 9;
    ctx.fillStyle = '#ff5252';
    ctx.fillRect(crestX, top - 2, 8, 3);

    // Viền đậm bao quanh thân hiệp sĩ
    ctx.fillStyle = '#142433';
    ctx.fillRect(left, top, this.width, this.height);

    // Thân giáp xanh dương sáng và phần sáng trên đỉnh mũ
    ctx.fillStyle = '#4fc3f7';
    ctx.fillRect(left + 2, top + 2, this.width - 4, this.height - 4);
    ctx.fillStyle = '#b3e5fc';
    ctx.fillRect(left + 3, top + 2, this.width - 6, 3);

    // Phần giáp dưới / chân đậm hơn
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(left + 2, top + 14, this.width - 4, 6);

    // Khe mũ và cặp mắt xoay theo hướng facingX
    const visorX = this.facingX > 0 ? left + 7 : left + 3;
    ctx.fillStyle = '#1a2634';
    ctx.fillRect(visorX, top + 6, 12, 6);

    const eyeOffset = this.facingX > 0 ? 2 : 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(visorX + 2 + eyeOffset, top + 8, 2, 3);
    ctx.fillRect(visorX + 6 + eyeOffset, top + 8, 2, 3);

    this.#drawWeapon(ctx, drawX, drawY);

    if (this.weaponSystem.outOfEnergyTimer > 0) {
      this.#drawOutOfEnergyWarning(ctx, drawX, top);
    }
  }

  #drawWeapon(ctx, drawX, drawY) {
    const weapon = this.weaponSystem.getCurrentWeapon();
    const recoilOffset = this.weaponSystem.recoilTimer > 0 ? -2 : 0;
    const switchOffset = this.weaponSystem.switchFlashTimer > 0 ? -2 : 0;

    ctx.save();
    ctx.translate(drawX, drawY + 2 + switchOffset);
    ctx.rotate(this.#aimAngle);
    if (Math.cos(this.#aimAngle) < 0) {
      ctx.scale(1, -1);
    }

    if (weapon.id === 'shotgun') {
      // Báng gỗ nâu đậm và thân Shotgun dài
      ctx.fillStyle = '#141824';
      ctx.fillRect(recoilOffset + 1, -4, weapon.barrelLength + 1, 7);

      ctx.fillStyle = weapon.bodyColor;
      ctx.fillRect(recoilOffset + 2, -2, 8, 4);
      ctx.fillStyle = '#a1887f';
      ctx.fillRect(recoilOffset + 2, -2, 7, 1);

      // Nòng thép dài và ốp tay bơm
      ctx.fillStyle = '#455a64';
      ctx.fillRect(recoilOffset + 8, -3, weapon.barrelLength - 8, 4);
      ctx.fillStyle = '#90a4ae';
      ctx.fillRect(recoilOffset + 9, -3, weapon.barrelLength - 10, 1);
      ctx.fillStyle = '#6d4c41';
      ctx.fillRect(recoilOffset + 11, 1, 7, 2);
    } else {
      // Tay cầm và thân Súng Lục gọn màu xám bạc
      ctx.fillStyle = '#4e342e';
      ctx.fillRect(recoilOffset + 4, 1, 4, 5);

      ctx.fillStyle = '#141824';
      ctx.fillRect(recoilOffset + 3, -4, weapon.barrelLength - 2, 6);
      ctx.fillStyle = weapon.bodyColor;
      ctx.fillRect(recoilOffset + 4, -3, weapon.barrelLength - 4, 4);
      ctx.fillStyle = '#eceff1';
      ctx.fillRect(recoilOffset + 4, -3, weapon.barrelLength - 4, 1);
      ctx.fillStyle = '#546e7a';
      ctx.fillRect(recoilOffset + 4, 0, weapon.barrelLength - 6, 1);
    }

    ctx.restore();
  }

  #drawOutOfEnergyWarning(ctx, drawX, top) {
    ctx.save();
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillText('Hết năng lượng!', drawX + 1, top - 5);
    ctx.fillStyle = '#ff8a80';
    ctx.fillText('Hết năng lượng!', drawX, top - 6);
    ctx.restore();
  }

  #bindInputEvents() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (ARROW_CODES.has(e.code)) {
          e.preventDefault();
        }
        if (MOVEMENT_CODES.has(e.code)) {
          this.keys.add(e.code);
        }
        if (e.code === 'KeyQ' && !e.repeat) {
          this.weaponSystem.switchWeapon();
        }
        // Phim test tam thoi o Chuong 4 de hoi nang luong, se bo khi co ngoc nang luong o Chuong 6
        if (e.code === 'KeyR' && !e.repeat) {
          this.energy = this.maxEnergy;
        }
      });

      window.addEventListener('keyup', (e) => {
        this.keys.delete(e.code);
      });

      window.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
          this.isFiring = false;
        }
      });

      // Xóa trạng thái phím và ngừng bắn khi mất tiêu điểm cửa sổ
      window.addEventListener('blur', () => {
        this.keys.clear();
        this.isFiring = false;
      });
    }

    if (this.canvas && typeof this.canvas.addEventListener === 'function') {
      this.canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          this.isFiring = true;
        }
      });

      this.canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
          this.isFiring = false;
        }
      });

      this.canvas.addEventListener(
        'wheel',
        (e) => {
          e.preventDefault();
          this.weaponSystem.switchWeapon();
        },
        { passive: false },
      );
    }
  }

  #moveAxis(axis, delta, map) {
    const isX = axis === 'x';
    const half = (isX ? this.width : this.height) / 2;
    const newPos = this[axis] + delta;
    const testX = isX ? newPos : this.x;
    const testY = isX ? this.y : newPos;

    if (!this.#collidesAt(testX, testY, map)) {
      this[axis] = newPos;
      return;
    }

    // Áp sát mép ô cứng để trượt tường mượt và không bị hở khe
    const eps = 0.001;
    const tileIndex =
      delta > 0
        ? Math.floor((newPos + half - eps) / map.tileSize)
        : Math.floor((newPos - half) / map.tileSize);
    const snappedPos =
      delta > 0
        ? tileIndex * map.tileSize - half
        : (tileIndex + 1) * map.tileSize + half;

    const snapX = isX ? snappedPos : this.x;
    const snapY = isX ? this.y : snappedPos;
    if (!this.#collidesAt(snapX, snapY, map)) {
      this[axis] = snappedPos;
    }
  }

  #collidesAt(cx, cy, map) {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    // Thu hẹp 0.001px ở cạnh phải/dưới để hitbox áp sát mép ô không kích hoạt va chạm giả
    const eps = 0.001;

    const left = cx - halfW;
    const right = cx + halfW - eps;
    const top = cy - halfH;
    const bottom = cy + halfH - eps;

    return (
      map.isSolidAt(left, top) ||
      map.isSolidAt(right, top) ||
      map.isSolidAt(left, bottom) ||
      map.isSolidAt(right, bottom)
    );
  }
}
