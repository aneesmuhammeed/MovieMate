import { useState } from 'react'
import { API_BASE_URL } from './api/client'
import './App.css'
import { HeroHeader } from './components/HeroHeader'
import { LibraryPanel } from './components/LibraryPanel'
import { NoticeBanner } from './components/NoticeBanner'
import { ReviewPanel } from './components/ReviewPanel'
import type { UiNotice, MediaType } from './types/api'

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
    setReloadToken((prev) => prev + 1)
  }

  return (
    <div className="app-shell">
      <HeroHeader apiBaseUrl={API_BASE_URL} />

      <NoticeBanner notice={notice} />

      <main className="layout">
        <div className="stacked-panels">
          <LibraryPanel
            reloadToken={reloadToken}
            onNotice={setNotice}
            onPickReviewTarget={setReviewTarget}
          />

          <ReviewPanel
            selectedTarget={reviewTarget}
            onNotice={setNotice}
            reloadToken={reloadToken}
          />
        </div>
      </main>
    </div>
  )
}

export default App