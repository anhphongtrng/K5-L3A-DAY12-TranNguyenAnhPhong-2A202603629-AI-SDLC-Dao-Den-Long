# Kiểm chứng Phase 1

## Headless

Chạy các lệnh dưới đây từ gốc repo sau khi cài bằng `npm ci`.

```sh
npm test
node src/headless.js --seed 42 --night 1 --ticks 10 --scenario tests/fixtures/final-lantern.json --inputs tests/fixtures/interact.json --out win.jsonl
node src/headless.js --seed 42 --night 1 --ticks 180 --scenario tests/fixtures/pulse-hit.json --inputs tests/fixtures/pulse.json --out loss.jsonl
```

| Kiểm chứng | Kết quả đã quan sát |
|---|---|
| Kiểm thử tự động trên Windows với Node.js 26 | 8/8 đạt, gồm so sánh JSONL tất định, nhịp snapshot mặc định/tùy chỉnh, mã lỗi của file đầu vào, chuyển động, nhảy, miễn nhiễm và vùng đèn an toàn. |
| Thắp đèn cuối | [JSONL thực tế](win.jsonl) có nhặt, nạp, thắp đèn và thắng tại tick 1. Điểm 318. |
| Pulse và hết máu | [JSONL thực tế](loss.jsonl) có pulse chỉ làm choáng Bóng Mực gần, rồi mất máu và thua. Điểm 20. |
| Đêm 1 mặc định | Test tự động chạy bộ mô phỏng của bản web từ trạng thái ban đầu, thắp cả 5 đèn khi Bóng Mực vẫn hoạt động. |

## Trình duyệt

- Mở bản web qua Vite. Đã quan sát canvas 3D, tiêu đề tiếng Việt và HUD. Máu bắt đầu ở 3, số đèn ở 0/5.
- Đứng yên đến khi bị Bóng Mực chạm hết máu. Game hiện “Đêm đã kết thúc” và “Mây đã hết máu. Điểm: 0.”
- Bấm **Chơi lại**. Màn kết quả đóng, máu về 3, số đèn về 0/5, thời gian về 180 giây.
- Chưa chơi thủ công đến thắng trên trình duyệt. Luồng thắng đã chạy trong test mô phỏng và CLI.
