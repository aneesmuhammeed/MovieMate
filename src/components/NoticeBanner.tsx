import type { UiNotice } from '../types/api'
import { CheckCircle, AlertCircle } from 'lucide-react'

interface NoticeBannerProps {
  notice: UiNotice | null
}

export function NoticeBanner({ notice }: NoticeBannerProps) {
  if (!notice) return null

  const isSuccess = notice.kind === 'success'

  return (
    <div className={`nb ${notice.kind}`} role="alert">
        <span className="nb-icon">
          {isSuccess
            ? <CheckCircle size={15} strokeWidth={2} />
            : <AlertCircle size={15} strokeWidth={2} />
          }
        </span>
        <span className="nb-text">{notice.text}</span>
    </div>
  )
}