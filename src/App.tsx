import { useState } from 'react'
import { API_BASE_URL } from './api/client'
import './App.css'
import { HeroHeader } from './components/HeroHeader'
import { LibraryPanel } from './components/LibraryPanel'
import { NoticeBanner } from './components/NoticeBanner'
import { ReviewPanel } from './components/ReviewPanel'
import { SearchAddPanel } from './components/SearchAddPanel'
import type { MediaType, UiNotice } from './types/api'

interface ReviewTarget {
  tmdbId: number
  mediaType: MediaType
  title: string
}

function App() {
  const [notice, setNotice] = useState<UiNotice | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null)

  function handleLibraryChanged(): void {
    setReloadToken((previous) => previous + 1)
  }

  return (
    <div className="app-shell">
      <HeroHeader apiBaseUrl={API_BASE_URL} />
      <NoticeBanner notice={notice} />

      <main className="layout">
        <SearchAddPanel
          onNotice={setNotice}
          onLibraryChanged={handleLibraryChanged}
        />

        <div className="stacked-panels">
          <LibraryPanel
            reloadToken={reloadToken}
            onNotice={setNotice}
            onPickReviewTarget={setReviewTarget}
          />
          <ReviewPanel selectedTarget={reviewTarget} onNotice={setNotice} reloadToken={reloadToken} />
        </div>
      </main>

      <footer className="footer-note">
        Built for current backend contract: versioned API routes, pagination, filtering, validation,
        and rate-limit aware UX.
      </footer>
    </div>
  )
}

export default App