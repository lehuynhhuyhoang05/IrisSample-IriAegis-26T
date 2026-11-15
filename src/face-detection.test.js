import test from 'node:test'
import assert from 'node:assert/strict'
import { detectionRegion, normalizeDetections } from './face-detection.js'

const detection = (x, y, w, h, score = 0.9) => ({ boundingBox: { originX: x, originY: y, width: w, height: h }, categories: [{ score }] })

test('landscape camera is analyzed only inside the visible portrait preview', () => {
  const region = detectionRegion(1280, 720, 400, 500)
  assert.deepEqual(region, { x: 352, y: 0, width: 576, height: 720, inputWidth: 512, inputHeight: 640 })
  const [face] = normalizeDetections([detection(128, 160, 128, 160)], region)
  assert.deepEqual(face.boundingBox, { originX: 496, originY: 180, width: 144, height: 180 })
  assert.deepEqual(face.preview, { left: 50, top: 25, width: 25, height: 25 })
})

test('near-identical boxes collapse to strongest score, separate faces remain two', () => {
  const region = detectionRegion(640, 800, 320, 400)
  const boxes = [detection(100, 100, 100, 150, 0.8), detection(102, 102, 100, 150, 0.95), detection(350, 150, 90, 120, 0.9)]
  const result = normalizeDetections(boxes, region)
  assert.equal(result.length, 2)
  assert.equal(result[0].score, 0.95)
  // Ordering by score must not merge distinct faces or select only the first.
  assert.equal(normalizeDetections(boxes.reverse(), region).length, 2)
})

test('invalid/outside boxes excluded; edge boxes clipped to visible preview', () => {
  const region = detectionRegion(640, 800, 320, 400)
  const rows = normalizeDetections([detection(-10, 10, 30, 40), detection(700, 0, 20, 20), detection(NaN, 0, 20, 20), detection(0, 0, -1, 3)], region)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].preview.left + rows[0].preview.width, 100)
  assert.equal(rows[0].boundingBox.originX, 0)
})
