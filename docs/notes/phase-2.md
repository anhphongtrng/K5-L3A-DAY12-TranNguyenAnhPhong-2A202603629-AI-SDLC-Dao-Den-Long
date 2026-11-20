# Phase 2 · Ba hòn đảo

## Nghiệm thu

| Tính năng | Kết quả cần quan sát |
|---|---|
| Gió Lạc | Sinh theo lịch, đuổi khi đủ đom đóm, cướp tối đa ba, rút lui một lần; pulse có thể xua hoặc thu hồi đồ bị cướp. |
| Bùa Gió | Nhặt trong tầm, tốc độ 7,2 m/s; lướt không hồi chiêu khi còn bùa; bùa hết hạn và xuất hiện lại đúng tick. |
| Ba Đêm | Menu → giới thiệu → chơi → kết quả; thắng mở Đêm kế, thua chơi lại cùng Đêm; Bình Minh cộng điểm các Đêm đã thắng. |
| Tạm dừng | Esc/P mở menu; tick CLI vẫn tăng, đồng hồ mô phỏng đứng yên; tiếp tục, chơi lại, cài đặt và về menu hoạt động. |
| Cài đặt | Âm lượng và độ nhạy chuột có hiệu lực và giữ sau khi tải lại. |
| Âm thanh | Có nhạc nền và tín hiệu cho các hành động, kết quả, Bóng Mực sinh, cảnh báo gió và 10 giây cuối. |
| HUD | Hiện máu, mm:ss, tiến độ, điểm, 10 ô đom đóm, hồi chiêu, nhắc nạp đèn và chỉ hướng đèn ở ngoài màn hình. |
| Màu và ánh sáng | Đối chiếu màu vật liệu với bảng chuẩn; ánh sáng môi trường tăng từ 0,15 đến 0,70. |

## Giả định và thay đổi

- Điểm bắt đầu Đêm 2 là tâm đảo A. Đêm 3 bắt đầu ở `(0, 0, -12)` trên tầng 0, phía nam tháp, vì ticket chỉ định điểm xuất phát chính xác cho Đêm 1. Hồi sinh dùng điểm xuất phát của Đêm hiện tại.
- Dùng khoảng cách XZ cho tương tác với đèn và vùng an toàn như v1.0. Dùng điều kiện độ cao riêng khi nhặt hoặc bị Bóng Mực chạm, và khoảng cách 3D cho Tỏa Sáng.
- Gió Lạc sinh trên các điểm sương ở vòng ngoài của bản đồ, dùng điểm sinh Bóng Mực vì ticket không liệt kê tọa độ riêng. Tỏa Sáng tác động Gió Lạc với cùng tâm và bán kính 3D.
- Snapshot tick 0 vẫn là trạng thái trước input. Sau snapshot đầu, CLI xuất `night_start` ở tick 0. Đom đóm thường không có TTL nên ghi `ttl_s: null`.
- Các test Phase 1 được cập nhật vì Phase 2 thay tốc độ, giá thắp đèn, điểm, chi phí Tỏa Sáng và trạng thái Bóng Mực. Test đủ ánh sáng cho màn đầu chạy riêng với Bóng Mực tắt; sát thương và vùng đèn có test riêng. Tag `phase-1` giữ nguyên dữ liệu kiểm chứng cũ.

## Đánh giá

- Test và benchmark trong [bằng chứng Phase 2](../proof/phase-2/README.md) chạy bằng lệnh thật. Kết quả test ẩn phụ thuộc bộ chấm của giảng viên.
- Codex đọc ticket, triển khai bản đồ, mô phỏng, CLI, UI và kiểm chứng. Không có số token hoặc chi phí được đo từ phiên làm việc. Dùng lại bộ mô phỏng và test Phase 1 để giảm mã trùng.
- Bài test gió phát hiện điểm `(0, 0, 0)` ở Đêm 3 bị tầng cao che kín. Đã đổi điểm xuất phát sang tầng 0 và giữ luật vách đứng.
