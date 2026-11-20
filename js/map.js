// Quản lý bản đồ, lưới gạch 30x18 (32x32px), phòng chơi, vật cản và cổng dịch chuyển.

export const TILE_SIZE = 32;
export const MAP_COLS = 30;
export const MAP_ROWS = 18;

export const TILE_TYPES = Object.freeze({
  FLOOR: 0,
  WALL: 1,
  PILLAR: 2,
  CRATE: 3,
});

// Bố cục 1 phòng hầm ngục chuẩn 18 hàng × 30 cột (đối xứng 4 chiều, trống khu vực giữa phòng)
export const roomLayout = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 0
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 1
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 2
  [1,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,1], // 3
  [1,0,0,3,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,3,0,0,1], // 4
  [1,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,1], // 5
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 6
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 7
  [1,0,0,0,2,0,0,0,0,0,3,0,0,0,0,0,0,0,0,3,0,0,0,0,0,2,0,0,0,1], // 8
  [1,0,0,0,2,0,0,0,0,0,3,0,0,0,0,0,0,0,0,3,0,0,0,0,0,2,0,0,0,1], // 9
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 10
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 11
  [1,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,1], // 12
  [1,0,0,3,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,3,0,0,1], // 13
  [1,0,0,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,1], // 14
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 15
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1], // 16
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // 17
];

/**
 * Đại diện cho bản đồ tilemap của 1 phòng hầm ngục và cung cấp hàm vẽ + kiểm tra va chạm ô gạch.
 */
export class DungeonMap {
  /**
   * @param {number[][]} [layout=roomLayout] Mảng 2 chiều biểu diễn loại gạch theo từng hàng và cột.
   */
  constructor(layout = roomLayout) {
    this.layout = layout;
    this.tileSize = TILE_SIZE;
    this.rows = layout.length;
    this.cols = layout[0]?.length ?? 0;
  }

  /**
   * Vẽ toàn bộ bản đồ gạch lên canvas context.
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
