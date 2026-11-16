/* global localStorage, document */
import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { seedData } from '../../src/portal/domain.js'

async function login(page) {
  await page.addInitScript(() => localStorage.setItem('aegis.data-mode', 'demo'))
  await page.goto('/#/app/login')
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Lịch dạy hôm nay' })).toBeVisible()
}

test('công cụ Android: tạo giờ tùy chọn, không trùng, random và xóa hôm nay', async ({ page }, info) => {
  await login(page); await page.goto('/#/app/mock-attendance')
  await page.getByLabel('Dùng giờ tùy chọn').check()
  await page.getByLabel('Giờ điểm danh thử', { exact: true }).fill('07:40')
  await page.getByRole('button', { name: 'Điểm danh các sinh viên còn lại' }).click()
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã tạo 5 lượt thử' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Điểm danh các sinh viên còn lại' })).toBeDisabled()
  await page.screenshot({ path: info.outputPath('mock-attendance.png'), fullPage: true })
  await page.getByRole('button', { name: 'Xóa điểm danh hôm nay' }).click()
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã xóa 8 lượt' })).toBeVisible()
  await page.getByRole('button', { name: 'Tạo giờ ngẫu nhiên' }).click()
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Đã tạo 8 lượt thử' })).toBeVisible()
})

test('bộ lọc báo cáo được giữ tới CSV đính kèm email', async ({ page }, info) => {
  await login(page); await page.goto('/#/app/reports?course=WEB301')
  await page.getByLabel('Trạng thái', { exact: true }).selectOption('LATE')
  await page.getByRole('button', { name: 'Chuẩn bị email', exact: true }).click()
  await page.getByText('Phạm vi báo cáo đính kèm', { exact: true }).click()
  await expect(page.getByText('Theo buổi học · 1 kết quả', { exact: false })).toBeVisible()
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Xuất CSV đính kèm' }).click()
  const csv = await readFile(await (await downloading).path(), 'utf8')
  expect(csv).toContain('Trần Gia Hân'); expect(csv).not.toContain('Nguyễn An Bình')
  await page.screenshot({ path: info.outputPath('filtered-email.png'), fullPage: true })
})

test('mống mắt hiển thị điều kiện thiết bị và không giả vờ đã ghi danh', async ({ page }, info) => {
  await login(page); await page.goto('/#/app/biometrics')
  await page.getByRole('button', { name: 'Ghi danh mống mắt', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Bắt đầu quét' })).toBeDisabled()
  await expect(page.getByRole('dialog')).toContainText('Chưa kết nối')
  await page.screenshot({ path: info.outputPath('iris-unavailable.png'), fullPage: true })
})

test('backup mã hóa có thể tải, nhập sai mật khẩu không khôi phục rồi nhập đúng', async ({ page }) => {
  await login(page); await page.goto('/#/app/backups')
  await page.getByRole('button', { name: 'Tạo bản sao lưu', exact: true }).click()
  await page.getByLabel('Mật khẩu tài khoản demo', { exact: true }).fill('Demo@123')
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click()
  await page.getByLabel('Mã hóa file khi tải xuống').check()
  await page.getByLabel('Mật khẩu file sao lưu', { exact: true }).fill('Backup@123')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tải bản sao lưu', exact: true }).click()
  const path = await (await downloading).path()
  expect(JSON.parse(await readFile(path, 'utf8')).format).toBe('iriaegis-web-encrypted')
  await page.getByLabel('Mật khẩu file (nếu đã mã hóa)').fill('wrong')
  await page.getByLabel('Chọn file JSON Web demo', { exact: false }).setInputFiles(path)
  await expect(page.getByText('Sai mật khẩu sao lưu hoặc file đã hỏng.', { exact: true }).first()).toBeVisible()
  await page.getByLabel('Mật khẩu file (nếu đã mã hóa)').fill('Backup@123')
  await page.getByLabel('Chọn file JSON Web demo', { exact: false }).setInputFiles(path)
  await expect(page.getByRole('button', { name: 'Tiếp tục khôi phục' })).toBeVisible()
})

test('nhắc hồ sơ lần đầu dẫn đến hồ sơ; màn mới dùng được ở các cỡ màn hình', async ({ page }, info) => {
  const db = seedData(); db.admins[0].firstLogin = true
  await page.addInitScript(data => localStorage.setItem('iriaegis.business-demo.v1', JSON.stringify(data)), db)
  await login(page)
  await expect(page.getByRole('dialog', { name: 'Hoàn thiện hồ sơ lần đầu' })).toBeVisible()
  await page.getByRole('button', { name: 'Cập nhật ngay' }).click()
  await expect(page.getByRole('heading', { name: 'Hoàng · Quản trị', exact: true })).toBeVisible()
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['mock-attendance', 'biometrics', 'backups']) {
      await page.goto(`/#/app/${route}`)
      await expect(page.locator('#portal-main h1')).toHaveText(({ 'mock-attendance': 'Điểm danh thử', biometrics: 'Sinh trắc học', backups: 'Sao lưu & khôi phục' })[route])
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
      await page.screenshot({ path: info.outputPath(`${route}-${width}.png`), fullPage: false })
    }
  }
})
