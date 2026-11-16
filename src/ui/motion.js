// Motion only follows explicit user actions. Camera frames never use these helpers.
const overlays = new WeakMap()
const disclosures = new WeakMap()
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function cancelOverlayMotion(element) {
  if (!element) return
  overlays.get(element)?.cancel()
  overlays.delete(element)
  delete element.dataset.motionPhase
  element.style.removeProperty('--overlay-motion-duration')
}

export function animateOverlay(element, { closing = false } = {}) {
  if (!element) return null
  cancelOverlayMotion(element)
  if (reduceMotion() || !element.animate) return null
  const drawer = element.classList.contains('portal-drawer')
  const duration = drawer ? closing ? 160 : 220 : 140
  const frames = drawer
    ? [{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }]
    : [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }]
  element.dataset.motionPhase = closing ? 'closing' : 'opening'
  element.style.setProperty('--overlay-motion-duration', `${duration}ms`)
  const animation = element.animate(closing ? [...frames].reverse() : frames, {
    duration, easing: closing ? 'cubic-bezier(.4,0,1,1)' : 'cubic-bezier(.22,1,.36,1)',
    fill: closing ? 'forwards' : 'none',
  })
  animation.id = drawer ? `drawer-${closing ? 'close' : 'open'}` : 'dialog-open'
  overlays.set(element, animation)
  animation.finished.then(() => {
    if (!closing && overlays.get(element) === animation) cancelOverlayMotion(element)
  }, () => { /* Expected when closing during entry or unmounting. */ })
  return animation
}

export function toggleDisclosure(details) {
  const content = details.querySelector(':scope > div')
  const previous = disclosures.get(details)
  const opening = !(previous?.opening ?? details.open)
  const start = details.open ? content.getBoundingClientRect().height : 0
  previous?.animation.cancel()
  disclosures.delete(details)
  if (reduceMotion() || !content.animate) { details.open = opening; return }
  details.open = true
  const animation = content.animate([{ height: `${start}px` }, { height: `${opening ? content.scrollHeight : 0}px` }], {
    duration: 180, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards',
  })
  animation.id = 'menu-disclosure'
  disclosures.set(details, { animation, opening })
  animation.finished.then(() => {
    if (disclosures.get(details)?.animation !== animation) return
    details.open = opening
    disclosures.delete(details)
    animation.cancel()
  }, () => { /* A second click reverses from the current height. */ })
}
