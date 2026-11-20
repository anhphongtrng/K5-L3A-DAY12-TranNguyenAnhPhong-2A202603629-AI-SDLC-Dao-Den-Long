# Phase 1 · Giả định và kế hoạch kiểm chứng

## Phạm vi

Đêm 1 có đảo tròn, 5 đèn, Mây đi và nhảy với camera 3D góc nhìn thứ ba. Mây nhặt và nạp ánh sáng, dùng pulse để xua Bóng Mực. Màn chơi có HUD, điểm số, thắng/thua và chơi lại.

PRD-0 bản PDF trang 4–8 là nguồn cho Test Contract v1.0. Ảnh mục B trên lab board xác nhận `--snapshot-every` mặc định là **10 tick**. Khi bỏ qua tham số, CLI ghi snapshot ở tick 0, 10, 20… trong thời gian mô phỏng. Snapshot tick 0 được ghi sau khi dựng scenario và trước khi áp dụng input.

## Thông số Phase 1

Các giả định dưới đây đã được dùng trong game. Logic đọc các thông số chấm trực tiếp từ `game.contract.json`. Màn mặc định sinh 45 đom đóm và hai Bóng Mực ngay khi dựng màn, nên không phát `shade_spawned` trong thời gian chơi Phase 1.

| Nhóm | Mặc định đề xuất |
|---|---|
| Đêm 1 | 5 đèn, 180 giây, 3 máu, không phạt rơi khỏi đảo. Giữ Mây trong ranh giới đảo. |
| Di chuyển và nhặt | Tốc độ 5 m/s, nhặt trong 0,8 m, mang tối đa 10 đom đóm. |
| Nạp đèn | 5 đom đóm mỗi đèn, tầm tương tác 1,5 m. Mỗi lần nạp tối đa lượng còn thiếu của đèn, cho phép nạp dở. |
| Bóng Mực | Tốc độ 2,5 m/s, tầm chạm 0,6 m, miễn nhiễm 1,5 giây sau khi trúng, không rơi đom đóm. Vùng an toàn 2 m quanh đèn đã thắp. |
| Pulse | Tốn 2 đom đóm, tầm 3 m, choáng 2 giây, đẩy 1 m, hồi 3 giây. |
| Điểm | +10 mỗi đom đóm, +100 mỗi đèn, +20 mỗi Bóng Mực bị pulse làm choáng. Khi thắng, cộng 2 điểm mỗi giây nguyên còn lại và 50 điểm mỗi máu còn lại. |

## Tiêu chí nghiệm thu và bằng chứng dự kiến

| Kiểm tra | Kết quả cần thấy | Bằng chứng |
|---|---|---|
| Di chuyển và nhảy | Đi đúng hướng camera, chéo không nhanh hơn, bấm nhảy Mây rời mặt đất rồi tiếp đất. | Scenario theo tick và clip ngắn. |
| Nhặt và nạp đèn | Nhặt trong tầm, giữ đúng sức chứa, nạp và thắp đúng lượng. Giữ nút tương tác không tạo thêm lượt nạp. | JSONL có `mote_picked`, `deposit`, `lantern_lit`. |
| Bóng Mực | Đuổi Mây, chạm gây mất máu, miễn nhiễm có hiệu lực; Bóng Mực tránh vùng đèn sáng. | Scenario cho từng hành vi và JSONL. |
| Pulse | Trừ đúng chi phí, chỉ tác động Bóng Mực trong tầm; không kích hoạt khi thiếu sáng hoặc đang hồi. | Scenario với mục tiêu trong/ngoài tầm và event `pulse`. |
| Kết thúc và chơi lại | Thắng đủ 5 đèn, thua khi hết máu hoặc hết giờ; HUD và điểm đúng, chơi lại đặt lại màn. | Scenario kết thúc và clip chơi lại. |
| Test Contract | Tick 0 trước input, snapshot mặc định mỗi 10 tick, event đúng tick, dòng cuối là `end`, input/scenario sai trả mã 2. Cùng đầu vào cho JSONL giống nhau. | Lệnh chạy có và không có `--snapshot-every`, fixture, output và kết quả so sánh. |
| Khởi chạy | Clone sạch, cài và mở được bằng tối đa 3 lệnh, headless chạy trên macOS hoặc Linux. | Lệnh, môi trường và kết quả thực tế. |

## Nhật ký AI

- Dùng Codex để đọc yêu cầu, đề xuất stack, chuẩn bị harness, triển khai game và chạy kiểm chứng. Ước tính khoảng 15.000–30.000 token cho quá trình chuẩn bị và triển khai dựa trên độ dài trao đổi, thao tác và mã. Phiên chat chưa có số liệu sử dụng hoặc chi phí xác nhận.
- Giảm ngữ cảnh bằng cách bám PRD-0, dùng một bộ mô phỏng chung và kiểm chứng bằng fixture nhỏ trước khi thử trên trình duyệt.

## Đánh giá Phase 1

- Đã kiểm chứng luồng thắp đèn, pulse, mất máu, tất định, mã thoát và thắng cả màn mặc định bằng mô phỏng. Trên trình duyệt đã thử tải game, HUD, thua và chơi lại. Xem [bằng chứng](../proof/phase-1/README.md).
- Ảnh PDF cắt giá trị mặc định của CLI và font Georgia hiển thị lỗi dấu trên máy người dùng. Đã dùng ảnh lab board để xác nhận 10 tick và chuyển tiêu đề sang font hệ thống.
- Lần sau nên xác minh đầy đủ contract và dùng fixture kiểm tra hành vi ngay khi dựng CLI. Chưa chơi thủ công đến thắng trên trình duyệt.
