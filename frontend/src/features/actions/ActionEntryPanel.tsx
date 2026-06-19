import * as React from 'react'
import { DateInput } from '../../components/DateInput'
import { CountrySelector } from '../../lib/country'
import type { Produkti } from '../../lib/api'
import { fmt } from '../../lib/format'
import type { ActionItemDraft } from '../../types/actionItem'
import { ActionItemsTable } from './ActionItemsTable'
import { ActionMetaFields } from './ActionMetaFields'

export function ActionEntryPanel(props: {
  lloji: 'Hyrje' | 'Dalje'
  onLlojiChange: (lloji: 'Hyrje' | 'Dalje') => void
  actionDate: string
  onActionDateChange: (date: string) => void
  actionOra: string
  onActionOraChange: (value: string) => void
  actionPershkrimi: string
  onActionPershkrimiChange: (value: string) => void
  items: ActionItemDraft[]
  products: Produkti[]
  onUpdateItem: (key: string, field: keyof ActionItemDraft, value: string | number) => void
  onRemoveItem: (key: string) => void
  onAddItem: () => void
  total: number
  saving: boolean
  onSubmit: (e: React.FormEvent) => void
  onOpenTransfer: () => void
  onOpenHistory: () => void
}) {
  return (
    <div className="card action-card">
      <div className="action-header">
        <div className="action-header-top">
          <h2 className="action-header-title">Regjistro Veprim</h2>
          <div className="action-controls">
            <div className="action-header-control action-header-control-country">
              <span className="muted action-header-control-label">Shteti</span>
              <CountrySelector />
            </div>
            <div className="action-header-control action-header-control-date">
              <span className="muted action-header-control-label">Data e Veprimit</span>
              <DateInput
                value={props.actionDate}
                onChange={props.onActionDateChange}
                className="action-header-date-input"
              />
            </div>
            <ActionMetaFields
              layout="inline"
              ora={props.actionOra}
              pershkrimi={props.actionPershkrimi}
              onOraChange={props.onActionOraChange}
              onPershkrimiChange={props.onActionPershkrimiChange}
              disabled={props.saving}
            />
          </div>
        </div>
      </div>

      <form onSubmit={props.onSubmit}>
        <div className="row action-type-row">
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${props.lloji === 'Hyrje' ? 'active success' : ''}`}
              onClick={() => props.onLlojiChange('Hyrje')}
            >
              Hyrje (IN)
            </button>
            <button
              type="button"
              className={`toggle-btn ${props.lloji === 'Dalje' ? 'active danger' : ''}`}
              onClick={() => props.onLlojiChange('Dalje')}
            >
              Dalje (OUT)
            </button>
          </div>
          <div className="spacer" />
          <button
            type="button"
            className="btn sm transfer-mode-btn"
            onClick={props.onOpenTransfer}
          >
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 7h11l-3-3" />
              <path d="M18 7l-3 3" />
              <path d="M17 17H6l3 3" />
              <path d="M6 17l3-3" />
            </svg>
            Transfero
          </button>
          <button
            type="button"
            className="btn ghost sm history-btn"
            onClick={props.onOpenHistory}
          >
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            Historiku
          </button>
        </div>

        <ActionItemsTable
          items={props.items}
          products={props.products}
          onUpdate={props.onUpdateItem}
          onRemove={props.onRemoveItem}
        />

        <div className="row action-footer">
          <button type="button" className="btn" onClick={props.onAddItem}>
            + Shto produkt
          </button>
          <div className="spacer" />
          <div className="row action-total" style={{ gap: 8 }}>
            <span className="muted">Total:</span>
            <span className="num-lg">{fmt(props.total)}</span>
          </div>
          <button
            type="submit"
            className="btn primary action-submit"
            disabled={props.saving}
            style={{ marginLeft: 16 }}
          >
            {props.saving ? 'Duke finalizuar…' : 'Finalizo Veprimin'}
          </button>
        </div>
      </form>
    </div>
  )
}
