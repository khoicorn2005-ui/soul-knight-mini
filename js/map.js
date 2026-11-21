// Quản lý bản đồ, lưới gạch 30x18 (32x32px), 4 bố cục phòng chơi, vật cản và cổng tường phải.

import { assets } from './assets.js';

export const TILE_SIZE = 32;
export const MAP_COLS = 30;
export const MAP_ROWS = 18;

export const TILE_TYPES = Object.freeze({
  FLOOR: 0,
  WALL: 1,
  PILLAR: 2,
  CRATE: 3,
});

const FLOOR_VARIANT_KEYS = [
  'floor_2',
  'floor_3',
  'floor_4',
  'floor_5',
  'floor_6',
  'floor_7',
  'floor_8',
];

// Mảng 4 bố cục phòng hầm ngục chuẩn 18 hàng × 30 cột.
// Luôn giữ trống (0) tại 3 vùng bắt buộc:
// - Vùng xuất hiện người chơi bên trái: cột 2..5, hàng 7..10
// - Vùng đặt Rương vũ khí giữa phòng: cột 13..16, hàng 7..10
// - Vùng đặt Cổng dịch chuyển bên phải: cột 24..27, hàng 7..10
export const ROOM_LAYOUTS = [
  // Phòng 0 (1-1): Bố cục cân đối, thoáng dễ làm quen (cột đá và thùng gỗ đối xứng)
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 1
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 2
    [1,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,1], // 3
    [1,0,0,3,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,3,0,0,1], // 4
    [1,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,1], // 5
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 6
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 7
    [1,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,1], // 8
    [1,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,1], // 9
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 10
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 11
    [1,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,1], // 12
    [1,0,0,3,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,3,0,0,1], // 13
    [1,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,1], // 14
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 15
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 16
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 17
  ],

  // Phòng 1 (1-2): Cụm cột đá tạo hành lang che chắn ở trung tâm và thùng gỗ hai bên
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 1
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 2
    [1,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,1], // 3
    [1,0,0,0,3,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,3,0,0,0,1], // 4
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 5
    [1,0,0,0,0,0,3,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,3,0,0,0,0,0,1], // 6
    [1,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,1], // 7
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 8
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 9
    [1,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,1], // 10
    [1,0,0,0,0,0,3,0,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,3,0,0,0,0,0,1], // 11
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 12
    [1,0,0,0,3,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,3,0,0,0,1], // 13
    [1,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,1], // 14
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 15
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 16
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 17
  ],

  // Phòng 2 (1-3): Bố cục 4 góc phòng thủ + vật cản rải đều cho giao tranh đông quái
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 1
    [1,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,1], // 2
    [1,0,0,2,3,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,3,2,0,0,1], // 3
    [1,0,0,3,0,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,0,3,0,0,1], // 4
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 5
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 6
    [1,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,1], // 7
    [1,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,1], // 8
    [1,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,1], // 9
    [1,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,1], // 10
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 11
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 12
    [1,0,0,3,0,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,0,3,0,0,1], // 13
    [1,0,0,2,3,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,3,2,0,0,1], // 14
    [1,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,1], // 15
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 16
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 17
  ],

  // Phòng 3 (1-4 BOSS): Đấu trường rộng thoáng, chỉ 4 cột đá nhỏ đặt lệch gần 4 góc để né đạn Boss
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 1
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 2
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 3
    [1,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,1], // 4
    [1,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,1], // 5
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 6
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 7
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 8
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 9
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 10
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 11
    [1,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,1], // 12
    [1,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,1], // 13
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 14
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 15
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 16
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 17
  ],
];

export const roomLayout = ROOM_LAYOUTS[0];

/**
 * Băm tọa độ ô cố định thành số nguyên dương để chọn biến thể gạch không nhấp nháy.
 * @param {number} col
 * @param {number} row
 * @returns {number}
 */
function hashTile(col, row) {
  return (Math.imul(col + 11, 73856093) ^ Math.imul(row + 19, 19349663)) >>> 0;
}

/**
 * Đại diện cho bản đồ tilemap của 1 phòng hầm ngục và cung cấp hàm vẽ + kiểm tra va chạm ô gạch.
 */
export class DungeonMap {
  /**
   * @param {number | number[][]} [layoutOrIndex=0] Chỉ số phòng trong ROOM_LAYOUTS hoặc mảng bố cục tùy chỉnh.
   */
  constructor(layoutOrIndex = 0) {
    this.tileSize = TILE_SIZE;
    this.currentRoomIndex = 0;
    this.isLocked = true;

    if (Array.isArray(layoutOrIndex)) {
      this.layout = layoutOrIndex;
      this.rows = layoutOrIndex.length;
      this.cols = layoutOrIndex[0]?.length ?? 0;
    } else {
      this.loadRoom(layoutOrIndex);
    }
  }

  /**
   * Nạp bố cục phòng theo chỉ số trong ROOM_LAYOUTS.
   * @param {number} index
   */
  loadRoom(index) {
    const safeIndex = Math.max(0, Math.min(ROOM_LAYOUTS.length - 1, index));
    this.currentRoomIndex = safeIndex;
    this.layout = ROOM_LAYOUTS[safeIndex];
    this.rows = this.layout.length;
    this.cols = this.layout[0]?.length ?? 0;
  }

  /**
   * Vẽ bản đồ theo 2 lượt (Sàn + bóng chân tường -> Tường, Cột, Thùng, Cửa) giữ nguyên nét pixel sắc nét.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    ctx.imageSmoothingEnabled = false;
    const s = this.tileSize;

    // Lượt 1: Vẽ toàn bộ mặt sàn trước (kể cả dưới chân cột/thùng) và bóng đổ mảnh dưới chân tường trên
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const tile = this.layout[row][col];
        if (tile === TILE_TYPES.WALL) {
          continue;
        }
        const x = col * s;
        const y = row * s;
        this.#drawFloorTile(ctx, x, y, s, col, row);

        if (row > 0 && this.layout[row - 1][col] === TILE_TYPES.WALL) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
          ctx.fillRect(x, y, s, 6);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
          ctx.fillRect(x, y + 6, s, 4);
        }
      }
    }

    // Lượt 2: Vẽ tường, cột đá và thùng gỗ từ trên xuống dưới để phần nhô 2.5D không bị ô khác đè mất
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const tile = this.layout[row][col];
        const x = col * s;
        const y = row * s;

        if (tile === TILE_TYPES.WALL) {
          this.#drawWallTile(ctx, x, y, s, col, row);
        } else if (tile === TILE_TYPES.PILLAR) {
          this.#drawPillarTile(ctx, x, y, s);
        } else if (tile === TILE_TYPES.CRATE) {
          this.#drawCrateTile(ctx, x, y, s);
        }
      }
    }

    this.#drawRightGate(ctx);
  }

  /**
   * Kiểm tra ô gạch tại (col, row) có chặn di chuyển/đạn hay không.
   * @param {number} col
   * @param {number} row
   * @returns {boolean}
   */
  isSolidTile(col, row) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return true;
    }

    const tile = this.layout[row][col];
    return (
      tile === TILE_TYPES.WALL ||
      tile === TILE_TYPES.PILLAR ||
      tile === TILE_TYPES.CRATE
    );
  }

  /**
   * Kiểm tra tọa độ pixel (x, y) có rơi vào ô gạch cứng hay không.
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isSolidAt(x, y) {
    const col = Math.floor(x / this.tileSize);
    const row = Math.floor(y / this.tileSize);
    return this.isSolidTile(col, row);
  }

  #drawRightGate(ctx) {
    const s = this.tileSize;
    const gateX = (this.cols - 1) * s;
    const gateY = 7 * s;
    const gateW = s;
    const gateH = 4 * s;
    const centerX = gateX + gateW / 2;
    const centerY = gateY + gateH / 2;

    ctx.save();

    // Khung đá hốc cửa hòa hợp tông đá nâu ấm ở chính giữa tường phải (cột 29, hàng 7-10)
    ctx.fillStyle = '#251e22';
    ctx.fillRect(gateX, gateY, gateW, gateH);
    ctx.fillStyle = '#8c736b';
    ctx.fillRect(gateX, gateY, gateW, 4);
    ctx.fillRect(gateX, gateY + gateH - 4, gateW, 4);
    ctx.fillStyle = '#594846';
    ctx.fillRect(gateX, gateY + 4, 4, gateH - 8);

    const innerX = gateX + 4;
    const innerY = gateY + 6;
    const innerW = gateW - 6;
    const innerH = gateH - 12;

    if (this.isLocked) {
      ctx.fillStyle = '#1b1116';
      ctx.fillRect(innerX, innerY, innerW, innerH);

      const doorClosedImg = assets.get('door_closed');
      if (doorClosedImg) {
        ctx.save();
        ctx.translate(centerX + 2, centerY);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(doorClosedImg, -32, -16, 64, 32);
        ctx.restore();
      }

      // Song sắt đỏ báo hiệu cửa đang khóa chặt khi chưa dọn xong phòng
      ctx.fillStyle = 'rgba(92, 20, 20, 0.85)';
      ctx.fillRect(innerX, innerY + 18, innerW, 5);
      ctx.fillRect(innerX, innerY + innerH - 23, innerW, 5);

      for (let offset = 3; offset < innerW - 2; offset += 7) {
        ctx.fillStyle = '#2e0808';
        ctx.fillRect(innerX + offset - 1, innerY, 5, innerH);
        ctx.fillStyle = '#d32f2f';
        ctx.fillRect(innerX + offset, innerY, 3, innerH);
        ctx.fillStyle = '#ff5252';
        ctx.fillRect(innerX + offset, innerY, 1, innerH);
      }

      // Chốt khóa đỏ nổi bật ở giữa cửa
      ctx.fillStyle = '#2e0808';
      ctx.fillRect(innerX + 6, centerY - 7, 14, 14);
      ctx.fillStyle = '#ff5252';
      ctx.fillRect(innerX + 8, centerY - 5, 10, 10);
    } else {
      // Cổng mở sáng xanh ngọc báo hiệu đã dọn xong phòng
      ctx.fillStyle = '#0f2533';
      ctx.fillRect(innerX, innerY, innerW, innerH);

      const doorOpenImg = assets.get('door_open');
      if (doorOpenImg) {
        ctx.save();
        ctx.translate(centerX + 2, centerY);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(doorOpenImg, -32, -16, 64, 32);
        ctx.restore();
      }

      ctx.fillStyle = 'rgba(79, 195, 247, 0.28)';
      ctx.fillRect(innerX + 2, innerY + 2, innerW - 4, innerH - 4);
      ctx.fillStyle = 'rgba(128, 222, 234, 0.50)';
      ctx.fillRect(innerX + 6, innerY + 6, innerW - 12, innerH - 12);

      ctx.fillStyle = '#80deea';
      ctx.fillRect(gateX, gateY + 6, 3, gateH - 12);
    }

    ctx.restore();
  }

  #drawFloorTile(ctx, x, y, s, col, row) {
    const h = hashTile(col, row);
    // Ưu tiên ~75% gạch floor_1 phẳng sạch, ~25% còn lại rải các viên gạch nứt/sứt góc
    let key = 'floor_1';
    if (h % 4 === 0) {
      key = FLOOR_VARIANT_KEYS[(h >>> 4) % FLOOR_VARIANT_KEYS.length];
    }

    const img = assets.get(key) ?? assets.get('floor_1');
    if (img) {
      ctx.drawImage(img, x, y, s, s);
      return;
    }

    // Dự phòng khối màu cũ nếu ảnh chưa sẵn sàng
    ctx.fillStyle = (col + row) % 2 === 0 ? '#2a2b36' : '#272833';
    ctx.fillRect(x, y, s, s);

    ctx.fillStyle = '#1f202a';
    ctx.fillRect(x, y, s, 1);
    ctx.fillRect(x, y, 1, s);

    if ((col * 7 + row * 13) % 5 === 0) {
      ctx.fillStyle = '#323442';
      ctx.fillRect(x + 8, y + 10, 4, 2);
      ctx.fillRect(x + 20, y + 22, 3, 2);
    }
  }

  #drawWallTile(ctx, x, y, s, col, row) {
    const h = hashTile(col, row);
    let wallKey = 'wall_mid';

    if (col === 0 && row > 0 && row < this.rows - 1) {
      wallKey = 'wall_edge_left';
    } else if (col === this.cols - 1 && row > 0 && row < this.rows - 1) {
      wallKey = 'wall_edge_right';
    } else if (row === 0 && col > 1 && col < this.cols - 2 && h % 7 === 0) {
      wallKey = h % 2 === 0 ? 'wall_hole_1' : 'wall_hole_2';
    }

    const wallImg = assets.get(wallKey) ?? assets.get('wall_mid');
    if (wallImg) {
      ctx.drawImage(wallImg, x, y, s, s);

      // Ghép thêm mép đỉnh đá (wall_top_mid) lên tường trên và dưới để tạo khối 2.5D rõ nét
      if (row === 0 || row === this.rows - 1) {
        const topRim = assets.get('wall_top_mid');
        if (topRim) {
          ctx.drawImage(topRim, 0, 12, 16, 4, x, y, s, 8);
        }
      }
      return;
    }

    // Dự phòng khối màu cũ
    ctx.fillStyle = '#5a5e72';
    ctx.fillRect(x, y, s, 22);
    ctx.fillStyle = '#7b8099';
    ctx.fillRect(x, y, s, 2);
    ctx.fillStyle = '#494d60';
    ctx.fillRect(x, y + 11, s, 1);
    const seamOffset = (col + row) % 2 === 0 ? 16 : 8;
    ctx.fillRect(x + seamOffset, y + 2, 1, 9);
    ctx.fillRect(x + ((seamOffset + 14) % s), y + 12, 1, 10);
    ctx.fillStyle = '#3d4052';
    ctx.fillRect(x, y + 22, s, 8);
    ctx.fillStyle = '#242633';
    ctx.fillRect(x, y + 30, s, 2);
  }

  #drawPillarTile(ctx, x, y, s) {
    const columnImg = assets.get('column');
    if (columnImg) {
      // Bóng tròn dẹt dưới chân cột đá
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.ellipse(x + s / 2, y + s - 2, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sprite column.png gốc 16x48: cắt thân đế và phần chóp bát giác phóng đúng 2x (không bóp méo)
      ctx.drawImage(columnImg, 0, 26, 16, 13, x, y + 6, s, 26);
      ctx.drawImage(columnImg, 0, 3, 16, 12, x, y - 8, s, 24);
      return;
    }

    // Dự phòng khối màu cũ
    ctx.fillStyle = '#191a24';
    ctx.fillRect(x + 2, y + s - 3, s - 4, 2);
    ctx.fillStyle = '#2b2e3c';
    ctx.fillRect(x + 2, y + 1, 28, 28);
    ctx.fillStyle = '#676c82';
    ctx.fillRect(x + 4, y + 3, 24, 18);
    ctx.fillStyle = '#8a90ab';
    ctx.fillRect(x + 4, y + 3, 24, 2);
    ctx.fillStyle = '#4b4f63';
    ctx.fillRect(x + 4, y + 21, 24, 6);
    ctx.fillStyle = '#575c70';
    ctx.fillRect(x + 9, y + 8, 14, 9);
  }

  #drawCrateTile(ctx, x, y, s) {
    const crateImg = assets.get('crate');
    if (crateImg) {
      // Bóng đổ nhẹ dưới chân thùng gỗ
      ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
      ctx.beginPath();
      ctx.ellipse(x + s / 2, y + s - 2, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sprite crate.png gốc 16x24 (phần thân gỗ từ y=3..23) phóng đúng 2x đặt khít mép đáy ô 32x32
      ctx.drawImage(crateImg, 0, 3, 16, 21, x, y - 10, s, 42);
      return;
    }

    // Dự phòng khối màu cũ
    ctx.fillStyle = '#191a24';
    ctx.fillRect(x + 2, y + s - 2, s - 4, 2);
    ctx.fillStyle = '#4a2c16';
    ctx.fillRect(x + 2, y + 2, 28, 28);
    ctx.fillStyle = '#8c5830';
    ctx.fillRect(x + 4, y + 4, 24, 24);
    ctx.fillStyle = '#a86e3e';
    ctx.fillRect(x + 4, y + 4, 24, 2);
    ctx.fillStyle = '#7a4b27';
    ctx.fillRect(x + 7, y + 7, 18, 18);
    ctx.strokeStyle = '#543016';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 6);
    ctx.lineTo(x + 26, y + 26);
    ctx.moveTo(x + 26, y + 6);
    ctx.lineTo(x + 6, y + 26);
    ctx.stroke();
  }
}
