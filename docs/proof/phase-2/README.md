# Kiểm chứng Phase 2

## Chạy lại từ gốc repo

```sh
npm ci
npm test
npm run build
node src/headless.js --seed 42 --night 2 --ticks 20 --inputs tests/fixtures/phase-2-paused-dash.json --out pause.jsonl
```

Kết quả chuẩn cho lệnh cuối lưu tại [pause.jsonl](pause.jsonl). Hai lần chạy cùng lệnh cho cùng SHA-256. Báo cáo [tests.txt](tests.txt) gồm các kiểm tra hồi quy Phase 1 với tuning Phase 2 và các scenario cho bản đồ, sinh thực thể, lướt, pause, rơi/hồi sinh, gió, Gió Lạc và Bùa Gió.

## Thời gian headless

Chạy mỗi Đêm với seed 42, snapshot mặc định, ngưỡng tick riêng là 18.000 / 19.800 / 21.600 và `--scenario tests/fixtures/phase-2-controlled-night.json`. Scenario chỉ kéo dài bất tử để đo toàn bộ thời lượng, vẫn bật sinh thực thể và gió theo mặc định. Xem [kết quả đo](headless.txt).

## Trình duyệt

- Menu → giới thiệu Đêm 1 → chơi. Thấy HUD, thông báo hết Ngọn Lửa, nút chơi lại và đồng hồ trở về 05:00.
- Phím P mở tạm dừng. Đồng hồ giữ nguyên khi vào cài đặt. Tăng âm lượng từ 0,50 lên 0,55, tải lại trang rồi mở cài đặt, giá trị vẫn là 0,55.
- Vite trên Windows, trình duyệt nhúng Chromium, viewport 1280×720. Mẫu Đêm 1 hiển thị trung bình **164,6 FPS trong 10 giây**, đo từ số frame thực bằng `?fps`. Chưa đo FPS riêng Đêm 2 và 3.
- Người làm lab xác nhận đã chơi xong cả ba màn.
- Âm thanh được tổng hợp trong mã. Chưa nghe và đối chiếu từng hiệu ứng.
