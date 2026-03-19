import { useState } from 'react'
import { API_BASE_URL } from './api/client'
import './App.css'
import { HeroHeader } from './components/HeroHeader'
import { LibraryPanel } from './components/LibraryPanel'
import type { UiNotice } from './types/api'

function App() {
  const [notice, setNotice] = useState<UiNotice | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  function handleLibraryChanged(): void {
    setReloadToken((prev) => prev + 1)
  }

  return (
    <div className="app-shell">
      <HeroHeader apiBaseUrl={API_BASE_URL} />

      <main className="layout">
        <LibraryPanel
          reloadToken={reloadToken}
          onNotice={setNotice}
          onPickReviewTarget={() => {}}
        />
      </main>
    </div>
  )
}

export default App