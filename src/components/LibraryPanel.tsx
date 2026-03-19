import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, formatApiError } from '../api/client'
import type { LibraryItem, PaginationMeta, UiNotice, WatchStatus } from '../types/api'
import { formatDate } from '../utils/format'

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

export function LibraryPanel({ reloadToken, onNotice, onPickReviewTarget }: LibraryPanelProps) {
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [libraryMeta, setLibraryMeta] = useState<PaginationMeta>({ page: 1, page_size: 20, total: 0 })
  const [libraryPage, setLibraryPage] = useState(1)
  const [libraryPageSize, setLibraryPageSize] = useState(20)
  const [libraryLoading, setLibraryLoading] = useState(false)

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [draftFilters, setDraftFilters] = useState<FilterState>(DEFAULT_FILTERS)

  const [progressDrafts, setProgressDrafts] = useState<Record<number, ProgressDraft>>({})

  const totalLibraryPages = useMemo(() => {
    return Math.max(1, Math.ceil(libraryMeta.total / Math.max(1, libraryMeta.page_size)))
  }, [libraryMeta.page_size, libraryMeta.total])

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

      setProgressDrafts((previous) => {
        const next = { ...previous }
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

  useEffect(() => {
    void loadLibrary()
  }, [loadLibrary, reloadToken])

  function updateDraft(itemId: number, patch: Partial<ProgressDraft>): void {
    setProgressDrafts((previous) => {
      const current = previous[itemId]
      if (!current) {
        return previous
      }
      return {
        ...previous,
        [itemId]: { ...current, ...patch },
      }
    })
  }

  async function onSaveProgress(item: LibraryItem): Promise<void> {
    const draft = progressDrafts[item.id]
    if (!draft || draft.submitting) {
      return
    }

    if (item.media_type === 'tv') {
      if (draft.totalEpisodes.trim() === '' || draft.watchedEpisodes.trim() === '') {
        updateDraft(item.id, {
          message: 'TV items require total and watched episodes.',
          isError: true,
        })
        return
      }
    }

    const parsedTotal = draft.totalEpisodes.trim() === '' ? null : Number(draft.totalEpisodes)
    const parsedWatched = draft.watchedEpisodes.trim() === '' ? null : Number(draft.watchedEpisodes)

    if ((parsedTotal !== null && (!Number.isInteger(parsedTotal) || parsedTotal < 0)) ||
      (parsedWatched !== null && (!Number.isInteger(parsedWatched) || parsedWatched < 0))) {
      updateDraft(item.id, {
        message: 'Episode values must be non-negative integers.',
        isError: true,
      })
      return
    }

    if (parsedTotal !== null && parsedWatched !== null && parsedWatched > parsedTotal) {
      updateDraft(item.id, {
        message: 'Watched episodes cannot be greater than total episodes.',
        isError: true,
      })
      return
    }

    updateDraft(item.id, { submitting: true, message: null, isError: false })

    try {
      await api.updateProgress(item.id, {
        status: draft.status,
        total_episodes: item.media_type === 'movie' ? 0 : parsedTotal,
        watched_episodes: item.media_type === 'movie' ? 0 : parsedWatched,
      })
      updateDraft(item.id, {
        submitting: false,
        message: 'Progress saved.',
        isError: false,
      })
      await loadLibrary()
    } catch (error) {
      updateDraft(item.id, {
        submitting: false,
        message: formatApiError(error, 'Failed to update progress.'),
        isError: true,
      })
    }
  }

  function applyFilters(): void {
    setFilters(draftFilters)
    setLibraryPage(1)
  }

  function resetFilters(): void {
    setDraftFilters(DEFAULT_FILTERS)
    setFilters(DEFAULT_FILTERS)
    setLibraryPage(1)
  }

  return (
    <section className="panel">
      <div className="panel-heading panel-heading-row">
        <div>
          <h2>Your Library</h2>
          <p>Filter, sort, paginate, and update watch progress.</p>
        </div>
        <div className="inline-controls">
          <label>
            Page size
            <select
              value={libraryPageSize}
              onChange={(event) => {
                const nextSize = Number(event.target.value)
                setLibraryPageSize(nextSize)
                setLibraryPage(1)
              }}
            >
              {LIBRARY_PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="filter-grid">
        <label className="field compact">
          <span>Genre</span>
          <input
            type="text"
            value={draftFilters.genre}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, genre: event.target.value }))}
            placeholder="Drama"
          />
        </label>

        <label className="field compact">
          <span>Platform</span>
          <input
            type="text"
            value={draftFilters.platform}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, platform: event.target.value }))}
            placeholder="Netflix"
          />
        </label>

        <label className="field compact">
          <span>Status</span>
          <select
            value={draftFilters.status}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, status: event.target.value as '' | WatchStatus }))}
          >
            <option value="">all</option>
            <option value="not_started">not_started</option>
            <option value="watching">watching</option>
            <option value="completed">completed</option>
          </select>
        </label>

        <label className="field compact">
          <span>Sort By</span>
          <select
            value={draftFilters.sort_by}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, sort_by: event.target.value as FilterState['sort_by'] }))}
          >
            <option value="date_added">date_added</option>
            <option value="title">title</option>
            <option value="rating">rating</option>
          </select>
        </label>

        <label className="field compact">
          <span>Sort Order</span>
          <select
            value={draftFilters.sort_order}
            onChange={(event) => setDraftFilters((prev) => ({ ...prev, sort_order: event.target.value as FilterState['sort_order'] }))}
          >
            <option value="desc">desc</option>
            <option value="asc">asc</option>
          </select>
        </label>

        <div className="filter-actions">
          <button type="button" className="secondary" onClick={applyFilters}>
            Apply
          </button>
          <button type="button" className="secondary" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </div>

      {libraryLoading ? <p className="muted">Loading library...</p> : null}
      {!libraryLoading && libraryItems.length === 0 ? (
        <p className="muted">No library items found for current filters.</p>
      ) : null}

      <div className="library-list">
        {libraryItems.map((item) => {
          const draft = progressDrafts[item.id]
          return (
            <article key={item.id} className="library-card">
              <div className="library-head">
                <div>
                  <h3>{item.title}</h3>
                  <p>
                    TMDB #{item.tmdb_id} • {item.media_type.toUpperCase()} • Added {formatDate(item.date_added)}
                  </p>
                  <p>
                    Genre: {item.genre} • Platform: {item.platform} • Rating: {item.average_rating ?? 'N/A'}
                  </p>
                </div>
                <div className="library-actions">
                  <span className="status-pill">{item.status ?? 'not_started'}</span>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => onPickReviewTarget({ tmdbId: item.tmdb_id, mediaType: item.media_type, title: item.title })}
                  >
                    Open Reviews
                  </button>
                </div>
              </div>

              {draft ? (
                <div className="progress-form">
                  <label className="field compact">
                    <span>Status</span>
                    <select
                      value={draft.status}
                      onChange={(event) => updateDraft(item.id, { status: event.target.value as WatchStatus, message: null })}
                    >
                      <option value="not_started">not_started</option>
                      <option value="watching">watching</option>
                      <option value="completed">completed</option>
                    </select>
                  </label>

                  <label className="field compact">
                    <span>Total Episodes</span>
                    <input
                      type="number"
                      min={0}
                      placeholder={item.media_type === 'movie' ? 'N/A for movie' : '24'}
                      value={draft.totalEpisodes}
                      onChange={(event) => updateDraft(item.id, { totalEpisodes: event.target.value, message: null })}
                      disabled={item.media_type === 'movie'}
                    />
                  </label>

                  <label className="field compact">
                    <span>Watched Episodes</span>
                    <input
                      type="number"
                      min={0}
                      placeholder={item.media_type === 'movie' ? 'N/A for movie' : '10'}
                      value={draft.watchedEpisodes}
                      onChange={(event) => updateDraft(item.id, { watchedEpisodes: event.target.value, message: null })}
                      disabled={item.media_type === 'movie'}
                    />
                  </label>

                  <button
                    type="button"
                    className="secondary"
                    onClick={() => void onSaveProgress(item)}
                    disabled={draft.submitting}
                  >
                    {draft.submitting ? 'Saving...' : 'Save Progress'}
                  </button>

                  {draft.message ? <p className={draft.isError ? 'error-text' : 'success-text'}>{draft.message}</p> : null}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>

      <div className="pager">
        <button
          type="button"
          onClick={() => setLibraryPage((previous) => Math.max(1, previous - 1))}
          disabled={libraryPage <= 1 || libraryLoading}
        >
          Prev
        </button>
        <span>
          Page {libraryPage} of {totalLibraryPages} • Total {libraryMeta.total}
        </span>
        <button
          type="button"
          onClick={() => setLibraryPage((previous) => Math.min(totalLibraryPages, previous + 1))}
          disabled={libraryPage >= totalLibraryPages || libraryLoading}
        >
          Next
        </button>
      </div>
    </section>
  )
}




