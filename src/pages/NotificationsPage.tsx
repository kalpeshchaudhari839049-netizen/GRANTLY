import { Link } from 'react-router-dom'
import { Bell, CalendarDays, CheckCheck, CircleUserRound, FileCheck2, Sparkles } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import type { ScholarshipNotification } from '../types'

interface Props {
  notifications: ScholarshipNotification[]
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
}

const iconMap = { deadline: CalendarDays, application: FileCheck2, profile: CircleUserRound }

export default function NotificationsPage({ notifications, onMarkRead, onMarkAllRead }: Props) {
  const unreadCount = notifications.filter((notification) => !notification.read).length
  return (
    <div className="page-stack">
      <PageHeader eyebrow="YOUR UPDATES" title="Notifications" description="A single place for deadline reminders, application updates, and profile tips." action={<button className="button button-outline" onClick={onMarkAllRead} disabled={!unreadCount}><CheckCheck size={15} /> Mark all read</button>} />
      <section className="panel notification-page">
        <div className="panel-heading"><div><h2>{unreadCount ? `${unreadCount} unread updates` : 'You’re all caught up'}</h2><p>Personalized demo notifications based on your saved data.</p></div><span className="notification-bell"><Bell size={18} /></span></div>
        {notifications.length ? notifications.map((notification) => {
          const Icon = iconMap[notification.kind]
          return <Link key={notification.id} to={notification.href} className={`notification-row${notification.read ? '' : ' unread'}`} onClick={() => onMarkRead(notification.id)}>
            <span className={`notification-icon ${notification.kind}`}><Icon size={17} /></span>
            <span className="notification-copy"><strong>{notification.title}</strong><span>{notification.message}</span><small>{notification.date}</small></span>
            {!notification.read && <i aria-label="Unread" />}
          </Link>
        }) : <div className="empty-notifications"><Sparkles size={22} /><strong>No updates yet</strong><span>As your saved scholarships and applications change, relevant updates will show here.</span></div>}
      </section>
    </div>
  )
}
