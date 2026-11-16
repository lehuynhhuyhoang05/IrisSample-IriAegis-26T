import test from 'node:test'
import assert from 'node:assert/strict'
import { cameraMeasurementContext, rememberFlashCheck, flashSupportReport } from './liveness/support-report.js'
import { FlashSampler } from './liveness/flash-challenge.js'

test('support camera context excludes device identifiers and handles unsupported capabilities', () => {
  const context = cameraMeasurementContext({
    getSettings: () => ({ width: 720, height: 1280, frameRate: 30, exposureMode: 'continuous', deviceId: 'private-device', groupId: 'private-group' }),
    getCapabilities: () => ({ whiteBalanceMode: ['manual', 'continuous'], deviceId: 'private-device' }),
  })
  assert.deepEqual(context, { settings: { width: 720, height: 1280, frameRate: 30, exposureMode: 'continuous' }, capabilities: { whiteBalanceMode: ['manual', 'continuous'] } })
  assert.deepEqual(cameraMeasurementContext({ getSettings() { throw Error('Unsupported') } }), { settings: {}, capabilities: {} })
  assert.deepEqual(cameraMeasurementContext({ getSettings: () => ({ width: 720 }), getCapabilities() { throw Error('Unsupported') } }), { settings: { width: 720 }, capabilities: {} })
})

test('support history keeps five independent page-memory measurements without unrelated account/image data', () => {
  const original = globalThis.window
  globalThis.window = { innerWidth: 390, innerHeight: 844 }
  try {
    for (let index = 0; index < 7; index++) {
      const flash = { passed: index % 2 === 0, shift: index, failedChecks: ['normBlue'] }
      rememberFlashCheck({ flash, camera: { settings: { width: 720 } }, cameraLock: { exposure: false, whiteBalance: false }, frameSource: 'timer', delegate: 'GPU', photo: 'private-photo', account: 'private-user', token: 'secret' })
      flash.shift = -99
    }
    const report = flashSupportReport()
    assert.equal(report.checks.length, 5)
    assert.deepEqual(report.checks.map(row => row.flash.shift), [2, 3, 4, 5, 6])
    assert.deepEqual(report.checks.map(row => row.flash.passed), [true, false, true, false, true])
    assert.doesNotMatch(JSON.stringify(report), /private-photo|private-user|secret/)
    report.checks[0].flash.shift = -99
    assert.equal(flashSupportReport().checks[0].flash.shift, 2)
  } finally {
    if (original === undefined) delete globalThis.window
    else globalThis.window = original
  }
})

test('flash telemetry records paint and fresh-frame timing without changing sampling decisions', () => {
  const flash = new FlashSampler(0)
  const gray = { r: 100, g: 100, b: 100 }
  for (const ms of [0, 60, 120]) flash.add(gray, ms, ms / 1000)
  assert.equal(flash.phase(160).color, 'red')
  flash.add(gray, 170, .17)
  flash.present('red', 180, .18, { width: 390, height: 844, color: 'rgb(255, 0, 0)' })
  flash.add(gray, 220, .22)
  flash.add(gray, 350, .2) // Camera clock has not passed the settle interval.
  flash.add({ r: 180, g: 80, b: 40 }, 400, .4, { presentedFrames: 12, captureTime: 380, private: 'ignored' })
  const report = flash.result()
  assert.equal(report.passed, false) // Instrumentation never completes the challenge.
  assert.equal(report.counts.red, 1)
  assert.deepEqual(report.skipped, { awaitingPaint: 1, settling: 1, staleTimestamp: 1, invalidRGB: 0 })
  assert.equal(report.trace[0].mediaAfterDisplayMs, null)
  assert.equal(report.trace.at(-1).afterDisplayMs, 220)
  assert.equal(Math.round(report.trace.at(-1).mediaAfterDisplayMs), 220)
  assert.deepEqual(report.trace.at(-1).frameMetadata, { captureTime: 380, presentedFrames: 12 })
  assert.equal(report.presentations[0].delayMs, 20)
  assert.equal(report.presentations[0].display.width, 390)
})
