import { DeleteIcon } from '../../components/icons'
import { fmtEuro, productLabel } from '../../lib/format'
import type { ActionItemDraft } from '../../types/actionItem'
import type { Produkti } from '../../lib/api'

export function ProductRowCard(props: {
  item: ActionItemDraft
  products: Produkti[]
  onTap: () => void
  onRemove: () => void
}) {
  const product = props.products.find((p) => p.kodi === props.item.kodi_produktit)
  const price = Number(props.item.cmimi_njesi) || 0
  const qty = Number(props.item.sasia) || 0
  const total = price * qty

  return (
    <div className="mobile-row-card" role="button" tabIndex={0} onClick={props.onTap} onKeyDown={(e) => e.key === 'Enter' && props.onTap()}>
      <div className="mobile-row-card-body">
        <div className="mobile-row-card-title">
          {product ? productLabel(product.emri, product.kodi) : props.item.kodi_produktit || '—'}
        </div>
        <div className="mobile-row-card-sub">
          {fmtEuro(price)} × {qty} cop
        </div>
        <div className="mobile-row-card-total">Total: {fmtEuro(total)}</div>
      </div>
      <button
        type="button"
        className="mobile-icon-btn"
        aria-label="Fshi produktin"
        onClick={(e) => {
          e.stopPropagation()
          props.onRemove()
        }}
      >
        <DeleteIcon />
      </button>
    </div>
  )
}
