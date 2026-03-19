import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { api, formatApiError } from '../api/client'
import type { PaginationMeta, SearchItem, UiNotice } from '../types/api'

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
    if (!searchMeta) {
      return 1
    }
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

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Add To Library</h2>
        <p>Search first, then fill in remaining fields and save.</p>
      </div>

      <label className="field">
        <span>Search Movie / TV</span>
        <input
          type="text"
          placeholder="Type title name..."
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value)
            setSearchPage(1)
          }}
        />
      </label>

      <div className="search-results" aria-live="polite">
        {searchLoading ? <p className="muted">Searching...</p> : null}
        {searchError ? <p className="error-text">{searchError}</p> : null}
        {!searchLoading && !searchError && searchQuery.trim() !== '' && searchResults.length === 0 ? (
          <p className="muted">No matching movie or TV results on this page.</p>
        ) : null}

        {searchResults.map((item) => (
          <button
            key={`${item.media_type}-${item.id}`}
            type="button"
            className={`search-card ${selectedSearchItem?.id === item.id && selectedSearchItem?.media_type === item.media_type ? 'selected' : ''}`}
            onClick={() => setSelectedSearchItem(item)}
          >
            <span className="search-title">{item.title}</span>
            <span className="search-meta">
              {item.media_type.toUpperCase()} • {item.release_date ?? 'Unknown date'}
            </span>
            <span className="search-overview">{item.overview || 'No overview provided.'}</span>
          </button>
        ))}

        {searchMeta && searchQuery.trim() !== '' ? (
          <div className="pager">
            <button
              type="button"
              onClick={() => setSearchPage((previous) => Math.max(1, previous - 1))}
              disabled={searchPage <= 1 || searchLoading}
            >
              Prev
            </button>
            <span>
              Page {searchPage} of {totalSearchPages}
            </span>
            <button
              type="button"
              onClick={() => setSearchPage((previous) => Math.min(totalSearchPages, previous + 1))}
              disabled={searchPage >= totalSearchPages || searchLoading}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      <form className="form-grid" onSubmit={(event) => void onAddLibraryItem(event)}>
        <label className="field">
          <span>Selected Title</span>
          <input type="text" value={selectedSearchItem?.title ?? ''} readOnly placeholder="Select from search results" />
        </label>
        <label className="field">
          <span>Media Type</span>
          <input type="text" value={selectedSearchItem?.media_type ?? ''} readOnly placeholder="movie / tv" />
        </label>
        <label className="field">
          <span>Genre</span>
          <input
            required
            minLength={1}
            maxLength={120}
            type="text"
            placeholder="Drama"
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Platform</span>
          <input
            required
            minLength={1}
            maxLength={120}
            type="text"
            placeholder="Netflix"
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
          />
        </label>
        <button type="submit" className="primary" disabled={addLoading}>
          {addLoading ? 'Adding...' : 'Add To Library'}
        </button>
      </form>
    </section>
  )
}