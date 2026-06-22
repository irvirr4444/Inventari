import * as React from 'react'
import { Modal } from '../../components/Modal'
import { createLokacioni } from '../../lib/api/lokacionet'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { useLokacioni } from '../../lib/lokacioni/LokacioniProvider'
import { DEFAULT_LOCATION_EMOJI, LocationEmojiPicker } from './LocationEmojiPicker'

export function LocationAddModal(props: {
  open: boolean
  onClose: () => void
  onCreated: (loc: Lokacioni) => void
}) {
  const { lokacionet } = useLokacioni()
  const [emri, setEmri] = React.useState('')
  const [flagEmoji, setFlagEmoji] = React.useState(DEFAULT_LOCATION_EMOJI)
  const [error, setError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!props.open) return
    setEmri('')
    setFlagEmoji(DEFAULT_LOCATION_EMOJI)
    setError(null)
    setSaving(false)
  }, [props.open])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = emri.trim()
    if (!name) {
      setError('Emri i lokacionit eshte i detyrueshem.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const loc = await createLokacioni({
        emri: name,
        flag_emoji: flagEmoji,
        rradhitja: lokacionet.length,
      })
      props.onCreated(loc)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim')
      setSaving(false)
    }
  }

  const formRef = React.useRef<HTMLFormElement>(null)

  return (
    <Modal
      open={props.open}
      title="Shto lokacion"
      onClose={props.onClose}
      stacked
      onEnterConfirm={() => formRef.current?.requestSubmit()}
      enterConfirmDisabled={saving || !emri.trim()}
    >
      <form ref={formRef} onSubmit={submit}>
        <div className="form-group" style={{ marginBottom: 14 }}>
          <span className="label">Ikona</span>
          <LocationEmojiPicker
            value={flagEmoji}
            onChange={setFlagEmoji}
            disabled={saving}
            className="location-emoji-picker-wide"
          />
        </div>
        <div className="form-group">
          <label className="label" htmlFor="location-add-emri">Emri</label>
          <input
            id="location-add-emri"
            className="input"
            value={emri}
            maxLength={40}
            placeholder="Emri i lokacionit"
            disabled={saving}
            onChange={(e) => setEmri(e.target.value)}
          />
        </div>
        {error ? <p className="error-text" style={{ marginTop: 10 }}>{error}</p> : null}
        <div className="confirm-modal-actions">
          <button type="button" className="btn" disabled={saving} onClick={props.onClose}>
            Anulo
          </button>
          <button type="submit" className="btn primary" disabled={saving || !emri.trim()}>
            {saving ? 'Duke shtuar…' : 'Shto'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
