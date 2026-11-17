import { useLayoutEffect, useRef, useState } from 'react'
import { faceGuide } from './face-guide.js'

export default function FaceGuide({ color = 'off', valid = false, failed = false }) {
  const svg = useRef(null), [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const element = svg.current
    const measure = () => {
      const bounds = element.getBoundingClientRect()
      setSize(previous => previous.width === bounds.width && previous.height === bounds.height ? previous : { width: bounds.width, height: bounds.height })
    }
    measure()
    const observer = new ResizeObserver(measure); observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const guide = faceGuide(size.width, size.height), flashing = ['red', 'blue'].includes(color)
  return <svg ref={svg} className={'face-guide liveness-contour' + (valid ? ' detected' : '') + (failed ? ' failed' : '')}
    viewBox={`0 0 ${size.width || 1} ${size.height || 1}`} aria-hidden="true"
    data-flash-phase={flashing ? color : undefined}>
    {guide && <>
      <path data-flash-surface="true" className="liveness-contour-mask" fill={color === 'red' ? '#ff0000' : color === 'blue' ? '#0000ff' : '#000000b3'} fillRule="evenodd"
        d={`M0 0 H${size.width} V${size.height} H0 Z ${guide.path}`} />
      <path className="liveness-contour-border" d={guide.path} fill="none" vectorEffect="non-scaling-stroke" />
    </>}
  </svg>
}
