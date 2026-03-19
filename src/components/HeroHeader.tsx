export function HeroHeader() {
  return (
    <header className="hh">
        <div className="hh-top">
          <div className="hh-left">
            <div className="hh-wordmark">
              <div className="hh-wordmark-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
              </div>
              <span className="hh-wordmark-name">MovieMate</span>
            </div>

            <h1 className="hh-h1">
              Your watch library,<br />
              <em>always organised.</em>
            </h1>

            <p className="hh-copy">
              Search TMDB titles, track watch progress, and manage ratings &amp; reviews — all in one clean, validated dashboard.
            </p>
          </div>

          <div className="hh-right">
            {[
              { val: '1M+',  lbl: 'TMDB Titles' },
              { val: 'REST', lbl: 'API-Backed'  },
              { val: '100%', lbl: 'Validated'   },
            ].map(({ val, lbl }) => (
              <div key={lbl} className="hh-stat">
                <span className="hh-stat-val">{val}</span>
                <span className="hh-stat-lbl">{lbl}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hh-footer">
          <div className="hh-tags">
            {['Search', 'Progress Tracking', 'Ratings', 'Filter & Sort'].map((t) => (
              <span key={t} className="hh-tag">{t}</span>
            ))}
          </div>
         
        </div>
    </header>
  )
}