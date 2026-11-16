import { detectionRegion, normalizeDetections } from '../face-detection.js'
import { angleDistance } from './liveness-state-machine.js'

// Model copied unchanged from group 4's server branch; see public/models/face-landmarker/README.md.
export const LANDMARK_MODEL = '/models/face-landmarker/face_landmarker.task'
const clamp = value => Math.min(1, Math.max(0, value))
export function eyeAspectRatio(points, indices, width, height) {
  const eye = indices.map(index => points[index])
  if (eye.some(point => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))) return NaN
  const dist = (a, b) => Math.hypot((a.x - b.x) * width, (a.y - b.y) * height)
  const span = dist(eye[0], eye[3])
  return span > 1 ? (dist(eye[1], eye[5]) + dist(eye[2], eye[4])) / (2 * span) : NaN
}

// ML Kit eye-open probabilities do not exist on Web. Calibrate geometric openness,
// then supply [0,1] values to the ported thresholds. These are not ML Kit probabilities.
export class EyeCalibration {
  constructor() { this.rows = []; this.base = null }
  reset() { this.rows = []; this.base = null }
  measure(sample, now) {
    const { earLeft: left, earRight: right, blinkLeft, blinkRight } = sample
    if (![left, right, blinkLeft, blinkRight].every(Number.isFinite)) return { calibrating: true }
    if (!this.base) {
      if (Math.abs(sample.yaw) > 12 || left < .1 || right < .1 || left > .7 || right > .7 || blinkLeft > .55 || blinkRight > .55) { this.rows = []; return { calibrating: true } }
      // Wait for the pose estimate to settle as well as the eyes at startup.
      if (this.rows.length && ['yaw', 'pitch', 'roll'].some(key => angleDistance(sample[key] ?? 0, this.rows[0][key]) > 8)) this.rows = []
      if (this.rows.length && (Math.abs(left / this.rows[0].left - 1) > .25 || Math.abs(right / this.rows[0].right - 1) > .25)) this.rows = []
      this.rows.push({ left, right, blinkLeft, blinkRight, yaw: sample.yaw, pitch: sample.pitch ?? 0, roll: sample.roll ?? 0, now }); this.rows = this.rows.slice(-60)
      if (this.rows.length >= 5 && now - this.rows[0].now >= 500) {
        const median = key => this.rows.map(row => row[key]).sort((a, b) => a - b)[Math.floor(this.rows.length / 2)]
        this.base = { left: median('left'), right: median('right'), blinkLeft: median('blinkLeft'), blinkRight: median('blinkRight') }
      } else return { calibrating: true }
    }
    const openness = (ear, baseline, blink, neutral) => {
      const geometry = clamp((ear / baseline - .35) / .45)
      const expression = clamp((1 - blink) / Math.max(.1, 1 - neutral))
      // A geometric closure alone can be noise; require increased blink too.
      return blink >= Math.max(.3, neutral + .18) ? Math.min(geometry, expression) : Math.max(.2, geometry)
    }
    return { eyeLeft: openness(left, this.base.left, blinkLeft, this.base.blinkLeft), eyeRight: openness(right, this.base.right, blinkRight, this.base.blinkRight), calibrating: false }
  }
}

export function readLandmarks(result, video, canvas) {
  const detected = result.faceLandmarks || [], points = detected[0], count = detected.length
  const region = detectionRegion(video.videoWidth, video.videoHeight, video.clientWidth, video.clientHeight)
  const boxes = detected.filter(face => face.length && face.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).map(face => {
    const xs = face.map(p => p.x), ys = face.map(p => p.y)
    return { boundingBox: { originX: Math.min(...xs) * canvas.width, originY: Math.min(...ys) * canvas.height, width: (Math.max(...xs) - Math.min(...xs)) * canvas.width, height: (Math.max(...ys) - Math.min(...ys)) * canvas.height }, categories: [] }
  })
  const faces = normalizeDetections(boxes, { ...region, inputWidth: canvas.width, inputHeight: canvas.height })
  const empty = { count, inFrame: false, timestamp: video.currentTime, faces }
  if (!points || count !== 1) return empty
  const matrix = result.facialTransformationMatrixes?.[0]?.data
  const categories = result.faceBlendshapes?.[0]?.categories || []
  const score = name => categories.find(row => row.categoryName === name)?.score
  if (matrix?.length !== 16 || points.length < 468 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return empty
  const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x))
  const minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y))
  const left = points[33], right = points[263], nose = points[1], eyeDist = Math.abs(right.x - left.x)
  if (!faces.length || eyeDist < .005 || maxX <= minX) return empty
  return {
    count, faces, inFrame: minX >= 0 && maxX <= 1 && minY >= 0 && maxY <= 1, timestamp: video.currentTime,
    yaw: Math.atan2(matrix[8], matrix[10]) * 180 / Math.PI,
    pitch: Math.atan2(-matrix[9], Math.hypot(matrix[8], matrix[10])) * 180 / Math.PI,
    roll: Math.atan2(matrix[1], matrix[0]) * 180 / Math.PI,
    noseX: nose.x * canvas.width, noseY: nose.y * canvas.height,
    eyeRatio: eyeDist / (maxX - minX), noseRatio: (nose.x - Math.min(left.x, right.x)) / eyeDist,
    blinkLeft: score('eyeBlinkLeft'), blinkRight: score('eyeBlinkRight'),
    earLeft: eyeAspectRatio(points, [362, 385, 387, 263, 373, 380], canvas.width, canvas.height),
    earRight: eyeAspectRatio(points, [33, 160, 158, 133, 153, 144], canvas.width, canvas.height),
  }
}
