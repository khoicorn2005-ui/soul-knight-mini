// Quản lý tải trước (preload) toàn bộ hình ảnh Pixel Art và hỗ trợ vẽ sprite/tint/hoạt ảnh.

export const DUNGEON_ASSET_PATHS = Object.freeze({
  // Sàn gạch hầm ngục (16x16)
  floor_1: './assets/images/dungeon/frames/floor_1.png',
  floor_2: './assets/images/dungeon/frames/floor_2.png',
  floor_3: './assets/images/dungeon/frames/floor_3.png',
  floor_4: './assets/images/dungeon/frames/floor_4.png',
  floor_5: './assets/images/dungeon/frames/floor_5.png',
  floor_6: './assets/images/dungeon/frames/floor_6.png',
  floor_7: './assets/images/dungeon/frames/floor_7.png',
  floor_8: './assets/images/dungeon/frames/floor_8.png',

  // Tường đá hầm ngục (16x16)
  wall_mid: './assets/images/dungeon/frames/wall_mid.png',
  wall_top_mid: './assets/images/dungeon/frames/wall_top_mid.png',
  wall_left: './assets/images/dungeon/frames/wall_left.png',
  wall_right: './assets/images/dungeon/frames/wall_right.png',
  wall_edge_left: './assets/images/dungeon/frames/wall_edge_left.png',
  wall_edge_right: './assets/images/dungeon/frames/wall_edge_right.png',
  wall_hole_1: './assets/images/dungeon/frames/wall_hole_1.png',
  wall_hole_2: './assets/images/dungeon/frames/wall_hole_2.png',

  // Cột đá và thùng gỗ vật cản
  column: './assets/images/dungeon/frames/column.png',
  column_wall: './assets/images/dungeon/frames/column_wall.png',
  crate: './assets/images/dungeon/frames/crate.png',

  // Cửa phòng (32x32)
  door_closed: './assets/images/dungeon/frames/doors_leaf_closed.png',
  door_open: './assets/images/dungeon/frames/doors_leaf_open.png',

  // Rương kho báu (16x16: đóng ở f0, mở ở f2)
  chest_closed: './assets/images/dungeon/frames/chest_full_open_anim_f0.png',
  chest_open: './assets/images/dungeon/frames/chest_full_open_anim_f2.png',

  // Hiệp sĩ (Player, 16x28)
  knight_idle_0: './assets/images/dungeon/frames/knight_m_idle_anim_f0.png',
  knight_idle_1: './assets/images/dungeon/frames/knight_m_idle_anim_f1.png',
  knight_idle_2: './assets/images/dungeon/frames/knight_m_idle_anim_f2.png',
  knight_idle_3: './assets/images/dungeon/frames/knight_m_idle_anim_f3.png',
  knight_run_0: './assets/images/dungeon/frames/knight_m_run_anim_f0.png',
  knight_run_1: './assets/images/dungeon/frames/knight_m_run_anim_f1.png',
  knight_run_2: './assets/images/dungeon/frames/knight_m_run_anim_f2.png',
  knight_run_3: './assets/images/dungeon/frames/knight_m_run_anim_f3.png',

  // Quái cận chiến (Chort, 16x23)
  melee_idle_0: './assets/images/dungeon/frames/chort_idle_anim_f0.png',
  melee_idle_1: './assets/images/dungeon/frames/chort_idle_anim_f1.png',
  melee_idle_2: './assets/images/dungeon/frames/chort_idle_anim_f2.png',
  melee_idle_3: './assets/images/dungeon/frames/chort_idle_anim_f3.png',
  melee_run_0: './assets/images/dungeon/frames/chort_run_anim_f0.png',
  melee_run_1: './assets/images/dungeon/frames/chort_run_anim_f1.png',
  melee_run_2: './assets/images/dungeon/frames/chort_run_anim_f2.png',
  melee_run_3: './assets/images/dungeon/frames/chort_run_anim_f3.png',

  // Quái đánh xa (Necromancer, 16x23 — dùng chung vòng 4 khung hình thực tế trong pack)
  ranged_idle_0: './assets/images/dungeon/frames/necromancer_anim_f0.png',
  ranged_idle_1: './assets/images/dungeon/frames/necromancer_anim_f1.png',
  ranged_idle_2: './assets/images/dungeon/frames/necromancer_anim_f2.png',
  ranged_idle_3: './assets/images/dungeon/frames/necromancer_anim_f3.png',
  ranged_run_0: './assets/images/dungeon/frames/necromancer_anim_f0.png',
  ranged_run_1: './assets/images/dungeon/frames/necromancer_anim_f1.png',
  ranged_run_2: './assets/images/dungeon/frames/necromancer_anim_f2.png',
  ranged_run_3: './assets/images/dungeon/frames/necromancer_anim_f3.png',

  // Boss cuối Vua Hầm Ngục (Big Demon, 32x36)
  boss_idle_0: './assets/images/dungeon/frames/big_demon_idle_anim_f0.png',
  boss_idle_1: './assets/images/dungeon/frames/big_demon_idle_anim_f1.png',
  boss_idle_2: './assets/images/dungeon/frames/big_demon_idle_anim_f2.png',
  boss_idle_3: './assets/images/dungeon/frames/big_demon_idle_anim_f3.png',
  boss_run_0: './assets/images/dungeon/frames/big_demon_run_anim_f0.png',
  boss_run_1: './assets/images/dungeon/frames/big_demon_run_anim_f1.png',
  boss_run_2: './assets/images/dungeon/frames/big_demon_run_anim_f2.png',
  boss_run_3: './assets/images/dungeon/frames/big_demon_run_anim_f3.png',

  // Vũ khí Pháp Trượng (8x30)
  weapon_staff: './assets/images/dungeon/frames/weapon_red_magic_staff.png',
});

/**
 * Nạp trước toàn bộ hình ảnh đã đăng ký bằng Promise, không làm treo game khi thiếu ảnh.
 */
export class AssetManager {
  #loadingPromise = null;
  #tintCanvas = null;
  #tintCtx = null;

  /**
   * @param {Record<string, string>} [manifest={}]
   */
  constructor(manifest = {}) {
    this.manifest = new Map(Object.entries(manifest));
    this.images = new Map();
  }

  /**
   * Đăng ký thêm hoặc cập nhật đường dẫn một asset ảnh.
   * @param {string} key
   * @param {string} src
   */
  register(key, src) {
    this.manifest.set(key, src);
    this.#loadingPromise = null;
  }

  /**
   * Tải toàn bộ ảnh trong manifest. Luôn resolve kể cả khi có ảnh lỗi tải.
   * @returns {Promise<void>}
   */
  loadAll() {
    if (this.#loadingPromise) {
      return this.#loadingPromise;
    }

    const entries = Array.from(this.manifest.entries());
    const tasks = entries.map(([key, src]) => this.#loadImage(key, src));

    this.#loadingPromise = Promise.all(tasks).then(() => undefined);
    return this.#loadingPromise;
  }

  /**
   * Lấy đối tượng HTMLImageElement đã sẵn sàng vẽ, hoặc null nếu thiếu/chưa tải xong.
   * @param {string} key
   * @returns {HTMLImageElement | null}
   */
  get(key) {
    const img = this.images.get(key);
    if (img && img.complete && img.naturalWidth > 0) {
      return img;
    }
    return null;
  }

  /**
   * Trả về ảnh của một khung hoạt ảnh theo tiền tố và chỉ số khung hình (0..3).
   * @param {string} keyPrefix
   * @param {number} frameIndex
   * @returns {HTMLImageElement | null}
   */
  getAnimFrame(keyPrefix, frameIndex) {
    const normalized = ((Math.floor(frameIndex) % 4) + 4) % 4;
    return this.get(`${keyPrefix}_${normalized}`);
  }

  /**
   * Vẽ sprite căn giữa theo centerX và neo mép dưới tại feetY, hỗ trợ lật ngang và phủ màu pixel.
   * @param {CanvasRenderingContext2D} ctx
   * @param {HTMLImageElement | null} img
   * @param {number} centerX
   * @param {number} feetY
   * @param {number} [scale=2]
   * @param {{ flipX?: boolean, alpha?: number, flashWhite?: boolean, tintColor?: string | null }} [options={}]
   */
  drawSprite(ctx, img, centerX, feetY, scale = 2, options = {}) {
    if (!ctx || !img) {
      return;
    }

    const imgW = img.naturalWidth || img.width || 0;
    const imgH = img.naturalHeight || img.height || 0;
    if (imgW <= 0 || imgH <= 0) {
      return;
    }

    const {
      flipX = false,
      alpha = 1,
      flashWhite = false,
      tintColor = null,
    } = options;

    const drawW = Math.round(imgW * scale);
    const drawH = Math.round(imgH * scale);
    let source = img;

    if (flashWhite || tintColor) {
      const surface = this.#getTintSurface(imgW, imgH);
      if (surface) {
        const { canvas, ctx: tCtx } = surface;
        tCtx.imageSmoothingEnabled = false;
        tCtx.globalCompositeOperation = 'source-over';
        tCtx.clearRect(0, 0, imgW, imgH);
        tCtx.drawImage(img, 0, 0);

        tCtx.globalCompositeOperation = 'source-in';
        tCtx.fillStyle = flashWhite ? '#ffffff' : tintColor;
        tCtx.fillRect(0, 0, imgW, imgH);
        tCtx.globalCompositeOperation = 'source-over';

        source = canvas;
      }
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha *= alpha;
    ctx.translate(Math.round(centerX), Math.round(feetY));
    if (flipX) {
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      source,
      0,
      0,
      imgW,
      imgH,
      -Math.round(drawW / 2),
      -drawH,
      drawW,
      drawH,
    );
    ctx.restore();
  }

  #getTintSurface(minW, minH) {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return null;
    }

    if (!this.#tintCanvas) {
      this.#tintCanvas = document.createElement('canvas');
      this.#tintCanvas.width = Math.max(64, minW);
      this.#tintCanvas.height = Math.max(64, minH);
      this.#tintCtx = this.#tintCanvas.getContext('2d');
    } else if (
      this.#tintCanvas.width < minW ||
      this.#tintCanvas.height < minH
    ) {
      this.#tintCanvas.width = Math.max(this.#tintCanvas.width, minW);
      this.#tintCanvas.height = Math.max(this.#tintCanvas.height, minH);
      this.#tintCtx = this.#tintCanvas.getContext('2d');
    }

    if (!this.#tintCtx) {
      return null;
    }

    return { canvas: this.#tintCanvas, ctx: this.#tintCtx };
  }

  #loadImage(key, src) {
    if (typeof Image === 'undefined') {
      this.images.set(key, null);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(key, img);
        resolve();
      };
      img.onerror = () => {
        console.warn(`[AssetManager] Không thể tải ảnh "${key}" tại "${src}". Sử dụng hình vẽ dự phòng.`);
        this.images.set(key, null);
        resolve();
      };
      img.src = src;
    });
  }
}

export const assets = new AssetManager(DUNGEON_ASSET_PATHS);
