import { getCoverCrop } from './camera-crop.js'

export function detectionRegion(frameWidth, frameHeight, viewWidth, viewHeight) {
  const crop = getCoverCrop(frameWidth, frameHeight, viewWidth, viewHeight)
  const scale = Math.min(1, 640 / Math.max(crop.width, crop.height))
  return { ...crop, inputWidth: Math.max(1, Math.round(crop.width * scale)), inputHeight: Math.max(1, Math.round(crop.height * scale)) }
}

function overlap(a, b) {
  const w = Math.max(0, Math.min(a.originX + a.width, b.originX + b.width) - Math.max(a.originX, b.originX))
  const h = Math.max(0, Math.min(a.originY + a.height, b.originY + b.height) - Math.max(a.originY, b.originY))
  const intersection = w * h
  return intersection / (a.width * a.height + b.width * b.height - intersection)
}

// Only collapse near-identical bounding boxes. Distinct faces must remain distinct.
export function normalizeDetections(detections, region) {
  const candidates = detections.filter(row => {
    const box = row.boundingBox
    return box && [box.originX, box.originY, box.width, box.height].every(Number.isFinite) && box.width > 0 && box.height > 0
  }).sort((a, b) => (b.categories?.[0]?.score || 0) - (a.categories?.[0]?.score || 0))
  const selected = []
  for (const row of candidates) {
    if (selected.some(previous => overlap(previous.boundingBox, row.boundingBox) >= 0.75)) continue
    selected.push(row)
  }
  return selected.map(row => {
    const box = row.boundingBox
    const x = Math.max(0, box.originX), y = Math.max(0, box.originY)
    const endX = Math.min(region.inputWidth, box.originX + box.width), endY = Math.min(region.inputHeight, box.originY + box.height)
    if (endX <= x || endY <= y) return null
    return {
      score: row.categories?.[0]?.score ?? null,
      boundingBox: {
        originX: region.x + x * region.width / region.inputWidth,
        originY: region.y + y * region.height / region.inputHeight,
        width: (endX - x) * region.width / region.inputWidth,
        height: (endY - y) * region.height / region.inputHeight,
      },
      preview: { left: 100 * (1 - endX / region.inputWidth), top: 100 * y / region.inputHeight, width: 100 * (endX - x) / region.inputWidth, height: 100 * (endY - y) / region.inputHeight },
    }
  }).filter(Boolean)
}

export function detectVisibleFaces(detector, video, canvas) {
  const region = detectionRegion(video.videoWidth, video.videoHeight, video.clientWidth, video.clientHeight)
  canvas.width = region.inputWidth; canvas.height = region.inputHeight
  canvas.getContext('2d').drawImage(video, region.x, region.y, region.width, region.height, 0, 0, canvas.width, canvas.height)
  const result = detector.detectForVideo(canvas, performance.now())
  return normalizeDetections(result.detections || [], region)
}
