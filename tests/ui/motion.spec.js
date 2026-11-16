/* global localStorage, Element, window, document, requestAnimationFrame */
import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 393, height: 680 } })
async function prepare(page, reduced = false) {
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
  await page.addInitScript(() => {
    localStorage.setItem('aegis.data-mode', 'demo')
    window.motionCalls = []
    const animate = Element.prototype.animate
    Element.prototype.animate = function (frames, options) {
      window.motionCalls.push({ frames, duration: options.duration })
      return animate.call(this, frames, options)
    }
  })
  await page.goto('/#/app/login')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hôm nay', exact: true })).toBeVisible()
}
const menuButton = page => page.getByRole('button', { name: 'Mở menu điều hướng', exact: true })

test('menu animates entry/exit, interrupted entry releases the background and restores focus', async ({ page }, info) => {
  await prepare(page)
  // Native click avoids Playwright waiting for entry to finish before testing interruption.
  const state = await page.evaluate(async () => {
    document.querySelector('.portal-menu-button').click()
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const dialog = document.querySelector('.portal-drawer')
    const entry = dialog.getAnimations().find(a => a.id === 'drawer-open')
    entry?.pause()
    if (entry) entry.currentTime = 90
    dialog.querySelector('.ui-dialog-heading button').click()
    dialog.querySelector('.ui-dialog-heading button').click()
    return { phase: dialog.dataset.motionPhase, open: dialog.open, locked: document.body.style.overflow }
  })
  expect(state).toEqual({ phase: 'closing', open: true, locked: 'hidden' })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(menuButton(page)).toBeFocused()
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await menuButton(page).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('link', { name: 'Sinh viên', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sinh viên', exact: true })).toBeVisible()
  await expect(dialog).toHaveCount(0)
  await menuButton(page).click()
  await expect.poll(async () => Math.round((await page.getByRole('dialog').boundingBox()).x)).toBe(0)
  await page.screenshot({ path: info.outputPath('menu-motion-complete.png') })
})

test('rapid group toggles settle correctly; form still focuses and closes normally', async ({ page }) => {
  await prepare(page); await menuButton(page).click()
  const group = page.getByRole('dialog').locator('details').filter({ has: page.locator('summary', { hasText: 'Quản lý' }) })
  await group.evaluate(async details => {
    const summary = details.querySelector('summary')
    summary.click()
    await new Promise(requestAnimationFrame)
    summary.click()
    summary.click()
  })
  await expect(group.getByRole('link', { name: 'Sinh viên', exact: true })).toBeHidden()
  await group.locator('summary').click()
  await group.getByRole('link', { name: 'Sinh viên', exact: true }).click()
  await page.getByRole('button', { name: 'Thêm sinh viên', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Mã sinh viên', { exact: false })).toBeFocused()
  await page.getByRole('button', { name: 'Hủy', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Thêm sinh viên', exact: true })).toBeFocused()
  const calls = await page.evaluate(() => window.motionCalls)
  expect(calls.some(call => call.frames[0].height !== undefined)).toBe(true)
  expect(calls.some(call => call.frames[0].opacity === 0)).toBe(true)
})

test('reduced motion keeps menu, groups and forms usable without animations', async ({ page }) => {
  await prepare(page, true); await menuButton(page).click()
  const dialog = page.getByRole('dialog')
  await expect.poll(async () => Math.round((await dialog.boundingBox()).x)).toBe(0)
  const group = dialog.locator('details').filter({ has: page.locator('summary', { hasText: 'Quản lý' }) })
  await group.locator('summary').click()
  await expect(group.getByRole('link', { name: 'Sinh viên', exact: true })).toBeHidden()
  await group.locator('summary').click()
  await group.getByRole('link', { name: 'Sinh viên', exact: true }).click()
  await page.getByRole('button', { name: 'Thêm sinh viên', exact: true }).click()
  await expect(page.getByRole('dialog').getByLabel('Họ tên', { exact: false })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => window.motionCalls)).toEqual([])
})
