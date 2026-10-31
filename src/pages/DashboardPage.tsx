import ccdilogo from '../assets/ccdilogo.png'
import ReportConcernPage from './ReportConcernPage'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import NotificationsPage from './NotificationsPage'
import ProfilePage from './ProfilePage'
import './DashboardPage.css'

type ConcernReport = {
  id: string
  reference_number: string
  category: string
  description: string
  status: string
  created_at: string
}

const menuItems = [
  { label: 'Dashboard', icon: '▦' },
  { label: 'Report a Concern', icon: '＋' },
  { label: 'My Reports', icon: '▤' },
  { label: 'Notifications', icon: '♧' },
  { label: 'Profile', icon: '♙' },
]

function DashboardPage() {
  const [reports, setReports] = useState<ConcernReport[]>([])
  const [fullName, setFullName] = useState('Student')
  const [userEmail, setUserEmail] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [soundOn, setSoundOn] = useState(
  () => localStorage.getItem('ccdi-notification-sound') === 'enabled'
)
  const [activeMenu, setActiveMenu] = useState('Dashboard')
const audioContextRef = useRef<AudioContext | null>(null)

const soundEnabled = () =>
  localStorage.getItem('ccdi-notification-sound') === 'enabled'

function playNotificationDing() {
  try {
    const audioContext = audioContextRef.current

    if (!audioContext || audioContext.state !== 'running') return

    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(1175, audioContext.currentTime + 0.12)

    gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.15, audioContext.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.5)
  } catch (error) {
    console.error('Notification ding failed:', error)
    
  }
}

async function enableSound() {
  if (soundOn) {
    localStorage.setItem('ccdi-notification-sound', 'disabled')
    setSoundOn(false)

    if (audioContextRef.current) {
      await audioContextRef.current.suspend()
    }
    return
  }

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext
      }).webkitAudioContext

    if (!AudioContextClass) return

    let audioContext = audioContextRef.current

    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioContextClass()
      audioContextRef.current = audioContext
    }

    await audioContext.resume()
    localStorage.setItem('ccdi-notification-sound', 'enabled')
    setSoundOn(true)
    playNotificationDing()
  } catch (error) {
    console.error('Unable to toggle notification sound:', error)
  }
}


  useEffect(() => {
  async function loadDashboard() {
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) {
      setLoading(false)
      return
    }

    setUserEmail(userData.user.email ?? '')

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (profile?.full_name) setFullName(profile.full_name)

    const { data, error } = await supabase
      .from('concern_reports')
      .select('id, reference_number, category, description, status, created_at')
      .order('created_at', { ascending: false })

    if (!error && data) setReports(data)

    const { count, error: notificationError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)

    if (notificationError) {
      console.error('Unable to load notifications:', notificationError.message)
    } else {
      setUnreadCount(count ?? 0)
    }

    setLoading(false)
  }

  const channel = supabase
    .channel('student-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      async () => {
        if (soundEnabled()) {
    playNotificationDing()
  }
        const { count, error } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false)

        if (!error) {
          setUnreadCount(count ?? 0)
        }
      }
    )
    .subscribe()

  loadDashboard()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])

  async function handleLogout() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    alert('Unable to log out. Please try again.')
    return
  }

  window.location.href = '/'
}

  const countStatus = (status: string) =>
    reports.filter((report) => report.status === status).length

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
  <img src={ccdilogo} alt="CCDI Logo" className="sidebar-logo" />
</div>

        <nav className="sidebar-menu" aria-label="Main navigation">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className={`menu-item ${activeMenu === item.label ? 'active' : ''}`}
              onClick={() => setActiveMenu(item.label)}
            >
             <span className="menu-icon">{item.icon}</span>
<span>{item.label}</span>

{item.label === 'Notifications' && unreadCount > 0 && (
  <span className="notification-badge">
    {unreadCount > 99 ? '99+' : unreadCount}
  </span>
)}
            </button>
          ))}
        </nav>

        <button className="menu-item logout-link" onClick={handleLogout}>
          <span className="menu-icon">↪</span>
          Log Out
        </button>
      </aside>

      <div className="dashboard-main">
        <header className="topbar">
          <div className="mobile-brand">CCDI</div>
         
<div className="topbar-spacer" />


<button
  className={`sound-toggle ${soundEnabled() ? 'sound-on' : 'sound-off'}`}
  onClick={enableSound}
  title={soundOn ? 'Mute notification sound' : 'Enable notification sound'}
aria-label={soundOn ? 'Mute notification sound' : 'Enable notification sound'}
>
  
{soundEnabled() ? (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      stroke="#664FC2"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M9.354 21c.705.622 1.632 1 2.646 1s1.94-.378 2.646-1M18 8A6 6 0 1 0 6 8c0 3.09-.78 5.206-1.65 6.605-.735 1.18-1.102 1.771-1.089 1.936.015.182.054.252.2.36.133.099.732.099 1.928.099H18.61c1.196 0 1.795 0 1.927-.098.147-.11.186-.179.2-.361.014-.165-.353-.755-1.088-1.936C18.78 13.206 18 11.09 18 8"
    />
  </svg>
) : (

  //
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      stroke="#664FC2"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M8.633 3.034A6 6 0 0 1 18 8c0 2.1.27 3.751.648 5.032M6.258 6.257A6 6 0 0 0 6 8c0 3.09-.78 5.206-1.65 6.605-.735 1.18-1.102 1.771-1.089 1.936.015.182.054.252.2.36.133.099.732.099 1.928.099H17m-7.646 4c.705.622 1.632 1 2.646 1s1.94-.378 2.646-1M21 21 3 3"
    />
  </svg>
)}

</button>

<button
  className="topbar-icon notification-bell"
  onClick={() => setActiveMenu('Notifications')}
  aria-label={`Notifications, ${unreadCount} unread`}
  title="Notifications"
>
  <svg
    width="23"
    height="23"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M10 21h4" />
  </svg>

  {unreadCount > 0 && (
    <span className="topbar-notification-badge">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )}
</button>

          <div className="user-summary">
            <div className="avatar">{fullName.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <strong>{fullName}</strong>
              <span>Student</span>
            </div>
          </div>
        </header>


  
        {activeMenu === 'Report a Concern' ? (
  <ReportConcernPage />
  ) : activeMenu === 'Notifications' ? (
  <NotificationsPage /> 
) : activeMenu === 'Profile' ? (
  <ProfilePage
    fullName={fullName}
    email={userEmail}
  />
) : activeMenu === 'My Reports' ? (
  <main className="dashboard-content">
    <section className="welcome-heading">
      <p className="eyebrow">STUDENT PORTAL</p>
      <h1>My Reports</h1>
      <p>View your submitted concerns and track their status.</p>
    </section>

    <section className="reports-panel">
      <div className="panel-heading">
        <div>
          <h2>All My Reports</h2>
          <p>{reports.length} report(s) submitted</p>
        </div>
      </div>

      {loading ? (
        <p className="empty-state">Loading reports...</p>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <h3>No reports yet</h3>
          <p>Your submitted concerns will appear here.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Reference No.</th>
                <th>Category</th>
                <th>Date Submitted</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.reference_number}</td>
                  <td>{report.category}</td>
                  <td>
                    {report.created_at
                      ? new Date(report.created_at).toLocaleDateString()
                      : '—'}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${report.status.toLowerCase().replaceAll(' ', '-')}`}
                    >
                      {report.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  </main>
) : (
  <main className="dashboard-content">
          <section className="welcome-heading">
            <p className="eyebrow">STUDENT PORTAL</p>
            <h1>Good day, {fullName}!</h1>
            <p>Here's what's happening with your concerns.</p>
          </section>

          <section className="stats-grid">
            <article className="stat-card">
              <div className="stat-icon blue">▤</div>
              <div><span>Total Reports</span><strong>{reports.length}</strong></div>
            </article>
            <article className="stat-card">
              <div className="stat-icon yellow">◷</div>
              <div><span>Pending</span><strong>{countStatus('Pending') + countStatus('Submitted')}</strong></div>
            </article>
            <article className="stat-card">
              <div className="stat-icon purple">◉</div>
              <div><span>In Progress</span><strong>{countStatus('In Progress')}</strong></div>
            </article>
            <article className="stat-card">
              <div className="stat-icon green">✓</div>
              <div><span>Resolved</span><strong>{countStatus('Resolved')}</strong></div>
            </article>
          </section>

          <section className="reports-panel">
            <div className="panel-heading">
              <div>
                <h2>Recent Reports</h2>
                <p>Track the status of your submitted concerns.</p>
              </div>
              <button className="text-action" onClick={() => setActiveMenu('My Reports')}>
                View All →
              </button>
            </div>

            {loading ? (
              <p className="empty-state">Loading reports...</p>
            ) : reports.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">▤</div>
                <h3>No reports yet</h3>
                <p>Your submitted concerns will appear here.</p>
                <button className="primary-button" onClick={() => setActiveMenu('Report a Concern')}>
                  + Report a Concern
                </button>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Reference No.</th>
                      <th>Category</th>
                      <th>Date Submitted</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.slice(0, 5).map((report) => (
                      <tr key={report.id}>
                        <td>{report.reference_number}</td>
                        <td>{report.category}</td>
                        <td>{new Date(report.created_at).toLocaleDateString()}</td>
                        <td><span className={`status-badge ${report.status.toLowerCase().replaceAll(' ', '-')}`}>{report.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
          )}
      </div>
    </div>
  )
}

export default DashboardPage
