import test from 'node:test'
import assert from 'node:assert/strict'
import { predictLiveness, validateLivenessResult } from './liveness/client.js'
import { getLivenessCrop } from './liveness/face-crop.js'

const real = { status: 'success', result: 'REAL', is_real: true, real_score: 0.83, spoof_score: 0.15, threshold_used: 0.108 }
const blob = new Blob(['jpeg-test-fixture'], { type: 'image/jpeg' })

test('group 4: multipart file đúng endpoint, không JWT hoặc tự chọn threshold', async () => {
  let request
  const result = await predictLiveness(blob, { baseURL: '/liveness-api', fetcher: async (url, options) => { request = { url, ...options }; return Response.json(real) } })
  assert.equal(request.url, '/liveness-api/api/v1/predict-liveness')
  assert.equal(request.method, 'POST')
  assert.deepEqual(Object.keys(request.headers), ['Accept'])
  assert.deepEqual([...request.body.keys()], ['file'])
  assert.equal(request.body.get('file').type, 'image/jpeg')
  assert.equal(request.body.get('file').name, 'face.jpg')
  assert.equal(result.is_real, true)
})

test('group 4: FAKE là verdict server, không tự so score hay chuyển thành REAL', async () => {
  const fake = { ...real, result: 'FAKE', is_real: false, real_score: 0.05, spoof_score: 0.9 }
  assert.equal((await predictLiveness(blob, { fetcher: async () => Response.json(fake) })).is_real, false)
  // main.py rounds scores; do not recompute its verdict using rounded numbers.
  assert.equal(validateLivenessResult({ ...real, real_score: 0.108 }).is_real, true)
})

test('group 4: dữ liệu thiếu, nhãn mâu thuẫn, điểm sai kiểu đều không được công nhận', () => {
  for (const bad of [{}, { ...real, is_real: 'true' }, { ...real, result: 'FAKE' }, { ...real, real_score: NaN }, { ...real, spoof_score: 1.1 }, { ...real, threshold_used: '0.108' }]) assert.throws(() => validateLivenessResult(bad), /không hợp lệ/)
})

test('group 4: lỗi HTTP, mạng, timeout và hủy không tạo kết quả đạt', async () => {
  await assert.rejects(predictLiveness(blob, { fetcher: async () => Response.json({ detail: 'Không kết nối được dịch vụ liveness.' }, { status: 502 }) }), /Kết nối đến dịch vụ xác thực bị gián đoạn/)
  await assert.rejects(predictLiveness(blob, { fetcher: async () => Response.json({ detail: 'Model unavailable' }, { status: 503 }) }), /tạm thời chưa sẵn sàng/)
  await assert.rejects(predictLiveness(blob, { fetcher: async () => { throw new TypeError('Offline') } }), /Không kết nối được/)
  const hanging = (_, { signal }) => new Promise((resolve, reject) => { if (signal.aborted) reject(signal.reason); else signal.addEventListener('abort', () => reject(signal.reason), { once: true }) })
  await assert.rejects(predictLiveness(blob, { fetcher: hanging, timeout: 5 }), /phản hồi quá lâu/)
  const controller = new AbortController(); controller.abort()
  await assert.rejects(predictLiveness(blob, { signal: controller.signal, fetcher: hanging }), { name: 'AbortError' })
})

test('gateway HTML/JSON and internal errors are not rendered as raw infrastructure diagnostics', async () => {
  for (const status of [502, 504, 520, 521, 522, 523, 524, 525, 526, 527, 530]) {
    for (const response of [new Response('<html>The origin web server returned an invalid or incomplete response to Cloudflare.</html>', { status }), Response.json({ detail: 'The origin web server returned an invalid or incomplete response to Cloudflare.' }, { status })]) {
      await assert.rejects(predictLiveness(blob, { fetcher: async () => response }), failure => failure.status === status && failure.message === 'Kết nối đến dịch vụ xác thực bị gián đoạn. Hãy thử lại.')
    }
  }
  await assert.rejects(predictLiveness(blob, { fetcher: async () => Response.json({ detail: 'Lỗi xử lý hệ thống: private stack trace' }, { status: 500 }) }), failure => failure.status === 500 && !failure.message.includes('private'))
  await assert.rejects(predictLiveness(blob, { fetcher: async () => Response.json({ detail: 'File ảnh không hợp lệ.' }, { status: 400 }) }), /File ảnh không hợp lệ/)
  await assert.rejects(predictLiveness(blob, { fetcher: async () => new Response('<html>no verdict</html>', { status: 200 }) }), /kết quả không hợp lệ/)
})

test('group 4: không gửi file rỗng/sai MIME; crop 2.7 theo notebook, không vượt ảnh', async () => {
  await assert.rejects(predictLiveness(new Blob([])), /JPEG\/PNG/)
  assert.deepEqual(getLivenessCrop({ originX: 100, originY: 50, width: 100, height: 100 }, 640, 480), { x: 15, y: 0, width: 271, height: 236 })
  const crop = getLivenessCrop({ originX: 0, originY: 0, width: 300, height: 450 }, 640, 480)
  assert.ok(crop.x >= 0 && crop.y >= 0 && crop.x + crop.width <= 640 && crop.y + crop.height <= 480)
  assert.throws(() => getLivenessCrop(null, 640, 480))
})
