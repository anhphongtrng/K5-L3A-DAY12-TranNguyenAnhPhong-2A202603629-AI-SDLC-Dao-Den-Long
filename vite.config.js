import { defineConfig } from 'vite';
import { leaderboardMiddleware } from './scripts/leaderboard.js';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'local-leaderboard',
    configureServer(server) { server.middlewares.use(leaderboardMiddleware); },
    configurePreviewServer(server) { server.middlewares.use(leaderboardMiddleware); },
  }],
  server: {
    host: '127.0.0.1',
    fs: {
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.lantern-data/**'],
    },
    watch: {
      ignored: ['**/.vs/**'],
    },
  },
});
