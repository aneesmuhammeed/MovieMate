export type MediaType = 'movie' | 'tv'
export type WatchStatus = 'not_started' | 'watching' | 'completed'

export interface PaginationMeta {
  page: number
  page_size: number
  total: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface SearchItem {
  id: number
  title: string
  media_type: MediaType
  overview: string
  poster_path: string | null
  release_date: string | null
}

export interface LibraryItem {
  id: number
  tmdb_id: number
  title: string
  media_type: MediaType
  genre: string
  platform: string
  date_added: string
  status: WatchStatus | null
  average_rating: number | null
}

export interface ProgressResponse {
  id: number
  item_id: number
  total_episodes: number | null
  watched_episodes: number | null
  status: WatchStatus
}

export interface Review {
  id: number
  item_id: number
  rating: number
  comment: string
  created_at: string
}

export interface AddLibraryPayload {
  tmdb_id: number
  title: string
  type: MediaType
  genre: string
  platform: string
}

export interface UpdateProgressPayload {
  total_episodes: number | null
  watched_episodes: number | null
  status: WatchStatus
}

export interface CreateReviewPayload {
  tmdb_id: number
  type?: MediaType
  rating: number
  comment: string
}

export interface LibraryFilterParams {
  genre?: string
  platform?: string
  status?: WatchStatus
  sort_by?: 'rating' | 'title' | 'date_added'
  sort_order?: 'asc' | 'desc'
  page: number
  page_size: number
}

export interface ReviewListParams {
  movieId: number
  type?: MediaType
  page: number
  page_size: number
}

export interface UiNotice {
  kind: 'success' | 'error'
  text: string
}