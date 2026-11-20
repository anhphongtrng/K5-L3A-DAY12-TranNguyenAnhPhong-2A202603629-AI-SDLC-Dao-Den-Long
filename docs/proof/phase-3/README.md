# Kiểm chứng Phase 3

Chạy từ gốc repo.

```sh
npm test
npm run build
node src/headless.js --seed 42 --night 1 --ticks 60 --scenario tests/fixtures/phase-3-dawn.json --inputs tests/fixtures/interact.json --out dawn.jsonl
```

- [Báo cáo test](tests.txt) gồm hồi quy Phase 1–2, nhiên liệu tính theo tick, châm/thắp lại, hút cộng dồn, pause, ngưỡng an toàn, đẩy sát mép đảo và kết quả bình minh.
- [JSONL bình minh](dawn.jsonl) ghi L1 thắp lại ở tick 1, L4 cạn dầu ở tick 60, rồi thắng với ba đèn sáng và 622 điểm. Hai lần chạy cùng đầu vào cho file giống hệt.
- Chromium tải bản web Đêm 1 và hiển thị đồng hồ 04:00, mục tiêu 3/5 đèn và sức chứa 0/10. Đã bật Bảng màu dễ phân biệt và xác nhận lựa chọn vẫn bật sau khi tải lại. Chưa chơi thủ công hết ba Đêm theo luật mới hoặc xác nhận trực quan mọi trạng thái thanh nhiên liệu.
