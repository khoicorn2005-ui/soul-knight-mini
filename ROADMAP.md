# Khung sườn & khởi tạo

Lộ trình phát triển dự án **Soul Knight Mini**, chia thành 4 phần và 10 chương. Mỗi chương tính năng được làm trên một nhánh riêng, kiểm thử xong mới merge vào `main`.

## Phần 1: Chuẩn bị & Khởi tạo nền móng

**Mục tiêu:** Chốt phạm vi vừa sức để không bị quá tải, thiết lập repo GitHub và khung dự án sạch.

### Chương 1: Chốt thiết kế Soul Knight Mini (Mini GDD)

- Chốt 3 chỉ số đặc trưng: **Máu (HP)**, **Giáp (Shield – tự hồi sau vài giây không dính đòn)** và **Năng lượng (Energy – tiêu hao khi bắn vũ khí mạnh)**.
- Chốt cấu trúc màn chơi gọn nhẹ: gồm 1 bản đồ **3 phòng thường + 1 phòng Boss** nối tiếp nhau qua cổng dịch chuyển, có cột đá/thùng gỗ trong phòng để núp đạn.
- Chốt kho vũ khí khởi đầu (ví dụ: 3 loại gồm Súng lục 0 năng lượng, Shotgun bắn tỏa, và Súng Laser/Pháp trượng) cùng 1 kỹ năng nhân vật (Lướt né đạn *Dash* có hồi chiêu).

### Chương 2: Khởi tạo Repository GitHub & Cấu trúc VS Code

- Tạo repo trên GitHub (kèm `README.md`, `.gitignore`), dùng PowerShell trong VS Code để `git clone` về máy.
- Dựng cấu trúc thư mục tách biệt rõ từng module (`map.js`, `player.js`, `weapon.js`, `enemy.js`, `bullet.js`, `main.js`), chạy thử khung trống với Live Server và commit khởi tạo lên nhánh `main`.
- Thiết lập quy tắc giao việc cho **Antigravity**: code JavaScript thuần, tách file rõ ràng, không cài thư viện ngoài.

---

## Phần 2: Xây dựng Lõi Gameplay – Bản chạy thử khối màu (MVP)

**Mục tiêu:** Dùng các ô vuông và hình tròn tô màu để hoàn thiện toàn bộ cảm giác di chuyển, núp tường và bắn súng mượt mà trước khi ghép hình.

### Chương 3: Phòng hầm ngục, Tường & Vật cản

**Nhánh:** `feature/dungeon-room`

- Xây dựng bản đồ phòng bằng mảng 2 chiều (Tilemap): ô nào là sàn, ô nào là tường bao, ô nào là cột đá/thùng gỗ chắn giữa phòng.
- Code nhân vật di chuyển 8 hướng (WASD), xử lý **va chạm trượt tường mượt**: khi đi chéo đụng tường sẽ trượt dọc theo mép tường thay vì bị khựng cứng.
- Kiểm thử → Commit → Merge vào `main`.

### Chương 4: Hệ thống 2 Vũ khí, Ngắm bắn & Năng lượng

**Nhánh:** `feature/weapons-combat`

- Cài đặt chế độ ngắm bằng chuột (hoặc bật tùy chọn tự khóa mục tiêu vào quái gần nhất, đặc trưng của Soul Knight).
- Code cơ chế mang tối đa 2 vũ khí và đổi qua lại bằng phím `Q` hoặc cuộn chuột; trừ Năng lượng khi bắn vũ khí xịn; xử lý đạn bay trúng tường/cột đá thì tự hủy (tạo chiến thuật núp góc).
- Kiểm thử → Commit → Merge vào `main`.

### Chương 5: Quái vật đa dạng, Cơ chế Giáp & Kỹ năng Lướt

**Nhánh:** `feature/enemies-and-stats`

- Tạo 2 nhóm quái cơ bản:
  - **Quái cận chiến:** đuổi theo, né cột để áp sát.
  - **Quái đánh xa:** giữ khoảng cách và bắn loạt đạn tròn màu đỏ để người chơi né.
- Code logic nhận sát thương chuẩn Soul Knight: trừ Giáp trước rồi mới trừ Máu; nếu không bị đánh trong 4 giây, Giáp tự hồi từng điểm một.
- Thêm kỹ năng **Lướt (`Space`)** giúp tăng tốc đột ngột và bất tử trong tích tắc để vượt qua màn đạn.
- Kiểm thử → Commit → Merge vào `main`.

---

## Phần 3: Vòng lặp Hầm ngục, Đồ họa Pixel & Âm thanh

**Mục tiêu:** Hoàn thiện trải nghiệm đi ải hoàn chỉnh, "thay áo" đồ họa hầm ngục và thêm hiệu ứng chiến đấu đã tay.

### Chương 6: Vòng lặp đi ải, Rương vũ khí & Phòng Boss

**Nhánh:** `feature/dungeon-loop-boss`

- Thiết kế luồng mỗi phòng: Bước vào phòng → Cửa đóng chặt → Sinh 1–2 đợt quái → Tiêu diệt hết quái sẽ rớt ngọc xanh hồi Năng lượng, xuất hiện rương nhặt vũ khí mới và mở **Cổng dịch chuyển** sang phòng tiếp theo.
- Thiết kế **Boss cuối** ở phòng 4 với thanh máu lớn và 2–3 chiêu thức xen kẽ: bắn đạn hình vòng tròn, bắn tia đuổi, lướt tới người chơi.
- Kiểm thử → Commit → Merge vào `main`.

### Chương 7: Giao diện HUD & Luồng màn hình

**Nhánh:** `feature/ui-hud`

- Vẽ cụm 3 thanh **Máu (đỏ) – Giáp (xám) – Năng lượng (xanh dương)** ở góc trên trái, ô hiển thị vũ khí đang cầm kèm chi phí năng lượng ở góc dưới, số tầng hiện tại (1-1, 1-2, 1-3, 1-4 BOSS).
- Hoàn thiện các màn hình: *Start Menu*, *Pause*, *Victory* (khi hạ Boss) và *Game Over* kèm nút chơi lại, reset sạch trạng thái.
- Kiểm thử → Commit → Merge vào `main`.

### Chương 8: "Thay áo" Pixel Art chuẩn hầm ngục

**Nhánh:** `feature/pixel-art`

- Vào **Itch.io** chọn tải 1 bộ asset hầm ngục pixel miễn phí (tường, sàn, hiệp sĩ, quái, vũ khí) và đặt vào thư mục `assets/`.
- Tắt làm mờ Canvas (`imageSmoothingEnabled = false`) để nét pixel sắc cạnh; gắn ảnh cho sàn/tường/cột; gắn sprite animation chạy và lật mặt cho nhân vật; vẽ khẩu súng xoay theo hướng ngắm.
- Kiểm thử → Commit → Merge vào `main`.

### Chương 9: Âm thanh 8-bit & Hiệu ứng chiến đấu (Game Feel)

**Nhánh:** `feature/audio-vfx`

- Dùng **jsfxr** tạo bộ hiệu ứng âm thanh `.wav` (bắn súng, đạn đập tường, vỡ giáp, mở rương, vào cổng, hạ Boss) và thêm nút bật/tắt âm thanh.
- Dùng chế độ **Cuộc trò chuyện** với Antigravity để trau chuốt cảm giác bắn: tia lửa đầu nòng, hiệu ứng giật nhẹ vũ khí, rung màn hình khi vỡ giáp/Boss ra chiêu, nhấp nháy trắng khi quái trúng đạn.
- Kiểm thử → Commit → Merge vào `main`.

---

## Phần 4: Kiểm thử, Tài liệu & Phát hành

**Mục tiêu:** Đảm bảo game chạy trơn tru từ đầu đến cuối và ai cũng có thể clone về máy hoặc mở link chơi ngay.

### Chương 10: Cân bằng game, Sửa lỗi & Phát hành bản v1.0.0

**Nhánh:** `feature/polish-release`

- Chơi thử trọn vẹn từ phòng 1-1 đến khi đánh bại Boss, kiểm tra Console (`F12`) để bắt các lỗi ẩn (như quái kẹt trong cột đá, đạn bay xuyên góc tường) và cân bằng lại sát thương/lượng năng lượng.
- Merge hoàn tất vào `main`, quay đoạn GIF ngắn khoe màn đấu Boss để gắn vào `README.md`, viết rõ bảng phím điều khiển và hướng dẫn `git clone` chạy bằng Live Server.
- Gắn tag `v1.0.0` và bật **GitHub Pages** miễn phí để có luôn đường link chơi trực tiếp trên trình duyệt.
