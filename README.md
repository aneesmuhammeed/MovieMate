# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  # MovieMate

  MovieMate is a React + TypeScript frontend for managing your personal watch journey.

  It lets users:
  - Search movies and TV titles
  - Add titles to a personal library/watchlist
  - Track progress (episodes/status)
  - Create and browse reviews
  - See backend-driven recommendations from `/recommended`

  The UI is built around a split layout:
  - Left: search and add flow
  - Right: interactive tiles that expand into full panels (Library, Recommendations, Reviews)

  ## Highlights

  - Modern React 19 + TypeScript + Vite stack
  - Tailwind CSS with centralized custom styles in `src/index.css`
  - Framer Motion transitions for panel expansion/collapse
  - Lucide icons for consistent iconography
  - Strong typed API contracts in `src/types/api.ts`
  - Reusable API client with typed responses and structured error handling

  ## Tech Stack

  - React 19
  - TypeScript
  - Vite 8
  - Tailwind CSS 3
  - Framer Motion
  - Lucide React
  - ESLint 9

  ## Project Structure

  ```text
  MovieMate/
    public/
    src/
      api/
        client.ts
      assets/
      components/
        heroheader.tsx
        LibraryPanel.tsx
        NoticeBanner.tsx
        RecommendationsPanel.tsx
        ReviewPanel.tsx
        SearchAddPanel.tsx
      types/
        api.ts
      utils/
        format.ts
      App.tsx
      index.css
      main.tsx
    eslint.config.js
    index.html
    package.json
    postcss.config.js
    tailwind.config.js
    tsconfig*.json
    vite.config.ts
  ```

  ## Core Features

  ### 1. Search and Add to Library

  - Search media titles through backend search endpoint
  - Select title and add it to library with metadata:
    - Genre
    - Platform
    - Media type (movie/tv)
  - Inline loading, empty, and error states

  ### 2. Library Panel

  - Paginated library view
  - Advanced filtering and sorting
    - Genre
    - Platform
    - Watch status
    - Sort by title/rating/date added
    - Sort order asc/desc
  - Per-item progress updates
    - Episode tracking for TV
    - Status changes (`not_started`, `watching`, `completed`)
  - Quick action to choose a title for writing a review
  - Compact list viewport configured to show about 2.5 cards with scroll

  ### 3. Recommendations Panel

  - Fetches personalized recommendations from `/recommended`
  - Shows:
    - Title
    - Media type
    - Reason text
  - Refresh button for manual refetch
  - Loading shimmer, empty state, and error state
  - Viewport configured to show about 2.5 cards with vertical scroll

  ### 4. Reviews Panel

  - Filter/select titles from your library
  - Submit review with:
    - 1-5 star rating
    - Comment
  - Fetch paginated reviews by selected title
  - Displays review summary text when available from backend

  ### 5. Expandable Tile UI

  In the default right-side grid, each tile shows panel heading preview content. Clicking a tile expands it into a full panel:

  - Library tile -> `LibraryPanel`
  - Recommendations tile -> `RecommendationsPanel`
  - Reviews tile -> `ReviewPanel`

  Framer Motion handles transition animations.

  ## API Integration

  Base URL is resolved in `src/api/client.ts`:

  - `VITE_API_BASE_URL` (without trailing slash)
  - Fallback: `/api/v1`

  ### Endpoints used

  - `GET /search?query=&page=&page_size=`
  - `POST /library/add`
  - `GET /library?page=&page_size=`
  - `GET /library/filter?...`
  - `PUT /progress/{itemId}`
  - `POST /review`
  - `GET /reviews/{movieId}?page=&page_size=&type=`
  - `GET /recommended`

  ### Recommendations response shape

  ```json
  {
    "recommendations": [
      {
        "title": "Dark",
        "media_type": "tv",
        "reason": "A captivating German sci-fi mystery series..."
      }
    ]
  }
  ```

  ## Type Contracts

  Type definitions live in `src/types/api.ts`.

  Important models:
  - `SearchItem`
  - `LibraryItem`
  - `ProgressResponse`
  - `Review`
  - `RecommendationItem`
  - `RecommendationResponse`
  - `PaginatedResponse<T>`

  ## Error Handling

  `src/api/client.ts` includes:

  - `ApiError` class with:
    - `status`
    - optional `retryAfter`
  - `extractErrorMessage` to parse backend error payloads
  - `formatApiError` helper for UI-safe fallback messages

  ## Styling System

  - Tailwind directives and global/custom styles are centralized in `src/index.css`
  - Component-specific design tokens use CSS variables such as:
    - `--ink`
    - `--sub`
    - `--rule`
    - `--surface`
  - Google fonts are imported for visual hierarchy

  ## Local Development

  ### Prerequisites

  - Node.js 18+ (recommended)
  - npm 9+

  ### Install

  ```bash
  npm install
  ```

  ### Run development server

  ```bash
  npm run dev
  ```

  ### Build for production

  ```bash
  npm run build
  ```

  ### Preview production build

  ```bash
  npm run preview
  ```

  ### Lint

  ```bash
  npm run lint
  ```

  ## Environment Variables

  Create a `.env` file in project root if needed:

  ```bash
  VITE_API_BASE_URL=http://localhost:8000/api/v1
  ```

  If omitted, frontend uses `/api/v1`.

  ## Scripts

  From `package.json`:

  - `dev`: start Vite dev server
  - `build`: type-check + production bundle
  - `lint`: run ESLint
  - `preview`: serve production bundle locally

  ## Notes for Backend Compatibility

  - Ensure media types are exactly: `movie` or `tv`
  - Ensure watch status values are exactly:
    - `not_started`
    - `watching`
    - `completed`
  - Review list endpoint supports optional `type`
  - Recommendations endpoint should return `recommendations` array

  ## Future Improvements

  - Authentication and multi-user profiles
  - Persisted user settings (theme/layout preferences)
  - Better analytics around watch progress
  - Unit and integration tests for key flows
  - Optimistic UI updates for smoother interactions