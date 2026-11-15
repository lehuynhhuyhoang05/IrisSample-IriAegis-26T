// Port of LivenessLogic.java, group 4 commit be89383530aa5845cf793a7cd4db90478f20f445.
// Web adapter supplies normalized eye openness, pixel landmarks and Euler angles.
export const GROUP4_LIMITS = Object.freeze({ eyeClosed: .15, eyeOpen: .75, left: -11.5, right: 11.5, center: 10, timeout: 25000 })
// Euler angles wrap at ±180°. Compare the shortest arc, not a raw subtraction.
export const angleDistance = (a, b) => Math.abs(((a - b + 180) % 360 + 360) % 360 - 180)

export class Group4Logic {
  constructor(now = 0) { this.started = now; this.lastFrameAt = now; this.lastTimestamp = -Infinity; this.cadence = []; this.state = 'waiting'; this.message = 'Nhìn thẳng vào camera'; this.resetProgress() }
  resetProgress() {
    this.openFrames = 0; this.closedFrames = 0; this.closed = false; this.blinkPose = null
    this.left = false; this.right = false; this.centerFrames = 0
    this.minEye = Infinity; this.maxEye = -Infinity; this.minNose = Infinity; this.maxNose = -Infinity
    this.previous = null; this.staticFrames = 0; this.lostAt = null
  }
  snapshot() { return { state: this.state, message: this.message, left: this.left, right: this.right, motion: this.motion, restartReason: this.restartReason } }
  fail(message) { this.state = 'failed'; this.message = message; return this.snapshot() }
  tick(now, freshFrame = false) {
    if (['failed', 'active_passed'].includes(this.state)) return this.snapshot()
    if (now - this.started >= GROUP4_LIMITS.timeout) return this.fail('Hết thời gian xác thực. Hãy thử lại.')
    if (!freshFrame && now - this.lastFrameAt >= 1800) return this.fail('Video bị gián đoạn. Hãy mở lại camera.')
    return this.snapshot()
  }
  process(sample, now) {
    // A fresh result may arrive after a slow synchronous inference. Only the
    // independent watchdog decides that no frame arrived, not its processing cost.
    const freshFrame = Number.isFinite(sample?.timestamp) && sample.timestamp > this.lastTimestamp
    this.tick(now, freshFrame)
    if (['failed', 'active_passed'].includes(this.state)) return this.snapshot()
    if (!Number.isFinite(sample?.timestamp) || sample.timestamp <= this.lastTimestamp) return this.snapshot()
    const frameGap = now - this.lastFrameAt
    this.lastTimestamp = sample.timestamp; this.lastFrameAt = now
    const sorted = [...this.cadence].sort((a, b) => a - b)
    const expectedGap = sorted.length >= 3 ? sorted[Math.floor(sorted.length / 2)] : 0
    const gapLimit = Math.min(1000, Math.max(250, expectedGap * 3))
    if ((frameGap > 0 && frameGap <= gapLimit) || !this.previous) this.cadence = [...this.cadence, frameGap].slice(-12)
    // Browser inference may skip frames. A gap is not evidence of a video splice;
    // discard the entire challenge instead of comparing stale poses or passing it.
    if (frameGap > gapLimit && this.previous && this.state !== 'flash') {
      this.resetProgress(); this.state = 'waiting'; this.motion = null
      this.restartReason = `Khoảng frame ${Math.round(frameGap)} ms vượt nhịp theo dõi ${Math.round(gapLimit)} ms.`
      this.message = 'Hình ảnh bị ngắt quãng. Nhìn thẳng để bắt đầu lại.'
      return { ...this.snapshot(), recalibrate: true }
    }
    if (sample.count !== 1 || !sample.inFrame) {
      if (this.state === 'flash') return this.fail('Mất khuôn mặt trong lúc kiểm tra ánh sáng. Hãy thử lại.')
      this.lostAt ??= now
      const reset = sample.count > 1 || now - this.lostAt >= 500
      if (reset) {
        this.restartReason = sample.count > 1 ? 'Có nhiều khuôn mặt trong khung.' : 'Mất theo dõi khuôn mặt ít nhất 500 ms.'
        this.resetProgress(); this.state = 'waiting'; this.lostAt = now
      }
      this.message = sample.count > 1 ? 'Chỉ để một khuôn mặt trong khung' : 'Đưa khuôn mặt vào giữa khung'
      // No pose is measured in this interval. Reacquire the derivative reference
      // on return, never count the missing frame as motion or a blink/turn.
      this.previous = null; this.staticFrames = 0
      return { ...this.snapshot(), recalibrate: reset }
    }
    if (!['yaw', 'pitch', 'roll', 'noseX', 'noseY', 'eyeRatio', 'noseRatio'].every(key => Number.isFinite(sample[key]))) return this.fail('Thiếu dữ liệu tư thế khuôn mặt. Hãy mở lại camera.')
    if (this.lostAt !== null) {
      this.message = this.state === 'turn' ? '2/3 · Quay chậm sang hai bên' : this.state === 'blink' ? '1/3 · Giữ đầu thẳng và chớp mắt' : 'Nhìn thẳng vào camera'
    }
    this.lostAt = null
    if (sample.calibrating) {
      // Eye calibration is reset on tracking loss in the Web adapter. Its new
      // baseline must never be compared with a pose from the previous track.
      this.resetProgress(); this.state = 'waiting'; this.motion = null
      this.message = 'Mở rõ hai mắt để đo ban đầu'; return this.snapshot()
    }
    if (!['eyeLeft', 'eyeRight'].every(key => Number.isFinite(sample[key]) && sample[key] >= 0 && sample[key] <= 1)) return this.fail('Không đo được trạng thái mắt. Hãy thử lại.')
    const prev = this.previous
    if (prev && this.state !== 'flash') {
      const dy = angleDistance(sample.yaw, prev.yaw), dx = angleDistance(sample.pitch, prev.pitch), dz = angleDistance(sample.roll, prev.roll)
      this.motion = { yaw: dy, pitch: dx, roll: dz, intervalMs: frameGap }
      const isStatic = dy <= .01 && dx <= .01 && dz <= .01 && Math.abs(sample.noseX - prev.noseX) <= .15 && Math.abs(sample.noseY - prev.noseY) <= .15 && Math.abs(sample.eyeLeft - prev.eyeLeft) <= .001 && Math.abs(sample.eyeRight - prev.eyeRight) <= .001
      if (isStatic) {
        this.staticFrames++
        if (this.staticFrames >= 28) return this.fail('Phát hiện video đứng hình. Hãy thử lại.')
      } else {
        if (this.staticFrames >= 18) return this.fail('Video bị đứng rồi tiếp tục phát. Hãy thử lại.')
        this.staticFrames = 0
        if (dy > (this.state === 'turn' ? 50 : 35) || dx > 25 || dz > 25) return this.fail('Chuyển động nhảy khung bất thường. Hãy thử lại.')
      }
    }
    this.previous = sample
    if (this.state === 'waiting') {
      if (Math.abs(sample.yaw) <= 12) this.state = 'blink'
      this.message = this.state === 'blink' ? '1/3 · Giữ đầu thẳng và chớp mắt' : 'Nhìn thẳng vào camera'
    } else if (this.state === 'blink') {
      if (Math.abs(sample.yaw) > 15) { this.openFrames = 0; this.closedFrames = 0; this.closed = false; this.message = '1/3 · Giữ đầu thẳng và chớp mắt'; return this.snapshot() }
      const open = sample.eyeLeft >= .75 && sample.eyeRight >= .75
      const closed = sample.eyeLeft <= .15 && sample.eyeRight <= .15
      if (!this.closed) {
        if (open) this.openFrames++
        if (this.openFrames >= 3 && closed) { this.closed = true; this.closedFrames = 1; this.blinkPose = sample; this.message = '1/3 · Đã thấy nhắm mắt, mở mắt lại' }
      } else if (closed) {
        if (++this.closedFrames > 15) { this.openFrames = 0; this.closedFrames = 0; this.closed = false; this.message = '1/3 · Mở mắt và chớp lại' }
      } else if (open) {
        if (['yaw', 'pitch', 'roll'].some(key => angleDistance(sample[key], this.blinkPose[key]) > 15)) return this.fail('Tư thế đầu thay đổi bất thường khi chớp mắt.')
        this.state = 'turn'; this.message = '2/3 · Quay chậm sang hai bên'
      }
    } else if (this.state === 'turn') {
      this.minEye = Math.min(this.minEye, sample.eyeRatio); this.maxEye = Math.max(this.maxEye, sample.eyeRatio)
      this.minNose = Math.min(this.minNose, sample.noseRatio); this.maxNose = Math.max(this.maxNose, sample.noseRatio)
      if (sample.yaw <= -11.5) this.left = true
      if (sample.yaw >= 11.5) this.right = true
      if (this.left && this.right) {
        if (this.maxEye - this.minEye < .015 && this.maxNose - this.minNose < .05) { this.message = '2/3 · Quay đầu thật, không di chuyển màn hình'; return this.snapshot() }
        this.centerFrames = Math.abs(sample.yaw) <= 10 ? this.centerFrames + 1 : 0
        this.message = '2/3 · Nhìn thẳng lại vào camera'
        if (this.centerFrames >= 3) { this.state = 'flash'; this.message = '3/3 · Giữ thẳng mặt, kiểm tra ánh sáng' }
      }
    } else if (this.state === 'flash' && (Math.abs(sample.yaw) > 15 || Math.abs(sample.pitch) > 15)) return this.fail('Giữ đầu thẳng trong lúc kiểm tra ánh sáng.')
    return this.snapshot()
  }
  reacquire(now, reason) {
    this.resetProgress(); this.state = 'waiting'; this.motion = null
    this.lastTimestamp = -Infinity; this.lastFrameAt = now
    this.restartReason = reason; this.message = 'Nhìn thẳng để bắt đầu lại theo dõi.'
    return this.snapshot()
  }
  flashResult(result) {
    if (this.state !== 'flash') return this.snapshot()
    if (!result?.passed) return this.fail(result?.reason || 'Không đạt kiểm tra phản xạ ánh sáng. Hãy thử lại.')
    this.state = 'active_passed'; this.message = 'Đã qua chớp mắt, quay đầu và phản xạ ánh sáng'
    return this.snapshot()
  }
}
