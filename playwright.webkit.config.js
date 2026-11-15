import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config.js'

// Opt-in: Windows must permit the downloaded WebKit executables and libraries.
// Mobile emulation exercises WebKit; it does not certify a physical iPhone.
export default defineConfig({
  ...base,
  projects: [{
    name: 'mobile-webkit',
    use: { ...devices['iPhone 13'], browserName: 'webkit' },
  }],
})
