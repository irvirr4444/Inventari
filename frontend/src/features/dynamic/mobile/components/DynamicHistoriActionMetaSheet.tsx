import * as React from 'react'
import { OraInput } from '../../../../components/OraInput'
import type { ActionBatchDetail } from '../../../../lib/api'
import {
  dynamicMetaFromDetail,
  type DynamicHistoryBatchMetaDraft,
} from '../../../../lib/dynamicHistoryBatchEdit'
import { BottomSheet } from '../../../../mobile/components/BottomSheet'
import { SheetActionFooter } from '../../../../mobile/components/SheetActions'
import { MobileDateInput } from '../../../../mobile/components/MobileDateInput'
import { DynamicLocationField, DynamicLocationPickerSheet } from './DynamicLocationPickerSheet'

const FORM_ID = 'dynamic-histori-action-meta-form'

export function DynamicHistoriActionMetaSheet(props: {
  open: boolean
  detail: ActionBatchDetail
  locations: Array<{ id: string; emri: string; flag_emoji?: string | null }>
  busy?: boolean
  onClose: () => void
  onSave: (meta: DynamicHistoryBatchMetaDraft) => void
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const [meta, setMeta] = React.useState<DynamicHistoryBatchMetaDraft>(() =>
    dynamicMetaFromDetail(props.detail),
  )
  const [fromOpen, setFromOpen] = React.useState(false)
  const [toOpen, setToOpen] = React.useState(false)
  const [locOpen, setLocOpen] = React.useState(false)

  React.useEffect(() => {
    if (props.open) setMeta(dynamicMetaFromDetail(props.detail))
  }, [props.open, props.detail])

  const setFrom = (id: string) => {
    const next = { ...meta, lokacioni_id: id }
    if (id === meta.destination_lokacioni_id) {
      const alt = props.locations.find((l) => l.id !== id)
      if (alt) next.destination_lokacioni_id = alt.id
    }
    setMeta(next)
  }

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    props.onSave(meta)
  }

  const busy = props.busy ?? false
  const formKey = `${props.detail.id}-${props.open}`

  return (
    <>
      <BottomSheet
        open={props.open}
        title="Ndrysho veprimin"
        onClose={props.onClose}
        footer={
          <SheetActionFooter
            onCancel={props.onClose}
            confirmLabel={busy ? 'Duke ruajtur…' : 'Ruaj'}
            confirmIcon="check"
            confirmType="submit"
            form={FORM_ID}
            confirmDisabled={busy}
            confirmLoading={busy}
          />
        }
      >
        {props.open ? (
          <form key={formKey} id={FORM_ID} className="mobile-picker-form" onSubmit={submit}>
            <div className="mobile-list-stack">
              <div>
                <label className="mobile-label">Data</label>
                <MobileDateInput
                  value={meta.data}
                  onChange={(data) => setMeta({ ...meta, data })}
                  disabled={busy}
                  aria-label="Data"
                  placeholder="Data"
                />
              </div>

              {props.detail.lloji === 'Transfer' ? (
                <div className="mobile-field-row mobile-history-route-row">
                  <DynamicLocationField
                    label="Nga"
                    value={meta.lokacioni_id}
                    locations={props.locations}
                    onOpen={() => setFromOpen(true)}
                  />
                  <DynamicLocationField
                    label="Te"
                    value={meta.destination_lokacioni_id}
                    locations={props.locations}
                    onOpen={() => setToOpen(true)}
                  />
                </div>
              ) : (
                <DynamicLocationField
                  label="Lokacioni"
                  value={meta.lokacioni_id}
                  locations={props.locations}
                  onOpen={() => setLocOpen(true)}
                />
              )}

              <div>
                <label className="mobile-label" htmlFor="dynamic-action-meta-ora">Ora</label>
                <OraInput
                  id="dynamic-action-meta-ora"
                  className="mobile-input"
                  value={meta.ora}
                  onChange={(ora) => setMeta({ ...meta, ora })}
                  disabled={busy}
                />
              </div>
              <div>
                <label className="mobile-label" htmlFor="dynamic-action-meta-pershkrimi">
                  Përshkrimi
                </label>
                <input
                  id="dynamic-action-meta-pershkrimi"
                  type="text"
                  className="mobile-input"
                  value={meta.pershkrimi}
                  onChange={(e) => setMeta({ ...meta, pershkrimi: e.target.value })}
                  disabled={busy}
                  maxLength={500}
                  placeholder="Opsionale"
                />
              </div>
            </div>
          </form>
        ) : null}
      </BottomSheet>

      <DynamicLocationPickerSheet
        open={fromOpen}
        title="Nga"
        value={meta.lokacioni_id}
        excludeIds={[meta.destination_lokacioni_id]}
        allowAdd
        onNotify={props.onNotify}
        onClose={() => setFromOpen(false)}
        onSelect={setFrom}
      />
      <DynamicLocationPickerSheet
        open={toOpen}
        title="Te"
        value={meta.destination_lokacioni_id}
        excludeIds={[meta.lokacioni_id]}
        allowAdd
        onNotify={props.onNotify}
        onClose={() => setToOpen(false)}
        onSelect={(id) => setMeta({ ...meta, destination_lokacioni_id: id })}
      />
      <DynamicLocationPickerSheet
        open={locOpen}
        title="Lokacioni"
        value={meta.lokacioni_id}
        allowAdd
        onNotify={props.onNotify}
        onClose={() => setLocOpen(false)}
        onSelect={(id) => setMeta({ ...meta, lokacioni_id: id })}
      />
    </>
  )
}
