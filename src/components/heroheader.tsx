interface HeroHeaderProps {
  apiBaseUrl: string
}

export function HeroHeader({ apiBaseUrl }: HeroHeaderProps) {
  return (
    <header className="hero">
      <p className="eyebrow">MovieMate</p>
      <h1>Production-Ready Library Dashboard</h1>
      <p className="hero-copy">
        Search TMDB titles, save entries to your local library, update watch progress, and manage
        ratings and reviews with backend-aligned validation.
      </p>
      <p className="api-badge">API Base: {apiBaseUrl}</p>
    </header>
  )
}