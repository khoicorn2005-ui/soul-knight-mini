// Quản lý hiệu ứng chiến đấu Game Feel / VFX: rung màn hình, tia lửa đầu nòng, chữ nổi, hạt pixel và viền sát thương.

const MAX_FLOATING_TEXTS = 40;
const MAX_PARTICLES = 240;

/**
 * Hệ thống quản lý 5 nhóm hiệu ứng chiến đấu sắc nét kiểu pixel art.
 */
export class VFXManager {
  constructor() {
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    this.muzzleFlashes = [];
    this.floatingTexts = [];
    this.particles = [];
    this.damageFlash = null;
  }

  /**
   * Kích hoạt rung màn hình, luôn giữ mức rung mạnh hơn nếu đang có một đợt rung nhỏ hơn.
   * @param {number} intensity Biên độ rung (px).
   * @param {number} duration Thời gian rung (giây).
   */
  addShake(intensity, duration) {
    if (intensity <= 0 || duration <= 0) {
      return;
    }

    const activeEffective =
      this.shakeTimer > 0 && this.shakeDuration > 0
        ? this.shakeIntensity * (this.shakeTimer / this.shakeDuration)
        : 0;

    if (intensity >= activeEffective || this.shakeTimer <= 0) {
      this.shakeIntensity = intensity;
      this.shakeDuration = duration;
      this.shakeTimer = duration;
      this.#refreshShakeOffsets();
    }
  }

  /**
   * Trả về độ lệch rung màn hình đã làm tròn số nguyên để giữ nét pixel sắc cạnh.
   * @returns {{ x: number, y: number }}
   */
  getShakeOffset() {
    if (this.shakeTimer <= 0) {
      return { x: 0, y: 0 };
    }
    return {
      x: Math.round(this.shakeOffsetX),
      y: Math.round(this.shakeOffsetY),
    };
  }

  /**
   * Tạo chớp lửa đầu nòng ngắn (~0.055s) hướng theo góc bắn.
   * @param {number} x
   * @param {number} y
   * @param {number} angle
   * @param {string} [color='#fff176']
   * @param {number} [size=10]
   */
  spawnMuzzleFlash(x, y, angle, color = '#fff176', size = 10) {
    const duration = 0.055;
    this.muzzleFlashes.push({
      x,
      y,
      angle,
      color,
      size,
      duration,
      timer: duration,
    });
  }

  /**
   * Tạo chữ nổi bay lên (sát thương, hồi giáp, nhặt ngọc, cảnh báo) giới hạn tối đa 40 chữ cùng lúc.
   * @param {number} x
   * @param {number} y
   * @param {string} text
   * @param {string} [color='#ffffff']
   * @param {number} [size=12]
   */
  spawnFloatingText(x, y, text, color = '#ffffff', size = 12) {
    if (this.floatingTexts.length >= MAX_FLOATING_TEXTS) {
      this.floatingTexts.shift();
    }

    const duration = 0.58 + Math.random() * 0.12;
    this.floatingTexts.push({
      x: x + (Math.random() - 0.5) * 8,
      y,
      vx: (Math.random() - 0.5) * 26,
      vy: -(44 + Math.random() * 14),
      text: String(text),
      color,
      size,
      duration,
      timer: duration,
    });
  }

  /**
   * Tạo chùm hạt vuông pixel (2x2 hoặc 4x4) bắn tóe có ma sát giảm tốc.
   * @param {number} x
   * @param {number} y
   * @param {string} color
   * @param {number} [count=8]
   * @param {number} [speed=130]
   * @param {number} [life=0.35]
   */
  spawnBurst(x, y, color, count = 8, speed = 130, life = 0.35) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.65;
      const spd = speed * (0.55 + Math.random() * 0.65);
      const duration = life * (0.75 + Math.random() * 0.45);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: i % 3 === 0 ? 4 : 2,
        color,
        duration,
        timer: duration,
      });
    }
  }

  /**
   * Kích hoạt lớp chớp viền màn hình khi người chơi mất Máu hoặc Vỡ Giáp.
   * @param {string} [color='rgba(239, 83, 80, 0.35)']
   * @param {number} [duration=0.22]
   */
  triggerDamageFlash(color = 'rgba(239, 83, 80, 0.35)', duration = 0.22) {
    if (duration <= 0) {
      return;
    }
    this.damageFlash = {
      color,
      duration,
      timer: duration,
    };
  }

  /**
   * Cập nhật toàn bộ hiệu ứng và dọn bỏ các phần tử đã hết thời gian sống.
   * @param {number} dt
   */
  update(dt) {
    if (dt <= 0) {
      return;
    }

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      if (this.shakeTimer > 0) {
        this.#refreshShakeOffsets();
      } else {
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    }

    for (const flash of this.muzzleFlashes) {
      flash.timer -= dt;
    }
    this.muzzleFlashes = this.muzzleFlashes.filter((flash) => flash.timer > 0);

    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      const damping = Math.exp(-7 * dt);
      particle.vx *= damping;
      particle.vy *= damping;
      particle.timer -= dt;
    }
    this.particles = this.particles.filter((particle) => particle.timer > 0);

    for (const ft of this.floatingTexts) {
      ft.x += ft.vx * dt;
      ft.y += ft.vy * dt;
      ft.vy *= Math.exp(-3.2 * dt);
      ft.timer -= dt;
    }
    this.floatingTexts = this.floatingTexts.filter((ft) => ft.timer > 0);

    if (this.damageFlash) {
      this.damageFlash.timer -= dt;
      if (this.damageFlash.timer <= 0) {
        this.damageFlash = null;
      }
    }
  }

  /**
   * Vẽ các hiệu ứng thuộc không gian thế giới game (hạt pixel, tia lửa đầu nòng, chữ sát thương).
   * @param {CanvasRenderingContext2D} ctx
   */
  drawWorld(ctx) {
    if (!ctx) {
      return;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const particle of this.particles) {
      ctx.globalAlpha = Math.max(0, particle.timer / particle.duration);
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        Math.round(particle.x - particle.size / 2),
        Math.round(particle.y - particle.size / 2),
        particle.size,
        particle.size,
      );
    }

    for (const flash of this.muzzleFlashes) {
      this.#drawMuzzleFlash(ctx, flash);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const ft of this.floatingTexts) {
      const alpha = Math.min(1, Math.max(0, (ft.timer / ft.duration) * 1.4));
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${ft.size}px monospace`;
      ctx.strokeStyle = '#0c0e16';
      ctx.lineWidth = 3;
      const fx = Math.round(ft.x);
      const fy = Math.round(ft.y);
      ctx.strokeText(ft.text, fx, fy);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, fx, fy);
    }

    ctx.restore();
  }

  /**
   * Vẽ lớp chớp viền màn hình khi dính đòn lên mép canvas (không che tầm nhìn giữa phòng).
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   */
  drawScreenOverlay(ctx, width, height) {
    if (!ctx || !this.damageFlash || this.damageFlash.timer <= 0) {
      return;
    }

    const ratio = Math.max(
      0,
      Math.min(1, this.damageFlash.timer / this.damageFlash.duration),
    );

    ctx.save();
    ctx.globalAlpha = ratio;

    if (typeof ctx.createRadialGradient === 'function') {
      const cx = width / 2;
      const cy = height / 2;
      const innerRadius = Math.min(width, height) * 0.32;
      const outerRadius = Math.hypot(cx, cy);
      const grad = ctx.createRadialGradient(
        cx,
        cy,
        innerRadius,
        cx,
        cy,
        outerRadius,
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, this.damageFlash.color);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else {
      const border = 28;
      ctx.fillStyle = this.damageFlash.color;
      ctx.fillRect(0, 0, width, border);
      ctx.fillRect(0, height - border, width, border);
      ctx.fillRect(0, border, border, height - border * 2);
      ctx.fillRect(width - border, border, border, height - border * 2);
    }

    ctx.restore();
  }

  /**
   * Xóa sạch toàn bộ hiệu ứng khi chuyển phòng, về Menu hoặc chơi lại.
   */
  clear() {
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTimer = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    this.muzzleFlashes = [];
    this.floatingTexts = [];
    this.particles = [];
    this.damageFlash = null;
  }

  #refreshShakeOffsets() {
    const progress =
      this.shakeDuration > 0 ? this.shakeTimer / this.shakeDuration : 0;
    const currentAmp = this.shakeIntensity * progress;
    this.shakeOffsetX = (Math.random() * 2 - 1) * currentAmp;
    this.shakeOffsetY = (Math.random() * 2 - 1) * currentAmp;
  }

  #drawMuzzleFlash(ctx, flash) {
    const ratio = Math.max(0, flash.timer / flash.duration);
    const scale = 0.65 + ratio * 0.45;
    const len = flash.size * scale;
    const halfH = Math.max(3, len * 0.45);

    ctx.save();
    ctx.globalAlpha = Math.min(1, ratio * 1.25);
    ctx.translate(Math.round(flash.x), Math.round(flash.y));
    ctx.rotate(flash.angle);

    // Chớp lửa ngoài hình sao/quạt ánh sáng theo màu đạn của khẩu súng
    ctx.fillStyle = flash.color;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(len * 0.35, -halfH);
    ctx.lineTo(len * 0.6, -halfH * 0.3);
    ctx.lineTo(len * 1.25, 0);
    ctx.lineTo(len * 0.6, halfH * 0.3);
    ctx.lineTo(len * 0.35, halfH);
    ctx.closePath();
    ctx.fill();

    // Lõi trắng rực ở tâm đầu nòng
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(len * 0.28, -halfH * 0.5);
    ctx.lineTo(len * 0.85, 0);
    ctx.lineTo(len * 0.28, halfH * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

export const vfxManager = new VFXManager();
