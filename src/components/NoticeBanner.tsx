import type { UiNotice } from '../types/api'

interface NoticeBannerProps {
  notice: UiNotice | null
}

export function NoticeBanner({ notice }: NoticeBannerProps) {
  if (!notice) {
    return null
  }

  return (
    <div className={`notice notice-${notice.kind}`} role="alert">
      {notice.text}
    </div>
  )
}