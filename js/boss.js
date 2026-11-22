// Quản lý Boss cuối "VUA HẦM NGỤC" tại phòng 1-4 với 3 chiêu thức luân phiên và Phase 2 cuồng nộ.

import { assets } from './assets.js';
import { audioManager } from './audio.js';
import { vfxManager } from './vfx.js';

const BOSS_ATTACKS = ['ring', 'homing', 'charge'];

/**
 * Kiểm tra toàn bộ các ô gạch mà hitbox Boss (52x52 lớn hơn 1 ô 32x32) giao qua có ô cứng hay không.
 * @param {number} cx
 * @param {number} cy
 * @param {number} width
 * @param {number} height
 * @param {import('./map.js').DungeonMap} map
 * @returns {boolean}
 */
function collidesRectWithMap(cx, cy, width, height, map) {
  const halfW = width / 2;
  const halfH = height / 2;
  const eps = 0.001;
  const tileSize = map.tileSize;

  const minCol = Math.floor((cx - halfW) / tileSize);
  const maxCol = Math.floor((cx + halfW - eps) / tileSize);
  const minRow = Math.floor((cy - halfH) / tileSize);
  const maxRow = Math.floor((cy + halfH - eps) / tileSize);

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const solid =
        typeof map.isSolidTile === 'function'
          ? map.isSolidTile(col, row)
          : map.isSolidAt(col * tileSize + 1, row * tileSize + 1);
      if (solid) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Đại diện cho Boss cuối ở phòng 1-4 với thanh máu lớn, Phase 2 cuồng nộ và 3 chiêu thức xen kẽ.
 */
export class Boss {
  #onDropEnergy = null;

  /**
   * @param {number} [x=720]
   * @param {number} [y=288]
   */
  constructor(x = 720, y = 288) {
    this.x = x;
    this.y = y;
    this.width = 52;
    this.height = 52;
    this.radius = 28;

    this.name = 'VUA HẦM NGỤC';
    this.maxHp = 200;
    this.hp = 200;
    this.speed = 85;
    this.active = true;
    this.hitFlashTimer = 0;
    this.contactCooldown = 0;

    this.isEnraged = false;
    this.aimAngle = Math.PI;

    // Hoạt ảnh Pixel Art của Boss (Big Demon)
    this.animTimer = 0;
    this.animFrame = 0;
    this.facingX = -1;
    this.isMoving = false;

    // Mốc máu rơi Ngọc năng lượng giúp người chơi duy trì năng lượng suốt trận Boss
    this.energyMilestones = [0.75, 0.5, 0.25];
    this.nextMilestoneIndex = 0;
    this.pendingEnergyDrops = 0;

    // Máy trạng thái AI luân phiên 3 chiêu thức: 'idle' -> 'telegraph' -> 'attack' -> 'idle'
    this.state = 'idle';
    this.stateTimer = 1.35;
    this.currentAttack = null;
    this.lastAttack = null;
    this.telegraphDuration = 0;

    // Tham số chiêu 1: vòng tròn đạn 2 đợt
    this.ringWaveTimer = 0;
    this.ringWavesFired = 0;

    // Tham số chiêu 3: lướt áp sát
    this.chargeDirX = -1;
    this.chargeDirY = 0;
    this.chargeTimer = 0;
    this.chargeLaserEndX = x;
    this.chargeLaserEndY = y;
    this.chargeTrail = [];

    // Hiệu ứng nổ lớn khi Boss bị tiêu diệt
    this.deathParticles = [];
    this.deathShockwaveTimer = 0;
    this.deathShockwaveDuration = 0.45;
  }

  /**
   * Trừ máu Boss, bật Phase 2 ở 50% HP, kiểm tra mốc rơi ngọc năng lượng và kích hoạt nổ khi hp <= 0.
   * @param {number} amount
   */
  takeDamage(amount) {
    if (!this.active || amount <= 0) {
      return;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashTimer = 0.1;

    if (!this.isEnraged && this.hp <= this.maxHp * 0.5) {
      this.isEnraged = true;
      if (this.hp > 0) {
        audioManager.play('hurt', { volume: 0.5, pitch: 0.65, minInterval: 0 });
        vfxManager.addShake(8, 0.35);
        vfxManager.spawnBurst(this.x, this.y, '#ff1744', 20, 210, 0.5);
        vfxManager.spawnFloatingText(
          this.x,
          this.y - 36,
          'CUỒNG NỘ!',
          '#ff5252',
          16,
        );
      }
    }

    while (
      this.nextMilestoneIndex < this.energyMilestones.length &&
      this.hp <= this.maxHp * this.energyMilestones[this.nextMilestoneIndex]
    ) {
      this.nextMilestoneIndex += 1;
      if (this.#onDropEnergy) {
        this.#onDropEnergy(this.x, this.y, 4);
      } else {
        this.pendingEnergyDrops += 1;
      }
    }

    if (this.hp <= 0) {
      this.active = false;
      this.chargeTrail = [];
      audioManager.play('explosion', { volume: 0.75, pitch: 0.75, minInterval: 0 });
      vfxManager.addShake(11, 0.45);
      this.#spawnDeathExplosion();
    }
  }

  /**
   * Cập nhật AI 3 chiêu thức, di chuyển trượt tường/cột, sát thương chạm và hiệu ứng hạt nổ.
   * @param {number} dt
   * @param {import('./map.js').DungeonMap} map
   * @param {object} player
   * @param {import('./bullet.js').BulletManager} bulletManager
   * @param {((x: number, y: number, count: number) => void) | null} [onDropEnergy=null]
   */
  update(dt, map, player, bulletManager, onDropEnergy = null) {
    if (typeof onDropEnergy === 'function') {
      this.#onDropEnergy = onDropEnergy;
    }

    while (this.pendingEnergyDrops > 0 && this.#onDropEnergy) {
      this.pendingEnergyDrops -= 1;
      this.#onDropEnergy(this.x, this.y, 4);
    }

    if (dt > 0) {
      this.#updateDeathExplosion(dt);
    }

    if (!this.active || dt <= 0) {
      return;
    }

    this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    this.contactCooldown = Math.max(0, this.contactCooldown - dt);

    for (const ghost of this.chargeTrail) {
      ghost.alpha -= dt * 5.0;
    }
    this.chargeTrail = this.chargeTrail.filter((ghost) => ghost.alpha > 0);

    const prevX = this.x;
    const prevY = this.y;

    if (player) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      if (Math.hypot(dx, dy) > 0.0001) {
        this.aimAngle = Math.atan2(dy, dx);
      }
      // Giữ nguyên hướng lao trong lúc tụ và lướt charge; còn lại quay mặt về phía player
      if (
        (this.state === 'telegraph' || this.state === 'attack') &&
        this.currentAttack === 'charge'
      ) {
        this.facingX = this.chargeDirX >= 0 ? 1 : -1;
      } else {
        this.facingX = dx >= 0 ? 1 : -1;
      }
    }

    if (this.state === 'idle') {
      this.#updateIdle(dt, map, player);
    } else if (this.state === 'telegraph') {
      this.#updateTelegraph(dt, map, player, bulletManager);
    } else if (this.state === 'attack') {
      this.#updateAttack(dt, map, bulletManager);
    }

    // Chốt tọa độ Boss trong vùng sàn chơi an toàn (tính cả nửa kích thước Boss)
    this.x = Math.max(58, Math.min(902, this.x));
    this.y = Math.max(58, Math.min(518, this.y));

    const movedDist = Math.hypot(this.x - prevX, this.y - prevY);
    this.isMoving =
      movedDist > 0.2 ||
      (this.state === 'attack' && this.currentAttack === 'charge');

    let frameDuration = this.isMoving ? 0.095 : 0.14;
    if (this.state === 'attack' && this.currentAttack === 'charge') {
      frameDuration = 0.06;
    } else if (this.isEnraged) {
      frameDuration *= 0.8;
    }

    this.animTimer += dt;
    while (this.animTimer >= frameDuration) {
      this.animTimer -= frameDuration;
      this.animFrame = (this.animFrame + 1) % 4;
    }

    if (player && player.hp > 0) {
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist < this.radius + 12 && this.contactCooldown <= 0) {
        if (player.takeDamage?.(1)) {
          this.contactCooldown = 0.8;
        }
      }
    }
  }

  /**
   * Vẽ bóng, hào quang cuồng nộ, sprite hoạt ảnh Boss, đường cảnh báo chiêu và vụ nổ khi gục.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    this.#drawChargeTrail(ctx);

    if (this.active) {
      const drawX = Math.round(this.x);
      const drawY = Math.round(this.y);
      const left = drawX - Math.floor(this.width / 2);
      const top = drawY - Math.floor(this.height / 2);
      const feetY = this.y + this.height / 2 + 6;
      const isFlashing = this.hitFlashTimer > 0;

      ctx.save();

      // Bóng elip lớn đậm dưới chân Boss
      ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
      ctx.beginPath();
      ctx.ellipse(drawX, this.y + this.height / 2 + 4, 28, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Vòng hào quang đỏ rực nhấp nháy khi Boss ở Phase 2 Cuồng nộ
      if (this.isEnraged) {
        const now =
          typeof performance !== 'undefined' ? performance.now() : Date.now();
        const pulse = 0.28 + Math.sin(now * 0.012) * 0.14;
        ctx.fillStyle = `rgba(255, 23, 68, ${pulse.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(drawX, drawY, this.radius + 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 82, 82, ${(pulse + 0.35).toFixed(2)})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(drawX, feetY - 4, 30, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      const framePrefix = this.isMoving ? 'boss_run' : 'boss_idle';
      const frameImg = assets.getAnimFrame(framePrefix, this.animFrame);

      if (frameImg) {
        assets.drawSprite(ctx, frameImg, this.x, feetY, 2, {
          flipX: this.facingX < 0,
          flashWhite: isFlashing,
        });
      } else {
        // Dự phòng khối màu uy nghiêm cũ nếu chưa có sprite
        ctx.fillStyle = isFlashing
          ? '#ffffff'
          : this.isEnraged
            ? '#ff1744'
            : '#1e092e';
        ctx.fillRect(left + 3, top, this.width - 6, this.height);
        ctx.fillRect(left, top + 3, this.width, this.height - 6);

        ctx.fillStyle = isFlashing ? '#ffffff' : '#4a148c';
        ctx.fillRect(left + 4, top + 4, this.width - 8, this.height - 8);

        if (!isFlashing) {
          ctx.fillStyle = this.isEnraged ? '#8e24aa' : '#6a1b9a';
          ctx.fillRect(left + 6, top + 4, this.width - 12, 8);
          ctx.fillStyle = '#310b5e';
          ctx.fillRect(left + 4, top + this.height - 14, this.width - 8, 10);

          ctx.fillStyle = this.isEnraged ? '#b71c1c' : '#380d6b';
          ctx.fillRect(left + 12, top + 30, this.width - 24, 12);
          ctx.fillStyle = '#ffd54f';
          ctx.fillRect(drawX - 4, top + 33, 8, 6);
        }

        this.#drawCrown(ctx, drawX, top);

        const lookX = Math.cos(this.aimAngle) >= 0 ? 3 : -3;
        const lookY = Math.round(Math.sin(this.aimAngle) * 2);
        const eyeCenterX = drawX + lookX;
        const eyeCenterY = drawY - 4 + lookY;

        ctx.fillStyle = '#140421';
        ctx.fillRect(eyeCenterX - 15, eyeCenterY - 6, 30, 12);

        ctx.fillStyle = this.isEnraged ? '#ff5252' : '#8e24aa';
        ctx.fillRect(eyeCenterX - 13, eyeCenterY - 5, 10, 3);
        ctx.fillRect(eyeCenterX + 3, eyeCenterY - 5, 10, 3);

        const eyeColor = this.isEnraged ? '#ff1744' : '#ffeb3b';
        const eyeCore = this.isEnraged ? '#ff8a80' : '#ffffff';
        ctx.fillStyle = eyeColor;
        ctx.fillRect(eyeCenterX - 11, eyeCenterY - 1, 7, 5);
        ctx.fillRect(eyeCenterX + 4, eyeCenterY - 1, 7, 5);
        ctx.fillStyle = eyeCore;
        ctx.fillRect(eyeCenterX - 9, eyeCenterY, 3, 2);
        ctx.fillRect(eyeCenterX + 6, eyeCenterY, 3, 2);
      }

      ctx.restore();

      // Vẽ các dấu hiệu cảnh báo chiêu thức lên trên cùng để không bị thân Boss che mất
      this.#drawTelegraph(ctx);
    }

    this.#drawDeathExplosion(ctx);
  }

  #updateIdle(dt, map, player) {
    if (player && player.hp > 0) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        const moveSpeed = this.isEnraged ? this.speed * 1.15 : this.speed;
        this.#moveAxis('x', (dx / dist) * moveSpeed * dt, map);
        this.#moveAxis('y', (dy / dist) * moveSpeed * dt, map);
      }
    }

    this.stateTimer -= dt;
    if (this.stateTimer <= 0) {
      const candidates = BOSS_ATTACKS.filter((atk) => atk !== this.lastAttack);
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      this.currentAttack = chosen;
      this.lastAttack = chosen;
      this.state = 'telegraph';

      if (chosen === 'ring') {
        this.telegraphDuration = this.isEnraged ? 0.45 : 0.55;
      } else if (chosen === 'homing') {
        this.telegraphDuration = this.isEnraged ? 0.36 : 0.45;
      } else {
        this.telegraphDuration = this.isEnraged ? 0.52 : 0.65;
        this.#lockChargeDirection(map, player);
      }
      this.stateTimer = this.telegraphDuration;
    }
  }

  #updateTelegraph(dt, map, player, bulletManager) {
    this.stateTimer -= dt;
    if (this.stateTimer > 0) {
      return;
    }

    this.state = 'attack';
    if (this.currentAttack === 'ring') {
      this.#fireRingWave(bulletManager, 0);
      this.ringWavesFired = 1;
      this.ringWaveTimer = this.isEnraged ? 0.28 : 0.35;
    } else if (this.currentAttack === 'homing') {
      this.#fireHomingVolley(bulletManager, player);
      this.#enterIdleState();
    } else if (this.currentAttack === 'charge') {
      this.chargeTimer = 0.55;
      audioManager.play('hurt', { volume: 0.5, pitch: 0.65 });
    }
    void map;
  }

  #updateAttack(dt, map, bulletManager) {
    if (this.currentAttack === 'ring') {
      this.ringWaveTimer -= dt;
      if (this.ringWaveTimer <= 0) {
        const count = this.isEnraged ? 16 : 12;
        this.#fireRingWave(bulletManager, Math.PI / count);
        this.ringWavesFired = 2;
        this.#enterIdleState();
      }
    } else if (this.currentAttack === 'charge') {
      this.chargeTrail.push({
        x: this.x,
        y: this.y,
        flipX: this.facingX < 0,
        animFrame: this.animFrame,
        alpha: 0.45,
      });

      const chargeSpeed = 480;
      const stepDist = chargeSpeed * Math.min(dt, Math.max(0, this.chargeTimer));
      const hitWall = this.#moveCharge(
        this.chargeDirX * stepDist,
        this.chargeDirY * stepDist,
        map,
      );

      this.chargeTimer -= dt;
      if (hitWall || this.chargeTimer <= 0) {
        if (hitWall) {
          vfxManager.addShake(6.5, 0.2);
          vfxManager.spawnBurst(this.x, this.y, '#ffab40', 12, 160, 0.35);
        }
        this.#fireChargeBurst(bulletManager);
        this.#enterIdleState();
      }
    }
  }

  #enterIdleState() {
    this.state = 'idle';
    this.currentAttack = null;
    this.stateTimer = this.isEnraged ? 0.95 : 1.35;
  }

  #fireRingWave(bulletManager, angleOffset) {
    if (!bulletManager) {
      return;
    }
    const count = this.isEnraged ? 16 : 12;
    const step = (Math.PI * 2) / count;
    const spawnDist = this.radius - 2;

    for (let i = 0; i < count; i++) {
      const angle = angleOffset + step * i;
      const spawnX = this.x + Math.cos(angle) * spawnDist;
      const spawnY = this.y + Math.sin(angle) * spawnDist;
      bulletManager.spawn(
        spawnX,
        spawnY,
        angle,
        200,
        1,
        5.5,
        '#ff3b3b',
        'enemy',
      );
    }
  }

  #fireHomingVolley(bulletManager, player) {
    if (!bulletManager) {
      return;
    }
    const baseAngle = player
      ? Math.atan2(player.y - this.y, player.x - this.x)
      : this.aimAngle;
    const count = this.isEnraged ? 4 : 3;
    const fanSpread = this.isEnraged ? 0.56 : 0.44;
    const step = fanSpread / (count - 1);
    const startAngle = baseAngle - fanSpread / 2;
    const spawnDist = this.radius;

    for (let i = 0; i < count; i++) {
      const angle = startAngle + step * i;
      const spawnX = this.x + Math.cos(angle) * spawnDist;
      const spawnY = this.y + Math.sin(angle) * spawnDist;
      bulletManager.spawn(
        spawnX,
        spawnY,
        angle,
        190,
        1,
        6,
        '#ff6d00',
        'enemy',
        {
          homing: true,
          turnSpeed: 1.55,
          homingDuration: 2.3,
        },
      );
    }
  }

  #fireChargeBurst(bulletManager) {
    if (!bulletManager) {
      return;
    }
    const count = this.isEnraged ? 8 : 6;
    const step = (Math.PI * 2) / count;
    const spawnDist = this.radius;

    for (let i = 0; i < count; i++) {
      const angle = step * i;
      const spawnX = this.x + Math.cos(angle) * spawnDist;
      const spawnY = this.y + Math.sin(angle) * spawnDist;
      bulletManager.spawn(
        spawnX,
        spawnY,
        angle,
        180,
        1,
        5,
        '#ff3b3b',
        'enemy',
      );
    }
  }

  #lockChargeDirection(map, player) {
    let dirX = -1;
    let dirY = 0;
    if (player) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.0001) {
        dirX = dx / dist;
        dirY = dy / dist;
      }
    }

    this.chargeDirX = dirX;
    this.chargeDirY = dirY;

    // Tính điểm kết thúc đường laser cảnh báo chạm tường/cột đá để người chơi kịp quan sát né
    const maxRay = 420;
    const step = 8;
    let endX = this.x + dirX * maxRay;
    let endY = this.y + dirY * maxRay;
    for (let d = this.radius; d <= maxRay; d += step) {
      const rx = this.x + dirX * d;
      const ry = this.y + dirY * d;
      if (map.isSolidAt(rx, ry)) {
        endX = rx;
        endY = ry;
        break;
      }
    }
    this.chargeLaserEndX = endX;
    this.chargeLaserEndY = endY;
  }

  #moveCharge(totalDx, totalDy, map) {
    const distance = Math.hypot(totalDx, totalDy);
    const steps = Math.max(1, Math.ceil(distance / 10));
    const stepX = totalDx / steps;
    const stepY = totalDy / steps;

    let hitAny = false;
    for (let i = 0; i < steps; i++) {
      const hitX = stepX !== 0 ? this.#moveAxis('x', stepX, map) : false;
      const hitY = stepY !== 0 ? this.#moveAxis('y', stepY, map) : false;
      if (hitX && hitY) {
        return true;
      }
      if (hitX || hitY) {
        hitAny = true;
      }
    }
    return hitAny;
  }

  #moveAxis(axis, delta, map) {
    if (delta === 0) {
      return false;
    }

    const isX = axis === 'x';
    const half = (isX ? this.width : this.height) / 2;
    const newPos = this[axis] + delta;
    const testX = isX ? newPos : this.x;
    const testY = isX ? this.y : newPos;

    if (!collidesRectWithMap(testX, testY, this.width, this.height, map)) {
      this[axis] = newPos;
      return false;
    }

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
    if (!collidesRectWithMap(snapX, snapY, this.width, this.height, map)) {
      this[axis] = snappedPos;
    }

    return true;
  }

  #drawCrown(ctx, drawX, top) {
    const crownY = top - 9;

    // Viền tối cho vương miện
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(drawX - 15, crownY + 4, 30, 8);
    ctx.fillRect(drawX - 15, crownY, 6, 5);
    ctx.fillRect(drawX - 4, crownY - 2, 8, 7);
    ctx.fillRect(drawX + 9, crownY, 6, 5);

    // Thân vương miện vàng #ffd54f và đổ bóng cam vàng
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(drawX - 14, crownY + 5, 28, 5);
    ctx.fillRect(drawX - 14, crownY + 1, 4, 5);
    ctx.fillRect(drawX - 3, crownY - 1, 6, 7);
    ctx.fillRect(drawX + 10, crownY + 1, 4, 5);

    ctx.fillStyle = '#ff8f00';
    ctx.fillRect(drawX - 14, crownY + 8, 28, 2);

    // Viên ngọc đỏ gắn chính giữa vương miện
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(drawX - 2, crownY + 4, 4, 4);
  }

  #drawTelegraph(ctx) {
    if (this.state !== 'telegraph' || this.telegraphDuration <= 0) {
      return;
    }

    const progress = Math.max(
      0,
      Math.min(1, 1 - this.stateTimer / this.telegraphDuration),
    );

    ctx.save();

    if (this.currentAttack === 'ring') {
      const ringRadius = this.radius + 8 + progress * 24;
      ctx.globalAlpha = 0.35 + progress * 0.5;
      ctx.strokeStyle = '#ff3b3b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.currentAttack === 'homing') {
      const auraRadius = 12 + progress * 22;
      ctx.globalAlpha = 0.3 + progress * 0.45;
      ctx.fillStyle = '#ff6d00';
      ctx.beginPath();
      ctx.arc(this.x, this.y, auraRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#e040fb';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, auraRadius + 4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.currentAttack === 'charge') {
      const blink = Math.floor(this.stateTimer * 18) % 2 === 0;
      ctx.strokeStyle = blink
        ? 'rgba(255, 23, 68, 0.92)'
        : 'rgba(255, 138, 128, 0.55)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 7]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.chargeLaserEndX, this.chargeLaserEndY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Điểm dấu đỏ tại vị trí cuối đường laser
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(this.chargeLaserEndX, this.chargeLaserEndY, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  #drawChargeTrail(ctx) {
    if (this.chargeTrail.length === 0) {
      return;
    }

    const tintColor = this.isEnraged ? '#ff1744' : '#ab47bc';
    for (const ghost of this.chargeTrail) {
      const ghostImg = assets.getAnimFrame(
        'boss_run',
        ghost.animFrame ?? this.animFrame,
      );
      if (ghostImg) {
        assets.drawSprite(
          ctx,
          ghostImg,
          ghost.x,
          ghost.y + this.height / 2 + 6,
          2,
          {
            flipX: Boolean(ghost.flipX),
            alpha: Math.max(0, ghost.alpha),
            tintColor,
          },
        );
      } else {
        const left = Math.round(ghost.x - this.width / 2);
        const top = Math.round(ghost.y - this.height / 2);
        ctx.save();
        ctx.globalAlpha = Math.max(0, ghost.alpha);
        ctx.fillStyle = this.isEnraged ? '#ff1744' : '#7b1fa2';
        ctx.fillRect(left + 2, top + 2, this.width - 4, this.height - 4);
        ctx.restore();
      }
    }
  }

  #spawnDeathExplosion() {
    const palette = ['#ff1744', '#ff6d00', '#ffd54f', '#ab47bc', '#ffffff'];
    const count = 42;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
      const speed = 75 + Math.random() * 195;
      const duration = 0.55 + Math.random() * 0.45;
      this.deathParticles.push({
        x: this.x + (Math.random() - 0.5) * 20,
        y: this.y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: i % 3 === 0 ? 7 : 5,
        color: palette[i % palette.length],
        duration,
        timer: duration,
      });
    }

    this.deathShockwaveTimer = this.deathShockwaveDuration;
  }

  #updateDeathExplosion(dt) {
    if (this.deathShockwaveTimer > 0) {
      this.deathShockwaveTimer = Math.max(0, this.deathShockwaveTimer - dt);
    }

    for (const particle of this.deathParticles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.exp(-2.2 * dt);
      particle.vy *= Math.exp(-2.2 * dt);
      particle.timer -= dt;
    }
    this.deathParticles = this.deathParticles.filter(
      (particle) => particle.timer > 0,
    );
  }

  #drawDeathExplosion(ctx) {
    if (this.deathShockwaveTimer > 0) {
      const ratio = this.deathShockwaveTimer / this.deathShockwaveDuration;
      const progress = 1 - ratio;
      ctx.save();
      ctx.globalAlpha = ratio;
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 26 + progress * 95, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.deathParticles.length === 0) {
      return;
    }

    ctx.save();
    for (const particle of this.deathParticles) {
      ctx.globalAlpha = Math.max(0, particle.timer / particle.duration);
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        Math.round(particle.x - particle.size / 2),
        Math.round(particle.y - particle.size / 2),
        particle.size,
        particle.size,
      );
    }
    ctx.restore();
  }
}
