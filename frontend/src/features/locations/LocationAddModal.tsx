import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { useMobileClient } from '../../hooks/useMobileClient'
import { createLokacioni } from '../../lib/api/lokacionet'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { useAuth } from '../../lib/auth/AuthProvider'
import { useLokacioni } from '../../lib/lokacioni/LokacioniProvider'
import { queryKeys } from '../../lib/queryKeys'
import { BottomSheet } from '../../mobile/components/BottomSheet'
import { SheetActionFooter } from '../../mobile/components/SheetActions'
import { DEFAULT_LOCATION_EMOJI, LocationEmojiPicker } from './LocationEmojiPicker'

const LOCATION_ADD_FORM_ID = 'location-add-form'

export function LocationAddModal(props: {
  open: boolean
  onClose: () => void
  onCreated: (loc: Lokacioni) => void
}) {
  const isMobile = useMobileClient()
  const { lokacionet, refresh } = useLokacioni()
  const queryClient = useQueryClient()
  const { user } = useAuth()
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
      queryClient.setQueryData<Lokacioni[]>(queryKeys.lokacionet(user?.id), (prev) => {
        const list = prev ?? lokacionet
        if (list.some((l) => l.id === loc.id)) return list
        return [...list, loc]
      })
      await refresh()
      props.onCreated(loc)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim')
      setSaving(false)
    }
  }

  const formRef = React.useRef<HTMLFormElement>(null)
  const emriInputId = isMobile ? 'location-add-emri-mobile' : 'location-add-emri'

  const emojiField = (
    <div className={isMobile ? undefined : 'form-group'} style={isMobile ? undefined : { marginBottom: 14 }}>
      <span className={isMobile ? 'mobile-label' : 'label'}>Ikona</span>
      <LocationEmojiPicker
        value={flagEmoji}
        onChange={setFlagEmoji}
        disabled={saving}
        className="location-emoji-picker-wide"
      />
    </div>
  )

  const nameField = (
    <div className={isMobile ? undefined : 'form-group'}>
      <label className={isMobile ? 'mobile-label' : 'label'} htmlFor={emriInputId}>
        Emri
      </label>
      <input
        id={emriInputId}
        className={isMobile ? 'mobile-input' : 'input'}
        value={emri}
        maxLength={40}
        placeholder="Emri i lokacionit"
        disabled={saving}
        onChange={(e) => setEmri(e.target.value)}
      />
    </div>
  )

  const errorBlock = error ? (
    isMobile ? (
      <div className="mobile-inline-error">{error}</div>
    ) : (
      <p className="error-text" style={{ marginTop: 10 }}>
        {error}
      </p>
    )
  ) : null

  if (isMobile) {
    return (
      <BottomSheet
        open={props.open}
        title="Shto lokacion"
        onClose={props.onClose}
        footer={
          <SheetActionFooter
            onCancel={props.onClose}
            confirmLabel={saving ? 'Duke shtuar…' : 'Shto'}
            confirmLoading={saving}
            confirmDisabled={!emri.trim()}
            confirmType="submit"
            confirmIcon="plus"
            form={LOCATION_ADD_FORM_ID}
          />
        }
      >
        <form
          id={LOCATION_ADD_FORM_ID}
          ref={formRef}
          className="mobile-list-stack"
          onSubmit={submit}
        >
          {emojiField}
          {nameField}
          {errorBlock}
        </form>
      </BottomSheet>
    )
  }

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
        {emojiField}
        {nameField}
        {errorBlock}
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
