import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './NotificationsPage.css'

type Notification = {
  id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
 
  const loadNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, message, is_read, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMessage('Unable to load notifications. Please try again.')
      console.error(error.message)
    } else {
      setNotifications(data ?? [])
      setErrorMessage('')
    }

    setLoading(false)
  }, [])

 useEffect(() => {
  loadNotifications()

  const channel = supabase
    .channel('notifications-page')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
() => {
  loadNotifications()
}
    )
    .subscribe((status) => {
  console.log('Notifications Realtime status:', status)
})

  return () => {
    supabase.removeChannel(channel)
  }
}, [loadNotifications])

 


  async function markAsRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) {
      setErrorMessage('Unable to mark this notification as read.')
      console.error(error.message)
      return
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, is_read: true }
          : notification
      )
    )
  }



  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length

  return (
    <main className="notifications-page">
      <p className="notifications-eyebrow">STUDENT PORTAL</p>
      <h1>Notifications</h1>
      <p className="notifications-subtitle">
        Stay updated on your submitted concerns.
      </p>

      <div className="notifications-toolbar">
        <span>{unreadCount} unread</span>
    
      </div>

      {errorMessage && (
        <p className="notification-error" role="alert">
          {errorMessage}
        </p>
      )}

      {loading ? (
        <p className="notification-empty">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <section className="notifications-panel">
          <div className="notifications-icon">♧</div>
          <h2>No notifications yet</h2>
          <p>Updates about your concerns will appear here.</p>
        </section>
      ) : (
        <section className="notification-list">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`notification-item ${
                notification.is_read ? 'read' : 'unread'
              }`}
            >
              <div className="notification-item-icon">♧</div>

              <div className="notification-item-content">
                <div className="notification-item-heading">
                  <h2>{notification.title}</h2>
                  {!notification.is_read && (
                    <span className="unread-dot" aria-label="Unread" />
                  )}
                </div>

                <p>{notification.message}</p>

                <time dateTime={notification.created_at}>
                  {new Date(notification.created_at).toLocaleString()}
                </time>

                {!notification.is_read && (
                  <button
                    type="button"
                    className="mark-read-button"
                    onClick={() => markAsRead(notification.id)}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  )
}

export default NotificationsPage
