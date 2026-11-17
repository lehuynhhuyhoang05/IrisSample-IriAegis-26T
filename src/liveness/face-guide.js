import { getCoverCrop } from '../camera-crop.js'

// FaceOverlayView.buildFaceContourPath/getValidArea and checkFaceInCircle,
// group 4 Android a9be597ba66f99d9f117871ef17d9da234780c81.
export function faceGuide(width, height) {
  if (![width, height].every(value => Number.isFinite(value) && value > 0)) return null
  const cx = width / 2, cy = height * .42, rx = width * .34, ry = Math.min(rx * 1.32, height * .28)
  const points = Array.from({ length: 121 }, (_, index) => {
    const angle = 2 * Math.PI * index / 120
    return [cx + rx * Math.cos(angle) * (1 - .10 * Math.sin(angle)), cy + ry * Math.sin(angle)]
  })
  return { left: cx - rx, top: cy - ry, right: cx + rx, bottom: cy + ry,
    path: points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(3)} ${y.toFixed(3)}`).join(' ') + ' Z' }
}

export function isFaceInsideGuide(box, frameWidth, frameHeight, viewWidth, viewHeight, active = false) {
  const guide = faceGuide(viewWidth, viewHeight)
  if (!guide || !box || ![frameWidth, frameHeight, box.originX, box.originY, box.width, box.height].every(Number.isFinite)
    || frameWidth <= 0 || frameHeight <= 0 || box.width <= 0 || box.height <= 0) return false
  const crop = getCoverCrop(frameWidth, frameHeight, viewWidth, viewHeight)
  // Preview is object-fit: cover and mirrored; RGB sampling stays unmirrored.
  const left = viewWidth - (box.originX + box.width - crop.x) * viewWidth / crop.width
  const right = viewWidth - (box.originX - crop.x) * viewWidth / crop.width
  const top = (box.originY - crop.y) * viewHeight / crop.height
  const bottom = (box.originY + box.height - crop.y) * viewHeight / crop.height
  const x = (left + right) / 2, y = (top + bottom) / 2, tolerance = active ? 110 : 65
  // Upstream uses View pixels; here these dimensions/tolerances are CSS pixels.
  // This is a browser port, not a claim of identical physical geometry.
  return x >= guide.left && x <= guide.right && y >= guide.top && y <= guide.bottom
    && left >= guide.left - tolerance && right <= guide.right + tolerance
    && top >= guide.top - tolerance && bottom <= guide.bottom + tolerance
    && (right - left) / (guide.right - guide.left) >= .35
}
