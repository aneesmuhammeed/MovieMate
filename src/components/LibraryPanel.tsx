import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, formatApiError } from '../api/client'
import type { LibraryItem, PaginationMeta, UiNotice, WatchStatus } from '../types/api'
import { formatDate } from '../utils/format'
import {
  BookOpen, SlidersHorizontal, X, ChevronDown,
  ChevronLeft, ChevronRight, Check, Loader2,
  AlertCircle, Star
} from 'lucide-react'

interface ProgressDraft {
  status: WatchStatus
  totalEpisodes: string
  watchedEpisodes: string
  submitting: boolean
  message: string | null
  isError: boolean
}

interface FilterState {
  genre: string
  platform: string
  status: '' | WatchStatus
  sort_by: 'rating' | 'title' | 'date_added'
  sort_order: 'asc' | 'desc'
}

interface ReviewSeed {
  tmdbId: number
  mediaType: 'movie' | 'tv'
  title: string
}

interface LibraryPanelProps {
  reloadToken: number
  onNotice: (notice: UiNotice) => void
  onPickReviewTarget: (target: ReviewSeed) => void
}

const LIBRARY_PAGE_SIZE_OPTIONS = [10, 20, 50]

const DEFAULT_FILTERS: FilterState = {
  genre: '',
  platform: '',
  status: '',
  sort_by: 'date_added',
  sort_order: 'desc',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  not_started: { label: 'Not Started', color: '#6b6b6b', bg: '#f5f5f4', dot: '#a3a3a3' },
  watching:    { label: 'Watching',    color: '#0369a1', bg: '#eff6ff', dot: '#3b82f6' },
  completed:   { label: 'Completed',   color: '#15803d', bg: '#f0fdf4', dot: '#22c55e' },
}

export function LibraryPanel({ reloadToken, onNotice, onPickReviewTarget }: LibraryPanelProps) {
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [libraryMeta, setLibraryMeta] = useState<PaginationMeta>({ page: 1, page_size: 20, total: 0 })
  const [libraryPage, setLibraryPage] = useState(1)
  const [libraryPageSize, setLibraryPageSize] = useState(20)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [expandedCard, setExpandedCard] = useState<number | null>(null)

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [draftFilters, setDraftFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [progressDrafts, setProgressDrafts] = useState<Record<number, ProgressDraft>>({})

  const totalLibraryPages = useMemo(() =>
    Math.max(1, Math.ceil(libraryMeta.total / Math.max(1, libraryMeta.page_size))),
    [libraryMeta.page_size, libraryMeta.total]
  )

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true)
    try {
      const response = await api.getLibraryFiltered({
        page: libraryPage,
        page_size: libraryPageSize,
        genre: filters.genre.trim() || undefined,
        platform: filters.platform.trim() || undefined,
        status: filters.status || undefined,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
      })
      setLibraryItems(response.data.data)
      setLibraryMeta(response.data.meta)
      setProgressDrafts((prev) => {
        const next = { ...prev }
        for (const item of response.data.data) {
          if (!next[item.id]) {
            next[item.id] = {
              status: item.status ?? 'not_started',
              totalEpisodes: '',
              watchedEpisodes: '',
              submitting: false,
              message: null,
              isError: false,
            }
          }
        }
        return next
      })
    } catch (error) {
      onNotice({ kind: 'error', text: formatApiError(error, 'Failed to load library.') })
    } finally {
      setLibraryLoading(false)
    }
  }, [filters, libraryPage, libraryPageSize, onNotice])

  useEffect(() => { void loadLibrary() }, [loadLibrary, reloadToken])

  function updateDraft(itemId: number, patch: Partial<ProgressDraft>): void {
    setProgressDrafts((prev) => {
      const current = prev[itemId]
      if (!current) return prev
      return { ...prev, [itemId]: { ...current, ...patch } }
    })
  }

  async function onSaveProgress(item: LibraryItem): Promise<void> {
    const draft = progressDrafts[item.id]
    if (!draft || draft.submitting) return

    if (item.media_type === 'tv') {
      if (draft.totalEpisodes.trim() === '' || draft.watchedEpisodes.trim() === '') {
        updateDraft(item.id, { message: 'TV items require total and watched episodes.', isError: true })
        return
      }
    }

    const parsedTotal   = draft.totalEpisodes.trim()   === '' ? null : Number(draft.totalEpisodes)
    const parsedWatched = draft.watchedEpisodes.trim()  === '' ? null : Number(draft.watchedEpisodes)

    if (
      (parsedTotal   !== null && (!Number.isInteger(parsedTotal)   || parsedTotal   < 0)) ||
      (parsedWatched !== null && (!Number.isInteger(parsedWatched) || parsedWatched < 0))
    ) {
      updateDraft(item.id, { message: 'Episode values must be non-negative integers.', isError: true })
      return
    }

    if (parsedTotal !== null && parsedWatched !== null && parsedWatched > parsedTotal) {
      updateDraft(item.id, { message: 'Watched episodes cannot exceed total episodes.', isError: true })
      return
    }

    updateDraft(item.id, { submitting: true, message: null, isError: false })

    try {
      await api.updateProgress(item.id, {
        status: draft.status,
        total_episodes:   item.media_type === 'movie' ? 0 : parsedTotal,
        watched_episodes: item.media_type === 'movie' ? 0 : parsedWatched,
      })
      updateDraft(item.id, { submitting: false, message: 'Progress saved successfully.', isError: false })
      await loadLibrary()
    } catch (error) {
      updateDraft(item.id, {
        submitting: false,
        message: formatApiError(error, 'Failed to update progress.'),
        isError: true,
      })
    }
  }

  function applyFilters(): void  { setFilters(draftFilters); setLibraryPage(1); setFiltersOpen(false) }
  function resetFilters(): void  { setDraftFilters(DEFAULT_FILTERS); setFilters(DEFAULT_FILTERS); setLibraryPage(1) }

  const activeFilterCount = [
    filters.genre,
    filters.platform,
    filters.status,
    filters.sort_by !== 'date_added' ? filters.sort_by : '',
    filters.sort_order !== 'desc'    ? filters.sort_order : '',
  ].filter(Boolean).length

  return (
    <div className="lp h-full w-full overflow-hidden">

        {/* ── Header ── */}
        <div className="lp-header">
          <div className="lp-header-left">
            <div className="lp-wordmark">
              <div className="lp-wordmark-icon">
                <BookOpen size={13} strokeWidth={2} />
              </div>
              <span className="lp-wordmark-label">Your Library</span>
            </div>
            <h2 className="lp-heading">
              Your watchlist,<br />
              <em>always in order.</em>
            </h2>
          </div>

          <div className="lp-header-right">
            <span className="lp-total-badge">{libraryMeta.total} items</span>
            <div className="lp-pagesize-wrap">
              <span>Show</span>
              <select
                className="lp-pagesize-select"
                value={libraryPageSize}
                onChange={(e) => { setLibraryPageSize(Number(e.target.value)); setLibraryPage(1) }}
              >
                {LIBRARY_PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="lp-filter-bar ">
          <button
            className={`lp-filter-btn ${filtersOpen || activeFilterCount > 0 ? 'active' : ''}`}
            onClick={() => setFiltersOpen((p) => !p)}
          >
            <SlidersHorizontal size={13} strokeWidth={2} />
            Filters
            {activeFilterCount > 0 && <span className="lp-filter-count">{activeFilterCount}</span>}
          </button>

          {filters.genre && (
            <span className="lp-chip">
              Genre: {filters.genre}
              <button className="lp-chip-x" onClick={() => { setFilters(f => ({ ...f, genre: '' })); setDraftFilters(f => ({ ...f, genre: '' })) }}>
                <X size={11} strokeWidth={2.5} />
              </button>
            </span>
          )}
          {filters.platform && (
            <span className="lp-chip">
              Platform: {filters.platform}
              <button className="lp-chip-x" onClick={() => { setFilters(f => ({ ...f, platform: '' })); setDraftFilters(f => ({ ...f, platform: '' })) }}>
                <X size={11} strokeWidth={2.5} />
              </button>
            </span>
          )}
          {filters.status && (
            <span className="lp-chip">
              {STATUS_CONFIG[filters.status]?.label ?? filters.status}
              <button className="lp-chip-x" onClick={() => { setFilters(f => ({ ...f, status: '' })); setDraftFilters(f => ({ ...f, status: '' })) }}>
                <X size={11} strokeWidth={2.5} />
              </button>
            </span>
          )}
        </div>

        {/* ── Filter panel ── */}
        {filtersOpen && (
          <div className="lp-filter-panel">
            <div className="lp-field">
              <span className="lp-field-label">Genre</span>
              <input className="lp-input" type="text" placeholder="e.g. Drama" value={draftFilters.genre}
                onChange={(e) => setDraftFilters(p => ({ ...p, genre: e.target.value }))} />
            </div>
            <div className="lp-field">
              <span className="lp-field-label">Platform</span>
              <input className="lp-input" type="text" placeholder="e.g. Netflix" value={draftFilters.platform}
                onChange={(e) => setDraftFilters(p => ({ ...p, platform: e.target.value }))} />
            </div>
            <div className="lp-field">
              <span className="lp-field-label">Status</span>
              <select className="lp-select" value={draftFilters.status}
                onChange={(e) => setDraftFilters(p => ({ ...p, status: e.target.value as '' | WatchStatus }))}>
                <option value="">All statuses</option>
                <option value="not_started">Not Started</option>
                <option value="watching">Watching</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="lp-field">
              <span className="lp-field-label">Sort By</span>
              <select className="lp-select" value={draftFilters.sort_by}
                onChange={(e) => setDraftFilters(p => ({ ...p, sort_by: e.target.value as FilterState['sort_by'] }))}>
                <option value="date_added">Date Added</option>
                <option value="title">Title</option>
                <option value="rating">Rating</option>
              </select>
            </div>
            <div className="lp-field">
              <span className="lp-field-label">Order</span>
              <select className="lp-select" value={draftFilters.sort_order}
                onChange={(e) => setDraftFilters(p => ({ ...p, sort_order: e.target.value as FilterState['sort_order'] }))}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            <div className="lp-filter-actions">
              <button className="lp-btn lp-btn-solid" onClick={applyFilters}>Apply</button>
              <button className="lp-btn lp-btn-outline" onClick={resetFilters}>Reset</button>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {libraryLoading && (
          <div className="lp-loading">
            {[1, 2, 3].map((n) => <div key={n} className="lp-shimmer" style={{ opacity: 1 - n * 0.2 }} />)}
          </div>
        )}

        {/* ── Empty ── */}
        {!libraryLoading && libraryItems.length === 0 && (
          <div className="lp-empty">No items match the current filters.</div>
        )}

        {/* ── List ── */}
        {!libraryLoading && libraryItems.length > 0 && (
          <div className="lp-list">
            {libraryItems.map((item) => {
              const draft     = progressDrafts[item.id]
              const isOpen    = expandedCard === item.id
              const statusCfg = STATUS_CONFIG[item.status ?? 'not_started']
              const epPct =
                item.media_type === 'tv' && draft &&
                Number(draft.totalEpisodes) > 0 && Number(draft.watchedEpisodes) >= 0
                  ? Math.min(100, Math.round((Number(draft.watchedEpisodes) / Number(draft.totalEpisodes)) * 100))
                  : null

              return (
                <article key={item.id} className="lp-card">
                  <div className="lp-card-head" onClick={() => setExpandedCard(isOpen ? null : item.id)}>
                    <div className="lp-card-info">
                      <div className="lp-card-title-row">
                        <h3 className="lp-card-title">{item.title}</h3>
                        <span className="lp-type-pill">{item.media_type.toUpperCase()}</span>
                      </div>
                      <div className="lp-card-meta">
                        <span className="lp-meta-item">{item.genre}</span>
                        <span className="lp-meta-dot" />
                        <span className="lp-meta-item">{item.platform}</span>
                        <span className="lp-meta-dot" />
                        <span className="lp-meta-item">Added {formatDate(item.date_added)}</span>
                        {item.average_rating != null && (
                          <>
                            <span className="lp-meta-dot" />
                            <span className="lp-rating-badge">
                              <Star size={10} strokeWidth={0} style={{ fill: '#d97706' }} />
                              {item.average_rating}
                            </span>
                          </>
                        )}
                      </div>
                      {epPct !== null && (
                        <div className="lp-ep-bar-wrap">
                          <div className="lp-ep-bar" style={{ width: `${epPct}%` }} />
                        </div>
                      )}
                    </div>

                    <div className="lp-card-right">
                      <span
                        className="lp-status-pill"
                        style={{ color: statusCfg.color, background: statusCfg.bg, borderColor: statusCfg.bg }}
                      >
                        <span className="lp-status-dot" style={{ background: statusCfg.dot }} />
                        {statusCfg.label}
                      </span>
                      <div className="lp-card-actions">
                        <button
                          className="lp-btn lp-btn-ghost-review"
                          onClick={(e) => { e.stopPropagation(); onPickReviewTarget({ tmdbId: item.tmdb_id, mediaType: item.media_type, title: item.title }) }}
                        >
                          Reviews
                        </button>
                        <ChevronDown size={15} strokeWidth={2} className={`lp-chevron ${isOpen ? 'open' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {isOpen && draft && (
                    <div className="lp-progress-form">
                      <div className="lp-progress-field">
                        <span className="lp-progress-label">Status</span>
                        <select className="lp-select-sm" value={draft.status}
                          onChange={(e) => updateDraft(item.id, { status: e.target.value as WatchStatus, message: null })}>
                          <option value="not_started">Not Started</option>
                          <option value="watching">Watching</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div className="lp-progress-field">
                        <span className="lp-progress-label">Total Episodes</span>
                        <input className="lp-input-sm" type="number" min={0}
                          placeholder={item.media_type === 'movie' ? 'N/A' : '24'}
                          value={draft.totalEpisodes}
                          onChange={(e) => updateDraft(item.id, { totalEpisodes: e.target.value, message: null })}
                          disabled={item.media_type === 'movie'} />
                      </div>
                      <div className="lp-progress-field">
                        <span className="lp-progress-label">Watched</span>
                        <input className="lp-input-sm" type="number" min={0}
                          placeholder={item.media_type === 'movie' ? 'N/A' : '10'}
                          value={draft.watchedEpisodes}
                          onChange={(e) => updateDraft(item.id, { watchedEpisodes: e.target.value, message: null })}
                          disabled={item.media_type === 'movie'} />
                      </div>
                      <div className="lp-progress-footer">
                        <button
                          className="lp-btn lp-btn-save"
                          onClick={() => void onSaveProgress(item)}
                          disabled={draft.submitting}
                        >
                          {draft.submitting
                            ? <><Loader2 size={13} strokeWidth={2.2} className="lp-spin" /> Saving…</>
                            : <><Check size={13} strokeWidth={2.5} /> Save Progress</>
                          }
                        </button>
                        {draft.message && (
                          <p className={`lp-msg ${draft.isError ? 'error' : 'success'}`}>
                            {draft.isError
                              ? <AlertCircle size={12} strokeWidth={2} />
                              : <Check size={12} strokeWidth={2.5} />
                            }
                            {draft.message}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}

        {/* ── Pager ── */}
        <div className="lp-pager">
          <p className="lp-pager-info">
            Page <strong>{libraryPage}</strong> of <strong>{totalLibraryPages}</strong>
            {' · '}<strong>{libraryMeta.total}</strong> total
          </p>
          <div className="lp-pager-btns">
            <button className="lp-pager-btn"
              onClick={() => setLibraryPage((p) => Math.max(1, p - 1))}
              disabled={libraryPage <= 1 || libraryLoading}>
              <ChevronLeft size={13} /> Prev
            </button>
            <button className="lp-pager-btn"
              onClick={() => setLibraryPage((p) => Math.min(totalLibraryPages, p + 1))}
              disabled={libraryPage >= totalLibraryPages || libraryLoading}>
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>

    </div>
  )
}