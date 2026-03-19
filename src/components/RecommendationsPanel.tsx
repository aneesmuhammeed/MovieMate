import { useCallback, useEffect, useState } from 'react'
import { api, formatApiError } from '../api/client'
import type { RecommendationItem } from '../types/api'
import { AlertCircle, Film, Loader2, RefreshCcw, Sparkles, Tv } from 'lucide-react'

interface RecommendationsPanelProps {
  reloadToken: number
}

function mediaLabel(mediaType: RecommendationItem['media_type']): string {
  return mediaType === 'tv' ? 'TV' : 'MOVIE'
}

export function RecommendationsPanel({ reloadToken }: RecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRecommendations = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.getRecommendations()
      setRecommendations(response.data.recommendations)
      setError(null)
    } catch (err) {
      setRecommendations([])
      setError(formatApiError(err, 'Unable to load recommendations right now.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRecommendations()
  }, [loadRecommendations, reloadToken])

  return (
    <section className="rc h-full w-full overflow-hidden">
      <div className="rc-header">
        <div className="rc-wordmark">
          <div className="rc-wordmark-icon">
            <Sparkles size={13} strokeWidth={2} />
          </div>
          <span className="rc-wordmark-label">Smart Picks</span>
        </div>
        <h2 className="rc-heading">
          Your next watch,<br />
          <em>picked for your taste.</em>
        </h2>
      </div>

      <div className="rc-body">
        <div className="rc-toolbar">
          <span className="rc-total-badge">{recommendations.length} suggestions</span>
          <button
            type="button"
            className="rc-refresh-btn"
            onClick={() => void loadRecommendations()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={13} strokeWidth={2.2} className="rc-spin" />
                Refreshing
              </>
            ) : (
              <>
                <RefreshCcw size={13} strokeWidth={2} />
                Refresh
              </>
            )}
          </button>
        </div>

        <div className="rc-list" aria-live="polite">
          {loading && (
            <div className="rc-loading">
              {[1, 2, 3].map((n) => (
                <div key={n} className="rc-shimmer" style={{ opacity: 1 - n * 0.2 }} />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rc-state error">
              <AlertCircle size={14} strokeWidth={2} />
              {error}
            </div>
          )}

          {!loading && !error && recommendations.length === 0 && (
            <div className="rc-state">
              <Sparkles size={14} strokeWidth={2} />
              No recommendations available yet.
            </div>
          )}

          {!loading && !error && recommendations.length > 0 && (
            <div className="rc-grid">
              {recommendations.map((item, index) => (
                <article key={`${item.media_type}-${item.title}-${index}`} className="rc-card">
                  <div className="rc-card-head">
                    <h3 className="rc-card-title">{item.title}</h3>
                    <span className="rc-type-pill">
                      {item.media_type === 'tv' ? <Tv size={10} strokeWidth={2.2} /> : <Film size={10} strokeWidth={2.2} />}
                      {mediaLabel(item.media_type)}
                    </span>
                  </div>
                  <p className="rc-card-reason">{item.reason}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}