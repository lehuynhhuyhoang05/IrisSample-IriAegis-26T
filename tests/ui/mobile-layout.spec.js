/* global localStorage, window, EventTarget */
import { test, expect } from '@playwright/test'
import { fixture, login as serverLogin } from './server-fixture.js'

async function preview(page) {
  await page.addInitScript(() => localStorage.setItem('aegis.data-mode', 'demo'))
  await page.goto('/#/app/login')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hôm nay', exact: true })).toBeVisible()
}

test('menu phân nhóm giữ đủ đường dẫn và trả focus khi đóng', async ({ page }, info) => {
  await preview(page)
  await page.setViewportSize({ width: 390, height: 844 })
  const trigger = page.getByRole('button', { name: 'Thêm mục điều hướng' })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('navigation', { name: 'Các chức năng khác' })).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Sinh viên', exact: true })).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Sao lưu', exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('iphone-menu.png') })
  await page.getByRole('button', { name: 'Đóng hộp thoại' }).click()
  await expect(trigger).toBeFocused()
  await expect(page.getByRole('navigation', { name: 'Điều hướng trên điện thoại' })).toBeVisible()
})

test('form trên iPhone giữ nút lưu trong vùng nhìn khi bàn phím thu nhỏ viewport', async ({ page }, info) => {
  await preview(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/app/students')
  await page.evaluate(() => {
    const viewport = new EventTarget()
    Object.assign(viewport, { height: 420, offsetTop: 0, scale: 1 })
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
  })
  await page.getByRole('button', { name: 'Thêm sinh viên', exact: true }).click()
  const save = page.getByRole('button', { name: 'Lưu sinh viên', exact: true })
  await expect(save).toBeVisible()
  const bounds = await save.boundingBox()
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(421)
  await page.screenshot({ path: info.outputPath('iphone-keyboard-viewport.png') })
  await page.getByRole('button', { name: 'Hủy', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Thêm sinh viên', exact: true })).toBeFocused()
})

test('chế độ API ghi đúng Server trên thanh ứng dụng', async ({ page }) => {
  await fixture(page); await serverLogin(page)
  await expect(page.getByRole('link', { name: 'Cấu hình kết nối server', exact: true })).toHaveText('Server')
  await expect(page.getByRole('link', { name: 'Thiết lập demo', exact: true })).toHaveCount(0)
})
