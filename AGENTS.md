# Đảo Đèn Lồng

- Cài phụ thuộc bằng `npm ci`, mở game bằng `npm run dev`, kiểm tra build bằng `npm run build` và chạy kiểm chứng bằng `npm test`. Trên PowerShell nếu npm.ps1 bị chặn, dùng `npm.cmd`.
- Đối chiếu PRD-0 và Ticket-02 đến Ticket-04 trước khi sửa hành vi. Phase 4 dùng Test Contract v1.3; giữ các luật v1.2 còn hiệu lực. Xem quyết định về đèn trong `docs/notes/phase-3.md`.
- Web và CLI phải dùng chung logic JavaScript thuần. Giữ Three.js, DOM và thời gian render ngoài mô phỏng. Logic tiến theo bước cố định 1/60 giây và dùng seed cho ngẫu nhiên.
- Giữ giá trị tuning trong `game.contract.json` khớp với game khi triển khai contract. Soát tên tham số, tick, schema và mã thoát theo đề.
- Dùng dữ liệu bản đồ chung ở `src/game/maps.js`. Pause chỉ tăng `tick`. Trừ nhiên liệu theo `sim_tick` trước khi xử lý tương tác, xét bình minh sau mọi hành động trong tick.
- Chạy `npm test` trước khi chốt phase. Chạy scenario thực tế và so output hai lần với cùng đầu vào. Lưu lệnh, input và output thật cùng phiên bản mã. Ghi rõ phần chưa đạt.
- Giữ file harness trong lịch sử Git. Không đưa khóa, token hay file `.env` vào repo.
- Hỏi và chờ người dùng đồng ý trước khi tạo commit.
- Chạy benchmark bằng cửa sổ Chromium thật và soak bằng một tiến trình Node. Lưu nguyên kết quả đo, ghi rõ máy và giới hạn đo; kiểm chứng bảng điểm bằng thư mục dữ liệu riêng.
