// FaceCaptureActivity.java: evaluateRedBlueRatioCycle(), core inset .22,
// baseline 150 ms → RED 500 ms → BLUE 500 ms → recovery 220 ms.
export const FLASH_TIMING = Object.freeze({ baseline: 150, settle: 150, color: 500, recovery: 220 })
export const FLASH_LIMITS = Object.freeze({ shift: .280, normRed: .040, normBlue: .040 })
export function checkFlashMetrics({ shift, normRed, normBlue, symmetric }) {
  const values = { shift, normRed, normBlue }
  const failedChecks = Object.entries(FLASH_LIMITS).filter(([key, minimum]) => !Number.isFinite(values[key]) || values[key] < minimum).map(([key]) => key)
  if (symmetric !== true) failedChecks.push('baseline')
  return { passed: failedChecks.length === 0, failedChecks }
}
export function evaluateFlash(samples) {
  const { baseline, red, blue } = samples
  const details = { counts: Object.fromEntries(['baseline', 'red', 'blue'].map(k => [k, samples[k]?.count || 0])), samples }
  const valid = row => row?.count > 0 && ['r', 'g', 'b'].every(k => Number.isFinite(row[k]) && row[k] >= 0 && row[k] <= 255)
  if (![baseline, red, blue].every(valid)) return { ...details, passed: false, reason: 'Không đủ mẫu ánh sáng trên khuôn mặt. Hãy thử lại.' }
  const luma = x => .299 * x.r + .587 * x.g + .114 * x.b
  if (luma(red) > 215 && luma(blue) > 215) return { ...details, passed: false, reason: 'Vùng mặt quá chói để kiểm tra phản xạ.' }
  const ratio = x => x.r / (x.b + 1)
  const sum = x => x.r + x.g + x.b + .001
  const shift = ratio(red) - ratio(blue)
  const normRed = red.r / sum(red) - blue.r / sum(blue)
  const normBlue = blue.b / sum(blue) - red.b / sum(red)
  const symmetric = ratio(red) > ratio(baseline) + .035 && ratio(blue) < ratio(baseline) - .035
  const { passed, failedChecks } = checkFlashMetrics({ shift, normRed, normBlue, symmetric })
  const names = { shift: 'biến thiên đỏ/xanh', normRed: 'phản xạ đỏ', normBlue: 'phản xạ xanh', baseline: 'đối xứng với nền' }
  return { ...details, passed, failedChecks, shift, normRed, normBlue, symmetric, reason: passed ? '' : `Phản xạ đỏ/xanh không đạt. Chưa đạt: ${failedChecks.map(key => names[key]).join(', ')}. Chưa xác nhận liveness; đây chưa phải kết quả FAKE từ MiniVision.` }
}

export class FlashSampler {
  constructor(now) {
    this.stage = 'baseline'; this.requestedAt = now; this.presentedAt = now
    this.presentedMediaTime = -Infinity; this.samples = {}; this.lastTimestamp = -Infinity; this.trace = []
    this.presentations = []; this.skipped = { awaitingPaint: 0, settling: 0, staleTimestamp: 0, invalidRGB: 0 }
  }
  // The UI acknowledges each color after commit and two animation frames. This
  // bounds paint scheduling; it cannot confirm physical display/camera latency.
  present(color, now, mediaTime, display) {
    if (color !== this.stage || this.presentedAt !== null) return
    this.presentedAt = now; this.presentedMediaTime = mediaTime
    this.presentations.push({ color, requestedAtMs: this.requestedAt, acknowledgedAtMs: now, mediaTime,
      delayMs: now - this.requestedAt, ...(display ? { display } : {}) })
  }
  phase(now) {
    if (this.failure) return { color: 'off', sample: null, done: true }
    const elapsed = this.presentedAt === null ? null : now - this.presentedAt
    if (this.stage === 'off') {
      this.complete = elapsed !== null && elapsed >= FLASH_TIMING.recovery
      return { color: 'off', sample: null, done: this.complete }
    }
    const hold = this.stage === 'baseline' ? FLASH_TIMING.baseline : FLASH_TIMING.color
    if (elapsed !== null && elapsed >= hold && this.samples[this.stage]?.count >= 3) {
      this.stage = { baseline: 'red', red: 'blue', blue: 'off' }[this.stage]
      this.requestedAt = now; this.presentedAt = null
      return { color: this.stage, sample: null, done: false }
    }
    if ((elapsed === null && now - this.requestedAt > 1200) || elapsed > 1200) {
      this.failure = 'Không lấy đủ frame theo màu đã hiển thị. Hãy giữ trang ở phía trước và thử lại.'
      return { color: 'off', sample: null, done: true }
    }
    const settled = elapsed !== null && elapsed >= (this.stage === 'baseline' ? 0 : FLASH_TIMING.settle)
    return { color: this.stage, sample: settled ? this.stage : null, done: false }
  }
  add(rgb, now, timestamp, metadata) {
    const phase = this.phase(now)
    const settle = this.stage === 'baseline' ? 0 : FLASH_TIMING.settle / 1000
    if (!phase.sample) { this.skipped[this.presentedAt === null ? 'awaitingPaint' : 'settling']++; return }
    if (timestamp <= this.lastTimestamp || timestamp < this.presentedMediaTime + settle) { this.skipped.staleTimestamp++; return }
    this.lastTimestamp = timestamp
    if (!rgb || !['r', 'g', 'b'].every(k => Number.isFinite(rgb[k]))) { this.skipped.invalidRGB++; return }
    const previous = this.samples[phase.sample] || { r: 0, g: 0, b: 0, count: 0 }
    const next = { count: previous.count + 1 }
    for (const k of ['r', 'g', 'b']) next[k] = (previous[k] * previous.count + rgb[k]) / next.count
    this.samples[phase.sample] = next
    this.trace.push({ phase: phase.sample, afterDisplayMs: Math.round(now - this.presentedAt),
      timestamp, mediaAfterDisplayMs: Number.isFinite(this.presentedMediaTime) ? (timestamp - this.presentedMediaTime) * 1000 : null,
      frameMetadata: Object.fromEntries(['captureTime', 'presentationTime', 'expectedDisplayTime', 'presentedFrames', 'processingDuration'].filter(key => Number.isFinite(metadata?.[key])).map(key => [key, metadata[key]])),
      r: rgb.r, g: rgb.g, b: rgb.b })
    this.trace = this.trace.slice(-128)
  }
  result() {
    const report = { ...evaluateFlash(this.samples), trace: [...this.trace], presentations: [...this.presentations], skipped: { ...this.skipped }, timing: FLASH_TIMING, limits: FLASH_LIMITS }
    if (this.failure || !this.complete) return { ...report, passed: false, reason: this.failure || 'Chưa hoàn thành các pha ánh sáng.' }
    return report
  }
}

export function sampleFaceCore(canvas, box) {
  if (!box) return null
  const x = Math.max(0, Math.floor(box.originX + box.width * .22)), y = Math.max(0, Math.floor(box.originY + box.height * .22))
  const width = Math.min(canvas.width - x, Math.floor(box.width * .56)), height = Math.min(canvas.height - y, Math.floor(box.height * .56))
  if (width < 12 || height < 12) return null
  const { data } = canvas.getContext('2d', { willReadFrequently: true }).getImageData(x, y, width, height)
  let r = 0, g = 0, b = 0, count = 0
  for (let py = 0; py < height; py += 4) for (let px = 0; px < width; px += 4) {
    const i = (py * width + px) * 4
    r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
  }
  return count ? { r: r / count, g: g / count, b: b / count } : null
}

export async function lockCamera(track) {
  let capabilities, original
  try { capabilities = track.getCapabilities?.() || {}; original = track.getSettings?.() || {} } catch { capabilities = {}; original = {} }
  const requested = {}, restore = {}
  for (const key of ['exposureMode', 'whiteBalanceMode']) {
    if (capabilities[key]?.includes('manual') && original[key]) { requested[key] = 'manual'; restore[key] = original[key] }
  }
  let released = false
  const release = async () => {
    if (released) return
    released = true
    if (Object.keys(restore).length && track.readyState === 'live') {
      try { await track.applyConstraints({ advanced: [restore] }) } catch { /* Track/driver may stop while restoring. */ }
    }
  }
  let applied = false
  try { if (Object.keys(requested).length) { await track.applyConstraints({ advanced: [requested] }); applied = true } } catch { /* Same as Android: no assumed hardware lock; still measure reflection. */ }
  let settings
  try { settings = track.getSettings?.() || {} } catch { settings = {} }
  return { exposure: applied && requested.exposureMode === 'manual' && settings.exposureMode === 'manual', whiteBalance: applied && requested.whiteBalanceMode === 'manual' && settings.whiteBalanceMode === 'manual', release }
}
