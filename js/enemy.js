// Quản lý kẻ địch thường, Boss, hành vi chiến đấu và vật phẩm rơi ra.

const ENEMY_CONFIG = Object.freeze({
  melee: Object.freeze({
    maxHp: 14,
    speed: 110,
    color: '#e53935',
  }),
  ranged: Object.freeze({
    maxHp: 10,
    speed: 75,
    color: '#ab47bc',
  }),
});

/**
 * Kiểm tra 4 góc hitbox của một thực thể có chạm ô cứng trên bản đồ hay không.
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

/**
 * Đại diện cho quái vật (Cận chiến hoặc Đánh xa) trong phòng hầm ngục.
 */
export class Enemy {
  #onDeath = null;
  #deathHandled = false;

  /**
   * @param {number} x
   * @param {number} y
   * @param {'melee' | 'ranged'} [type='melee']
   * @param {((enemy: Enemy) => void) | null} [onDeath=null]
   */
  constructor(x, y, type = 'melee', onDeath = null) {
    const config = ENEMY_CONFIG[type] ?? ENEMY_CONFIG.melee;

    this.x = x;
    this.y = y;
    this.type = type === 'ranged' ? 'ranged' : 'melee';
    this.width = 22;
    this.height = 22;
    this.radius = 12;

    this.maxHp = config.maxHp;
    this.hp = config.maxHp;
    this.speed = config.speed;

    this.active = true;
    this.hitFlashTimer = 0;
    this.attackCooldown =
      this.type === 'ranged' ? 0.9 + Math.random() * 0.9 : 0;

    this.aimAngle = 0;
    this.chargeRatio = 0;
    this.deathNotified = false;
    this.#onDeath = onDeath;
  }

  /**
   * Gây sát thương cho quái, bật nhấp nháy trắng và xử lý khi hết máu.
   * @param {number} amount
   */
  takeDamage(amount) {
    if (!this.active || amount <= 0) {
      return;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashTimer = 0.12;

    if (this.hp <= 0) {
      this.active = false;
      this.markDeathHandled();
    }
  }

  /**
   * Đánh dấu và kích hoạt callback sinh hạt pixel khi quái bị hạ gục (chỉ gọi một lần).
   * @returns {boolean}
   */
  markDeathHandled() {
    if (this.#deathHandled) {
      return false;
    }
    this.#deathHandled = true;
    this.#onDeath?.(this);
    return true;
  }

  /**
   * Cập nhật AI di chuyển/tấn công, tách quái và va chạm trượt tường theo từng trục.
   * @param {number} dt
   * @param {import('./map.js').DungeonMap} map
   * @param {object} player
   * @param {import('./bullet.js').BulletManager} bulletManager
   * @param {Enemy[]} [allEnemies=[]]
   */
  update(dt, map, player, bulletManager, allEnemies = []) {
    if (!this.active || dt <= 0) {
      return;
    }

    this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0.0001) {
      this.aimAngle = Math.atan2(dy, dx);
    }

    let vx = 0;
    let vy = 0;

    if (this.type === 'melee') {
      this.chargeRatio = 0;
      if (dist > 1) {
        vx = (dx / dist) * this.speed;
        vy = (dy / dist) * this.speed;
      }
    } else {
      // Quái đánh xa giữ khoảng cách chiến đấu 190px - 270px
      if (dist > 270) {
        vx = (dx / dist) * this.speed;
        vy = (dy / dist) * this.speed;
      } else if (dist < 190) {
        if (dist > 0.0001) {
          vx = -(dx / dist) * (this.speed * 0.75);
          vy = -(dy / dist) * (this.speed * 0.75);
        } else {
          vx = this.speed * 0.75;
        }
      }

      if (dist <= 380) {
        // Nháy sáng nhẹ ở đầu trượng trong 0.45s cuối trước khi bắn
        this.chargeRatio =
          this.attackCooldown <= 0.45
            ? Math.min(1, Math.max(0, 1 - this.attackCooldown / 0.45))
            : 0;

        if (this.attackCooldown <= 0 && bulletManager) {
          const staffTipDist = 16;
          const spawnX = this.x + Math.cos(this.aimAngle) * staffTipDist;
          const spawnY = this.y + Math.sin(this.aimAngle) * staffTipDist;
          bulletManager.spawn(
            spawnX,
            spawnY,
            this.aimAngle,
            220,
            1,
            5,
            '#ff3b3b',
            'enemy',
          );
          this.attackCooldown = 1.8 + Math.random() * 0.4;
          this.chargeRatio = 0;
        }
      } else {
        this.chargeRatio = 0;
      }
    }

    // Lực đẩy tách nhẹ để các quái không chồng khít lên nhau
    const sep = this.#computeSeparation(allEnemies);
    const stepX = (vx + sep.x) * dt;
    const stepY = (vy + sep.y) * dt;

    if (stepX !== 0) {
      this.#moveAxis('x', stepX, map);
    }
    if (stepY !== 0) {
      this.#moveAxis('y', stepY, map);
    }

    // Kiểm tra đòn cận chiến sau khi đã cập nhật vị trí trượt tường
    if (this.type === 'melee') {
      const updatedDist = Math.hypot(player.x - this.x, player.y - this.y);
      if (updatedDist < this.radius + 12 && this.attackCooldown <= 0) {
        if (player.takeDamage?.(1)) {
          this.attackCooldown = 0.8;
        }
      }
    }
  }

  /**
   * Vẽ quái cận chiến/đánh xa và thanh máu nhỏ phía trên đầu (khi hp < maxHp).
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!this.active) {
      return;
    }

    const drawX = Math.round(this.x);
    const drawY = Math.round(this.y);
    const left = drawX - Math.floor(this.width / 2);
    const top = drawY - Math.floor(this.height / 2);
    const isFlashing = this.hitFlashTimer > 0;

    ctx.save();

    // Bóng tròn mờ dưới chân quái
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.beginPath();
    ctx.ellipse(drawX, top + this.height, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.type === 'melee') {
      this.#drawMeleeBody(ctx, drawX, drawY, left, top, isFlashing);
    } else {
      this.#drawRangedBody(ctx, drawX, drawY, left, top, isFlashing);
    }

    if (this.hp < this.maxHp && this.hp > 0) {
      this.#drawHealthBar(ctx, drawX, top);
    }

    ctx.restore();
  }

  #drawMeleeBody(ctx, drawX, drawY, left, top, isFlashing) {
    // Khối thân vuông bo góc nhẹ (cắt 1px ở 4 góc)
    ctx.fillStyle = '#3d0e0e';
    ctx.fillRect(left + 1, top, this.width - 2, this.height);
    ctx.fillRect(left, top + 1, this.width, this.height - 2);

    ctx.fillStyle = isFlashing ? '#ffffff' : '#e53935';
    ctx.fillRect(left + 2, top + 2, this.width - 4, this.height - 4);

    if (!isFlashing) {
      ctx.fillStyle = '#ff6f60';
      ctx.fillRect(left + 3, top + 2, this.width - 6, 3);
      ctx.fillStyle = '#b71c1c';
      ctx.fillRect(left + 2, top + 15, this.width - 4, 5);
    }

    // Hai mắt vàng giận dữ nhìn hướng về phía player
    const lookX = Math.cos(this.aimAngle) >= 0 ? 1 : -1;
    const lookY = Math.round(Math.sin(this.aimAngle));
    const eyeBaseX = drawX + lookX * 2;
    const eyeY = drawY - 2 + lookY;

    ctx.fillStyle = '#2b0909';
    ctx.fillRect(eyeBaseX - 6, eyeY - 2, 5, 2);
    ctx.fillRect(eyeBaseX + 1, eyeY - 2, 5, 2);

    ctx.fillStyle = '#ffeb3b';
    ctx.fillRect(eyeBaseX - 5, eyeY, 3, 3);
    ctx.fillRect(eyeBaseX + 2, eyeY, 3, 3);
  }

  #drawRangedBody(ctx, drawX, drawY, left, top, isFlashing) {
    // Thân áo choàng màu tím có mũ trùm
    ctx.fillStyle = '#2a0f33';
    ctx.fillRect(left + 1, top, this.width - 2, this.height);
    ctx.fillRect(left, top + 1, this.width, this.height - 2);

    ctx.fillStyle = isFlashing ? '#ffffff' : '#ab47bc';
    ctx.fillRect(left + 2, top + 2, this.width - 4, this.height - 4);

    if (!isFlashing) {
      ctx.fillStyle = '#ce93d8';
      ctx.fillRect(left + 3, top + 2, this.width - 6, 3);
      ctx.fillStyle = '#7b1fa2';
      ctx.fillRect(left + 2, top + 14, this.width - 4, 6);
    }

    // Mắt phát sáng bên trong mũ trùm
    const lookX = Math.cos(this.aimAngle) >= 0 ? 2 : -2;
    ctx.fillStyle = '#1e0826';
    ctx.fillRect(drawX - 6 + lookX * 0.5, top + 6, 12, 6);
    ctx.fillStyle = '#ff80ab';
    ctx.fillRect(drawX - 4 + lookX, top + 8, 2, 2);
    ctx.fillRect(drawX + 2 + lookX, top + 8, 2, 2);

    // Cây trượng nhỏ xoay về phía player và nháy sáng trước lúc bắn
    ctx.save();
    ctx.translate(drawX, drawY + 2);
    ctx.rotate(this.aimAngle);

    ctx.fillStyle = '#3e2723';
    ctx.fillRect(6, -1, 12, 3);
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(6, -1, 11, 2);

    if (this.chargeRatio > 0) {
      ctx.fillStyle =
        this.chargeRatio > 0.5 ? '#ffffff' : 'rgba(255, 82, 82, 0.85)';
      ctx.beginPath();
      ctx.arc(19, 0, 4 + this.chargeRatio * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#4a148c';
    ctx.beginPath();
    ctx.arc(19, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.chargeRatio > 0.35 ? '#ffffff' : '#ff5252';
    ctx.beginPath();
    ctx.arc(19, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  #drawHealthBar(ctx, drawX, top) {
    const barWidth = 24;
    const barHeight = 4;
    const barX = drawX - barWidth / 2;
    const barY = top - 8;
    const ratio = Math.max(0, Math.min(1, this.hp / this.maxHp));

    ctx.fillStyle = '#141824';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
    ctx.fillStyle = '#2d1b20';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = '#ff5252';
    ctx.fillRect(barX, barY, Math.round(barWidth * ratio), barHeight);
  }

  #computeSeparation(allEnemies) {
    let sepX = 0;
    let sepY = 0;

    for (const other of allEnemies) {
      if (!other || other === this || !other.active) {
        continue;
      }
      const ox = this.x - other.x;
      const oy = this.y - other.y;
      const od = Math.hypot(ox, oy);
      const minDist = this.radius + (other.radius ?? 12) + 4;

      if (od < minDist) {
        const push = ((minDist - od) / minDist) * 140;
        if (od > 0.0001) {
          sepX += (ox / od) * push;
          sepY += (oy / od) * push;
        } else {
          sepX += push;
        }
      }
    }

    return { x: sepX, y: sepY };
  }

  #moveAxis(axis, delta, map) {
    const isX = axis === 'x';
    const half = (isX ? this.width : this.height) / 2;
    const newPos = this[axis] + delta;
    const testX = isX ? newPos : this.x;
    const testY = isX ? this.y : newPos;

    if (!collidesRectWithMap(testX, testY, this.width, this.height, map)) {
      this[axis] = newPos;
      return;
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
  }
}

/**
 * Quản lý bầy quái trong phòng, cảnh báo trước khi sinh đợt quái và hiệu ứng hạt khi quái bị hạ.
 */
export class EnemyManager {
  constructor() {
    this.enemies = [];
    this.pendingSpawns = [];
    this.deathParticles = [];
  }

  /**
   * Lên lịch sinh đợt quái gồm meleeCount quái cận chiến + rangedCount quái đánh xa với cảnh báo 0.85s.
   * @param {import('./map.js').DungeonMap} map
   * @param {{ x: number, y: number }} player
   * @param {number} [meleeCount=2]
   * @param {number} [rangedCount=1]
   */
  spawnWave(map, player, meleeCount = 2, rangedCount = 1) {
    const waveTypes = [];
    for (let i = 0; i < meleeCount; i++) {
      waveTypes.push('melee');
    }
    for (let i = 0; i < rangedCount; i++) {
      waveTypes.push('ranged');
    }

    for (const type of waveTypes) {
      const pos = this.#findValidSpawnPoint(map, player);
      if (pos) {
        this.pendingSpawns.push({
          x: pos.x,
          y: pos.y,
          type,
          timer: 0.85,
          duration: 0.85,
        });
      }
    }
  }

  /**
   * Trả về danh sách quái còn sống để AimSystem và BulletManager sử dụng.
   * @returns {Enemy[]}
   */
  getActiveEnemies() {
    return this.enemies.filter((enemy) => enemy.active);
  }

  /**
   * Kiểm tra xem vẫn còn quái sống hoặc còn quái đang chờ xuất hiện (pendingSpawns).
   * @returns {boolean}
   */
  hasEnemiesOrPending() {
    return (
      this.pendingSpawns.length > 0 ||
      this.enemies.some((enemy) => enemy.active)
    );
  }

  /**
   * Tổng số quái hiện còn (gồm đang sống và sắp xuất hiện).
   * @returns {number}
   */
  getRemainingCount() {
    return this.getActiveEnemies().length + this.pendingSpawns.length;
  }

  /**
   * Xóa sạch toàn bộ quái, điểm cảnh báo và hạt vỡ tan khi chuyển phòng hoặc chơi lại.
   */
  clearAll() {
    this.enemies = [];
    this.pendingSpawns = [];
    this.deathParticles = [];
  }

  /**
   * Cập nhật hàng chờ cảnh báo sinh quái, toàn bộ quái còn sống và hiệu ứng hạt khi quái chết.
   * @param {number} dt
   * @param {import('./map.js').DungeonMap} map
   * @param {object} player
   * @param {import('./bullet.js').BulletManager} bulletManager
   * @param {((enemy: Enemy) => void) | null} [onEnemyDeath=null]
   */
  update(dt, map, player, bulletManager, onEnemyDeath = null) {
    if (dt > 0 && this.pendingSpawns.length > 0) {
      const remainingPending = [];
      for (const pending of this.pendingSpawns) {
        pending.timer -= dt;
        if (pending.timer <= 0) {
          this.enemies.push(
            new Enemy(pending.x, pending.y, pending.type, (deadEnemy) =>
              this.#spawnDeathParticles(deadEnemy),
            ),
          );
        } else {
          remainingPending.push(pending);
        }
      }
      this.pendingSpawns = remainingPending;
    }

    const activeEnemies = this.getActiveEnemies();

    for (const enemy of activeEnemies) {
      enemy.update(dt, map, player, bulletManager, activeEnemies);
    }

    for (const enemy of this.enemies) {
      if (!enemy.active) {
        enemy.markDeathHandled();
        if (!enemy.deathNotified) {
          enemy.deathNotified = true;
          onEnemyDeath?.(enemy);
        }
      }
    }

    if (dt > 0) {
      for (const particle of this.deathParticles) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.timer -= dt;
      }
    }

    this.enemies = this.enemies.filter((enemy) => enemy.active);
    this.deathParticles = this.deathParticles.filter(
      (particle) => particle.timer > 0,
    );
  }

  /**
   * Vẽ cảnh báo sắp sinh quái, toàn bộ quái còn sống và hạt hiệu ứng khi quái vỡ tan.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    this.#drawPendingSpawns(ctx);

    for (const enemy of this.enemies) {
      enemy.draw(ctx);
    }

    if (this.deathParticles.length === 0) {
      return;
    }

    ctx.save();
    for (const particle of this.deathParticles) {
      ctx.globalAlpha = Math.max(0, particle.timer / particle.duration);
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        Math.round(particle.x) - particle.size / 2,
        Math.round(particle.y) - particle.size / 2,
        particle.size,
        particle.size,
      );
    }
    ctx.restore();
  }

  #drawPendingSpawns(ctx) {
    if (this.pendingSpawns.length === 0) {
      return;
    }

    ctx.save();
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const pending of this.pendingSpawns) {
      const progress = Math.max(
        0,
        Math.min(1, 1 - pending.timer / pending.duration),
      );
      const blink = Math.floor(pending.timer * 14) % 2 === 0;
      const radius = 13 + Math.sin(progress * Math.PI) * 3;

      ctx.fillStyle = blink
        ? 'rgba(255, 59, 59, 0.25)'
        : 'rgba(255, 59, 59, 0.12)';
      ctx.beginPath();
      ctx.arc(pending.x, pending.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = blink ? '#ff5252' : '#d32f2f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pending.x, pending.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = blink ? '#ff8a80' : '#ff3b3b';
      ctx.fillText('!', pending.x, pending.y + 1);
    }

    ctx.restore();
  }

  #findValidSpawnPoint(map, player) {
    const margin = map.tileSize * 1.5;
    const minX = margin;
    const maxX = map.cols * map.tileSize - margin;
    const minY = margin;
    const maxY = map.rows * map.tileSize - margin;

    for (let attempt = 0; attempt < 200; attempt++) {
      const x = minX + Math.random() * (maxX - minX);
      const y = minY + Math.random() * (maxY - minY);
      if (this.#isSpawnPositionValid(x, y, map, player)) {
        return { x, y };
      }
    }

    // Dự phòng quét tuần tự các tâm ô sàn trống nếu ngẫu nhiên trùng quá nhiều
    for (let row = 1; row < map.rows - 1; row++) {
      for (let col = 1; col < map.cols - 1; col++) {
        const x = col * map.tileSize + map.tileSize / 2;
        const y = row * map.tileSize + map.tileSize / 2;
        if (this.#isSpawnPositionValid(x, y, map, player)) {
          return { x, y };
        }
      }
    }

    return null;
  }

  #isSpawnPositionValid(x, y, map, player) {
    if (collidesRectWithMap(x, y, 22, 22, map)) {
      return false;
    }
    if (Math.hypot(x - player.x, y - player.y) < 180) {
      return false;
    }
    for (const existing of this.enemies) {
      if (Math.hypot(x - existing.x, y - existing.y) < 36) {
        return false;
      }
    }
    for (const pending of this.pendingSpawns) {
      if (Math.hypot(x - pending.x, y - pending.y) < 36) {
        return false;
      }
    }
    return true;
  }

  #spawnDeathParticles(enemy) {
    const baseColor =
      enemy.type === 'ranged'
        ? ENEMY_CONFIG.ranged.color
        : ENEMY_CONFIG.melee.color;
    const accentColor = enemy.type === 'ranged' ? '#e1bee7' : '#ffab91';
    const particleCount = 10;

    for (let i = 0; i < particleCount; i++) {
      const angle =
        (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.45;
      const speed = 55 + Math.random() * 85;
      const duration = 0.25 + Math.random() * 0.15;

      this.deathParticles.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: i % 3 === 0 ? 4 : 3,
        color: i % 2 === 0 ? baseColor : accentColor,
        duration,
        timer: duration,
      });
    }
  }
}
