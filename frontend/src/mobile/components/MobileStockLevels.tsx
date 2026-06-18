import { COUNTRY_META } from '../../lib/country'
import { fmtInt } from '../../lib/format'

export function MobileStockLevels(props: {
  gjendjeKosove: number
  gjendjeShqiperi: number
}) {
  return (
    <div className="mobile-stock-levels">
      <span className="mobile-stock-level">
        <img className="flagIcon" src={COUNTRY_META.XK.flagSrc} alt="" width={16} height={11} />
        <span className="mobile-stock-country">Kosove</span>
        <span
          className={`mobile-stock-num mobile-num${props.gjendjeKosove === 0 ? ' mobile-stock-low' : ''}`}
        >
          {fmtInt(props.gjendjeKosove)}
        </span>
      </span>
      <span className="mobile-stock-level">
        <img className="flagIcon" src={COUNTRY_META.AL.flagSrc} alt="" width={16} height={11} />
        <span className="mobile-stock-country">Shqiperi</span>
        <span
          className={`mobile-stock-num mobile-num${props.gjendjeShqiperi === 0 ? ' mobile-stock-low' : ''}`}
        >
          {fmtInt(props.gjendjeShqiperi)}
        </span>
      </span>
    </div>
  )
}
