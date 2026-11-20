import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { topTen, validEntry } from '../src/game/leaderboard.js';

const folder = process.env.LANTERN_DATA_DIR ? resolve(process.env.LANTERN_DATA_DIR)
  : fileURLToPath(new URL('../.lantern-data/', import.meta.url));
const file = join(folder, 'leaderboard.json');
export function readLeaderboard() {
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { entries: [] };
    throw error;
  }
  return { entries: topTen(data.entries) };
}

export function leaderboardMiddleware(req, res, next) {
  if (req.url !== '/api/leaderboard') return next();
  const send = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  };
  if (req.method === 'GET') {
    try { send(200, readLeaderboard()); } catch { send(500, { error: 'Không đọc được bảng điểm.' }); }
    return;
  }
  if (req.method !== 'POST' || req.headers.origin !== 'http://' + req.headers.host ||
      req.headers['content-type'] !== 'application/json') {
    send(403, { error: 'Yêu cầu không hợp lệ.' });
    return;
  }
  let body = '';
  let bytes = 0;
  req.on('data', (chunk) => {
    bytes += chunk.length;
    if (bytes <= 2048) body += chunk.toString('utf8');
  });
  req.on('end', () => {
    if (bytes > 2048) return send(413, { error: 'Dữ liệu quá lớn.' });
    let entry;
    try { entry = JSON.parse(body); } catch { return send(400, { error: 'Dữ liệu không hợp lệ.' }); }
    if (!validEntry(entry)) return send(400, { error: 'Điểm hoặc tên không hợp lệ.' });
    const { name, score, nights_won, seed } = entry;
    try {
      const result = { entries: topTen([...readLeaderboard().entries,
        { name, score, nights_won, achieved_at: new Date().toISOString(), seed }]) };
      mkdirSync(folder, { recursive: true });
      const temporary = file + '.tmp';
      writeFileSync(temporary, JSON.stringify(result, null, 2) + '\n');
      renameSync(temporary, file);
      send(200, result);
    } catch {
      send(500, { error: 'Không lưu được bảng điểm.' });
    }
  });
}
