import { leaderboardKey, topTen } from '../game/leaderboard.js';

const endpoint = new URL('api/leaderboard', document.baseURI);
const localEntries = () => {
  try { return topTen(JSON.parse(localStorage.getItem(leaderboardKey) ?? '[]')); } catch { return []; }
};
let diskMode;
export async function loadScores() {
  try {
    const response = await fetch(endpoint);
    if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
      diskMode = true;
      return topTen((await response.json()).entries);
    }
    if (response.status >= 500) diskMode = true;
    if (diskMode) throw new Error('Không đọc được bảng điểm.');
  } catch (error) {
    if (diskMode) throw error;
  }
  diskMode = false;
  return localEntries();
}
export async function saveScore(entry) {
  const entries = await loadScores();
  if (diskMode) {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry),
    });
    if (!response.ok) throw new Error('Không lưu được bảng điểm.');
    return;
  }
  localStorage.setItem(leaderboardKey, JSON.stringify(topTen([...entries,
    { ...entry, achieved_at: new Date().toISOString() }])));
}
