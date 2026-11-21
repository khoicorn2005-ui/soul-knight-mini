// Quản lý tải trước (preload) toàn bộ hình ảnh Pixel Art và cơ chế dự phòng an toàn (Graceful Fallback).

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
});

/**
 * Nạp trước toàn bộ hình ảnh đã đăng ký bằng Promise, không làm treo game khi thiếu ảnh.
 */
export class AssetManager {
  /**
   * @param {Record<string, string>} [manifest={}]
   */
  constructor(manifest = {}) {
    this.manifest = new Map(Object.entries(manifest));
    this.images = new Map();
    this.#loadingPromise = null;
  }

  #loadingPromise = null;

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
