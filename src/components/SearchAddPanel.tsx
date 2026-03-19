import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { api, formatApiError } from '../api/client'
import type { PaginationMeta, SearchItem, UiNotice } from '../types/api'
import {
  Search, X, Plus, AlertCircle, BookOpen,
  ChevronLeft, ChevronRight, Check, Loader2, Info
} from 'lucide-react'

const SEARCH_PAGE_SIZE = 8

interface SearchAddPanelProps {
  onNotice: (notice: UiNotice) => void
  onLibraryChanged: () => void
}

export function SearchAddPanel({ onNotice, onLibraryChanged }: SearchAddPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchPage, setSearchPage] = useState(1)
  const [searchMeta, setSearchMeta] = useState<PaginationMeta | null>(null)
  const [searchResults, setSearchResults] = useState<SearchItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [selectedSearchItem, setSelectedSearchItem] = useState<SearchItem | null>(null)
  const [genre, setGenre] = useState('')
  const [platform, setPlatform] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const totalSearchPages = useMemo(() => {
    if (!searchMeta) return 1
    return Math.max(1, Math.ceil(searchMeta.total / Math.max(1, searchMeta.page_size)))
  }, [searchMeta])

  useEffect(() => {
    const normalizedQuery = searchQuery.trim()
    if (normalizedQuery.length < 1) {
      setSearchResults([])
      setSearchMeta(null)
      setSearchError(null)
      return
    }
    const timeoutId = window.setTimeout(async () => {
      setSearchLoading(true)
      try {
        const response = await api.search(normalizedQuery, searchPage, SEARCH_PAGE_SIZE)
        setSearchResults(response.data.data)
        setSearchMeta(response.data.meta)
        setSearchError(null)
      } catch (error) {
        setSearchError(formatApiError(error, 'Search failed.'))
      } finally {
        setSearchLoading(false)
      }
    }, 350)
    return () => window.clearTimeout(timeoutId)
  }, [searchPage, searchQuery])

  function resetSearchAndForm(): void {
    setSearchQuery('')
    setSearchPage(1)
    setSearchResults([])
    setSearchMeta(null)
    setSelectedSearchItem(null)
    setGenre('')
    setPlatform('')
    setSearchError(null)
  }

  async function onAddLibraryItem(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!selectedSearchItem) {
      onNotice({ kind: 'error', text: 'Choose a movie or TV show from search results before adding.' })
      return
    }
    setAddLoading(true)
    try {
      await api.addToLibrary({
        tmdb_id: selectedSearchItem.id,
        title: selectedSearchItem.title,
        type: selectedSearchItem.media_type,
        genre: genre.trim(),
        platform: platform.trim(),
      })
      onNotice({ kind: 'success', text: `${selectedSearchItem.title} added to your library.` })
      resetSearchAndForm()
      onLibraryChanged()
    } catch (error) {
      onNotice({ kind: 'error', text: formatApiError(error, 'Failed to add item.') })
    } finally {
      setAddLoading(false)
    }
  }

  const hasQuery = searchQuery.trim().length > 0
  const showEmpty = !searchLoading && !searchError && hasQuery && searchResults.length === 0

  return (
    <div className="sap h-full w-full">
        <div className="sap-header">
          <div className="sap-wordmark">
            <div className="sap-wordmark-icon">
              <Search size={13} strokeWidth={2.2} />
            </div>
            <span className="sap-wordmark-label">Add to Library</span>
          </div>
          <h2 className="sap-heading">
            Find a title,<br />
            <em>save it to your list.</em>
          </h2>
        </div>

        <div className="sap-body">
          <label className="sap-label">Search Movie / TV Show</label>
          <div className="sap-search-wrap">
            <span className="sap-search-icon-left">
              <Search size={15} strokeWidth={2} />
            </span>
            <input
              className="sap-search-input"
              type="text"
              placeholder="Type a title to search…"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchPage(1) }}
            />
            {hasQuery && (
              <button className="sap-clear-btn" type="button" onClick={resetSearchAndForm} aria-label="Clear">
                <X size={14} strokeWidth={2.2} />
              </button>
            )}
          </div>

          <div aria-live="polite">
            {searchLoading && [1, 2, 3].map((n) => (
              <div key={n} className="sap-shimmer" style={{ opacity: 1 - n * 0.2 }} />
            ))}

            {searchError && !searchLoading && (
              <div className="sap-state error">
                <AlertCircle size={14} strokeWidth={2} />
                {searchError}
              </div>
            )}

            {showEmpty && (
              <div className="sap-state">
                <Search size={14} strokeWidth={2} />
                No results for &ldquo;{searchQuery.trim()}&rdquo;
              </div>
            )}

            {!searchLoading && searchResults.map((item) => {
              const isSelected = selectedSearchItem?.id === item.id && selectedSearchItem?.media_type === item.media_type
              return (
                <button
                  key={`${item.media_type}-${item.id}`}
                  type="button"
                  className={`sap-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedSearchItem(isSelected ? null : item)}
                >
                  <div className="sap-card-row">
                    <span className="sap-card-title">{item.title}</span>
                    <div className="sap-card-meta-row">
                      <span className="sap-pill">{item.media_type}</span>
                      {item.release_date && (
                        <span className="sap-card-year">{item.release_date.slice(0, 4)}</span>
                      )}
                      {isSelected && <Check size={15} strokeWidth={2.5} className="sap-check" />}
                    </div>
                  </div>
                  {item.overview && (
                    <span className="sap-card-overview">{item.overview}</span>
                  )}
                </button>
              )
            })}

            {searchMeta && hasQuery && (
              <div className="sap-pager">
                <span className="sap-pager-info">Page {searchPage} of {totalSearchPages}</span>
                <div className="sap-pager-btns">
                  <button className="sap-pager-btn"
                    onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                    disabled={searchPage <= 1 || searchLoading}>
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <button className="sap-pager-btn"
                    onClick={() => setSearchPage((p) => Math.min(totalSearchPages, p + 1))}
                    disabled={searchPage >= totalSearchPages || searchLoading}>
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="sap-rule">
            <div className="sap-rule-line" />
            <span className="sap-rule-label">Details</span>
            <div className="sap-rule-line" />
          </div>

          <form onSubmit={(e) => void onAddLibraryItem(e)}>
            {selectedSearchItem ? (
              <div className="sap-selected-strip">
                <div className="sap-selected-icon">
                  <BookOpen size={14} strokeWidth={2} />
                </div>
                <div className="sap-selected-info">
                  <div className="sap-selected-name">{selectedSearchItem.title}</div>
                  <div className="sap-selected-sub">
                    {selectedSearchItem.media_type.toUpperCase()}
                    {selectedSearchItem.release_date ? ` · ${selectedSearchItem.release_date.slice(0, 4)}` : ''}
                  </div>
                </div>
                <button type="button" className="sap-deselect" onClick={() => setSelectedSearchItem(null)} aria-label="Deselect">
                  <X size={15} strokeWidth={2.2} />
                </button>
              </div>
            ) : (
              <p className="sap-hint">
                <Info size={13} strokeWidth={2} />
                Select a title from the results above first
              </p>
            )}

            <div className="sap-form-grid">
              <div className="sap-field">
                <label className="sap-label">Genre</label>
                <input className="sap-input" type="text" required minLength={1} maxLength={120}
                  placeholder="e.g. Drama" value={genre} onChange={(e) => setGenre(e.target.value)} />
              </div>
              <div className="sap-field">
                <label className="sap-label">Platform</label>
                <input className="sap-input" type="text" required minLength={1} maxLength={120}
                  placeholder="e.g. Netflix" value={platform} onChange={(e) => setPlatform(e.target.value)} />
              </div>
            </div>

            <button type="submit" className="sap-submit" disabled={addLoading || !selectedSearchItem}>
              {addLoading ? (
                <><Loader2 size={15} strokeWidth={2.2} className="sap-spin" /> Adding…</>
              ) : (
                <><Plus size={15} strokeWidth={2.5} /> Add to Library</>
              )}
            </button>
          </form>
        </div>
    </div>
  )
}