import { useCallback, useEffect, useRef, useState } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { Camera, RefreshCcw } from '../ui/icons'
import { detectionRegion } from '../face-detection.js'
import { getCoverCrop } from '../camera-crop.js'
import { getLivenessCrop } from './face-crop.js'
import { predictLiveness } from './client.js'
import { LivenessStateMachine } from './liveness-state-machine.js'
import { EyeCalibration, LANDMARK_MODEL, readLandmarks } from './landmark-input.js'
import { FlashSampler, lockCamera, sampleFaceCore } from './flash-challenge.js'
import logo from '../assets/android/ic_app_logo.png'
import './full-liveness.css'

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm'
const stepNumber = { waiting: 1, blink: 1, turn: 2, flash: 3, checking: 4, real: 4, fake: 4 }
const blobFromCanvas = canvas => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Không tạo được ảnh gửi server.')), 'image/jpeg', .92))

export default function FullLivenessCamera({ embedded = false, onCapture }) {
  const videoRef = useRef(null), runtime = useRef({ epoch: 0 })
  const [status, setStatus] = useState({ state: 'idle', message: 'Sẵn sàng xác thực' })
  const [photo, setPhoto] = useState(null), [result, setResult] = useState(null), [error, setError] = useState('')
  const [flashColor, setFlashColor] = useState('off'), [metrics, setMetrics] = useState(null), [cameraLock, setCameraLock] = useState(null)
  const [showDetails, setShowDetails] = useState(false), [consent, setConsent] = useState(false)
  const [faces, setFaces] = useState([])
  const [flashReport, setFlashReport] = useState(null)
  function downloadMeasurement() {
    if (!flashReport) return
    const report = {
      kind: 'group4-web-flash-measurement-v1',
      userAgent: navigator.userAgent, viewport: { width: window.innerWidth, height: window.innerHeight },
      frameSource: metrics?.frameSource, delegate: metrics?.delegate,
      cameraLock, flash: flashReport,
      note: 'Chỉ số đo RGB trung bình, không có ảnh/video/tài khoản. Không phải bằng chứng server đã xác minh.',
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'iriaegis-flash-measurement.json'
    document.body.appendChild(link); link.click(); link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const Container = embedded ? 'div' : 'main'

  const releaseResources = useCallback(() => {
    const rt = runtime.current
    rt.epoch++
    rt.controller?.abort(); rt.controller = null
    clearInterval(rt.watchdog)
    clearTimeout(rt.frameTimer)
    if (rt.videoCallback !== undefined) videoRef.current?.cancelVideoFrameCallback?.(rt.videoCallback)
    cancelAnimationFrame(rt.animationFrame)
    rt.paintFrames?.forEach(cancelAnimationFrame); rt.paintFrames = []
    rt.lock?.release(); rt.lock = null
    rt.stream?.getTracks().forEach(track => track.stop()); rt.stream = null
    rt.model?.close(); rt.model = null
    rt.logic = null; rt.flash = null; rt.busyFlash = false
    if (videoRef.current) videoRef.current.srcObject = null
    setFlashColor('off'); setFaces([])
  }, [])
  const fail = useCallback(message => {
    releaseResources()
    setError(message); setStatus({ state: 'failed', message: 'Chưa hoàn tất xác thực' })
  }, [releaseResources])
  useEffect(() => () => releaseResources(), [releaseResources])
  useEffect(() => {
    const rt = runtime.current, epoch = rt.epoch
    if (!rt.flash || !['red', 'blue', 'off'].includes(flashColor)) return
    const first = requestAnimationFrame(() => {
      const second = requestAnimationFrame(() => {
        if (epoch === rt.epoch) rt.flash?.present(flashColor, performance.now(), videoRef.current?.currentTime ?? 0)
      })
      rt.paintFrames?.push(second)
    })
    rt.paintFrames = [first]
    return () => { rt.paintFrames?.forEach(cancelAnimationFrame); rt.paintFrames = [] }
  }, [flashColor])
  useEffect(() => {
    const interrupt = () => {
      if (runtime.current.stream || runtime.current.controller) fail('Phiên xác thực bị gián đoạn. Hãy bắt đầu lại.')
    }
    const visibility = () => { if (document.hidden) interrupt() }
    const escape = event => { if (event.key === 'Escape') interrupt() }
    const video = videoRef.current
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', interrupt)
    window.addEventListener('keydown', escape)
    video?.addEventListener('pause', interrupt)
    return () => {
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('pagehide', interrupt)
      window.removeEventListener('keydown', escape)
      video?.removeEventListener('pause', interrupt)
    }
  }, [fail])

  async function finish(video, sample, epoch) {
    const rt = runtime.current
    if (epoch !== rt.epoch || rt.finishing) return
    rt.finishing = true
    let requestEpoch = epoch, controller
    try {
      // Same frame provides both the displayed photo and context crop to MiniVision.
      const region = getCoverCrop(video.videoWidth, video.videoHeight, video.clientWidth, video.clientHeight)
      const preview = document.createElement('canvas'); preview.width = region.width; preview.height = region.height
      const ctx = preview.getContext('2d'); ctx.translate(preview.width, 0); ctx.scale(-1, 1)
      ctx.drawImage(video, region.x, region.y, region.width, region.height, 0, 0, preview.width, preview.height)
      const crop = getLivenessCrop(sample.faces[0].boundingBox, video.videoWidth, video.videoHeight)
      const upload = document.createElement('canvas'); upload.width = crop.width; upload.height = crop.height
      upload.getContext('2d').drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)
      const evidence = { source: 'group4-android-web-port', active: true, flash: rt.flashReport,
        cameraLock: { exposure: !!rt.lockReport?.exposure, whiteBalance: !!rt.lockReport?.whiteBalance }, serverBound: false }
      const image = preview.toDataURL('image/jpeg', .92)
      const blob = await blobFromCanvas(upload)
      if (epoch !== rt.epoch) return
      releaseResources()
      requestEpoch = rt.epoch
      controller = new AbortController(); rt.controller = controller
      setPhoto(image); setStatus({ state: 'checking', message: '4/4 · MiniVision đang kiểm tra ảnh' })
      const verdict = await predictLiveness(blob, { signal: controller.signal })
      if (requestEpoch !== rt.epoch || controller.signal.aborted) return
      rt.controller = null
      setResult({ ...verdict, web_liveness: evidence })
      setStatus({ state: verdict.is_real ? 'real' : 'fake', message: verdict.is_real ? 'Đã hoàn thành kiểm tra liveness' : 'MiniVision không chấp nhận ảnh này' })
    } catch (failure) {
      if (requestEpoch !== runtime.current.epoch || controller?.signal.aborted) return
      fail(failure.message)
    }
  }

  async function start() {
    if (!consent) return
    releaseResources()
    const rt = runtime.current, epoch = rt.epoch
    rt.finishing = false; rt.lastMediaTime = -1; rt.lastInference = -Infinity; rt.lastUI = -Infinity
    rt.frameSource = videoRef.current?.requestVideoFrameCallback ? 'video-callback' : 'timer'
    rt.challengeId = 0; rt.processingMs = 0; rt.lastObservedTime = -1
    rt.recoveryReadyAt = Infinity
    setPhoto(null); setResult(null); setError(''); setMetrics(null); setCameraLock(null); setFlashReport(null)
    setStatus({ state: 'opening', message: 'Đang mở camera và tải mô hình liveness…' })
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Camera cần HTTPS hoặc localhost và trình duyệt hỗ trợ camera.')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } })
      if (epoch !== rt.epoch) { stream.getTracks().forEach(track => track.stop()); return }
      rt.stream = stream
      const track = stream.getVideoTracks()[0]
      const interruption = () => { if (epoch === rt.epoch) fail('Camera bị dừng hoặc tạm ngắt. Hãy bắt đầu lại.') }
      track.addEventListener('ended', interruption, { once: true }); track.addEventListener('mute', interruption, { once: true })
      const video = videoRef.current
      video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '')
      video.muted = true; video.srcObject = stream
      await video.play()
      if (epoch !== rt.epoch) return
      const vision = await FilesetResolver.forVisionTasks(WASM)
      if (epoch !== rt.epoch) return
      const options = { runningMode: 'VIDEO', numFaces: 2, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true }
      const initialRegion = detectionRegion(video.videoWidth, video.videoHeight, video.clientWidth, video.clientHeight)
      const initialCanvas = document.createElement('canvas')
      initialCanvas.width = initialRegion.inputWidth; initialCanvas.height = initialRegion.inputHeight
      const prepare = async delegate => {
        const candidate = await FaceLandmarker.createFromOptions(vision, { ...options, baseOptions: { modelAssetPath: LANDMARK_MODEL, delegate } })
        if (epoch !== rt.epoch) { candidate.close(); return null }
        try {
          initialCanvas.getContext('2d').drawImage(video, initialRegion.x, initialRegion.y, initialRegion.width, initialRegion.height, 0, 0, initialCanvas.width, initialCanvas.height)
          // Cold shader compilation can exceed the no-frame watchdog. Warm up
          // before starting the challenge clock; this frame earns no progress.
          candidate.detectForVideo(initialCanvas, performance.now())
          return candidate
        } catch (failure) { candidate.close(); throw failure }
      }
      let model
      try {
        model = await prepare('GPU')
        rt.delegate = 'GPU'
      } catch {
        if (epoch !== rt.epoch) return
        model = await prepare('CPU')
        rt.delegate = 'CPU'
      }
      if (epoch !== rt.epoch) { model?.close(); return }
      rt.model = model; rt.logic = new LivenessStateMachine(performance.now()); rt.eyes = new EyeCalibration()
      rt.lastAcceptedAt = performance.now()
      rt.canvas = initialCanvas; rt.fullCanvas = document.createElement('canvas')
      setStatus(rt.logic.snapshot())
      const schedule = () => {
        if (epoch !== rt.epoch || rt.finishing) return
        if (rt.frameSource === 'video-callback') rt.videoCallback = video.requestVideoFrameCallback((time, metadata) => {
          if (rt.frameSource === 'video-callback') processFrame(time, metadata)
        })
        else rt.frameTimer = setTimeout(() => processFrame(performance.now()), 50)
      }
      const beginFlash = async () => {
        const challengeId = rt.challengeId
        rt.busyFlash = true
        const lock = await lockCamera(track)
        if (epoch !== rt.epoch || challengeId !== rt.challengeId) { lock.release(); return }
        rt.lock = lock; rt.lockReport = { exposure: lock.exposure, whiteBalance: lock.whiteBalance }
        setCameraLock(rt.lockReport)
        rt.flash = new FlashSampler(performance.now()); rt.color = 'off'
      }
      const processFrame = (_callbackTime, metadata) => {
        if (epoch !== rt.epoch || rt.finishing) return
        try {
          const now = performance.now()
          const mediaTime = Number.isFinite(metadata?.mediaTime) ? metadata.mediaTime : video.currentTime
          if (video.readyState < 2 || video.paused || document.hidden) { schedule(); return }
          // Cap at 30 processed frames/sec: Android counters assume approximately 30 fps.
          if (mediaTime === rt.lastMediaTime || now - rt.lastInference < 30) { schedule(); return }
          rt.lastMediaTime = mediaTime; rt.lastInference = now
          const region = detectionRegion(video.videoWidth, video.videoHeight, video.clientWidth, video.clientHeight)
          const canvas = rt.canvas
          if (canvas.width !== region.inputWidth) canvas.width = region.inputWidth
          if (canvas.height !== region.inputHeight) canvas.height = region.inputHeight
          canvas.getContext('2d').drawImage(video, region.x, region.y, region.width, region.height, 0, 0, canvas.width, canvas.height)
          let sample
          if (rt.flash && (!rt.flash.phase(now).done || now < rt.recoveryReadyAt)) {
            // Android pauses ML Kit while sampling flash; keep the last centered ROI.
            // Re-detect after recovery before capturing, never treat colored frames as new pose evidence.
            sample = { ...rt.lastSample, timestamp: mediaTime, retainedPose: true }
          } else {
            const landmarks = rt.model.detectForVideo(canvas, performance.now())
            sample = { ...readLandmarks(landmarks, video, canvas), timestamp: mediaTime }
            if (sample.count === 1 && sample.inFrame) sample = { ...sample, ...rt.eyes.measure(sample, now) }
            rt.lastSample = sample
          }
          const analyzedAt = performance.now()
          rt.processingMs = analyzedAt - now; rt.lastAcceptedAt = analyzedAt
          const snapshot = rt.logic.process(sample, analyzedAt)
          if (snapshot.recalibrate) rt.eyes.reset()
          const diagnostic = { ...sample, motion: snapshot.motion, restartReason: snapshot.restartReason, delegate: rt.delegate,
            frameSource: rt.frameSource, processingMs: rt.processingMs }
          if (snapshot.state === 'failed') { setMetrics(diagnostic); fail(snapshot.message); return }
          setStatus(snapshot)
          if (now - rt.lastUI >= 200) { setMetrics(diagnostic); setFaces(sample.faces || []); rt.lastUI = now }
          if (snapshot.state === 'flash' && !rt.busyFlash) beginFlash().catch(failure => { if (epoch === rt.epoch) fail(failure.message) })
          if (rt.flash) {
            const phase = rt.flash.phase(now)
            // Never classify or capture before all color phases have real frame samples.
            if (phase.color !== rt.color) {
              rt.color = phase.color; setFlashColor(phase.color)
              if (phase.color === 'off') {
                const lock = rt.lock; rt.lock = null
                Promise.resolve(lock?.release()).then(() => { if (epoch === rt.epoch) rt.recoveryReadyAt = performance.now() + 220 })
              }
            }
            if (phase.sample && sample.count === 1 && sample.inFrame) {
              const full = rt.fullCanvas
              if (full.width !== video.videoWidth) full.width = video.videoWidth
              if (full.height !== video.videoHeight) full.height = video.videoHeight
              full.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0)
              rt.flash.add(sampleFaceCore(full, sample.faces[0]?.boundingBox), now, sample.timestamp)
            }
            if (phase.done && now >= rt.recoveryReadyAt) {
              rt.flashReport = rt.flash.result()
              setFlashReport(rt.flashReport)
              const active = rt.logic.flashResult(rt.flashReport)
              if (active.state !== 'active_passed') { setShowDetails(true); fail(active.message); return }
              if (sample.count !== 1 || !sample.inFrame || Math.abs(sample.yaw) > 10 || Math.abs(sample.pitch) > 15) { fail('Mặt không còn chính diện sau flash. Hãy thử lại.'); return }
              setFlashColor('off')
              rt.lock?.release(); rt.lock = null
              finish(video, sample, epoch)
              return
            }
          }
          schedule()
        } catch (failure) { if (epoch === rt.epoch) fail('Lỗi phân tích camera: ' + failure.message) }
      }
      rt.watchdog = setInterval(() => {
        if (epoch !== rt.epoch || rt.finishing) return
        const now = performance.now(), currentTime = video.currentTime
        const advancing = Number.isFinite(currentTime) && currentTime > rt.lastObservedTime
        rt.lastObservedTime = currentTime
        if (rt.frameSource === 'video-callback' && now - rt.lastAcceptedAt >= 600 && advancing && video.readyState >= 2 && !video.paused && !document.hidden) {
          // Some video compositors advertise rVFC but stop delivering callbacks.
          // Switch once to polling a progressing video clock, without reopening
          // the camera. Discard challenge/flash progress when changing clocks.
          rt.frameSource = 'timer'; video.cancelVideoFrameCallback?.(rt.videoCallback)
          rt.challengeId++; rt.flash = null; rt.busyFlash = false
          rt.lock?.release(); rt.lock = null; rt.color = 'off'; setFlashColor('off')
          rt.paintFrames?.forEach(cancelAnimationFrame); rt.paintFrames = []
          rt.lastMediaTime = -1; rt.lastInference = -Infinity; rt.lastAcceptedAt = now
          rt.eyes.reset(); rt.recoveryReadyAt = Infinity
          setStatus(rt.logic.reacquire(now, 'Callback video không cấp frame; chuyển sang đọc video đang tiến.'))
          schedule()
        }
        const state = rt.logic.tick(now)
        if (state.state === 'failed') {
          const cameraState = `readyState=${video.readyState}; paused=${video.paused}; track=${track.readyState}; muted=${track.muted}; videoTime=${currentTime.toFixed(3)}; lastFrame=${rt.lastMediaTime.toFixed(3)}; age=${Math.round(now - rt.lastAcceptedAt)} ms`
          setMetrics(previous => ({ ...previous, delegate: rt.delegate, frameSource: rt.frameSource, processingMs: rt.processingMs,
            cameraState }))
          setShowDetails(true); fail(state.message)
        }
      }, 200)
      schedule()
    } catch (failure) {
      if (epoch !== runtime.current.epoch) return
      fail(failure.name === 'NotAllowedError' ? 'Quyền camera đã bị từ chối. Hãy cấp lại quyền và thử lại.' : failure.message)
    }
  }

  const running = !['idle', 'failed', 'real', 'fake'].includes(status.state)
  const hasCamera = ['opening', 'waiting', 'blink', 'turn', 'flash'].includes(status.state)
  return <div className={'app-shell full-liveness' + (embedded ? ' embedded-camera' : '')}>
    {!embedded && <header className="topbar"><div className="brand"><span className="brand-icon"><img src={logo} alt="" /></span><span>IriAegis</span></div><a href="#/app">Mở quản lý</a></header>}
    <Container className="main">{!embedded && <div className="heading"><h1>Xác thực khuôn mặt</h1><p>Chớp mắt, quay đầu, phản xạ ánh sáng và MiniVision</p></div>}
      <section className="camera-card" aria-label="Kiểm tra liveness">
        {!running && !photo && <label className="full-liveness-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />Cho phép hai lượt sáng đỏ/xanh để đo phản xạ và gửi ảnh đến dịch vụ liveness.</label>}
        <ol className="liveness-steps" aria-label="Các bước xác thực">{['Chớp mắt', 'Quay đầu', 'Ánh sáng', 'MiniVision'].map((label, i) => <li key={label} aria-current={stepNumber[status.state] === i + 1 ? 'step' : undefined}>{i + 1}. {label}</li>)}</ol>
        <div className={'viewport' + (photo ? ' has-photo' : '')}>
          <video ref={videoRef} autoPlay muted playsInline disablePictureInPicture className={hasCamera ? 'visible' : ''} />
          {photo && <img src={photo} alt="Ảnh sau kiểm tra liveness" />}
          {!hasCamera && !photo && <div className="camera-placeholder"><Camera size={32}/><strong>Sẵn sàng xác thực</strong></div>}
          {hasCamera && <div className={'face-guide' + (faces.length === 1 ? ' detected' : '')} aria-hidden="true" />}
          {showDetails && hasCamera && <div className="face-detection-overlay" aria-hidden="true">{faces.map((face, index) => <div className="face-detection-box" key={index} style={{ left: `${face.preview.left}%`, top: `${face.preview.top}%`, width: `${face.preview.width}%`, height: `${face.preview.height}%` }}><span>{index + 1}</span></div>)}</div>}
        </div>
        <div className="card-bottom"><div className="detect-status" role="status" aria-live="polite"><strong>{status.message}</strong></div>
          <div className="actions">{running ? <button type="button" className="btn secondary" onClick={() => { releaseResources(); setStatus({ state: 'idle', message: 'Đã hủy xác thực' }); setPhoto(null); setResult(null); setError('') }}>Hủy xác thực</button> : <button type="button" className={'btn ' + (status.state === 'real' && onCapture ? 'secondary' : 'primary')} disabled={!consent} onClick={start}>{status.state === 'idle' ? <Camera size={18}/> : <RefreshCcw size={18}/>} {status.state === 'idle' ? 'Bắt đầu xác thực' : 'Xác thực lại'}</button>}</div>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        {status.state === 'fake' && <p className="error" role="alert">Dịch vụ trả FAKE. Không được sử dụng ảnh này.</p>}
        {photo && onCapture && <button type="button" className="btn primary" disabled={status.state !== 'real'} onClick={() => { if (status.state === 'real' && result?.is_real) onCapture(photo, result) }}>Sử dụng ảnh này</button>}
        {cameraLock && (!cameraLock.exposure || !cameraLock.whiteBalance) && <p className="liveness-disclosure">Camera không xác nhận khóa đủ phơi sáng/cân bằng trắng. Vẫn đo phản xạ; chưa xác nhận tương đương phần cứng Android.</p>}
        <details className="liveness-details" open={showDetails} onToggle={event => setShowDetails(event.currentTarget.open)}><summary>Thông tin kiểm tra</summary>
          <p>Luồng liveness trên Web; chưa đối sánh danh tính hoặc ràng buộc xác thực vào API điểm danh.</p>
          {metrics && <><p>EyeBlink: {metrics.blinkLeft?.toFixed(2) ?? '—'} / {metrics.blinkRight?.toFixed(2) ?? '—'} · Mắt mở: {metrics.calibrating ? 'đang hiệu chuẩn' : `${metrics.eyeLeft?.toFixed(2) ?? '—'} / ${metrics.eyeRight?.toFixed(2) ?? '—'}`} · {metrics.count} mặt</p><p>Góc quay/ngẩng/nghiêng: {metrics.yaw?.toFixed(1) ?? '—'}° / {metrics.pitch?.toFixed(1) ?? '—'}° / {metrics.roll?.toFixed(1) ?? '—'}°</p>{metrics.motion && <p>Chênh lệch frame: {metrics.motion.yaw.toFixed(1)}° / {metrics.motion.pitch.toFixed(1)}° / {metrics.motion.roll.toFixed(1)}° · {Math.round(metrics.motion.intervalMs)} ms</p>}</>}
          {metrics && <p>Xử lý: {metrics.delegate}{metrics.restartReason ? ` · Bắt đầu lại: ${metrics.restartReason}` : ''}</p>}
          {metrics?.frameSource && <p>Nguồn frame: {metrics.frameSource} · Suy luận: {Math.round(metrics.processingMs)} ms</p>}
          {metrics?.cameraState && <p>Camera: {metrics.cameraState}</p>}
          {flashReport && <p>Flash: shift {flashReport.shift?.toFixed(3) ?? '—'} / 0.280 · normR {flashReport.normRed?.toFixed(3) ?? '—'} / 0.040 · normB {flashReport.normBlue?.toFixed(3) ?? '—'} / 0.040 · Baseline đối xứng: {flashReport.symmetric === undefined ? '—' : flashReport.symmetric ? 'đạt' : 'không đạt'} · Mẫu nền/đỏ/xanh: {flashReport.counts.baseline}/{flashReport.counts.red}/{flashReport.counts.blue}</p>}
          {flashReport && <button type="button" className="btn secondary" onClick={downloadMeasurement}>Tải số đo ánh sáng (.json)</button>}
          {result && <p>MiniVision: {result.result} · REAL {result.real_score} · Ngưỡng {result.threshold_used} · Flash shift {result.web_liveness.flash.shift.toFixed(3)}</p>}
        </details>
        {!embedded && <a className="passive-test-link" href="#/camera/passive">Thử riêng API phân loại ảnh</a>}
      </section>
    </Container>
    {['red', 'blue'].includes(flashColor) && <><div className={'liveness-screen-flash ' + flashColor} data-flash-phase={flashColor} aria-hidden="true" /><button type="button" className="liveness-flash-stop" onClick={() => fail('Đã dừng kiểm tra ánh sáng. Bạn có thể thử lại.')}>Dừng kiểm tra ánh sáng</button></>}
  </div>
}
