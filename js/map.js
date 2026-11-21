// Quản lý bản đồ, lưới gạch 30x18 (32x32px), 4 bố cục phòng chơi, vật cản và cổng tường phải.

export const TILE_SIZE = 32;
export const MAP_COLS = 30;
export const MAP_ROWS = 18;

export const TILE_TYPES = Object.freeze({
  FLOOR: 0,
  WALL: 1,
  PILLAR: 2,
  CRATE: 3,
});

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
   * Vẽ toàn bộ bản đồ gạch và khung cửa bên tường phải lên canvas context.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    const s = this.tileSize;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const tile = this.layout[row][col];
        const x = col * s;
        const y = row * s;

        switch (tile) {
          case TILE_TYPES.WALL:
            this.#drawWallTile(ctx, x, y, s, col, row);
            break;
          case TILE_TYPES.PILLAR:
            this.#drawFloorTile(ctx, x, y, s, col, row);
            this.#drawPillarTile(ctx, x, y, s);
            break;
          case TILE_TYPES.CRATE:
            this.#drawFloorTile(ctx, x, y, s, col, row);
            this.#drawCrateTile(ctx, x, y, s);
            break;
          case TILE_TYPES.FLOOR:
          default:
            this.#drawFloorTile(ctx, x, y, s, col, row);
            break;
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

    ctx.save();

    // Khung đá hốc cửa ở chính giữa tường bên phải (cột 29, hàng 7-10)
    ctx.fillStyle = '#20222e';
    ctx.fillRect(gateX, gateY, gateW, gateH);
    ctx.fillStyle = '#7b8099';
    ctx.fillRect(gateX, gateY, gateW, 4);
    ctx.fillRect(gateX, gateY + gateH - 4, gateW, 4);
    ctx.fillStyle = '#494d60';
    ctx.fillRect(gateX, gateY + 4, 4, gateH - 8);

    const innerX = gateX + 4;
    const innerY = gateY + 6;
    const innerW = gateW - 6;
    const innerH = gateH - 12;

    if (this.isLocked) {
      // Cổng đóng chặt: nền tối kèm song sắt đỏ cảnh báo chưa dọn phòng
      ctx.fillStyle = '#180d12';
      ctx.fillRect(innerX, innerY, innerW, innerH);

      // Các thanh ngang giữ song sắt
      ctx.fillStyle = '#5c1414';
      ctx.fillRect(innerX, innerY + 18, innerW, 5);
      ctx.fillRect(innerX, innerY + innerH - 23, innerW, 5);

      // Các song sắt dọc màu đỏ
      for (let offset = 3; offset < innerW - 2; offset += 7) {
        ctx.fillStyle = '#2e0808';
        ctx.fillRect(innerX + offset - 1, innerY, 5, innerH);
        ctx.fillStyle = '#d32f2f';
        ctx.fillRect(innerX + offset, innerY, 3, innerH);
        ctx.fillStyle = '#ff5252';
        ctx.fillRect(innerX + offset, innerY, 1, innerH);
      }

      // Chốt khóa đỏ phát sáng ở giữa cửa
      ctx.fillStyle = '#2e0808';
      ctx.fillRect(innerX + 6, gateY + gateH / 2 - 7, 14, 14);
      ctx.fillStyle = '#ff5252';
      ctx.fillRect(innerX + 8, gateY + gateH / 2 - 5, 10, 10);
    } else {
      // Cổng mở sáng nhẹ báo hiệu đã dọn xong phòng
      ctx.fillStyle = '#0f2533';
      ctx.fillRect(innerX, innerY, innerW, innerH);

      ctx.fillStyle = 'rgba(79, 195, 247, 0.25)';
      ctx.fillRect(innerX + 2, innerY + 2, innerW - 4, innerH - 4);

      ctx.fillStyle = 'rgba(128, 222, 234, 0.55)';
      ctx.fillRect(innerX + 6, innerY + 6, innerW - 12, innerH - 12);

      // Bậc ngưỡng sáng nhẹ cạnh sàn báo lối thông
      ctx.fillStyle = '#80deea';
      ctx.fillRect(gateX, gateY + 6, 3, gateH - 12);
    }

    ctx.restore();
  }

  #drawFloorTile(ctx, x, y, s, col, row) {
    // Sàn xám đậm xen kẽ nhẹ giữa các ô kèm đường mạch gạch mờ
    ctx.fillStyle = (col + row) % 2 === 0 ? '#2a2b36' : '#272833';
    ctx.fillRect(x, y, s, s);

    ctx.fillStyle = '#1f202a';
    ctx.fillRect(x, y, s, 1);
    ctx.fillRect(x, y, 1, s);

    // Họa tiết đá nhỏ ngẫu nhiên cố định theo vị trí ô để sàn trông tự nhiên hơn
    if ((col * 7 + row * 13) % 5 === 0) {
      ctx.fillStyle = '#323442';
      ctx.fillRect(x + 8, y + 10, 4, 2);
      ctx.fillRect(x + 20, y + 22, 3, 2);
    }
  }

  #drawWallTile(ctx, x, y, s, col, row) {
    // Mặt trên của tường (chiều sâu 2.5D nhẹ)
    ctx.fillStyle = '#5a5e72';
    ctx.fillRect(x, y, s, 22);

    // Viền sáng nổi ở mép trên tường
    ctx.fillStyle = '#7b8099';
    ctx.fillRect(x, y, s, 2);

    // Mạch gạch đá trên mặt tường
    ctx.fillStyle = '#494d60';
    ctx.fillRect(x, y + 11, s, 1);
    const seamOffset = (col + row) % 2 === 0 ? 16 : 8;
    ctx.fillRect(x + seamOffset, y + 2, 1, 9);
    ctx.fillRect(x + ((seamOffset + 14) % s), y + 12, 1, 10);

    // Mặt đứng phía trước tối hơn và bóng chân tường
    ctx.fillStyle = '#3d4052';
    ctx.fillRect(x, y + 22, s, 8);
    ctx.fillStyle = '#242633';
    ctx.fillRect(x, y + 30, s, 2);
  }

  #drawPillarTile(ctx, x, y, s) {
    // Bóng đổ nhẹ ở chân cột
    ctx.fillStyle = '#191a24';
    ctx.fillRect(x + 2, y + s - 3, s - 4, 2);

    // Khung viền tối ngoài cột đá
    ctx.fillStyle = '#2b2e3c';
    ctx.fillRect(x + 2, y + 1, 28, 28);

    // Thân cột xám đá và viền sáng phía trên
    ctx.fillStyle = '#676c82';
    ctx.fillRect(x + 4, y + 3, 24, 18);
    ctx.fillStyle = '#8a90ab';
    ctx.fillRect(x + 4, y + 3, 24, 2);

    // Mặt trước cột tạo khối 2.5D và ô chạm lõm ở đỉnh cột
    ctx.fillStyle = '#4b4f63';
    ctx.fillRect(x + 4, y + 21, 24, 6);
    ctx.fillStyle = '#575c70';
    ctx.fillRect(x + 9, y + 8, 14, 9);
  }

  #drawCrateTile(ctx, x, y, s) {
    // Bóng đổ nhẹ dưới chân thùng gỗ
    ctx.fillStyle = '#191a24';
    ctx.fillRect(x + 2, y + s - 2, s - 4, 2);

    // Viền gỗ đậm bao quanh thùng
    ctx.fillStyle = '#4a2c16';
    ctx.fillRect(x + 2, y + 2, 28, 28);

    // Thân thùng nâu gỗ, viền sáng cạnh trên và mặt gỗ bên trong
    ctx.fillStyle = '#8c5830';
    ctx.fillRect(x + 4, y + 4, 24, 24);
    ctx.fillStyle = '#a86e3e';
    ctx.fillRect(x + 4, y + 4, 24, 2);
    ctx.fillStyle = '#7a4b27';
    ctx.fillRect(x + 7, y + 7, 18, 18);

    // Hai đường kẻ chéo tạo hình chữ X trên mặt thùng gỗ
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
