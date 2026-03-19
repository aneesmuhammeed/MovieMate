import { API_BASE_URL } from './api/client'
import './App.css'
import { HeroHeader } from './components/heroheader'

function App() {
  return (
    <div className="app-shell">
      <HeroHeader apiBaseUrl={API_BASE_URL} />
    </div>
  )
}

export default App