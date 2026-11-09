import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && node apps/server/dist/index.js',
    url: 'http://127.0.0.1:3100/healthz',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      PORT: '3100',
      HOST: '127.0.0.1',
      LOG_LEVEL: 'silent',
      CLIENT_DIST: 'apps/client/dist',
    },
  },
});
