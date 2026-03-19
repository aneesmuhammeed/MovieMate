import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { api, formatApiError } from '../api/client'
import type { LibraryItem, MediaType, PaginationMeta, Review, UiNotice } from '../types/api'
import { formatDate } from '../utils/format'

interface ReviewTarget {
  tmdbId: number
  mediaType: MediaType
  title: string
}

interface ReviewMovie {
  tmdb_id: number
  title: string
  media_type: MediaType
}

interface ReviewPanelProps {
  selectedTarget: ReviewTarget | null
  onNotice: (notice: UiNotice) => void
  reloadToken: number
}

const REVIEW_PAGE_SIZE = 10
const LIBRARY_SOURCE_PAGE_SIZE = 20

export function ReviewPanel({ selectedTarget, onNotice, reloadToken }: ReviewPanelProps) {
  const [libraryFilterQuery, setLibraryFilterQuery] = useState('')
  const [libraryMeta, setLibraryMeta] = useState<PaginationMeta | null>(null)
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryError, setLibraryError] = useState<string | null>(null)

  const [selectedMovie, setSelectedMovie] = useState<ReviewMovie | null>(null)

  const [rating, setRating] = useState('5')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsMeta, setReviewsMeta] = useState<PaginationMeta | null>(null)
  const [reviewPage, setReviewPage] = useState(1)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [reviewsError, setReviewsError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedTarget) {
      return
    }
    setSelectedMovie({
      tmdb_id: selectedTarget.tmdbId,
      title: selectedTarget.title,
      media_type: selectedTarget.mediaType,
    })
    setLibraryFilterQuery(selectedTarget.title)
    setReviewPage(1)
  }, [selectedTarget])

  useEffect(() => {
    async function loadAllLibraryTitles(): Promise<void> {
      setLibraryLoading(true)
      try {
        let page = 1
        let totalPages = 1
        let totalRecords = 0
        const allItems: LibraryItem[] = []

        while (page <= totalPages) {
          const response = await api.getLibrary(page, LIBRARY_SOURCE_PAGE_SIZE)
          allItems.push(...response.data.data)
          totalRecords = response.data.meta.total
          totalPages = Math.max(
            1,
            Math.ceil(response.data.meta.total / Math.max(1, response.data.meta.page_size)),
          )
          page += 1
        }

        setLibraryItems(allItems)
        setLibraryMeta({
          page: 1,
          page_size: allItems.length,
          total: totalRecords,
        })
        setLibraryError(null)
      } catch (error) {
        setLibraryItems([])
        setLibraryMeta(null)
        setLibraryError(formatApiError(error, 'Failed to load your library titles.'))
      } finally {
        setLibraryLoading(false)
      }
    }

    void loadAllLibraryTitles()
  }, [reloadToken])

  const visibleLibraryItems = useMemo(() => {
    const q = libraryFilterQuery.trim().toLowerCase()
    if (!q) {
      return libraryItems
    }
    return libraryItems.filter((item) => item.title.toLowerCase().includes(q))
  }, [libraryFilterQuery, libraryItems])

  const totalReviewPages = useMemo(() => {
    if (!reviewsMeta) {
      return 1
    }
    return Math.max(1, Math.ceil(reviewsMeta.total / Math.max(1, reviewsMeta.page_size)))
  }, [reviewsMeta])

  async function loadReviews(page = reviewPage): Promise<void> {
    if (!selectedMovie) {
      setReviewsError('Select a movie or TV show by name before loading reviews.')
      return
    }

    setLoadingReviews(true)
    try {
      const response = await api.getReviews({
        movieId: selectedMovie.tmdb_id,
        type: selectedMovie.media_type,
        page,
        page_size: REVIEW_PAGE_SIZE,
      })
      setReviews(response.data.data)
      setReviewsMeta(response.data.meta)
      setReviewPage(response.data.meta.page)
      setReviewsError(null)
    } catch (error) {
      setReviews([])
      setReviewsMeta(null)
      setReviewsError(formatApiError(error, 'Failed to load reviews.'))
    } finally {
      setLoadingReviews(false)
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!selectedMovie) {
      onNotice({ kind: 'error', text: 'Select a movie or TV show by name before adding review.' })
      return
    }

    const parsedRating = Number(rating)

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      onNotice({ kind: 'error', text: 'Rating must be an integer from 1 to 5.' })
      return
    }

    setSubmitting(true)
    try {
      await api.createReview({
        tmdb_id: selectedMovie.tmdb_id,
        type: selectedMovie.media_type,
        rating: parsedRating,
        comment: comment.trim(),
      })
      onNotice({ kind: 'success', text: `Review added for ${selectedMovie.title}.` })
      setComment('')
      await loadReviews(1)
    } catch (error) {
      onNotice({ kind: 'error', text: formatApiError(error, 'Failed to create review.') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Ratings & Reviews</h2>
        <p>Select a title from your local library, then create or list reviews.</p>
      </div>

      <label className="field compact">
        <span>Filter All Library Titles</span>
        <input
          type="text"
          placeholder="Type movie or show name..."
          value={libraryFilterQuery}
          onChange={(event) => {
            setLibraryFilterQuery(event.target.value)
          }}
        />
      </label>

      <div className="search-results" aria-live="polite">
        {libraryLoading ? <p className="muted">Loading library titles...</p> : null}
        {libraryError ? <p className="error-text">{libraryError}</p> : null}
        {!libraryLoading && !libraryError && visibleLibraryItems.length === 0 ? (
          <p className="muted">No matching titles in your library.</p>
        ) : null}

        {visibleLibraryItems.map((item) => (
          <button
            key={`review-library-${item.media_type}-${item.id}`}
            type="button"
            className={`search-card ${selectedMovie?.tmdb_id === item.tmdb_id && selectedMovie?.media_type === item.media_type ? 'selected' : ''}`}
            onClick={() => {
              setSelectedMovie({ tmdb_id: item.tmdb_id, title: item.title, media_type: item.media_type })
              setReviewPage(1)
              setReviews([])
              setReviewsMeta(null)
              setReviewsError(null)
            }}
          >
            <span className="search-title">{item.title}</span>
            <span className="search-meta">
              {item.media_type.toUpperCase()} • Library #{item.id} • TMDB #{item.tmdb_id}
            </span>
            <span className="search-overview">Genre: {item.genre} • Platform: {item.platform}</span>
          </button>
        ))}

        {libraryMeta ? (
          <div className="pager">
            <span>Loaded {libraryItems.length} of {libraryMeta.total} library titles</span>
          </div>
        ) : null}
      </div>

      {selectedMovie ? (
        <p className="muted">
          Selected: <strong>{selectedMovie.title}</strong> ({selectedMovie.media_type}) • TMDB #{selectedMovie.tmdb_id}
        </p>
      ) : (
        <p className="muted">Pick one movie or TV title from your library to continue.</p>
      )}

      <form className="review-form" onSubmit={(event) => void submitReview(event)}>
        <label className="field compact">
          <span>Rating (1-5)</span>
          <input
            type="number"
            min={1}
            max={5}
            value={rating}
            onChange={(event) => setRating(event.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Comment</span>
          <textarea
            className="review-textarea"
            minLength={1}
            maxLength={2000}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Excellent pacing and performances."
            required
          />
        </label>

        <div className="review-actions">
          <button type="submit" className="primary" disabled={submitting || !selectedMovie}>
            {submitting ? 'Saving...' : 'Add Review'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => void loadReviews(1)}
            disabled={loadingReviews || !selectedMovie}
          >
            Load Reviews
          </button>
        </div>
      </form>

      {loadingReviews ? <p className="muted">Loading reviews...</p> : null}
      {reviewsError ? <p className="error-text">{reviewsError}</p> : null}
      {!loadingReviews && !reviewsError && reviewsMeta && reviews.length === 0 ? (
        <p className="muted">No reviews found for the selected title.</p>
      ) : null}

      <div className="review-list">
        {reviews.map((review) => (
          <article key={review.id} className="review-card">
            <div className="review-head">
              <strong>{review.rating} / 5</strong>
              <span>{formatDate(review.created_at)}</span>
            </div>
            <p>{review.comment}</p>
          </article>
        ))}
      </div>

      {reviewsMeta ? (
        <div className="pager">
          <button
            type="button"
            onClick={() => void loadReviews(Math.max(1, reviewPage - 1))}
            disabled={reviewPage <= 1 || loadingReviews}
          >
            Prev
          </button>
          <span>
            Page {reviewPage} of {totalReviewPages} • Total {reviewsMeta.total}
          </span>
          <button
            type="button"
            onClick={() => void loadReviews(Math.min(totalReviewPages, reviewPage + 1))}
            disabled={reviewPage >= totalReviewPages || loadingReviews}
          >
            Next
          </button>
        </div>
      ) : null}
    </section>
  )
}