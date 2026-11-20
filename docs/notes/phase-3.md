# ADR · Mô hình đèn và luật thắng ở bình minh

**Bối cảnh.** Phase 2 kết thúc ngay khi thắp đủ đèn. Ticket-03 yêu cầu người chơi giữ được ánh sáng đến hết Đêm.

**Quyết định.** Lưu nhiên liệu bằng số nguyên theo đơn vị 1/60. Trong một tick mô phỏng, hao tự nhiên trừ 1 đơn vị nội bộ, mỗi Bóng Mực đang hút trừ thêm 5. Tính hết hao và tắt đèn trước tương tác để người chơi có thể thắp lại ngay trong tick đèn tắt. Chỉ làm tròn khi xuất JSONL. Một đèn tắt xóa tiến độ nạp và giữ lịch sử thắp. Sức chứa lấy từ số lần thắp thực tế, riêng scenario có thể đặt giá trị ban đầu để kiểm thử.

**Thứ tự và chuyển trạng thái.** Dựa vào trạng thái hút từ cuối tick trước để trừ dầu. Ghi sự kiện sau mỗi 60 tick hút liên tục của từng Bóng Mực, tính theo tick mô phỏng. Chọn đèn yếu theo khoảng cách XZ và id. Sau tương tác, tính lại vùng an toàn và chọn đường đẩy ra mép có thể đi được, kể cả khi hướng xuyên tâm bị mép đảo chặn. Xét bình minh sau di chuyển, nạp dầu và va chạm. Hết Ngọn Lửa luôn ưu tiên hơn thắng.

**Ảnh hưởng lên test cũ.** Test thắp đèn cuối vẫn kiểm tra nhặt, nạp và thắp, nhưng kiểm tra trạng thái tiếp tục thay cho thắng sớm và điểm mới. Test đủ đom đóm Đêm 1 kiểm tra ngưỡng ba đèn ở bình minh thay cho năm đèn sáng cùng lúc. Các test về input, tick, lỗi CLI, di chuyển, pause, bản đồ, gió và thực thể Phase 2 vẫn chạy.

**Đánh giá.** Dùng Codex để thay logic mô phỏng, nối HUD, viết test và thu bằng chứng. Giữ mô phỏng dùng chung và chỉ cập nhật những kỳ vọng bị ticket thay thế. Phiên làm việc không có số liệu token hoặc chi phí đo được. Xem [kết quả kiểm chứng](../proof/phase-3/README.md).
