# Đảo Đèn Lồng

- Cài phụ thuộc bằng `npm ci`, mở game bằng `npm run dev`, kiểm tra build bằng `npm run build` và chạy kiểm chứng bằng `npm test`. Trên PowerShell nếu npm.ps1 bị chặn, dùng `npm.cmd`.
- Đọc PRD-0 và Ticket-02 trước khi sửa hành vi. Phase 2 dùng Test Contract v1.1 và thay tuning Phase 1. Xem tiêu chí nghiệm thu và quyết định ở `docs/notes/phase-2.md`.
- Web và CLI phải dùng chung logic JavaScript thuần. Giữ Three.js, DOM và thời gian render ngoài mô phỏng. Logic tiến theo bước cố định 1/60 giây và dùng seed cho ngẫu nhiên.
- Giữ giá trị tuning trong `game.contract.json` khớp với game khi triển khai contract. Soát tên tham số, tick, schema và mã thoát theo đề.
- Dùng dữ liệu bản đồ chung ở `src/game/maps.js`. Phân biệt `tick` và `sim_tick`; pause chỉ tăng `tick`. Mọi thay đổi thứ tự xử lý cần đối chiếu Ticket-02.
- Chạy `npm test` trước khi chốt phase. Chạy scenario thực tế và so output hai lần với cùng đầu vào. Lưu lệnh, input và output thật cùng phiên bản mã. Ghi rõ phần chưa đạt.
- Giữ file harness trong lịch sử Git. Không đưa khóa, token hay file `.env` vào repo.
- Hỏi và chờ người dùng đồng ý trước khi tạo commit.
