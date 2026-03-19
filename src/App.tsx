import { useState } from "react"
import type { MouseEvent } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { BookOpen, Sparkles, Star } from "lucide-react"
import { HeroHeader } from "./components/HeroHeader"
import { LibraryPanel } from "./components/LibraryPanel"
import { NoticeBanner } from "./components/NoticeBanner"
import { RecommendationsPanel } from "./components/RecommendationsPanel"
import { ReviewPanel } from "./components/ReviewPanel"
import { SearchAddPanel } from "./components/SearchAddPanel"
import type { MediaType, UiNotice } from "./types/api"

interface ReviewTarget {
  tmdbId: number
  mediaType: MediaType
  title: string
}

type ExpandedPanel = "library" | "review" | "recommendations" | null

function App() {
  const [notice, setNotice] = useState<UiNotice | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null)
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null)

  function handleLibraryChanged(): void {
    setReloadToken((previous) => previous + 1)
  }

  function togglePanel(panel: Exclude<ExpandedPanel, null>): void {
    setExpandedPanel((previous) => (previous === panel ? null : panel))
  }

  function shouldIgnorePanelToggle(event: MouseEvent<HTMLDivElement>): boolean {
    const target = event.target as HTMLElement
    return Boolean(target.closest("button, input, select, textarea, a, label"))
  }

  const isExpanded = expandedPanel !== null

  return (
    <div className="app-shell flex flex-col">
      <HeroHeader />

      <NoticeBanner notice={notice} />

      <main className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
          <div className="h-full lg:basis-3/5 lg:min-w-0 [&>.sap]:h-full">
            <SearchAddPanel
              onNotice={setNotice}
              onLibraryChanged={handleLibraryChanged}
            />
          </div>

          <div className="flex h-full min-h-0 flex-col gap-4 lg:basis-2/5 lg:min-w-0">
            <AnimatePresence initial={false} mode="wait">
              {isExpanded ? (
                <motion.div
                  key={`expanded-${expandedPanel}`}
                  layout
                  className={`min-h-0 flex-1 cursor-pointer ${expandedPanel === "library" ? "[&>.lp]:h-full" : expandedPanel === "review" ? "[&>.rp]:h-full" : "[&>.rc]:h-full"} `}
                  onClick={(event) => {
                    if (shouldIgnorePanelToggle(event)) {
                      return
                    }
                    if (expandedPanel) {
                      togglePanel(expandedPanel)
                    }
                  }}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.24, ease: "easeInOut" }}
                >
                  {expandedPanel === "library" ? (
                    <LibraryPanel
                      reloadToken={reloadToken}
                      onNotice={setNotice}
                      onPickReviewTarget={setReviewTarget}
                    />
                  ) : expandedPanel === "recommendations" ? (
                    <RecommendationsPanel reloadToken={reloadToken} />
                  ) : (
                    <ReviewPanel
                      selectedTarget={reviewTarget}
                      onNotice={setNotice}
                      reloadToken={reloadToken}
                    />
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="quadrant-tiles"
                  layout
                  className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.24, ease: "easeInOut" }}
                >
                  <motion.div
                    layout
                    className="aspect-square w-full rounded-xl border border-gray-300 bg-white p-4 text-left shadow-sm cursor-pointer [--ink:#0a0a0a] [--sub:#6b6b6b] [--faint:#a3a3a3] [--rule:#e4e4e4] [--surface:#fafaf9] [--bg:#ffffff]"
                    onClick={(event) => {
                      if (shouldIgnorePanelToggle(event)) {
                        return
                      }
                      togglePanel("library")
                    }}
                  >
                    <div className="lp-header-left">
                      <div className="lp-wordmark">
                        <div className="lp-wordmark-icon">
                          <BookOpen size={13} strokeWidth={2}  />
                        </div>
                        <span className="lp-wordmark-label">Your Library</span>
                      </div>
                      <h2 className="lp-heading">
                        Your watchlist,<br />
                        <em>always in order.</em>
                      </h2>
                    </div>
                  </motion.div>

                  <motion.div
                    layout
                    className="aspect-square w-full rounded-xl border border-gray-300 bg-white p-4 text-left shadow-sm cursor-pointer [--ink:#0a0a0a] [--sub:#6b6b6b] [--faint:#a3a3a3] [--rule:#e4e4e4] [--surface:#fafaf9] [--bg:#ffffff]"
                    onClick={(event) => {
                      if (shouldIgnorePanelToggle(event)) {
                        return
                      }
                      togglePanel("recommendations")
                    }}
                  >
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
                  </motion.div>

                  <div className="aspect-square w-full rounded-xl border border-dashed bg-transparent" />

                  <motion.div
                    layout
                    className="aspect-square w-full rounded-xl border border-gray-300 bg-white p-4 text-left shadow-sm cursor-pointer [--ink:#0a0a0a] [--sub:#6b6b6b] [--faint:#a3a3a3] [--rule:#e4e4e4] [--surface:#fafaf9] [--bg:#ffffff]"
                    onClick={(event) => {
                      if (shouldIgnorePanelToggle(event)) {
                        return
                      }
                      togglePanel("review")
                    }}
                  >
                    <div className="rp-wordmark">
                      <div className="rp-wordmark-icon">
                        <Star size={13} strokeWidth={2} />
                      </div>
                      <span className="rp-wordmark-label">Ratings &amp; Reviews</span>
                    </div>
                    <h2 className="rp-heading">
                      Your take on<br />
                      <em>what you've watched.</em>
                    </h2>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App