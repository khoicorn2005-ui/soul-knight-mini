# Soul Knight Mini - Game Design Document (GDD)

## 1. Quy ước kỹ thuật (Bắt buộc)
- Công nghệ: HTML5 Canvas + JavaScript thuần (ES Modules: import/export).
- KHÔNG cài đặt bất kỳ thư viện, framework hay npm package nào.
- Kích thước Canvas cố định: 960 x 576 px (lưới 30 cột x 18 hàng, mỗi ô gạch 32 x 32 px).
- Đồ họa: Tắt làm mờ (imageSmoothingEnabled = false), CSS image-rendering: pixelated.

## 2. Chỉ số nhân vật & Điều khiển
- Máu (HP): 6
- Giáp (Shield): 5 (hấp thụ sát thương trước HP, tự hồi từng điểm sau 4 giây không dính đòn)
- Năng lượng (Energy): 100 (tiêu hao khi bắn vũ khí mạnh)
- Phím điều khiển:
  - W A S D / Mũi tên: Di chuyển 8 hướng
  - Chuột trái: Ngắm và bắn
  - Q: Đổi giữa 2 vũ khí đang mang
  - Space: Lướt né đạn (Dash) có thời gian hồi chiêu
  - Esc: Tạm dừng (Pause)

## 3. Cấu trúc màn chơi mục tiêu
- Gồm 4 phòng nối tiếp qua cổng dịch chuyển: 3 phòng quái thường (1-1, 1-2, 1-3) và 1 phòng Boss (1-4).
- Mỗi phòng có tường bao và cột đá/thùng gỗ làm vật cản che đạn.
- Dọn sạch quái trong phòng sẽ rớt ngọc hồi năng lượng, hiện rương vũ khí và mở cổng sang phòng kế tiếp.