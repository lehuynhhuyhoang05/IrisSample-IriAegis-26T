// Bounded, page-memory history. Only allow-listed measurements, never face images,
// account identifiers, deviceId/groupId, tokens or network requests.
const history = []
// Reports contain plain measurements only. Do not require structuredClone on
// older Safari versions just to collect support data in the camera flow.
const copy = value => JSON.parse(JSON.stringify(value))
export function cameraMeasurementContext(track) {
  let settings = {}, capabilities = {}
  try { settings = track?.getSettings?.() || {} } catch { /* Unsupported hardware. */ }
  try { capabilities = track?.getCapabilities?.() || {} } catch { /* Some browsers expose settings only. */ }
  return {
    settings: Object.fromEntries(['width', 'height', 'frameRate', 'exposureMode', 'whiteBalanceMode'].filter(key => ['string', 'number'].includes(typeof settings[key])).map(key => [key, settings[key]])),
    capabilities: Object.fromEntries(['exposureMode', 'whiteBalanceMode'].filter(key => Array.isArray(capabilities[key])).map(key => [key, capabilities[key].filter(value => typeof value === 'string')])),
  }
}
export function rememberFlashCheck({ flash, camera, cameraLock, frameSource, delegate }) {
  const report = {
    createdAt: new Date().toISOString(), userAgent: navigator.userAgent,
    viewport: { width: window.innerWidth, height: window.innerHeight, scale: window.visualViewport?.scale ?? 1 },
    camera, cameraLock, frameSource, delegate, flash,
  }
  history.push(copy(report))
  if (history.length > 5) history.shift()
}
export function flashSupportReport() {
  return {
    kind: 'iris-aegis-flash-support-v1', checks: copy(history),
    note: 'Chỉ số đo màu và thời gian của tối đa 5 lượt trong trang hiện tại. Không có ảnh/video, tài khoản hoặc token. Không phải bằng chứng xác thực danh tính.',
  }
}
export function downloadFlashSupport() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(flashSupportReport(), null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = 'iriaegis-camera-support.json'
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
