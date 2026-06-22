import * as React from 'react'
import { useLocation } from 'react-router-dom'
import { useEscapeToClose } from '../../hooks/useEscapeToClose'
import type { TabId } from '../../mobile/types'
import { markTutorialSeen } from '../../lib/api/tenantConfig'
import { useAuth } from '../../lib/auth/AuthProvider'

const DESKTOP_STEPS: Array<{ target: string; text: string }> = [
  {
    target: 'products-table',
    text: 'Këtu shihni të gjitha produktet tuaja dhe gjendjen e tyre për çdo vendodhje.',
  },
  {
    target: 'add-product-btn',
    text: 'Shtoni produktin e parë. Kodi dhe emri janë të mjaftueshëm për të filluar.',
  },
  {
    target: 'action-card',
    text: 'Regjistroni çdo lëvizje stoku — Hyrje kur diçka vjen, Dalje kur diçka shkon.',
  },
  {
    target: 'location-picker',
    text: 'Zgjidhni vendodhjen për secilën lëvizje. Mund të ndryshoni në çdo kohë.',
  },
  {
    target: 'transfer-btn',
    text: 'Transferoni stok nga një vendodhje në tjetrën pa i humbur gjurmët.',
  },
  {
    target: 'history-btn',
    text: 'Çdo veprim ruhet këtu. Filtroni, ndryshoni, ose fshini sipas nevojës.',
  },
  {
    target: 'summary-panel',
    text: 'Totalet automatike për periudhën tuaj. Shkarkoni Excel kur keni nevojë.',
  },
]

const MOBILE_STEPS: Array<{ target: string; mobileTab: TabId; label: string; text: string }> = [
  { target: 'tab-produkte', mobileTab: 'produkte', label: 'Produkte', text: 'Shihni dhe menaxhoni të gjitha produktet.' },
  { target: 'tab-veprime', mobileTab: 'veprime', label: 'Veprime', text: 'Regjistroni hyrjet dhe daljet këtu.' },
  { target: 'tab-transfer', mobileTab: 'transfer', label: 'Transfer', text: 'Transferoni stok midis vendodhjeve.' },
  { target: 'tab-histori', mobileTab: 'histori', label: 'Histori', text: 'Çdo veprim ruhet dhe mund të ndryshohet.' },
  {
    target: 'tab-permbledhje',
    mobileTab: 'permblehdje',
    label: 'Përmbledhje',
    text: 'Totalet dhe shkarkimi i raporteve Excel.',
  },
]

const VIEWPORT_PAD = 16
const TOOLTIP_GAP = 12
const TOOLTIP_MAX_W = 280

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

type ArrowDir = 'top' | 'bottom' | 'left' | 'right'

function computeTooltipPlacement(
  rect: DOMRect,
  size: { width: number; height: number },
): { style: React.CSSProperties; arrow: ArrowDir } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const tw = size.width || TOOLTIP_MAX_W
  const th = size.height || 140

  const fitsBelow = rect.bottom + TOOLTIP_GAP + th <= vh - VIEWPORT_PAD
  const fitsAbove = rect.top - TOOLTIP_GAP - th >= VIEWPORT_PAD
  const fitsRight = rect.right + TOOLTIP_GAP + tw <= vw - VIEWPORT_PAD
  const fitsLeft = rect.left - TOOLTIP_GAP - tw >= VIEWPORT_PAD

  let top = rect.bottom + TOOLTIP_GAP
  let left = rect.left
  let arrow: ArrowDir = 'top'

  if (!fitsBelow && fitsAbove) {
    top = rect.top - TOOLTIP_GAP - th
    arrow = 'bottom'
  } else if (!fitsBelow && !fitsAbove && fitsRight) {
    left = rect.right + TOOLTIP_GAP
    top = clamp(rect.top + rect.height / 2 - th / 2, VIEWPORT_PAD, vh - th - VIEWPORT_PAD)
    arrow = 'left'
  } else if (!fitsBelow && !fitsAbove && fitsLeft) {
    left = rect.left - TOOLTIP_GAP - tw
    top = clamp(rect.top + rect.height / 2 - th / 2, VIEWPORT_PAD, vh - th - VIEWPORT_PAD)
    arrow = 'right'
  } else if (!fitsBelow) {
    top = clamp(vh - th - VIEWPORT_PAD, VIEWPORT_PAD, vh - th - VIEWPORT_PAD)
    arrow = 'bottom'
  }

  left = clamp(left, VIEWPORT_PAD, vw - tw - VIEWPORT_PAD)
  top = clamp(top, VIEWPORT_PAD, vh - th - VIEWPORT_PAD)

  return { style: { top, left }, arrow }
}

export function TutorialOverlay(props: {
  isMobile?: boolean
  onMobileTabChange?: (tab: TabId) => void
  onTutorialTargetChange?: (target: string | null) => void
  onDismiss: () => void
}) {
  const { refreshSession } = useAuth()
  const location = useLocation()
  const steps = props.isMobile ? MOBILE_STEPS : DESKTOP_STEPS

  const [stepIndex, setStepIndex] = React.useState(0)
  const [rect, setRect] = React.useState<DOMRect | null>(null)
  const [tooltipSize, setTooltipSize] = React.useState({ width: TOOLTIP_MAX_W, height: 140 })
  const [arrow, setArrow] = React.useState<ArrowDir>('top')
  const tooltipRef = React.useRef<HTMLDivElement>(null)
  const dismissedRef = React.useRef(false)
  const initialPathRef = React.useRef(location.pathname)

  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1

  const finish = React.useCallback(async () => {
    if (dismissedRef.current) return
    dismissedRef.current = true
    props.onTutorialTargetChange?.(null)
    try {
      await markTutorialSeen()
      await refreshSession()
    } catch {
      /* still dismiss locally */
    }
    props.onDismiss()
  }, [props, refreshSession])

  useEscapeToClose(() => {
    void finish()
  })

  React.useEffect(() => {
    if (!props.isMobile) {
      props.onTutorialTargetChange?.(null)
      return
    }
    props.onTutorialTargetChange?.(step.target)
    return () => props.onTutorialTargetChange?.(null)
  }, [props.isMobile, props.onTutorialTargetChange, step.target])

  React.useEffect(() => {
    if (location.pathname !== initialPathRef.current) {
      void finish()
    }
  }, [location.pathname, finish])

  const updateRect = React.useCallback(() => {
    const el = document.querySelector(`[data-tutorial="${step.target}"]`)
    if (!el) {
      setRect(null)
      return
    }
    setRect(el.getBoundingClientRect())
  }, [step.target])

  React.useEffect(() => {
    if (props.isMobile && props.onMobileTabChange) {
      const mobileStep = MOBILE_STEPS[stepIndex]
      if (mobileStep) props.onMobileTabChange(mobileStep.mobileTab)
    }
    const timer = window.setTimeout(updateRect, props.isMobile ? 150 : 80)
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [step, props.isMobile, props.onMobileTabChange, updateRect])

  React.useLayoutEffect(() => {
    const node = tooltipRef.current
    if (!node || props.isMobile) return
    const { width, height } = node.getBoundingClientRect()
    setTooltipSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    )
  }, [stepIndex, step.text, rect, props.isMobile])

  const tooltipStyle = React.useMemo((): React.CSSProperties => {
    if (props.isMobile || !rect) return {}
    const { style } = computeTooltipPlacement(rect, tooltipSize)
    return style
  }, [props.isMobile, rect, tooltipSize])

  React.useLayoutEffect(() => {
    if (props.isMobile || !rect) return
    const { arrow: dir } = computeTooltipPlacement(rect, tooltipSize)
    setArrow(dir)
  }, [props.isMobile, rect, tooltipSize])

  const next = () => {
    if (isLast) {
      void finish()
      return
    }
    setStepIndex((i) => i + 1)
  }

  return (
    <div
      className="tutorial-overlay"
      role="dialog"
      aria-modal="false"
      aria-label="Tutorial"
      onClick={(e) => {
        if (e.target === e.currentTarget) void finish()
      }}
    >
      {rect ? (
        <div
          className="tutorial-overlay__spotlight-wrap"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      ) : null}

      <div
        ref={tooltipRef}
        className={`tutorial-tooltip arrow-${arrow}${props.isMobile ? ' tutorial-tooltip--mobile' : ''}`}
        style={tooltipStyle}
      >
        {props.isMobile ? (
          <>
            <div className="tutorial-tooltip__header">
              <div className="tutorial-tooltip__header-main">
                <span className="tutorial-tooltip__eyebrow">Udhëzues</span>
                <span className="tutorial-tooltip__label">
                  {(step as (typeof MOBILE_STEPS)[number]).label}
                </span>
              </div>
              <span className="tutorial-tooltip__step-count">
                {stepIndex + 1} / {steps.length}
              </span>
            </div>
            <div className="tutorial-tooltip__progress-track" aria-hidden="true">
              <div
                className="tutorial-tooltip__progress-fill"
                style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
            <div className="tutorial-tooltip__dots" aria-hidden="true">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`tutorial-tooltip__dot${i === stepIndex ? ' tutorial-tooltip__dot--active' : i < stepIndex ? ' tutorial-tooltip__dot--done' : ''}`}
                />
              ))}
            </div>
            <p className="tutorial-tooltip__text">{step.text}</p>
            <div className="tutorial-tooltip__actions tutorial-tooltip__actions--mobile">
              <button
                type="button"
                className="tutorial-tooltip__btn tutorial-tooltip__btn--ghost"
                onClick={() => void finish()}
              >
                × Kalo
              </button>
              <button
                type="button"
                className="tutorial-tooltip__btn tutorial-tooltip__btn--primary"
                onClick={next}
              >
                {isLast ? 'Gati! →' : 'Vazhdo →'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="tutorial-tooltip__text">{step.text}</p>
            <div className="tutorial-tooltip__actions">
              <button
                type="button"
                className="tutorial-tooltip__btn tutorial-tooltip__btn--ghost"
                onClick={() => void finish()}
              >
                × Kalo
              </button>
              <button
                type="button"
                className="tutorial-tooltip__btn tutorial-tooltip__btn--primary"
                onClick={next}
              >
                {isLast ? 'Gati! →' : 'Vazhdo →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
