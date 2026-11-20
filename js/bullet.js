// Quản lý đạn của người chơi và kẻ địch, chuyển động và xử lý va chạm.

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 576;

/**
 * Đại diện cho một viên đạn bay thẳng trên bản đồ.
 */
export class Bullet {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} vx
   * @param {number} vy
   * @param {number} radius
   * @param {number} damage
   * @param {string} color
   */
  constructor(x, y, vx, vy, radius, damage, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radius = radius;
    this.damage = damage;
    this.color = color;
    this.active = true;
  }

  /**
   * Di chuyển đạn theo vận tốc và kiểm tra va chạm tường/cột/thùng, biên canvas hoặc mục tiêu.
   * @param {number} dt
   * @param {import('./map.js').DungeonMap} map
   * @param {Array<{ x: number, y: number, radius?: number, alive?: boolean, hitFlashTimer?: number }>} [targets=[]]
   * @returns {{ x: number, y: number, color: string, isTargetHit: boolean } | null}
   */
  update(dt, map, targets = []) {
    if (!this.active || dt <= 0) {
      return null;
    }

    // Kiểm tra ngay điểm xuất phát đề phòng đầu nòng súng sát tường/vật cản
    if (map && map.isSolidAt(this.x, this.y)) {
      this.active = false;
      return { x: this.x, y: this.y, color: this.color, isTargetHit: false };
    }

    const prevX = this.x;
    const prevY = this.y;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Kiểm tra thêm trung điểm để tránh đạn nhanh xuyên qua góc vật cản 1 ô
    const midX = (prevX + this.x) / 2;
    const midY = (prevY + this.y) / 2;
    if (map && map.isSolidAt(midX, midY)) {
      this.active = false;
      return { x: midX, y: midY, color: this.color, isTargetHit: false };
    }

    if (
      (map && map.isSolidAt(this.x, this.y)) ||
      this.x < 0 ||
      this.x > CANVAS_WIDTH ||
      this.y < 0 ||
      this.y > CANVAS_HEIGHT
    ) {
      this.active = false;
      return { x: this.x, y: this.y, color: this.color, isTargetHit: false };
    }

    for (const target of targets) {
      if (!target || target.alive === false) {
        continue;
      }
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      if (dist < this.radius + (target.radius ?? 0)) {
        this.active = false;
        target.hitFlashTimer = 0.12;
        return { x: this.x, y: this.y, color: this.color, isTargetHit: true };
      }
    }

    return null;
  }
}

/**
 * Quản lý danh sách đạn đang bay và các hiệu ứng tia lửa va chạm.
 */
export class BulletManager {
  constructor() {
    this.bullets = [];
    this.impacts = [];
  }

  /**
   * Sinh một viên đạn mới tại tọa độ (x, y) bay theo góc angle.
   * @param {number} x
   * @param {number} y
   * @param {number} angle
   * @param {number} speed
   * @param {number} damage
   * @param {number} radius
   * @param {string} color
   */
  spawn(x, y, angle, speed, damage, radius, color) {
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    this.bullets.push(new Bullet(x, y, vx, vy, radius, damage, color));
  }

  /**
   * Cập nhật toàn bộ đạn/hiệu ứng và dọn bỏ các phần tử không còn active.
   * @param {number} dt
   * @param {import('./map.js').DungeonMap} map
   * @param {Array<object>} [targets=[]]
   */
  update(dt, map, targets = []) {
    for (const bullet of this.bullets) {
      const impact = bullet.update(dt, map, targets);
      if (impact) {
        this.#spawnImpact(impact.x, impact.y, impact.color, impact.isTargetHit);
      }
    }

    if (dt > 0) {
      for (const impact of this.impacts) {
        impact.timer -= dt;
        for (const spark of impact.sparks) {
          spark.x += spark.vx * dt;
          spark.y += spark.vy * dt;
        }
        if (impact.timer <= 0) {
          impact.active = false;
        }
      }
    }

    this.bullets = this.bullets.filter((bullet) => bullet.active);
    this.impacts = this.impacts.filter((impact) => impact.active);
  }

  /**
   * Vẽ đạn sắc nét kèm viền tối và hiệu ứng tia lửa va chạm.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    ctx.save();

    for (const bullet of this.bullets) {
      // Viền tối giúp viên đạn nổi bật rõ ràng trên mọi nền gạch
      ctx.fillStyle = '#141824';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius + 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(
        bullet.x - 0.5,
        bullet.y - 0.5,
        Math.max(1.5, bullet.radius * 0.4),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    for (const impact of this.impacts) {
      const alpha = Math.max(0, impact.timer / impact.duration);
      const progress = 1 - alpha;

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = impact.isTargetHit ? '#ffffff' : impact.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(impact.x, impact.y, 3 + progress * 9, 0, Math.PI * 2);
      ctx.stroke();

      for (const spark of impact.sparks) {
        ctx.fillStyle = spark.core ? '#ffffff' : impact.color;
        ctx.fillRect(Math.round(spark.x) - 1, Math.round(spark.y) - 1, 2, 2);
      }
    }

    ctx.restore();
  }

  #spawnImpact(x, y, color, isTargetHit) {
    const duration = 0.18;
    const sparkCount = 5;
    const sparks = [];

    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.4;
      const speed = 45 + Math.random() * 45;
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        core: i % 2 === 0,
      });
    }

    this.impacts.push({
      x,
      y,
      color,
      isTargetHit,
      duration,
      timer: duration,
      sparks,
      active: true,
    });
  }
}
