import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createServer } from 'vite';
import { readLeaderboard } from './leaderboard.js';

try {
  const { values } = parseArgs({ options: { 'export-leaderboard': { type: 'string' } } });
  if (values['export-leaderboard']) {
    writeFileSync(values['export-leaderboard'], JSON.stringify(readLeaderboard(), null, 2) + '\n');
  } else {
    const server = await createServer();
    await server.listen();
    server.printUrls();
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
