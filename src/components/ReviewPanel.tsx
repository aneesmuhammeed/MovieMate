import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { api, formatApiError } from '../api/client'
import type { LibraryItem, MediaType, PaginationMeta, Review, UiNotice } from '../types/api'
import { formatDate } from '../utils/format'
import {
  Star, Search, X, Info, AlertCircle, Check,
  Loader2, RotateCcw, MessageSquare, ChevronLeft, ChevronRight
} from 'lucide-react'

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

const STAR_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Excellent',
}

export function ReviewPanel({ selectedTarget, onNotice, reloadToken }: ReviewPanelProps) {
  const [libraryFilterQuery, setLibraryFilterQuery] = useState('')
  const [libraryMeta, setLibraryMeta] = useState<PaginationMeta | null>(null)
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryError, setLibraryError] = useState<string | null>(null)

  const [selectedMovie, setSelectedMovie] = useState<ReviewMovie | null>(null)

  const [rating, setRating] = useState(5)
  const [hoveredStar, setHoveredStar] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewSummary, setReviewSummary] = useState<string | null>(null)
  const [reviewsMeta, setReviewsMeta] = useState<PaginationMeta | null>(null)
  const [reviewPage, setReviewPage] = useState(1)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [reviewsError, setReviewsError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedTarget) return
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
          totalPages = Math.max(1, Math.ceil(response.data.meta.total / Math.max(1, response.data.meta.page_size)))
          page += 1
        }
        setLibraryItems(allItems)
        setLibraryMeta({ page: 1, page_size: allItems.length, total: totalRecords })
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
    if (!q) return libraryItems
    return libraryItems.filter((item) => item.title.toLowerCase().includes(q))
  }, [libraryFilterQuery, libraryItems])

  const totalReviewPages = useMemo(() => {
    if (!reviewsMeta) return 1
    return Math.max(1, Math.ceil(reviewsMeta.total / Math.max(1, reviewsMeta.page_size)))
  }, [reviewsMeta])

  async function loadReviews(page = reviewPage): Promise<void> {
    if (!selectedMovie) { setReviewsError('Select a movie or TV show before loading reviews.'); return }
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
      setReviewSummary(response.data.summary)
      setReviewsError(null)
    } catch (error) {
      setReviews([])
      setReviewsMeta(null)
      setReviewSummary(null)
      setReviewsError(formatApiError(error, 'Failed to load reviews.'))
    } finally {
      setLoadingReviews(false)
    }
  }

  async function submitReview(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!selectedMovie) { onNotice({ kind: 'error', text: 'Select a movie or TV show before adding a review.' }); return }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) { onNotice({ kind: 'error', text: 'Rating must be an integer from 1 to 5.' }); return }
    setSubmitting(true)
    try {
      await api.createReview({ tmdb_id: selectedMovie.tmdb_id, type: selectedMovie.media_type, rating, comment: comment.trim() })
      onNotice({ kind: 'success', text: `Review added for ${selectedMovie.title}.` })
      setComment('')
      await loadReviews(1)
    } catch (error) {
      onNotice({ kind: 'error', text: formatApiError(error, 'Failed to create review.') })
    } finally {
      setSubmitting(false)
    }
  }

  const displayStars = hoveredStar ?? rating

  return (
    <div className="rp h-full w-full">

        {/* ── Header ── */}
        <div className="rp-header">
          <div className="rp-wordmark">
            <div className="rp-wordmark-icon">
              <Star size={13} strokeWidth={2} />
            </div>
            <span className="rp-wordmark-label">Ratings & Reviews</span>
          </div>
          <h2 className="rp-heading">
            Your take on<br />
            <em>what you've watched.</em>
          </h2>
        </div>

        {/* ── Body ── */}
        <div className="rp-body">
          <label className="rp-label">Filter Library Titles</label>
          <div className="rp-search-wrap">
            <span className="rp-search-icon-left">
              <Search size={15} strokeWidth={2} />
            </span>
            <input
              className="rp-search-input"
              type="text"
              placeholder="Search your library…"
              value={libraryFilterQuery}
              onChange={(e) => setLibraryFilterQuery(e.target.value)}
            />
            {libraryFilterQuery && (
              <button className="rp-clear-btn" type="button" onClick={() => setLibraryFilterQuery('')} aria-label="Clear">
                <X size={14} strokeWidth={2.2} />
              </button>
            )}
          </div>

          <div className="rp-results" aria-live="polite">
            {libraryLoading && [1, 2, 3].map((n) => (
              <div key={n} className="rp-shimmer" style={{ opacity: 1 - n * 0.2 }} />
            ))}

            {libraryError && !libraryLoading && (
              <div className="rp-state error">
                <AlertCircle size={14} strokeWidth={2} />{libraryError}
              </div>
            )}

            {!libraryLoading && !libraryError && visibleLibraryItems.length === 0 && (
              <div className="rp-state">
                <Search size={14} strokeWidth={2} />No matching titles in your library.
              </div>
            )}

            {!libraryLoading && visibleLibraryItems.map((item) => {
              const isSelected = selectedMovie?.tmdb_id === item.tmdb_id && selectedMovie?.media_type === item.media_type
              return (
                <button
                  key={`review-library-${item.media_type}-${item.id}`}
                  type="button"
                  className={`rp-lib-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedMovie({ tmdb_id: item.tmdb_id, title: item.title, media_type: item.media_type })
                    setReviewPage(1)
                    setReviews([])
                    setReviewSummary(null)
                    setReviewsMeta(null)
                    setReviewsError(null)
                  }}
                >
                  <div className="rp-lib-card-row">
                    <span className="rp-lib-title">{item.title}</span>
                    <div className="rp-lib-right">
                      <span className="rp-pill">{item.media_type}</span>
                      {isSelected && <Check size={14} strokeWidth={2.5} className="rp-check" />}
                    </div>
                  </div>
                  <span className="rp-lib-meta">{item.genre} · {item.platform}</span>
                </button>
              )
            })}

            {libraryMeta && (
              <div className="rp-loaded-count">
                {libraryItems.length} of {libraryMeta.total} titles loaded
              </div>
            )}
          </div>

          {selectedMovie ? (
            <div className="rp-selected-strip">
              <div className="rp-selected-icon">
                <Star size={13} strokeWidth={2} />
              </div>
              <div className="rp-selected-info">
                <div className="rp-selected-name">{selectedMovie.title}</div>
                <div className="rp-selected-sub">
                  {selectedMovie.media_type.toUpperCase()} · TMDB #{selectedMovie.tmdb_id}
                </div>
              </div>
              <button
                type="button"
                className="rp-deselect"
                onClick={() => { setSelectedMovie(null); setReviews([]); setReviewsMeta(null); setReviewSummary(null) }}
                aria-label="Deselect"
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>
          ) : (
            <p className="rp-hint">
              <Info size={13} strokeWidth={2} />
              Select a title from your library above to continue
            </p>
          )}

          {/* Divider */}
          <div className="rp-rule">
            <div className="rp-rule-line" />
            <span className="rp-rule-label">Write a Review</span>
            <div className="rp-rule-line" />
          </div>
        </div>

        {/* ── Review form ── */}
        <form className="rp-form" onSubmit={(e) => void submitReview(e)}>
          <div>
            <span className="rp-label">Your Rating</span>
            <div className="rp-stars-row">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="rp-star-btn"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(null)}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <Star
                    size={24}
                    strokeWidth={1.5}
                    style={{
                      fill: star <= displayStars ? 'var(--amber)' : 'transparent',
                      stroke: star <= displayStars ? 'var(--amber)' : 'var(--rule)',
                      transition: 'fill 110ms, stroke 110ms',
                    }}
                  />
                </button>
              ))}
              <span className="rp-star-lbl">{STAR_LABELS[displayStars]}</span>
            </div>
          </div>

          <div>
            <label className="rp-label" htmlFor="rp-comment">Comment</label>
            <textarea
              id="rp-comment"
              className="rp-textarea"
              minLength={1}
              maxLength={2000}
              placeholder="Share your thoughts on this title…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </div>

          <div className="rp-form-actions">
            <button
              type="submit"
              className="rp-btn rp-btn-solid"
              disabled={submitting || !selectedMovie}
            >
              {submitting
                ? <><Loader2 size={14} strokeWidth={2.2} className="rp-spin" /> Saving…</>
                : <><Star size={14} strokeWidth={2} /> Add Review</>
              }
            </button>

            <button
              type="button"
              className="rp-btn rp-btn-outline"
              onClick={() => void loadReviews(1)}
              disabled={loadingReviews || !selectedMovie}
            >
              {loadingReviews
                ? <><Loader2 size={14} strokeWidth={2.2} className="rp-spin" /> Loading…</>
                : <><RotateCcw size={14} strokeWidth={2} /> Load Reviews</>
              }
            </button>
          </div>
        </form>

        {/* ── Reviews list ── */}
        {(reviews.length > 0 || reviewsError || (reviewsMeta && reviews.length === 0)) && (
          <div className="rp-reviews-section">
            <div className="rp-reviews-header">
              <span className="rp-reviews-label">
                <MessageSquare size={13} strokeWidth={2} />
                Reviews
              </span>
              {reviewsMeta && (
                <span className="rp-reviews-count">{reviewsMeta.total} total</span>
              )}
            </div>

            {reviewSummary && (
              <div className="rp-summary">
                <strong>Summary:</strong> {reviewSummary}
              </div>
            )}

            <div className="rp-reviews-state">
              {reviewsError && (
                <div className="rp-state error">
                  <AlertCircle size={14} strokeWidth={2} />{reviewsError}
                </div>
              )}
              {!loadingReviews && !reviewsError && reviewsMeta && reviews.length === 0 && (
                <div className="rp-state">
                  <MessageSquare size={14} strokeWidth={2} />No reviews yet for this title.
                </div>
              )}
            </div>

            {reviews.length > 0 && (
              <div className="rp-review-list">
                {reviews.map((review) => (
                  <article key={review.id} className="rp-review-card">
                    <div className="rp-review-head">
                      <div className="rp-review-stars">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <svg key={s} className={`rp-review-star ${s <= review.rating ? 'filled' : 'empty'}`}
                            viewBox="0 0 24 24" strokeWidth="0">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                        ))}
                      </div>
                      <span className="rp-review-date">{formatDate(review.created_at)}</span>
                    </div>
                    <p className="rp-review-comment">{review.comment}</p>
                  </article>
                ))}
              </div>
            )}

            {reviewsMeta && reviews.length > 0 && (
              <div className="rp-pager">
                <p className="rp-pager-info">
                  Page <strong>{reviewPage}</strong> of <strong>{totalReviewPages}</strong>
                  {' · '}<strong>{reviewsMeta.total}</strong> total
                </p>
                <div className="rp-pager-btns">
                  <button className="rp-pager-btn"
                    onClick={() => void loadReviews(Math.max(1, reviewPage - 1))}
                    disabled={reviewPage <= 1 || loadingReviews}>
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <button className="rp-pager-btn"
                    onClick={() => void loadReviews(Math.min(totalReviewPages, reviewPage + 1))}
                    disabled={reviewPage >= totalReviewPages || loadingReviews}>
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

    </div>
  )
}