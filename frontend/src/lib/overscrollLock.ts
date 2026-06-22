type OverscrollAxis = 'y' | 'x' | 'both'

/** Stops touch scroll from chaining to a parent when this element is at its scroll edge. */
export function attachOverscrollLock(
  el: HTMLElement,
  axis: OverscrollAxis = 'y',
): () => void {
  let startX = 0
  let startY = 0

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return
    startX = e.touches[0].clientX
    startY = e.touches[0].clientY
  }

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return

    const touch = e.touches[0]
    const dx = touch.clientX - startX
    const dy = touch.clientY - startY
    let block = false

    if (axis === 'y' || axis === 'both') {
      const scrollableY = el.scrollHeight > el.clientHeight + 1
      if (scrollableY) {
        const maxScrollY = el.scrollHeight - el.clientHeight
        const atTop = el.scrollTop <= 0
        const atBottom = el.scrollTop >= maxScrollY - 1
        if ((atTop && dy > 0) || (atBottom && dy < 0)) block = true
      }
    }

    if (axis === 'x' || axis === 'both') {
      const scrollableX = el.scrollWidth > el.clientWidth + 1
      if (scrollableX) {
        const maxScrollX = el.scrollWidth - el.clientWidth
        const atLeft = el.scrollLeft <= 0
        const atRight = el.scrollLeft >= maxScrollX - 1
        if ((atLeft && dx > 0) || (atRight && dx < 0)) block = true
      }
    }

    if (block) e.preventDefault()
  }

  el.addEventListener('touchstart', onTouchStart, { passive: true })
  el.addEventListener('touchmove', onTouchMove, { passive: false })

  return () => {
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
  }
}
