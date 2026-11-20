# Retro · Đảo Đèn Lồng

## Kết quả qua bốn phase

**Phase 1.** Chọn Three.js và Vite cho giao diện, Node.js cho CLI. Giữ luật trong một mô phỏng JavaScript thuần giúp kiểm tra tick và kết quả mà không mở trình duyệt. Ảnh in đề cắt giá trị tần suất snapshot; ảnh lab board xác nhận mặc định là 10 tick. Chữ “Lồng” bị lệch dấu trong font Georgia trên máy người chơi, nên chuyển tiêu đề sang font hệ thống. Kiểm chứng headless trước giúp phát hiện lỗi hợp đồng sớm.

**Phase 2.** Chuẩn hóa tuning và bổ sung ba bản đồ trong cùng bộ mô phỏng. Các test cũ phát hiện những giá trị phải đổi như tốc độ và chi phí thắp đèn. Test gió phát hiện một vấn đề địa hình: điểm gốc Đêm 3 ở dưới tầng cao. Dời điểm xuất phát sang khoảng trống tầng 0. Người làm lab xác nhận chơi qua ba màn. Soát sau khi nộp phát hiện Bóng Mực có thể mắc kẹt khi bị đẩy về phía mép đảo.

**Phase 3.** Lưu nhiên liệu dạng số nguyên, tách hao dầu và kiểm tra bình minh vào đúng vị trí trong tick. Đổi các test thắng sớm sang kiểm tra ngưỡng cuối Đêm và ghi lý do trong ADR. Kịch bản sát mép đảo xác nhận đường đẩy thay thế giải quyết trường hợp lỗi đã tái hiện ở Phase 2. Hai lần chạy kịch bản bình minh cho đầu ra giống hệt.

**Phase 4.** Bổ sung công cụ chạy cảnh chuẩn và đo thời gian khung hình qua trình duyệt thật, cùng soak dùng một tiến trình mô phỏng. Giữ tùy chọn truy cập ở bản web để tránh ảnh hưởng đầu ra CLI. Kiểm tra lại bảng xếp hạng bằng dữ liệu riêng, để điểm thử không lẫn vào bảng điểm của người chơi. Các ngưỡng benchmark chính thức còn phụ thuộc máy chấm.

## Làm việc với AI

Giữ yêu cầu theo từng ticket và lệnh chạy trong `AGENTS.md` giúp AI sửa đúng lớp và tự kiểm tra. Test tình huống nhỏ có ích nhất khi thay đổi luật, nhất là ở các ranh giới như giây cuối, đèn vừa tắt hoặc gió bắt đầu. JSONL cho phép so kết quả tái lập theo seed. Bài kiểm tra giao diện bổ sung các lỗi mà headless không thấy, như font tiếng Việt và cài đặt lưu sau tải lại.

Điểm yếu là từng diễn giải thiếu dữ liệu của PDF và có lúc xác nhận một luồng dựa trên test tự động trước khi chơi tay đầy đủ. Phân biệt rõ bằng chứng từ CLI, đo trình duyệt và xác nhận của người chơi để giới hạn kết luận. Tag của mỗi phase giúp truy nguyên bằng chứng trong khi test hồi quy tiếp tục thay đổi theo yêu cầu.

Không có tổng token hay hóa đơn từ phiên làm việc. Ước lượng thô theo độ dài mã, ticket, trao đổi và output công cụ là khoảng **60.000–130.000 token** cho bốn phase, không quy đổi chi phí vì thiếu số liệu mô hình và gói sử dụng. Việc tiết kiệm ngữ cảnh đến từ đọc các đoạn liên quan, tái sử dụng bộ mô phỏng, dùng fixture ngắn và lưu kết quả trong repo để khỏi chạy lại chỉ để tra cứu.

## Nếu làm lại

Chốt sớm các điểm mơ hồ trong contract với Coach, nhất là dữ liệu scenario và thứ tự tick. Viết fixture cho mép địa hình và các ranh giới số ngay khi có ticket. Thử benchmark thật sớm để có thời gian xử lý khác biệt GPU/trình duyệt. Quay vài đoạn kiểm chứng ngắn sau mỗi phase để dựng video cuối từ dữ liệu thật.
