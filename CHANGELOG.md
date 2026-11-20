# Thay đổi theo phase

## Phase 4 · Bình minh

- Test Contract v1.3 có lệnh benchmark Chromium và soak dùng mô phỏng headless.
- Thêm bảng xếp hạng top 10, lưu điểm trên máy và xuất JSON từ CLI.
- Thêm đổi phím, cảnh báo hình ảnh, giảm chuyển động và chữ lớn.
- Chuẩn bị gói web tĩnh, bằng chứng đo và retro.

## Phase 3 · Đèn cạn dầu

Thay đổi phá vỡ tương thích từ Contract v1.1 sang v1.2.

- Thời lượng ba Đêm là 240, 270 và 300 giây. Bỏ kết thúc `all_lit`. Thắng chỉ xảy ra ở bình minh khi còn Ngọn Lửa và đủ 60% đèn sáng, với lý do `dawn_survived`.
- Đèn có nhiên liệu, tự tắt khi cạn, có thể châm dầu và thắp lại. Snapshot thêm `fuel`, `ever_lit`, `relit_count`. Scenario nhận `fuel`, `ever_lit`. `lantern_lit` thêm `relight`; có thêm `refuel` và `lantern_out`.
- Bóng Mực có trạng thái `drain`. Scenario nhận `target_lantern_id`; có thêm sự kiện `fuel_drain`. Đèn dưới 30 dầu không tạo vùng an toàn.
- Snapshot người chơi thêm `capacity`; scenario nhận `successful_lights`. Sức chứa tăng theo số lần thắp trong Đêm.
- Điểm nạp giảm còn 5 mỗi đom đóm. Thắp lại cho 40 điểm. Pulse trúng Bóng Mực đang hút cho 15 điểm tổng cộng. Thay thưởng thời gian bằng thưởng đèn và nhiên liệu ở bình minh.

## Phase 2 · Ba hòn đảo

- Chuẩn hóa tuning, mở ba Đêm, thêm lướt, địa hình nhiều tầng, Bùa Gió, Gió Lạc và tạm dừng.
- Contract v1.1 thêm bản đồ, trạng thái, scenario và trường đầu ra.

## Phase 1 · Đảo Bến

- Xây Đêm 1 với thu thập, thắp đèn, Bóng Mực, điểm và chơi lại.
- Thêm CLI tất định theo Contract v1.0 và kiểm chứng JSONL.
