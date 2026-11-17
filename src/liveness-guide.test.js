import test from 'node:test'
import assert from 'node:assert/strict'
import { faceGuide, isFaceInsideGuide } from './liveness/face-guide.js'

test('guide matches native contour bounds at portrait and landscape sizes', () => {
  const guide = faceGuide(400, 500)
  assert.deepEqual([guide.left, guide.top, guide.right, guide.bottom], [64, 70, 336, 350])
  assert.equal((guide.path.match(/L/g) || []).length, 120)
  assert.ok(guide.path.endsWith('Z'))
  assert.equal(faceGuide(0, 500), null)
  assert.equal(faceGuide(400, NaN), null)
})

test('guide maps cover-cropped and mirrored preview rather than raw sensor bounds', () => {
  assert.equal(isFaceInsideGuide({ originX: 225, originY: 290, width: 270, height: 500 }, 720, 1280, 400, 500), true)
  assert.equal(isFaceInsideGuide({ originX: 490, originY: 180, width: 300, height: 340 }, 1280, 720, 400, 500), true)
  assert.equal(isFaceInsideGuide({ originX: 10, originY: 200, width: 80, height: 200 }, 1280, 720, 400, 500), false)
})

test('guide rejects tiny/off-center faces and retains upstream wider tolerance during challenges', () => {
  assert.equal(isFaceInsideGuide({ originX: 340, originY: 400, width: 50, height: 100 }, 720, 1280, 400, 500), false)
  assert.equal(isFaceInsideGuide({ originX: 40, originY: 100, width: 100, height: 300 }, 720, 1280, 400, 500), false)
  const large = { originX: 5, originY: 85, width: 390, height: 345 }
  assert.equal(isFaceInsideGuide(large, 400, 500, 400, 500, false), false)
  assert.equal(isFaceInsideGuide(large, 400, 500, 400, 500, true), true)
  assert.equal(isFaceInsideGuide(null, 720, 1280, 400, 500), false)
  assert.equal(isFaceInsideGuide(large, 0, 0, 400, 500), false)
})
