// Preprocessing only: match group 4 notebook MiniVisionFAS.crop(scale=2.7).
// main.py resizes the supplied crop itself; classification stays on their server.
export function getLivenessCrop(box, width, height) {
  if (!box || ![box.originX, box.originY, box.width, box.height, width, height].every(Number.isFinite) || box.width <= 0 || box.height <= 0 || width <= 1 || height <= 1) throw new Error('Chưa có vùng khuôn mặt hợp lệ để gửi liveness.')
  const scale = Math.min((height - 1) / box.height, (width - 1) / box.width, 2.7)
  const centerX = box.originX + box.width / 2, centerY = box.originY + box.height / 2
  const x = Math.max(0, Math.floor(centerX - box.width * scale / 2))
  const y = Math.max(0, Math.floor(centerY - box.height * scale / 2))
  const endX = Math.min(width, Math.floor(centerX + box.width * scale / 2) + 1)
  const endY = Math.min(height, Math.floor(centerY + box.height * scale / 2) + 1)
  if (endX <= x || endY <= y) throw new Error('Khuôn mặt nằm ngoài ảnh camera.')
  return { x, y, width: endX - x, height: endY - y }
}
