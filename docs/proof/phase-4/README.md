# Kiểm chứng Phase 4

## Kết quả đo

| Phép đo | Kết quả quan sát |
|---|---|
| Benchmark | 30 giây sau 3 giây khởi động, vùng render 1280×720. 4.941 khung hình, 164,72 FPS trung bình, 129,30 FPS cho 1% khung chậm nhất, p95 6,30 ms và tải 978 ms. |
| Soak | 10 Đêm, 0 crash. RSS từ 53,45 MB lên 61,21 MB (+14,51%). |
| Hồi quy | 24/24 bài kiểm thử đạt. Vite build thành công. |

Máy đo Windows x64, Intel Core i5-14450HX, Node.js 26.13, Edge/Chromium và Three.js r187 WebGL 2. Số đo FPS phụ thuộc màn hình và GPU của máy chấm. Browser giữ đồng bộ màn hình và không báo RSS tổng của các tiến trình. Xem [bench.json](../../../bench.json), [soak.json](../../../soak.json) và [log test](tests.txt) để đối chiếu.

## Chạy lại

```sh
npm ci
npm test
npm run build
node scripts/bench.js --seed 42 --duration 30 --out bench.json
node scripts/soak.js --seed 7 --nights 10 --out soak.json
```

## Bản web và đóng gói

- Ở màn thua, nhập tên thử `Test_May`. Sau khi tải lại, bảng xếp hạng vẫn hiện mục này. Lệnh xuất CLI đọc đúng điểm, số Đêm, seed và ngày đạt. Điểm thử nằm trong thư mục dữ liệu QA riêng. [Output xuất bảng điểm](leaderboard-export.json)
- Trong Cài đặt, gán phím E cho Nhảy báo trùng. Gán J thành công và vẫn giữ sau tải lại. Chữ lớn đặt cỡ chữ gốc thành 22,5 px. Giảm chuyển động được lưu sau tải lại. Khôi phục phím mặc định trả Nhảy về Space.
- Bản sao sạch trên Windows cài từ lockfile, chạy test và build. Lệnh khởi chạy trả HTTP 200 cho trang, module gameplay và API bảng điểm.
- [Ảnh bản web Đêm 1](game.jpg) cho thấy HUD và cảnh báo Bóng Mực xuất hiện. Chưa chơi lại toàn bộ chiến dịch bằng bản Phase 4.
