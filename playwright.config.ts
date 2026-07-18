import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: 'e2e',
  timeout: 60000,                 // dev-server on-demand route compiles add ~5-8s per first hit
  retries: 2,                     // single-process chromium occasionally crashes on relaunch (this machine)
  workers: 1,
  // --single-process: chrome-headless-shell crashes (SIGTRAP/EPERM) on this machine without it
  use: { baseURL: 'http://localhost:3000', launchOptions: { args: ['--single-process', '--no-sandbox'] } },
  webServer: { command: 'IMAGE_PROVIDER=mock MOCK_AI=1 npm run dev', port: 3000, reuseExistingServer: true },
})
