import { stockRecord, type DynamicProdukti } from '../../../../lib/api'
import type { Lokacioni } from '../../../../lib/lokacioni/types'
import { DynamicMobileStockLevels } from './DynamicMobileStockLevels'

export function DynamicProductCard(props: {
  product: DynamicProdukti
  locations: Lokacioni[]
  onTap: () => void
}) {
  const { product, locations } = props
  return (
    <button type="button" className="dynamic-product-card" onClick={props.onTap}>
      <div className="dynamic-product-card-heading">
        <span className="dynamic-product-card-name">{product.emri}</span>
        <span className="dynamic-product-card-code">({product.kodi})</span>
      </div>
      <DynamicMobileStockLevels locations={locations} stock={stockRecord(product)} />
    </button>
  )
}
