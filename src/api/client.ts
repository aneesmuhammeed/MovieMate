import type {
  AddLibraryPayload,
  CreateReviewPayload,
  LibraryFilterParams,
  LibraryItem,
  PaginatedResponse,
  ProgressResponse,
  RecommendationResponse,
  Review,
  ReviewListParams,
  SearchItem,
  UpdateProgressPayload,
} from '../types/api'

export class ApiError extends Error {
  status: number
  retryAfter: number | null

  constructor(message: string, status: number, retryAfter: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.retryAfter = retryAfter
  }
}

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '/api/v1'

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return 'Unexpected server response.'
  }

  const detail = (payload as { detail?: unknown }).detail
  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail) && detail.length > 0 && typeof detail[0] === 'object' && detail[0] !== null) {
    const first = detail[0] as { msg?: unknown }
    if (typeof first.msg === 'string') {
      return first.msg
    }
  }

  return 'Request failed. Please try again.'
}

function addDefinedParams(params: URLSearchParams, values: Record<string, string | undefined>): void {
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, value)
    }
  })
}

export async function request<T>(path: string, init?: RequestInit): Promise<{ data: T; headers: Headers }> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
    })

    const rawBody = await response.text()
    const payload = rawBody ? (JSON.parse(rawBody) as unknown) : null

    if (!response.ok) {
      const retryAfterHeader = response.headers.get('Retry-After')
      const retryAfter = retryAfterHeader ? Number(retryAfterHeader) || null : null
      throw new ApiError(extractErrorMessage(payload), response.status, retryAfter)
    }

    return { data: payload as T, headers: response.headers }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Unable to reach server. Check your network or backend status.', 502)
  }
}

export const api = {
  search: (query: string, page: number, pageSize: number) => {
    const params = new URLSearchParams({ query, page: String(page), page_size: String(pageSize) })
    return request<PaginatedResponse<SearchItem>>(`/search?${params.toString()}`)
  },
  addToLibrary: (payload: AddLibraryPayload) => {
    return request<LibraryItem>('/library/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  getLibrary: (page: number, pageSize: number) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
    return request<PaginatedResponse<LibraryItem>>(`/library?${params.toString()}`)
  },
  getLibraryFiltered: (filters: LibraryFilterParams) => {
    const params = new URLSearchParams()
    addDefinedParams(params, {
      page: String(filters.page),
      page_size: String(filters.page_size),
      genre: filters.genre,
      platform: filters.platform,
      status: filters.status,
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
    })
    return request<PaginatedResponse<LibraryItem>>(`/library/filter?${params.toString()}`)
  },
  updateProgress: (itemId: number, payload: UpdateProgressPayload) => {
    return request<ProgressResponse>(`/progress/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },
  createReview: (payload: CreateReviewPayload) => {
    return request<Review>('/review', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
  getReviews: ({ movieId, type, page, page_size }: ReviewListParams) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(page_size) })
    if (type) {
      params.set('type', type)
    }
    return request<PaginatedResponse<Review>>(`/reviews/${movieId}?${params.toString()}`)
  },
  getRecommendations: () => {
    return request<RecommendationResponse>('/recommended')
  },
}

export function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.status === 429 && error.retryAfter) {
    return `${error.message} Retry in ${error.retryAfter}s.`
  }
  if (error instanceof ApiError) {
    return error.message
  }
  return fallback
}