import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  text: string
  action?: ReactNode
}

export default function EmptyState({ icon: Icon, title, text, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span><Icon size={21} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}
