import * as React from 'react'
import type { ActionBatchDetail } from '../../lib/api'
import {
  A4_HEIGHT_MM,
  A4_MARGIN_MM,
  mmToPx,
  paginateByHeights,
  PRINT_CARD_GAP_PX,
} from '../../lib/historyPrintLayout'
import { HistoryPrintActionCard } from './HistoryPrintActionCard'

export function HistoryPrintPages(props: {
  details: ActionBatchDetail[]
  trackPrice: boolean
  header: React.ReactNode
  layoutKey?: string
}) {
  const { details, trackPrice, header, layoutKey = '' } = props
  const headerRef = React.useRef<HTMLDivElement>(null)
  const cardRefs = React.useRef(new Map<string, HTMLDivElement>())
  const [pageIndices, setPageIndices] = React.useState<number[][] | null>(null)

  const measureLayout = React.useCallback(() => {
    const contentHeightPx = mmToPx(A4_HEIGHT_MM - A4_MARGIN_MM * 2)
    const headerHeight = headerRef.current?.offsetHeight ?? 0
    const heights = details.map((detail) => cardRefs.current.get(detail.id)?.offsetHeight ?? 0)

    if (heights.some((height) => height === 0)) return

    const firstPageCapacity = Math.max(contentHeightPx - headerHeight, 120)
    const pages = paginateByHeights(
      heights,
      firstPageCapacity,
      contentHeightPx,
      PRINT_CARD_GAP_PX,
    )
    setPageIndices(pages)
  }, [details])

  React.useLayoutEffect(() => {
    setPageIndices(null)
    cardRefs.current = new Map()
    const frame = window.requestAnimationFrame(() => {
      measureLayout()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [details, trackPrice, layoutKey, measureLayout])

  React.useEffect(() => {
    const onResize = () => {
      setPageIndices(null)
      window.requestAnimationFrame(() => measureLayout())
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [measureLayout])

  return (
    <>
      <div className="history-print-measure" aria-hidden="true">
        <div className="history-print-sheet">
          <div className="history-print-document">
            <div ref={headerRef}>{header}</div>
            <section className="history-print-actions">
              {details.map((detail) => (
                <div
                  key={detail.id}
                  ref={(element) => {
                    if (element) cardRefs.current.set(detail.id, element)
                  }}
                >
                  <HistoryPrintActionCard detail={detail} trackPrice={trackPrice} />
                </div>
              ))}
            </section>
          </div>
        </div>
      </div>

      {pageIndices ? (
        <div className="history-print-pages">
          {pageIndices.map((indices, pageNumber) => (
            <div key={pageNumber} className="history-print-sheet">
              <div className="history-print-document">
                {pageNumber === 0 ? header : null}
                <section className="history-print-actions">
                  {indices.map((index) => {
                    const detail = details[index]
                    return (
                      <HistoryPrintActionCard
                        key={detail.id}
                        detail={detail}
                        trackPrice={trackPrice}
                      />
                    )
                  })}
                </section>
              </div>
              <div className="history-print-page-number" aria-hidden="true">
                {pageNumber + 1} / {pageIndices.length}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="history-print-layout-loading">Duke përgatitur faqet…</div>
      )}
    </>
  )
}
