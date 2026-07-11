import * as React from 'react'
import { createPortal } from 'react-dom'
import type { HistoryClientFilters, HistoryServerFilters } from '../../lib/historyClientFilters'
import { DebouncedSearchInput } from '../../components/DebouncedSearchInput'
import { DateRangeInput } from '../../components/DateRangeInput'
import { NumericInput } from '../../components/NumericInput'
import { OraRangeInput } from '../../components/OraRangeInput'
import { ProductSearchSelect } from '../../components/ProductSearchSelect'
import type { ProductListItem } from '../../lib/api'
import { parseNumericFilterValue } from '../../lib/numericInput'
import type { Lokacioni } from '../../lib/lokacioni/types'
import { useEscapeToClose } from '../../hooks/useEscapeToClose'
import { HistoryFilterClearButton } from '../history/HistoryFilterClearButton'
import { HistoryExportActions } from '../history/HistoryExportActions'

const NUMERIC_FILTER_DEBOUNCE_MS = 1_000

type NumericFilterDraftValue = number | string

type NumericFilterDrafts = {
  totaliMin: NumericFilterDraftValue
  totaliMax: NumericFilterDraftValue
  produkteMin: NumericFilterDraftValue
  produkteMax: NumericFilterDraftValue
}

type NumericFilterDraftKey = keyof NumericFilterDrafts

type SearchListPosition = {
  top: number
  left: number
  width: number
}

const SEARCH_LIST_MAX_HEIGHT = 280

function computeSearchListPosition(trigger: HTMLElement): SearchListPosition {
  const rect = trigger.getBoundingClientRect()
  const width = rect.width
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
  const gap = 4
  const spaceBelow = window.innerHeight - rect.bottom - gap
  const spaceAbove = rect.top - gap
  const top =
    spaceBelow < SEARCH_LIST_MAX_HEIGHT && spaceAbove > spaceBelow
      ? Math.max(8, rect.top - gap - SEARCH_LIST_MAX_HEIGHT)
      : rect.bottom + gap

  return { top, left, width }
}

export type HistoryUserFilterOption = {
  id: string
  label: string
}

function HistoryUserFilterDropdown(props: {
  users: HistoryUserFilterOption[]
  value: string
  onChange: (id: string) => void
}) {
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const selectedOptionRef = React.useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [listPos, setListPos] = React.useState<SearchListPosition | null>(null)
  const [activeIndex, setActiveIndex] = React.useState(0)
  const selected = props.users.find((u) => u.id === props.value) ?? null
  const normalizedQuery = query.trim().toLowerCase()
  const filteredUsers = normalizedQuery
    ? props.users.filter((u) => u.label.toLowerCase().includes(normalizedQuery))
    : props.users

  const repositionList = React.useCallback(() => {
    const trigger = inputRef.current
    if (!trigger) return
    setListPos(computeSearchListPosition(trigger))
  }, [])

  const closeMenu = React.useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }, [])

  useEscapeToClose(closeMenu, { enabled: open })

  const openMenu = React.useCallback(() => {
    const trigger = inputRef.current
    if (trigger) setListPos(computeSearchListPosition(trigger))
    setOpen(true)
    setQuery('')
    setActiveIndex(0)
  }, [])

  const toggleMenu = React.useCallback(() => {
    if (open) {
      closeMenu()
      return
    }
    openMenu()
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [closeMenu, open, openMenu])

  const selectUser = React.useCallback(
    (id: string) => {
      props.onChange(id)
      closeMenu()
    },
    [closeMenu, props],
  )

  const clearUser = React.useCallback(() => {
    props.onChange('')
    closeMenu()
  }, [closeMenu, props])

  React.useLayoutEffect(() => {
    if (!open) return
    repositionList()
    const raf = requestAnimationFrame(repositionList)
    return () => cancelAnimationFrame(raf)
  }, [open, query, repositionList])

  React.useLayoutEffect(() => {
    if (!open || normalizedQuery || !props.value) return
    selectedOptionRef.current?.scrollIntoView({ block: 'nearest' })
  }, [open, normalizedQuery, props.value, filteredUsers.length])

  React.useEffect(() => {
    if (!open) return

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      closeMenu()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, Math.max(0, filteredUsers.length - 1)))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' && filteredUsers.length > 0) {
        e.preventDefault()
        const user = filteredUsers[activeIndex] ?? filteredUsers[0]
        if (user) selectUser(user.id)
      }
    }
    const onReposition = () => repositionList()

    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onReposition)
    window.addEventListener('scroll', onReposition, true)

    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onReposition)
      window.removeEventListener('scroll', onReposition, true)
    }
  }, [open, activeIndex, closeMenu, filteredUsers, repositionList, selectUser])

  const inputValue = open ? query : selected?.label ?? ''
  const showClearToggle = Boolean(props.value)
  const list =
    open && listPos ? (
      <div
        ref={listRef}
        className="product-search-list product-search-list-portal"
        role="listbox"
        aria-label="Lista e përdoruesve"
        style={{ top: listPos.top, left: listPos.left, width: listPos.width }}
      >
        <button
          type="button"
          role="option"
          aria-selected={!props.value}
          className={[
            'product-search-option',
            'product-search-option-clear',
            !props.value && 'selected',
          ]
            .filter(Boolean)
            .join(' ')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => selectUser('')}
        >
          Të gjithë përdoruesit
        </button>

        <div className="product-search-list-header">
          {normalizedQuery ? (
            <span className="product-search-list-meta">
              {filteredUsers.length} rezultat{filteredUsers.length === 1 ? '' : 'e'}
            </span>
          ) : (
            <span className="product-search-list-meta">
              {props.users.length} përdorues — kerko ose zgjedh nga lista
            </span>
          )}
        </div>

        {filteredUsers.length === 0 ? (
          <div className="product-search-empty">Nuk u gjet përdorues.</div>
        ) : (
          <div className="product-search-options">
            {filteredUsers.map((user, index) => {
              const active = index === activeIndex
              const isSelected = props.value === user.id
              return (
                <button
                  key={user.id}
                  ref={isSelected ? selectedOptionRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={[
                    'product-search-option',
                    active && 'active',
                    isSelected && 'selected',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectUser(user.id)}
                >
                  {user.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
    ) : null

  return (
    <div
      ref={rootRef}
      className={[
        'product-search-select',
        open && 'open',
        'product-search-select--clearable',
        props.value && 'product-search-select--has-value',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        ref={inputRef}
        className="input product-search-input"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label="Filtro sipas përdoruesit"
        placeholder="Kërko përdorues…"
        value={inputValue}
        onFocus={openMenu}
        onChange={(e) => {
          setQuery(e.target.value)
          setActiveIndex(0)
          if (!open) {
            const trigger = inputRef.current
            if (trigger) setListPos(computeSearchListPosition(trigger))
          }
          setOpen(true)
        }}
      />
      <button
        type="button"
        className="product-search-toggle"
        aria-label={
          showClearToggle
            ? 'Pastro përdoruesin'
            : open
              ? 'Mbyll listen e përdoruesve'
              : 'Shfaq të gjithë përdoruesit'
        }
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={showClearToggle ? clearUser : toggleMenu}
      >
        {showClearToggle ? (
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
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </button>

      {list && typeof document !== 'undefined' ? createPortal(list, document.body) : null}
    </div>
  )
}

function numericDraftsFromClientFilters(filters: HistoryClientFilters): NumericFilterDrafts {
  return {
    totaliMin: filters.totaliMin,
    totaliMax: filters.totaliMax,
    produkteMin: filters.produkteMin,
    produkteMax: filters.produkteMax,
  }
}

function parseNumericDraft(value: NumericFilterDrafts[keyof NumericFilterDrafts]): number | '' {
  return typeof value === 'number' ? value : parseNumericFilterValue(value)
}

function numericDraftsAreEqual(a: NumericFilterDrafts, b: NumericFilterDrafts): boolean {
  return (
    a.totaliMin === b.totaliMin &&
    a.totaliMax === b.totaliMax &&
    a.produkteMin === b.produkteMin &&
    a.produkteMax === b.produkteMax
  )
}

export function DynamicHistoryFilterBar(props: {
  serverFilters: HistoryServerFilters
  clientFilters: HistoryClientFilters
  locations: Lokacioni[]
  products: ProductListItem[]
  users: HistoryUserFilterOption[]
  onServerFilterChange: (patch: Partial<HistoryServerFilters>) => void
  onClientFilterChange: (patch: Partial<HistoryClientFilters>) => boolean | void
  onClearAll: () => void
  showClearLink: boolean
  showUserFilter?: boolean
  showTotali?: boolean
  trackPrice?: boolean
  onNotify?: (message: string, variant?: 'success' | 'default' | 'error') => void
}) {
  const {
    serverFilters,
    clientFilters,
    onServerFilterChange,
    onClientFilterChange,
    onClearAll,
    showClearLink,
  } = props
  const showTotali = props.showTotali ?? true
  const selectedLocationId = clientFilters.locationIds[0] ?? ''
  const onClientFilterChangeRef = React.useRef(onClientFilterChange)
  const [lastAppliedNumericDrafts, setLastAppliedNumericDrafts] =
    React.useState<NumericFilterDrafts>(() => numericDraftsFromClientFilters(clientFilters))
  const [numericDrafts, setNumericDrafts] = React.useState<NumericFilterDrafts>(() =>
    numericDraftsFromClientFilters(clientFilters),
  )
  const [showNumericProgress, setShowNumericProgress] = React.useState(false)

  React.useEffect(() => {
    onClientFilterChangeRef.current = onClientFilterChange
  }, [onClientFilterChange])

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    const next: NumericFilterDrafts = {
      totaliMin: clientFilters.totaliMin,
      totaliMax: clientFilters.totaliMax,
      produkteMin: clientFilters.produkteMin,
      produkteMax: clientFilters.produkteMax,
    }
    if (numericDraftsAreEqual(lastAppliedNumericDrafts, next)) return
    setLastAppliedNumericDrafts(next)
    setNumericDrafts(next)
  }, [
    lastAppliedNumericDrafts,
    clientFilters.totaliMin,
    clientFilters.totaliMax,
    clientFilters.produkteMin,
    clientFilters.produkteMax,
  ])

  React.useEffect(() => {
    if (numericDraftsAreEqual(lastAppliedNumericDrafts, numericDrafts)) return

    setShowNumericProgress(false)

    const progressTimer = window.setTimeout(() => {
      setShowNumericProgress(true)
    }, NUMERIC_FILTER_DEBOUNCE_MS / 2)

    const timeoutId = window.setTimeout(() => {
      onClientFilterChangeRef.current({
        totaliMin: parseNumericDraft(numericDrafts.totaliMin),
        totaliMax: parseNumericDraft(numericDrafts.totaliMax),
        produkteMin: parseNumericDraft(numericDrafts.produkteMin),
        produkteMax: parseNumericDraft(numericDrafts.produkteMax),
      })
      setShowNumericProgress(false)
    }, NUMERIC_FILTER_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(progressTimer)
      window.clearTimeout(timeoutId)
    }
  }, [lastAppliedNumericDrafts, numericDrafts])
  /* eslint-enable react-hooks/set-state-in-effect */

  const numericFieldIsPending = (key: NumericFilterDraftKey) =>
    numericDrafts[key] !== lastAppliedNumericDrafts[key]

  const renderNumericFilter = (
    key: NumericFilterDraftKey,
    placeholder: string,
    step: string | number,
  ) => {
    const isPending = numericFieldIsPending(key)
    return (
      <span
        className={[
          'debounced-search-input',
          showNumericProgress && isPending ? 'debounced-search-input--pending' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <NumericInput
          className="input history-filter-num debounced-search-input__field"
          clearable
          hideZero={false}
          value={numericDrafts[key]}
          placeholder={placeholder}
          min={0}
          step={step}
          aria-busy={isPending}
          onChange={(v) => setNumericDrafts((prev) => ({ ...prev, [key]: v }))}
        />
        {showNumericProgress && isPending ? (
          <span
            className="debounced-search-input__progress"
            style={{ animationDuration: `${NUMERIC_FILTER_DEBOUNCE_MS / 2}ms` }}
            aria-hidden="true"
          />
        ) : null}
      </span>
    )
  }

  return (
    <div className="history-filters-bar">
      <div className="history-filters-primary">
      <div className="history-filter-group history-filter-group-selects">
        <div className="history-filter-field">
          <span className="history-filter-group-label">Veprime</span>
          <select
            className="select history-filter-select"
            value={serverFilters.lloji ?? ''}
            onChange={(e) =>
              onServerFilterChange({
                lloji: (e.target.value || undefined) as HistoryServerFilters['lloji'],
              })
            }
          >
            <option value="">Të gjitha llojet</option>
            <option value="Hyrje">Hyrje</option>
            <option value="Dalje">Dalje</option>
            <option value="Transfer">Transfer</option>
          </select>
        </div>
        <div className="history-filter-field">
          <span className="history-filter-group-label">Vendndodhja</span>
          <select
            className="select history-filter-select"
            value={selectedLocationId}
            onChange={(e) =>
              onClientFilterChange({
                locationIds: e.target.value ? [e.target.value] : [],
              })
            }
          >
            <option value="">Të gjitha vendndodhjet</option>
            {props.locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.flag_emoji ? `${loc.flag_emoji} ` : ''}
                {loc.emri}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="history-filter-sep" aria-hidden="true" />

      <div className="history-filter-group history-filter-group-labeled history-filter-group-dates">
        <span className="history-filter-group-label">Data</span>
        <div className="history-filter-pair history-filter-pair-dates">
          <DateRangeInput
            clearable
            from={serverFilters.dateFrom ?? ''}
            to={serverFilters.dateTo ?? ''}
            fromClassName="history-filter-date"
            toClassName="history-filter-date"
            fromPlaceholder="Nga"
            toPlaceholder="Deri"
            onRangeChange={(from, to) =>
              onServerFilterChange({
                dateFrom: from || undefined,
                dateTo: to || undefined,
              })
            }
          />
        </div>
      </div>

      <div className="history-filter-sep" aria-hidden="true" />

      <div className="history-filter-group history-filter-group-labeled history-filter-group-ora">
        <span className="history-filter-group-label">Ora</span>
        <div className="history-filter-pair history-filter-pair-ora">
          <OraRangeInput
            clearable
            from={clientFilters.oraFrom}
            to={clientFilters.oraDeri}
            fromWrapperClassName="history-filter-ora-wrap"
            toWrapperClassName="history-filter-ora-wrap"
            fromPlaceholder="Nga"
            toPlaceholder="Deri"
            onFromChange={(v) => onClientFilterChange({ oraFrom: v })}
            onToChange={(v) => onClientFilterChange({ oraDeri: v })}
          />
        </div>
      </div>

      <div className="history-filter-sep" aria-hidden="true" />

      {showTotali ? (
        <>
          <div className="history-filter-group history-filter-group-labeled history-filter-group-totali">
            <span className="history-filter-group-label">Totali (€)</span>
            <div className="history-filter-pair">
              {renderNumericFilter('totaliMin', 'Min', '0.01')}
              {renderNumericFilter('totaliMax', 'Max', '0.01')}
            </div>
          </div>
        </>
      ) : null}

      <div className="history-filter-group history-filter-group-labeled history-filter-group-produkte">
        <span className="history-filter-group-label">Produkte</span>
        <div className="history-filter-pair">
          {renderNumericFilter('produkteMin', 'Min', 1)}
          {renderNumericFilter('produkteMax', 'Max', 1)}
        </div>
      </div>
      </div>

      <div className="history-filters-search-row">
        <div className="history-filter-group history-filter-group-labeled history-filter-product">
          <span className="history-filter-group-label">Produkti</span>
          <ProductSearchSelect
            products={props.products}
            value={serverFilters.kodiProduktit ?? ''}
            clearable
            clearLabel="Të gjitha produktet"
            placeholder="Kërko produkt…"
            aria-label="Filtro sipas produktit"
            onChange={(kodi) => onServerFilterChange({ kodiProduktit: kodi || undefined })}
          />
        </div>

        {props.showUserFilter ? (
          <div className="history-filter-group history-filter-group-labeled history-filter-user">
            <span className="history-filter-group-label">Përdorues</span>
            <HistoryUserFilterDropdown
              users={props.users}
              value={serverFilters.createdByUserId ?? ''}
              onChange={(id) => onServerFilterChange({ createdByUserId: id || undefined })}
            />
          </div>
        ) : null}

        <div className="history-filter-group history-filter-group-labeled history-filter-search">
          <span className="history-filter-group-label">Përshkrimi (veprimi)</span>
          <DebouncedSearchInput
            className="input history-filter-pershkrimi"
            clearable
            value={clientFilters.pershkriminQuery}
            placeholder="Kërko…"
            onChange={(v) => onClientFilterChange({ pershkriminQuery: v })}
          />
        </div>

        <div className="history-filter-group history-filter-group-labeled history-filter-search">
          <span className="history-filter-group-label">Shenim (produkt)</span>
          <DebouncedSearchInput
            className="input history-filter-pershkrimi"
            clearable
            value={serverFilters.shenim ?? ''}
            placeholder="Kërko…"
            onChange={(v) => onServerFilterChange({ shenim: v || undefined })}
          />
        </div>

        {showClearLink ? <HistoryFilterClearButton onClick={onClearAll} /> : null}
        <HistoryExportActions
          serverFilters={serverFilters}
          clientFilters={clientFilters}
          trackPrice={props.trackPrice}
          onNotify={props.onNotify}
        />
      </div>
    </div>
  )
}
