export const leaderboardKey = 'lantern:leaderboard-v1';
export const validName = (name) => typeof name === 'string' && /^[A-Za-z0-9_]{3,12}$/.test(name);
export function validEntry(entry) {
  return entry && validName(entry.name) && Number.isSafeInteger(entry.score) && entry.score >= 0 &&
    Number.isInteger(entry.nights_won) && entry.nights_won >= 0 && entry.nights_won <= 3 &&
    Number.isSafeInteger(entry.seed);
}
export function topTen(entries) {
  return entries.filter((entry) => validEntry(entry) && typeof entry.achieved_at === 'string' &&
    Number.isFinite(Date.parse(entry.achieved_at)))
    .sort((a, b) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at)).slice(0, 10);
}
