// Quản lý nhân vật người chơi: di chuyển 8 hướng, lướt né (dash), HP, giáp (shield) và năng lượng.

import { WeaponSystem, drawPixelWeapon } from './weapon.js';
import { assets } from './assets.js';
import { audioManager } from './audio.js';

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
 * Đại diện cho nhân vật người chơi với cơ chế di chuyển 8 hướng, trượt tường, giáp tự hồi và lướt né.
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

    // Bộ đếm sát thương, bất tử ngắn và tự hồi giáp sau 4 giây
    this.hitFlashTimer = 0;
    this.invulnerableTimer = 0;
    this.shieldRegenDelay = 0;
    this.shieldRegenTick = 0;
    this.shieldRegenFlash = 0;

    // Kỹ năng Lướt (Dash - phím Space)
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashDuration = 0.18;
    this.dashSpeed = 580;
    this.dashCooldown = 0;
    this.dashMaxCooldown = 1.5;
    this.dashDirX = 0;
    this.dashDirY = 0;
    this.dashTrail = [];

    // Hoạt ảnh Pixel Art (idle / run 4 khung hình)
    this.animTimer = 0;
    this.animFrame = 0;
    this.isMoving = false;

    this.inputEnabled = true;
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
   * Kích hoạt nhấp nháy báo hiệu nhân vật vừa bị quái chạm hoặc trúng đạn.
   */
  triggerHitFlash() {
    this.hitFlashTimer = 0.18;
  }

  /**
   * Nhận sát thương chuẩn Soul Knight: trừ Giáp trước, phần dư trừ vào Máu.
   * @param {number} [amount=1]
   * @returns {boolean} True nếu sát thương được áp dụng.
   */
  takeDamage(amount = 1) {
    if (
      this.isDashing ||
      this.invulnerableTimer > 0 ||
      this.hp <= 0 ||
      amount <= 0
    ) {
      return false;
    }

    const hadShield = this.shield > 0;

    if (this.shield >= amount) {
      this.shield -= amount;
    } else {
      const overflow = amount - this.shield;
      this.shield = 0;
      this.hp = Math.max(0, this.hp - overflow);
    }

    if (hadShield && this.shield === 0) {
      audioManager.play('hurt', { volume: 0.65, pitch: 0.72 });
    } else {
      audioManager.play('hurt', { volume: 0.45, pitch: 1.0 });
    }

    this.invulnerableTimer = 0.6;
    this.hitFlashTimer = 0.18;
    this.shieldRegenDelay = 4.0;
    this.shieldRegenTick = 0;
    return true;
  }

  /**
   * Cộng thêm năng lượng cho người chơi (nhặt từ Ngọc năng lượng), không vượt quá maxEnergy.
   * @param {number} amount
   */
  addEnergy(amount) {
    if (amount <= 0) {
      return;
    }
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
  }

  /**
   * Khôi phục toàn bộ chỉ số và đặt lại các bộ đếm về trạng thái ban đầu.
   */
  resetStats() {
    this.hp = this.maxHp;
    this.shield = this.maxShield;
    this.energy = this.maxEnergy;

    this.hitFlashTimer = 0;
    this.invulnerableTimer = 0;
    this.shieldRegenDelay = 0;
    this.shieldRegenTick = 0;
    this.shieldRegenFlash = 0;

    this.isDashing = false;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDirX = 0;
    this.dashDirY = 0;
    this.dashTrail = [];

    this.isFiring = false;
    this.animTimer = 0;
    this.animFrame = 0;
    this.isMoving = false;
    this.weaponSystem.cooldown = 0;
    this.weaponSystem.outOfEnergyTimer = 0;
  }

  /**
   * Đặt sạch trạng thái mọi phím di chuyển đang nhấn và trạng thái giữ chuột bắn súng.
   */
  resetInputs() {
    this.keys.clear();
    this.isFiring = false;
  }

  /**
   * Cập nhật vị trí nhân vật, kỹ năng Lướt, tự hồi Giáp và bắn vũ khí.
   * @param {number} dt Thời gian trôi qua giữa hai khung hình (giây).
   * @param {import('./map.js').DungeonMap} map Bản đồ hiện tại.
   * @param {import('./bullet.js').BulletManager | null} [bulletManager=null]
   */
  update(dt, map, bulletManager = null) {
    if (dt <= 0) {
      return;
    }

    this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    this.shieldRegenFlash = Math.max(0, this.shieldRegenFlash - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);

    // Làm mờ dần và xóa các bóng mờ vệt lướt cũ
    for (const ghost of this.dashTrail) {
      ghost.alpha -= dt * 4.5;
    }
    this.dashTrail = this.dashTrail.filter((ghost) => ghost.alpha > 0);

    if (this.hp <= 0) {
      this.isDashing = false;
      this.isFiring = false;
      return;
    }

    // Tự hồi Giáp: chờ 4.0s sau đòn đánh cuối, sau đó hồi +1 mỗi 1.0s
    if (this.shield < this.maxShield) {
      if (this.shieldRegenDelay > 0) {
        this.shieldRegenDelay = Math.max(0, this.shieldRegenDelay - dt);
      } else {
        this.shieldRegenTick += dt;
        while (this.shieldRegenTick >= 1.0 && this.shield < this.maxShield) {
          this.shield = Math.min(this.maxShield, this.shield + 1);
          this.shieldRegenTick -= 1.0;
          this.shieldRegenFlash = 0.25;
          audioManager.play('pickup', { volume: 0.22, pitch: 1.45 });
        }
        if (this.shield >= this.maxShield) {
          this.shieldRegenTick = 0;
        }
      }
    } else {
      this.shieldRegenTick = 0;
    }

    if (this.isDashing) {
      const dashDt = Math.min(dt, this.dashTimer);
      this.dashTrail.push({
        x: this.x,
        y: this.y,
        flipX: this.facingX < 0,
        animFrame: this.animFrame,
        isMoving: true,
        alpha: 0.65,
      });

      this.#moveDash(
        this.dashDirX * this.dashSpeed * dashDt,
        this.dashDirY * this.dashSpeed * dashDt,
        map,
      );

      this.isMoving = true;
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.dashTimer = 0;
        this.isDashing = false;
      }
    } else {
      this.isMoving = this.#updateNormalMovement(dt, map);
    }

    const frameDuration = this.isMoving ? 0.085 : 0.14;
    this.animTimer += dt;
    while (this.animTimer >= frameDuration) {
      this.animTimer -= frameDuration;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    this.weaponSystem.update(dt);
    if (this.isFiring && bulletManager) {
      this.weaponSystem.tryFire(this, this.#aimAngle, bulletManager);
    }
  }

  /**
   * Vẽ vệt lướt, bóng chân, hoạt ảnh Hiệp sĩ, vũ khí xoay theo hướng ngắm và hiệu ứng trạng thái.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    this.#drawDashTrail(ctx);

    const drawX = Math.round(this.x);
    const drawY = Math.round(this.y);
    const left = drawX - Math.floor(this.width / 2);
    const top = drawY - Math.floor(this.height / 2);
    const feetY = this.y + this.height / 2 + 3;

    let alpha = 1;
    if (this.isDashing) {
      // Hơi sáng rực và bán trong suốt nhẹ để báo trạng thái bất tử khi lướt
      alpha = 0.85;
    } else if (
      this.invulnerableTimer > 0 &&
      this.hitFlashTimer <= 0 &&
      Math.floor(this.invulnerableTimer * 18) % 2 === 0
    ) {
      alpha = 0.45;
    }

    ctx.save();

    // Bóng tròn tối bán trong suốt ngay dưới chân nhân vật
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(drawX, this.y + this.height / 2 + 2, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const framePrefix = this.isMoving ? 'knight_run' : 'knight_idle';
    const frameImg = assets.getAnimFrame(framePrefix, this.animFrame);

    if (frameImg) {
      assets.drawSprite(ctx, frameImg, this.x, feetY, 2, {
        flipX: this.facingX < 0,
        alpha,
        flashWhite: this.hitFlashTimer > 0,
      });
    } else {
      // Dự phòng hình khối cũ nếu chưa có sprite
      ctx.globalAlpha = alpha;
      const crestX = this.facingX > 0 ? left + 5 : left + 9;
      ctx.fillStyle = this.isDashing ? '#80d8ff' : '#ff5252';
      ctx.fillRect(crestX, top - 2, 8, 3);

      ctx.fillStyle = this.hitFlashTimer > 0 ? '#7f1d1d' : '#142433';
      ctx.fillRect(left, top, this.width, this.height);

      if (this.hitFlashTimer > 0) {
        ctx.fillStyle = this.hitFlashTimer > 0.09 ? '#ffffff' : '#ffcdd2';
        ctx.fillRect(left + 2, top + 2, this.width - 4, this.height - 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(left + 3, top + 2, this.width - 6, 3);
        ctx.fillStyle = '#ff8a80';
        ctx.fillRect(left + 2, top + 14, this.width - 4, 6);
      } else if (this.isDashing) {
        ctx.fillStyle = '#80d8ff';
        ctx.fillRect(left + 2, top + 2, this.width - 4, this.height - 4);
        ctx.fillStyle = '#e1f5fe';
        ctx.fillRect(left + 3, top + 2, this.width - 6, 4);
        ctx.fillStyle = '#29b6f6';
        ctx.fillRect(left + 2, top + 14, this.width - 4, 6);
      } else {
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(left + 2, top + 2, this.width - 4, this.height - 4);
        ctx.fillStyle = '#b3e5fc';
        ctx.fillRect(left + 3, top + 2, this.width - 6, 3);
        ctx.fillStyle = '#2980b9';
        ctx.fillRect(left + 2, top + 14, this.width - 4, 6);
      }

      const visorX = this.facingX > 0 ? left + 7 : left + 3;
      ctx.fillStyle = '#1a2634';
      ctx.fillRect(visorX, top + 6, 12, 6);

      const eyeOffset = this.facingX > 0 ? 2 : 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(visorX + 2 + eyeOffset, top + 8, 2, 3);
      ctx.fillRect(visorX + 6 + eyeOffset, top + 8, 2, 3);
    }

    ctx.globalAlpha = alpha;
    this.#drawWeapon(ctx, drawX, drawY);

    ctx.restore();

    if (this.shieldRegenFlash > 0) {
      this.#drawShieldRegenRing(ctx, drawX, drawY);
    }

    if (this.weaponSystem.outOfEnergyTimer > 0) {
      this.#drawOutOfEnergyWarning(ctx, drawX, frameImg ? drawY - 26 : top);
    }
  }

  #drawDashTrail(ctx) {
    if (this.dashTrail.length === 0) {
      return;
    }

    for (const ghost of this.dashTrail) {
      const ghostPrefix = ghost.isMoving ? 'knight_run' : 'knight_idle';
      const ghostImg = assets.getAnimFrame(ghostPrefix, ghost.animFrame ?? 0);

      if (ghostImg) {
        assets.drawSprite(
          ctx,
          ghostImg,
          ghost.x,
          ghost.y + this.height / 2 + 3,
          2,
          {
            flipX: Boolean(ghost.flipX),
            alpha: Math.max(0, ghost.alpha),
            tintColor: '#4dd0e1',
          },
        );
      } else {
        const gx = Math.round(ghost.x);
        const gy = Math.round(ghost.y);
        const gLeft = gx - Math.floor(this.width / 2);
        const gTop = gy - Math.floor(this.height / 2);

        ctx.save();
        ctx.globalAlpha = Math.max(0, ghost.alpha);
        ctx.fillStyle = '#4fc3f7';
        ctx.fillRect(gLeft + 1, gTop + 1, this.width - 2, this.height - 2);
        ctx.fillStyle = '#b3e5fc';
        ctx.fillRect(gLeft + 3, gTop + 2, this.width - 6, 4);
        ctx.restore();
      }
    }
  }

  #drawShieldRegenRing(ctx, drawX, drawY) {
    const progress = 1 - this.shieldRegenFlash / 0.25;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.shieldRegenFlash / 0.25);
    ctx.strokeStyle = '#81d4fa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(drawX, drawY, 15 + progress * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  #drawWeapon(ctx, drawX, drawY) {
    const weapon = this.weaponSystem.getCurrentWeapon();
    const handX = drawX + Math.cos(this.#aimAngle) * 3;
    const handY = drawY + 4 + Math.sin(this.#aimAngle) * 2;

    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(this.#aimAngle);
    if (Math.cos(this.#aimAngle) < 0) {
      ctx.scale(1, -1);
    }

    drawPixelWeapon(ctx, weapon, assets);
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
        if (!this.inputEnabled) {
          return;
        }
        if (ARROW_CODES.has(e.code)) {
          e.preventDefault();
        }
        if (MOVEMENT_CODES.has(e.code)) {
          this.keys.add(e.code);
        }
        if (e.code === 'Space') {
          e.preventDefault();
          if (
            !e.repeat &&
            !this.isDashing &&
            this.dashCooldown <= 0 &&
            this.hp > 0
          ) {
            this.#startDash();
          }
        }
        if (e.code === 'KeyQ' && !e.repeat && this.hp > 0) {
          this.weaponSystem.switchWeapon();
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
        if (this.inputEnabled && e.button === 0 && this.hp > 0) {
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
          if (this.inputEnabled && this.hp > 0) {
            this.weaponSystem.switchWeapon();
          }
        },
        { passive: false },
      );
    }
  }

  #startDash() {
    let dirX = 0;
    let dirY = 0;

    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      dirX -= 1;
    }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      dirX += 1;
    }
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      dirY -= 1;
    }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      dirY += 1;
    }

    if (dirX !== 0 || dirY !== 0) {
      const length = Math.hypot(dirX, dirY);
      this.dashDirX = dirX / length;
      this.dashDirY = dirY / length;
    } else {
      this.dashDirX = Math.cos(this.#aimAngle);
      this.dashDirY = Math.sin(this.#aimAngle);
    }

    this.isDashing = true;
    this.dashTimer = this.dashDuration;
    this.dashCooldown = this.dashMaxCooldown;
    audioManager.play('dash', { volume: 0.45 });
    this.dashTrail.push({
      x: this.x,
      y: this.y,
      flipX: this.facingX < 0,
      animFrame: this.animFrame,
      isMoving: true,
      alpha: 0.65,
    });
  }

  #updateNormalMovement(dt, map) {
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

    if (dx === 0 && dy === 0) {
      return false;
    }

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
    return true;
  }

  #moveDash(totalDx, totalDy, map) {
    // Chia nhỏ bước lướt (tối đa 10px mỗi bước) để tuyệt đối không xuyên tường/cột đá
    const distance = Math.hypot(totalDx, totalDy);
    const steps = Math.max(1, Math.ceil(distance / 10));
    const stepX = totalDx / steps;
    const stepY = totalDy / steps;

    for (let i = 0; i < steps; i++) {
      if (stepX !== 0) {
        this.#moveAxis('x', stepX, map);
      }
      if (stepY !== 0) {
        this.#moveAxis('y', stepY, map);
      }
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
