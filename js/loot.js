// Quản lý vật phẩm rơi từ quái (Ngọc năng lượng), Rương vũ khí và Cổng dịch chuyển sang phòng tiếp theo.

import { WEAPONS } from './weapon.js';
import { assets } from './assets.js';
import { audioManager } from './audio.js';

const ROOM_INNER_MIN_X = 38;
const ROOM_INNER_MAX_X = 960 - 38;
const ROOM_INNER_MIN_Y = 38;
const ROOM_INNER_MAX_Y = 576 - 38;

/**
 * Vẽ hộp gợi ý phím tương tác [E] nổi phía trên vật thể.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {string} text
 * @param {string} [borderColor='#ffd54f']
 */
function drawPromptBadge(ctx, x, y, text, borderColor = '#ffd54f') {
  ctx.save();
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText
    ? ctx.measureText(text).width
    : text.length * 6.5;
  const width = Math.ceil(textWidth) + 14;
  const height = 20;
  const bx = Math.round(x - width / 2);
  const by = Math.round(y - height / 2);

  ctx.fillStyle = 'rgba(12, 14, 22, 0.88)';
  ctx.fillRect(bx, by, width, height);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, width - 1, height - 1);

  ctx.fillStyle = '#fffde7';
  ctx.fillText(text, x, y + 0.5);
  ctx.restore();
}

/**
 * Vẽ hình dáng thu nhỏ của vũ khí đang trưng bày phía trên Rương đã mở.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {object} weapon
 */
function drawFloatingWeaponIcon(ctx, cx, cy, weapon) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));

  // Hào quang nhẹ theo màu đạn của vũ khí
  ctx.fillStyle = weapon.bulletColor;
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  const length = weapon.barrelLength ?? 18;
  const left = -Math.round(length / 2);

  if (weapon.id === 'staff') {
    ctx.fillStyle = '#141824';
    ctx.fillRect(left - 1, -2, length - 1, 5);
    ctx.fillStyle = weapon.bodyColor;
    ctx.fillRect(left, -1, length - 4, 3);
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(left + length - 7, -2, 3, 5);

    ctx.fillStyle = '#141824';
    ctx.beginPath();
    ctx.arc(left + length - 2, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = weapon.bulletColor;
    ctx.beginPath();
    ctx.arc(left + length - 2, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(left + length - 2.5, -0.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (weapon.id === 'smg') {
    ctx.fillStyle = '#141824';
    ctx.fillRect(left - 1, -4, length + 1, 7);
    ctx.fillRect(left + 5, 2, 4, 5);
    ctx.fillStyle = weapon.bodyColor;
    ctx.fillRect(left, -3, length - 3, 4);
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(left + 1, -3, length - 6, 1);
    ctx.fillStyle = weapon.bulletColor;
    ctx.fillRect(left + length - 4, -2, 3, 2);
  } else if (weapon.id === 'shotgun') {
    ctx.fillStyle = '#141824';
    ctx.fillRect(left - 1, -4, length + 1, 7);
    ctx.fillStyle = weapon.bodyColor;
    ctx.fillRect(left, -2, 8, 4);
    ctx.fillStyle = '#455a64';
    ctx.fillRect(left + 7, -3, length - 7, 4);
  } else {
    ctx.fillStyle = '#141824';
    ctx.fillRect(left - 1, -4, length, 6);
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(left, 1, 4, 5);
    ctx.fillStyle = weapon.bodyColor;
    ctx.fillRect(left, -3, length - 2, 4);
  }

  ctx.restore();
}

/**
 * Ngọc năng lượng xanh dương rơi ra khi quái bị tiêu diệt, tự hút vào người chơi khi lại gần.
 */
export class EnergyOrb {
  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.energyValue = 8;
    this.active = true;
    this.magnetRange = 120;
    this.pickupRange = 20;
    this.scatterTimer = 0.25;
    this.pulsePhase = Math.random() * Math.PI * 2;

    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 70;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  /**
   * Cập nhật hiệu ứng văng, lực hút về phía player và kiểm tra nhặt ngọc.
   * @param {number} dt
   * @param {object} player
   * @returns {boolean} True nếu ngọc vừa được nhặt ở frame này.
   */
  update(dt, player) {
    if (!this.active || dt <= 0) {
      return false;
    }

    this.pulsePhase += dt * 7;

    if (this.scatterTimer > 0) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const damping = Math.exp(-10 * dt);
      this.vx *= damping;
      this.vy *= damping;
      this.scatterTimer = Math.max(0, this.scatterTimer - dt);
      if (this.scatterTimer <= 0) {
        this.vx = 0;
        this.vy = 0;
      }
      this.x = Math.max(ROOM_INNER_MIN_X, Math.min(ROOM_INNER_MAX_X, this.x));
      this.y = Math.max(ROOM_INNER_MIN_Y, Math.min(ROOM_INNER_MAX_Y, this.y));
    }

    if (player && player.hp > 0) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist < this.pickupRange) {
        if (typeof player.addEnergy === 'function') {
          player.addEnergy(this.energyValue);
        } else {
          player.energy = Math.min(
            player.maxEnergy ?? 100,
            (player.energy ?? 0) + this.energyValue,
          );
        }
        this.active = false;
        audioManager.play('pickup', { volume: 0.35, pitch: 1.1, minInterval: 0.04 });
        return true;
      }

      if (dist < this.magnetRange && dist > 0.0001) {
        const pullSpeed = 200 + (1 - dist / this.magnetRange) * 260;
        this.x += (dx / dist) * pullSpeed * dt;
        this.y += (dy / dist) * pullSpeed * dt;
      }
    }

    return false;
  }

  /**
   * Vẽ viên ngọc hình thoi xanh lam sáng (#29b6f6) có lõi trắng và nhấp nháy nhẹ.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!this.active) {
      return;
    }

    const pulse = 0.8 + Math.sin(this.pulsePhase) * 0.2;
    const drawX = Math.round(this.x);
    const drawY = Math.round(this.y);
    const radius = 5 + Math.sin(this.pulsePhase) * 0.6;

    ctx.save();

    // Quầng sáng xanh lam mờ xung quanh ngọc
    ctx.globalAlpha = 0.25 * pulse;
    ctx.fillStyle = '#29b6f6';
    ctx.beginPath();
    ctx.arc(drawX, drawY, radius + 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Viên ngọc hình thoi viền tối + thân #29b6f6
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#0d2638';
    ctx.beginPath();
    ctx.moveTo(drawX, drawY - radius - 1.5);
    ctx.lineTo(drawX + radius + 1.5, drawY);
    ctx.lineTo(drawX, drawY + radius + 1.5);
    ctx.lineTo(drawX - radius - 1.5, drawY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#29b6f6';
    ctx.beginPath();
    ctx.moveTo(drawX, drawY - radius);
    ctx.lineTo(drawX + radius, drawY);
    ctx.lineTo(drawX, drawY + radius);
    ctx.lineTo(drawX - radius, drawY);
    ctx.closePath();
    ctx.fill();

    // Lõi trắng nhấp nháy nhẹ
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(drawX, drawY - 2.5);
    ctx.lineTo(drawX + 2.5, drawY);
    ctx.lineTo(drawX, drawY + 2.5);
    ctx.lineTo(drawX - 2.5, drawY);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

/**
 * Rương vũ khí xuất hiện ở giữa phòng sau khi dọn sạch phòng 1-1, 1-2, 1-3.
 */
export class WeaponChest {
  /**
   * @param {number} [x=480]
   * @param {number} [y=288]
   */
  constructor(x = 480, y = 288) {
    this.x = x;
    this.y = y;
    this.state = 'closed';
    this.weapon = null;
    this.interactRadius = 60;
    this.floatTime = 0;
  }

  /**
   * Kiểm tra người chơi có đứng trong phạm vi tương tác với rương (< 60px).
   * @param {{ x: number, y: number } | null} player
   * @returns {boolean}
   */
  isPlayerInRange(player) {
    return Boolean(
      player && Math.hypot(player.x - this.x, player.y - this.y) < this.interactRadius,
    );
  }

  /**
   * Mở rương để sinh vũ khí mới hoặc đổi vũ khí đang trưng bày với ô súng hiện tại của người chơi.
   * @param {object} player
   * @returns {{ type: string, weapon: object, previousWeapon?: object | null, message: string } | null}
   */
  interact(player) {
    if (!player || !player.weaponSystem) {
      return null;
    }

    if (this.state === 'closed') {
      const candidates = [WEAPONS.smg, WEAPONS.staff];
      const unowned = candidates.filter(
        (weapon) => !player.weaponSystem.hasWeapon(weapon.id),
      );
      const pool = unowned.length > 0 ? unowned : candidates;
      this.weapon = pool[Math.floor(Math.random() * pool.length)];
      this.state = 'opened';
      audioManager.play('chest', { volume: 0.5, pitch: 1.0 });

      return {
        type: 'chest_open',
        weapon: this.weapon,
        message: `Mở rương: ${this.weapon.name} (${this.weapon.energyCost} EN)!`,
      };
    }

    if (this.state === 'opened' && this.weapon) {
      const equippedWeapon = this.weapon;
      const oldWeapon = player.weaponSystem.swapCurrentWeapon(equippedWeapon);
      this.weapon = oldWeapon;
      audioManager.play('chest', { volume: 0.5, pitch: 1.0 });

      return {
        type: 'weapon_swap',
        weapon: equippedWeapon,
        previousWeapon: oldWeapon,
        message: `Đã trang bị: ${equippedWeapon.name}!`,
      };
    }

    return null;
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    if (dt > 0) {
      this.floatTime += dt;
    }
  }

  /**
   * Vẽ rương (đóng hoặc đã mở kèm vũ khí nổi bên trên) và nhãn gợi ý phím [E].
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} player
   */
  draw(ctx, player) {
    const drawX = Math.round(this.x);
    const drawY = Math.round(this.y);
    const width = 32;
    const height = 24;
    const left = drawX - width / 2;
    const top = drawY - height / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Bóng đổ tròn mờ dưới chân rương
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(drawX, top + height + 1, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const chestImg =
      this.state === 'closed'
        ? assets.get('chest_closed')
        : assets.get('chest_open');

    if (chestImg) {
      // Phóng chẵn 2x từ sprite 16x16 lên 32x32 giữ nguyên nét pixel sắc cạnh
      ctx.drawImage(chestImg, drawX - 16, drawY - 16, 32, 32);
      if (this.state === 'opened' && this.weapon) {
        const floatY = top - 16 + Math.sin(this.floatTime * 4) * 3.5;
        drawFloatingWeaponIcon(ctx, drawX, floatY, this.weapon);
      }
    } else if (this.state === 'closed') {
      // Dự phòng khối màu khi ảnh chưa sẵn sàng
      ctx.fillStyle = '#241409';
      ctx.fillRect(left, top, width, height);

      ctx.fillStyle = '#8d5524';
      ctx.fillRect(left + 2, top + 2, width - 4, height - 4);
      ctx.fillStyle = '#b6783d';
      ctx.fillRect(left + 2, top + 2, width - 4, 8);

      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(left + 2, top + 9, width - 4, 2);
      ctx.fillRect(left + 6, top + 2, 2, height - 4);
      ctx.fillRect(left + width - 8, top + 2, 2, height - 4);

      ctx.fillStyle = '#5d4037';
      ctx.fillRect(drawX - 4, top + 7, 8, 8);
      ctx.fillStyle = '#ffca28';
      ctx.fillRect(drawX - 3, top + 8, 6, 6);
    } else {
      // Dự phòng rương mở
      ctx.fillStyle = '#241409';
      ctx.fillRect(left, top - 8, width, 11);
      ctx.fillStyle = '#a46831';
      ctx.fillRect(left + 2, top - 6, width - 4, 7);
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(left + 2, top - 6, width - 4, 2);

      ctx.fillStyle = '#241409';
      ctx.fillRect(left, top + 3, width, height - 3);
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(left + 2, top + 5, width - 4, 5);
      ctx.fillStyle = '#8d5524';
      ctx.fillRect(left + 2, top + 10, width - 4, height - 12);
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(left + 6, top + 10, 2, height - 12);
      ctx.fillRect(left + width - 8, top + 10, 2, height - 12);

      if (this.weapon) {
        const floatY = top - 16 + Math.sin(this.floatTime * 4) * 3.5;
        drawFloatingWeaponIcon(ctx, drawX, floatY, this.weapon);
      }
    }

    ctx.restore();

    if (this.isPlayerInRange(player)) {
      if (this.state === 'closed') {
        drawPromptBadge(ctx, drawX, top - 18, '[E] Mở rương', '#ffd54f');
      } else if (this.weapon) {
        drawPromptBadge(
          ctx,
          drawX,
          top - 34,
          `[E] Đổi lấy ${this.weapon.name} (${this.weapon.energyCost} EN)`,
          this.weapon.bulletColor ?? '#ffd54f',
        );
      }
    }
  }
}

/**
 * Cổng dịch chuyển xoáy năng lượng tím-xanh ở bên phải phòng để sang phòng kế tiếp.
 */
export class Portal {
  /**
   * @param {number} [x=832]
   * @param {number} [y=288]
   * @param {string} [nextRoomLabel='']
   */
  constructor(x = 832, y = 288, nextRoomLabel = '') {
    this.x = x;
    this.y = y;
    this.nextRoomLabel = nextRoomLabel;
    this.interactRadius = 42;
    this.time = 0;
  }

  /**
   * Kiểm tra người chơi có đứng đủ gần cổng dịch chuyển (< 42px).
   * @param {{ x: number, y: number } | null} player
   * @returns {boolean}
   */
  isPlayerInRange(player) {
    return Boolean(
      player && Math.hypot(player.x - this.x, player.y - this.y) < this.interactRadius,
    );
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    if (dt > 0) {
      this.time += dt;
    }
  }

  /**
   * Vẽ vòng xoáy năng lượng nhiều lớp màu tím-xanh xoay mượt theo thời gian và nhãn [E].
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} player
   */
  draw(ctx, player) {
    const drawX = Math.round(this.x);
    const drawY = Math.round(this.y);
    const pulse = 1 + Math.sin(this.time * 4) * 0.06;

    ctx.save();

    // Hào quang nền tím-xanh bên dưới cổng
    ctx.fillStyle = 'rgba(124, 77, 255, 0.22)';
    ctx.beginPath();
    ctx.arc(drawX, drawY, 30 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(41, 182, 246, 0.2)';
    ctx.beginPath();
    ctx.arc(drawX, drawY, 22 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Các lớp vòng xoáy xoay ngược chiều nhau theo thời gian
    const layers = [
      { radius: 24, speed: 2.2, color: '#ab47bc', width: 3 },
      { radius: 18, speed: -3.2, color: '#7c4dff', width: 3 },
      { radius: 12, speed: 4.5, color: '#29b6f6', width: 2.5 },
    ];

    for (const layer of layers) {
      const baseAngle = this.time * layer.speed;
      ctx.strokeStyle = layer.color;
      ctx.lineWidth = layer.width;
      for (let i = 0; i < 2; i++) {
        const start = baseAngle + i * Math.PI;
        ctx.beginPath();
        ctx.arc(drawX, drawY, layer.radius * pulse, start, start + Math.PI * 0.68);
        ctx.stroke();
      }
    }

    // Tâm cổng xoáy sáng rực
    ctx.fillStyle = '#80d8ff';
    ctx.beginPath();
    ctx.arc(drawX, drawY, 7 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(drawX, drawY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (this.isPlayerInRange(player)) {
      const label = this.nextRoomLabel
        ? `[E] Sang phòng ${this.nextRoomLabel}`
        : '[E] Vào cổng';
      drawPromptBadge(ctx, drawX, drawY - 40, label, '#80d8ff');
    }
  }
}

/**
 * Quản lý toàn bộ Ngọc năng lượng, Rương vũ khí và Cổng dịch chuyển trong phòng hiện tại.
 */
export class LootManager {
  constructor() {
    this.energyOrbs = [];
    this.pickupSparks = [];
    this.weaponChest = null;
    this.portal = null;
  }

  /**
   * Sinh count viên Ngọc năng lượng tại vị trí quái vừa bị hạ.
   * @param {number} x
   * @param {number} y
   * @param {number} [count=2]
   */
  spawnEnergyOrbs(x, y, count = 2) {
    for (let i = 0; i < count; i++) {
      this.energyOrbs.push(new EnergyOrb(x, y));
    }
  }

  /**
   * Sinh phần thưởng cuối phòng: Rương vũ khí ở giữa phòng (1-1..1-3) và Cổng dịch chuyển bên phải.
   * @param {number} roomIndex
   * @param {string} nextRoomLabel
   * @param {object} player
   */
  spawnRoomRewards(roomIndex, nextRoomLabel, player) {
    if (roomIndex < 3) {
      this.weaponChest = new WeaponChest(480, 288);
    }
    if (nextRoomLabel) {
      this.portal = new Portal(832, 288, nextRoomLabel);
    }
    void player;
  }

  /**
   * Xóa sạch ngọc, tia sáng, rương và cổng khi chuyển phòng hoặc chơi lại.
   */
  clearAll() {
    this.energyOrbs = [];
    this.pickupSparks = [];
    this.weaponChest = null;
    this.portal = null;
  }

  /**
   * Xử lý tương tác phím [E] với Cổng dịch chuyển hoặc Rương vũ khí gần người chơi.
   * @param {object} player
   * @returns {{ type: string, [key: string]: any } | null}
   */
  tryInteract(player) {
    if (this.portal && this.portal.isPlayerInRange(player)) {
      audioManager.play('chest', { volume: 0.55, pitch: 1.28 });
      return {
        type: 'portal',
        nextRoomLabel: this.portal.nextRoomLabel,
      };
    }

    if (this.weaponChest && this.weaponChest.isPlayerInRange(player)) {
      return this.weaponChest.interact(player);
    }

    return null;
  }

  /**
   * Cập nhật chuyển động ngọc năng lượng, tia sáng nhặt ngọc, rương và cổng.
   * @param {number} dt
   * @param {object} player
   */
  update(dt, player) {
    for (const orb of this.energyOrbs) {
      const collected = orb.update(dt, player);
      if (collected) {
        this.#spawnPickupSparks(orb.x, orb.y);
      }
    }
    this.energyOrbs = this.energyOrbs.filter((orb) => orb.active);

    if (dt > 0) {
      for (const spark of this.pickupSparks) {
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.timer -= dt;
      }
      this.pickupSparks = this.pickupSparks.filter((spark) => spark.timer > 0);
    }

    this.weaponChest?.update(dt);
    this.portal?.update(dt);
  }

  /**
   * Vẽ cổng dịch chuyển, rương vũ khí, ngọc năng lượng và tia sáng nhặt ngọc.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} player
   */
  draw(ctx, player) {
    this.portal?.draw(ctx, player);
    this.weaponChest?.draw(ctx, player);

    for (const orb of this.energyOrbs) {
      orb.draw(ctx);
    }

    if (this.pickupSparks.length > 0) {
      ctx.save();
      for (const spark of this.pickupSparks) {
        ctx.globalAlpha = Math.max(0, spark.timer / spark.duration);
        ctx.fillStyle = spark.color;
        ctx.fillRect(
          Math.round(spark.x) - 1,
          Math.round(spark.y) - 1,
          3,
          3,
        );
      }
      ctx.restore();
    }
  }

  #spawnPickupSparks(x, y) {
    const count = 6;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 40 + Math.random() * 55;
      const duration = 0.22;
      this.pickupSparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: i % 2 === 0 ? '#80d8ff' : '#ffffff',
        duration,
        timer: duration,
      });
    }
  }
}
