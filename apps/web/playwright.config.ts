import { defineConfig } from '@playwright/test'
import path from 'node:path'
import { config as dotenvConfig } from 'dotenv'

// Load env from monorepo root .env so tests pick up API_BASE and JWT_SECRET
dotenvConfig({ path: path.resolve(process.cwd(), '../../.env') })

const FRONTEND_PORT = process.env.FRONTEND_PORT || '5999'
const API_BASE = process.env.API_BASE || 'http://localhost:3388'

export default defineConfig({
  testDir: 'tests-e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    headless: true,
  },
  webServer: {
    // Only start Nuxt; API is provided by Docker (API_BASE)
    command: `bash -lc 'NUXT_PUBLIC_API_BASE="${API_BASE}" NUXT_TELEMETRY_DISABLED="1" nuxt dev -p ${FRONTEND_PORT} -H 0.0.0.0'`,
    url: `http://localhost:${FRONTEND_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
  },
})
