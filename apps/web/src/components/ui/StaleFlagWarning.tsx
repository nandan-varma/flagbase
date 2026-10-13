import { AlertTriangle } from 'lucide-react'

interface Props {
  updatedAt: string
}

export function StaleFlagWarning({ updatedAt }: Props) {
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24))

  if (days < 90) return null

  const months = Math.floor(days / 30)
  const label = months >= 2 ? `${months} months ago` : `${days} days ago`

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>This flag was last modified <strong>{label}</strong>. Is it still needed?</span>
    </div>
  )
}
