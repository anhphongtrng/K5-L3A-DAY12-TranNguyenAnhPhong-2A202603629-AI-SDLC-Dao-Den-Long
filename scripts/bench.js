import { existsSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import contract from '../game.contract.json' with { type: 'json' };
import { integerOption } from './args.js';

const processStart = Date.now() - process.uptime() * 1000;
async function run() {
  const { values } = parseArgs({ options: {
    seed: { type: 'string' }, duration: { type: 'string' }, out: { type: 'string' },
  } });
  const seed = integerOption(values.seed, 'seed', Number.MIN_SAFE_INTEGER);
  const duration = Number(values.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Invalid --duration');
  if (!values.out) throw new Error('Missing --out');
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  let browser;
  try {
    await server.listen();
    const executablePath = process.env.LANTERN_CHROMIUM;
    const edge = process.platform === 'win32' && !existsSync(chromium.executablePath());
    browser = await chromium.launch({
      headless: false, executablePath, channel: !executablePath && edge ? 'msedge' : undefined,
      args: ['--window-size=1280,720', '--no-first-run'],
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(server.resolvedUrls.local[0] + 'bench.html?' + new URLSearchParams({ seed, duration }));
    try {
      await page.waitForFunction(() => globalThis.benchResult, { }, { timeout: (duration + 30) * 1000 });
    } catch (error) {
      throw new Error(errors.join('\n') || error.message);
    }
    const data = await page.evaluate(() => ({ ...globalThis.benchResult, first: globalThis.benchLoaded }));
    const { first, ...numbers } = data;
    writeFileSync(values.out, JSON.stringify({ contract_version: contract.contract_version, ...numbers,
      load_ms: Math.round(first - processStart), peak_mem_mb: null, vsync_off: false,
      os: os.type() + ' ' + os.release() + ' ' + os.arch(),
    }, null, 2) + '\n');
  } finally {
    await browser?.close();
    await server.close();
  }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
