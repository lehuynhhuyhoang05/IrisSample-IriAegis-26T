import test from 'node:test'
import assert from 'node:assert/strict'
import { LivenessStateMachine, angleDistance } from './liveness/liveness-state-machine.js'
import { FLASH_LIMITS, FLASH_PROFILE, checkFlashMetrics, evaluateFlash, FlashSampler, lockCamera } from './liveness/flash-challenge.js'
import { EyeCalibration, eyeAspectRatio } from './liveness/landmark-input.js'

function frames() {
  const logic = new LivenessStateMachine(0); let now = 0, index = 0
  const frame = (values = {}) => { now += 34; index++; return logic.process({ count: 1, inFrame: true, timestamp: index, yaw: 0, pitch: 0, roll: 0, noseX: 100 + index * .2, noseY: 100, eyeRatio: .5, noseRatio: .5, eyeLeft: .95, eyeRight: .95, ...values }, now) }
  return { logic, frame, get now() { return now } }
}
function blink(d) { d.frame(); d.frame(); d.frame(); d.frame(); d.frame({ eyeLeft: .05, eyeRight: .05 }); d.frame() }
function turn(d) { d.frame({ yaw: -18, noseRatio: .4 }); d.frame({ yaw: 18, noseRatio: .6 }); d.frame(); d.frame(); d.frame() }
const samples = { baseline: { r: 100, g: 100, b: 100, count: 2 }, red: { r: 180, g: 80, b: 40, count: 6 }, blue: { r: 40, g: 80, b: 180, count: 6 } }

test('group 4 port: ordered blink → both sides → center → measured flash; no early completion', () => {
  const d = frames(); blink(d); assert.equal(d.logic.state, 'turn')
  turn(d); assert.equal(d.logic.state, 'flash')
  d.logic.flashResult(evaluateFlash(samples)); assert.equal(d.logic.state, 'active_passed')
  const early = frames(); early.logic.flashResult({ passed: true }); assert.equal(early.logic.state, 'waiting')
})
test('group 4 port: wink, closed from start, turning during blink do not complete blink', () => {
  for (const bad of [{ eyeLeft: .05 }, { eyeLeft: .05, eyeRight: .05 }]) {
    const d = frames(); for (let i = 0; i < 12; i++) d.frame(bad)
    assert.equal(d.logic.state, 'blink')
  }
  const d = frames(); d.frame(); d.frame(); d.frame(); d.frame(); d.frame({ yaw: 18 }); d.frame({ eyeLeft: .05, eyeRight: .05 }); d.frame()
  assert.equal(d.logic.state, 'blink')
})
test('group 4 port: both turns without perspective change never reach flash', () => {
  const d = frames(); blink(d)
  for (const yaw of [-18, 18, 0, 0, 0]) d.frame({ yaw })
  assert.equal(d.logic.state, 'turn')
})
test('group 4 port: multiple faces reset, face loss during flash fails, deadline and splice fail', () => {
  const d = frames(); blink(d); d.frame({ count: 2 }); assert.equal(d.logic.state, 'waiting')
  const e = frames(); blink(e); turn(e); e.frame({ count: 0 }); assert.equal(e.logic.state, 'failed')
  const f = frames(); f.frame(); f.frame({ pitch: 30 }); assert.equal(f.logic.state, 'failed')
  const g = frames(); g.logic.tick(25001); assert.equal(g.logic.state, 'failed')
  const h = frames(); h.frame(); h.logic.tick(1900); assert.equal(h.logic.state, 'failed')
})
test('group 4 port: frozen feature sequence fails before accepting a replay sequence', () => {
  const d = frames(); for (let i = 0; i < 32; i++) d.frame({ noseX: 100 })
  assert.equal(d.logic.state, 'failed')
  assert.match(d.logic.message, /đứng hình/)
})
test('flash: upstream perimeter profile still rejects missing samples, flat colors and glare', () => {
  assert.equal(evaluateFlash(samples).passed, true)
  assert.equal(evaluateFlash({ ...samples, blue: null }).passed, false)
  assert.equal(evaluateFlash({ baseline: samples.baseline, red: samples.baseline, blue: samples.baseline }).passed, false)
  assert.equal(evaluateFlash({ ...samples, red: { r: 250, g: 250, b: 250, count: 3 }, blue: { r: 250, g: 250, b: 250, count: 3 } }).passed, false)
})
test('flash: waits for presented colors, settling frames and three distinct samples per phase', () => {
  const flash = new FlashSampler(0)
  flash.add(samples.baseline, 40, .04); flash.add(samples.baseline, 70, .04)
  assert.equal(flash.samples.baseline.count, 1)
  flash.add(samples.baseline, 80, .08); flash.add(samples.baseline, 120, .12)
  assert.equal(flash.phase(150).color, 'red')
  flash.add(samples.red, 300, .3); assert.equal(flash.samples.red, undefined)
  // A delayed paint starts its own 150 ms settling interval.
  flash.present('red', 450, .45)
  flash.add(samples.red, 550, .55); assert.equal(flash.samples.red, undefined)
  flash.add(samples.red, 620, .62); flash.add(samples.red, 720, .72); flash.add(samples.red, 820, .82)
  assert.equal(flash.phase(950).color, 'blue')
  flash.present('blue', 980, .98)
  flash.add(samples.blue, 1150, 1.15); flash.add(samples.blue, 1250, 1.25); flash.add(samples.blue, 1350, 1.35)
  assert.equal(flash.phase(1480).color, 'off'); assert.equal(flash.phase(1800).done, false)
  assert.equal(flash.result().passed, false)
  flash.present('off', 1800, 1.8)
  assert.equal(flash.phase(2019).done, false); assert.equal(flash.phase(2020).done, true)
  assert.equal(flash.result().passed, true)
  assert.equal(flash.result().trace.length, 9)
  assert.deepEqual(flash.result().trace.map(row => row.phase), ['baseline', 'baseline', 'baseline', 'red', 'red', 'red', 'blue', 'blue', 'blue'])
})
test('camera: requested manual mode is verified and restored; unsupported is never declared locked', async () => {
  let settings = { exposureMode: 'continuous', whiteBalanceMode: 'continuous' }
  const track = { readyState: 'live', getCapabilities: () => ({ exposureMode: ['continuous', 'manual'], whiteBalanceMode: ['continuous', 'manual'] }), getSettings: () => settings,
    applyConstraints: async options => { settings = { ...settings, ...options.advanced[0] } } }
  const lock = await lockCamera(track); assert.equal(lock.exposure, true); assert.equal(lock.whiteBalance, true)
  await lock.release(); assert.equal(settings.exposureMode, 'continuous')
  const missing = await lockCamera({ readyState: 'live' }); assert.equal(missing.exposure, false); assert.equal(missing.whiteBalance, false); await missing.release()
})
test('eye adapter: session calibration handles different eyes without hardcoded 0.85 blink', () => {
  const eyes = new EyeCalibration(), open = { earLeft: .18, earRight: .2, blinkLeft: .2, blinkRight: .25, yaw: 0 }
  for (let i = 0; i < 8; i++) eyes.measure(open, i * 100)
  assert.ok(eyes.measure(open, 900).eyeLeft >= .75)
  const closed = eyes.measure({ ...open, earLeft: .06, earRight: .06, blinkLeft: .55, blinkRight: .6 }, 1000)
  assert.ok(closed.eyeLeft <= .15 && closed.eyeRight <= .15)
  eyes.reset(); assert.equal(eyes.measure({ ...open, blinkLeft: .9, blinkRight: .9 }, 1100).calibrating, true)
})
test('eye geometry respects non-square input aspect ratio', () => {
  const px = [{ x: 100, y: 100 }, { x: 120, y: 85 }, { x: 180, y: 85 }, { x: 200, y: 100 }, { x: 180, y: 115 }, { x: 120, y: 115 }]
  for (const [w, h] of [[1280, 720], [720, 1280]]) assert.ok(Math.abs(eyeAspectRatio(px.map(p => ({ x: p.x / w, y: p.y / h })), [0,1,2,3,4,5], w, h) - .3) < 1e-8)
})

test('pose continuity: Euler wrap is a small motion; a real adjacent-frame jump still fails', () => {
  assert.equal(angleDistance(179, -179), 2)
  assert.equal(angleDistance(-179, 179), 2)
  const d = frames(); d.frame({ roll: 179 }); d.frame({ roll: -179 })
  assert.equal(d.logic.state, 'blink'); assert.equal(d.logic.snapshot().motion.roll, 2)
  d.frame({ roll: -140 }); assert.equal(d.logic.state, 'failed')
  assert.equal(d.logic.snapshot().motion.roll, 39)
})

test('pose continuity: recalibration discards stale pose and all challenge progress', () => {
  const d = frames(); blink(d); assert.equal(d.logic.state, 'turn')
  d.frame({ count: 0 })
  d.frame({ calibrating: true, pitch: 35, eyeLeft: undefined, eyeRight: undefined })
  assert.equal(d.logic.state, 'waiting'); assert.equal(d.logic.previous, null)
  d.frame({ pitch: 35 }); assert.equal(d.logic.state, 'blink')
  assert.equal(d.logic.left, false); assert.equal(d.logic.closed, false)
  assert.equal(d.logic.flashResult({ passed: true }).state, 'blink')
})

test('pose continuity: slow browser frame resets challenge instead of accusing a splice or accepting it', () => {
  const d = frames(); blink(d)
  const state = d.logic.process({ count: 1, inFrame: true, timestamp: 100, yaw: 0, pitch: 40, roll: 0 }, d.now + 400)
  assert.equal(state.state, 'waiting'); assert.equal(state.recalibrate, true)
  assert.equal(d.logic.previous, null); assert.equal(d.logic.flashResult({ passed: true }).state, 'waiting')
})

test('eye adapter: unstable startup pose cannot establish a baseline; stable pose can', () => {
  const eyes = new EyeCalibration()
  const sample = { earLeft: .2, earRight: .2, blinkLeft: .15, blinkRight: .15, yaw: 0, pitch: 0, roll: 0 }
  for (let i = 0; i < 12; i++) assert.equal(eyes.measure({ ...sample, pitch: i % 2 ? 35 : 0 }, i * 100).calibrating, true)
  for (let i = 0; i < 8; i++) eyes.measure(sample, 1200 + i * 100)
  assert.equal(eyes.measure(sample, 2100).calibrating, false)
})

test('tracking: brief profile loss preserves the turn step; sustained loss and multiple faces reset it', () => {
  const d = frames(); blink(d)
  d.frame({ count: 0 }); const recovered = d.frame({ yaw: -18, noseRatio: .4 })
  assert.equal(recovered.state, 'turn'); assert.equal(recovered.left, true)
  const multiple = d.frame({ count: 2 }); assert.equal(multiple.state, 'waiting'); assert.equal(multiple.recalibrate, true)
  const e = frames(); blink(e)
  for (let i = 0; i < 17; i++) e.frame({ count: 0 })
  assert.equal(e.logic.state, 'waiting'); assert.match(e.logic.restartReason, /500 ms/)
})

test('tracking: stable low frame rate is not treated as a fresh interruption at every frame', () => {
  const logic = new LivenessStateMachine(0)
  for (let i = 1; i <= 8; i++) {
    const state = logic.process({ timestamp: i * .3, count: 1, inFrame: true, calibrating: i <= 4,
      yaw: 0, pitch: 0, roll: 0, noseX: 100 + i, noseY: 100, eyeRatio: .5, noseRatio: .5, eyeLeft: 1, eyeRight: 1 }, i * 300)
    assert.notEqual(state.recalibrate, true)
  }
  assert.equal(logic.state, 'blink')
})

test('flash: missing presentation or fresh frames times out and reports counts, never a pass', () => {
  const flash = new FlashSampler(0)
  flash.add(samples.baseline, 40, .04); flash.add(samples.baseline, 80, .08); flash.add(samples.baseline, 120, .12)
  assert.equal(flash.phase(150).color, 'red')
  flash.phase(1400)
  const result = flash.result(); assert.equal(result.passed, false)
  assert.equal(result.counts.baseline, 3); assert.equal(result.counts.red, 0)
  assert.match(result.reason, /frame/)
})

test('watchdog: a fresh result after slow inference is not a camera stall; duplicate frames still stall', () => {
  const logic = new LivenessStateMachine(0)
  assert.notEqual(logic.process({ timestamp: .1, count: 0 }, 2200).state, 'failed')
  assert.equal(logic.lastFrameAt, 2200)
  assert.equal(logic.process({ timestamp: .1, count: 0 }, 4100).state, 'failed')
  const expired = new LivenessStateMachine(0)
  assert.equal(expired.process({ timestamp: 25.1, count: 1 }, 25100).state, 'failed')
})

test('watchdog: switching frame clock discards every challenge step without extending its deadline', () => {
  const d = frames(); blink(d); turn(d)
  const started = d.logic.started
  d.logic.reacquire(900, 'Callback video không cấp frame')
  assert.equal(d.logic.state, 'waiting'); assert.equal(d.logic.left, false); assert.equal(d.logic.previous, null)
  assert.equal(d.logic.started, started); assert.equal(d.logic.flashResult({ passed: true }).state, 'waiting')
  assert.equal(d.logic.tick(25001).state, 'failed')
})

test('flash: pin group 4 a9be597 thresholds; legacy iPhone numbers now meet the new profile, not proof of physical success', () => {
  assert.deepEqual(FLASH_LIMITS, { shift: .018, normRed: .002, normBlue: .002 })
  assert.equal(FLASH_PROFILE.sourceRevision, 'a9be597ba66f99d9f117871ef17d9da234780c81')
  assert.equal(checkFlashMetrics({ shift: .347, normRed: .057, normBlue: .038, symmetric: true }).passed, true)
  assert.equal(checkFlashMetrics({ shift: .278, normRed: .046, normBlue: .032, symmetric: true }).passed, true)
  assert.equal(checkFlashMetrics({ shift: .018, normRed: .002, normBlue: .002 }).passed, true)
  assert.deepEqual(checkFlashMetrics({ shift: .018, normRed: .002, normBlue: .001999 }), { passed: false, failedChecks: ['normBlue'] })
  assert.equal(checkFlashMetrics({ shift: .017999, normRed: .002, normBlue: .002 }).passed, false)
})

test('flash: a9be597 removes baseline symmetry and raises the double-luma ceiling to 240', () => {
  const asymmetric = evaluateFlash({ ...samples, baseline: { r: 190, g: 80, b: 10, count: 3 } })
  assert.equal(asymmetric.symmetric, false)
  assert.equal(asymmetric.passed, true)
  assert.equal(evaluateFlash({ ...samples, red: { r: 245, g: 230, b: 220, count: 3 }, blue: { r: 220, g: 230, b: 245, count: 3 } }).passed, true)
  assert.equal(evaluateFlash({ ...samples, red: { r: 255, g: 245, b: 240, count: 3 }, blue: { r: 240, g: 245, b: 255, count: 3 } }).passed, false)
  assert.equal(evaluateFlash({ ...samples, red: samples.blue, blue: samples.red }).passed, false)
})
