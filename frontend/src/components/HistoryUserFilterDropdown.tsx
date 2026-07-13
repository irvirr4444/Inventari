import * as React from 'react'
import { createPortal } from 'react-dom'
import { useEscapeToClose } from '../hooks/useEscapeToClose'

export type HistoryUserFilterOption = {
  id: string
  label: string
}

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

export function HistoryUserFilterDropdown(props: {
  users: HistoryUserFilterOption[]
  value: string
  onChange: (id: string) => void
  clearLabel?: string
  placeholder?: string
  emptyLabel?: string
  listAriaLabel?: string
  'aria-label'?: string
  listCountLabel?: (count: number) => string
}) {
  const clearLabel = props.clearLabel ?? 'Të gjithë përdoruesit'
  const placeholder = props.placeholder ?? 'Kërko përdorues…'
  const emptyLabel = props.emptyLabel ?? 'Nuk u gjet përdorues.'
  const listAriaLabel = props.listAriaLabel ?? 'Lista e përdoruesve'
  const listCountLabel =
    props.listCountLabel ?? ((count: number) => `${count} përdorues — kerko ose zgjedh nga lista`)

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
        aria-label={listAriaLabel}
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
          {clearLabel}
        </button>

        <div className="product-search-list-header">
          {normalizedQuery ? (
            <span className="product-search-list-meta">
              {filteredUsers.length} rezultat{filteredUsers.length === 1 ? '' : 'e'}
            </span>
          ) : (
            <span className="product-search-list-meta">{listCountLabel(props.users.length)}</span>
          )}
        </div>

        {filteredUsers.length === 0 ? (
          <div className="product-search-empty">{emptyLabel}</div>
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
        aria-label={props['aria-label'] ?? 'Filtro sipas përdoruesit'}
        placeholder={placeholder}
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
            ? 'Pastro zgjedhjen'
            : open
              ? 'Mbyll listen'
              : 'Shfaq listen'
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
