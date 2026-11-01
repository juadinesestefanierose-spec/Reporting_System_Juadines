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
  block_section: string | null
  status: string
  created_at: string
    deleted_at: string | null
}

const menuItems = [
  { label: 'Dashboard', icon: '▦' },
  { label: 'Report a Concern', icon: '＋' },
  { label: 'My Reports', icon: '▤' },
  { label: 'Trash', icon: '🗑' },
  { label: 'Notifications', icon: '♧' },
  { label: 'Profile', icon: '♙' },
]

function DashboardPage() {
  const [reports, setReports] = useState<ConcernReport[]>([])
  const [trashedReports, setTrashedReports] = useState<ConcernReport[]>([])
  const [fullName, setFullName] = useState('Student')
  const [userEmail, setUserEmail] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [soundOn, setSoundOn] = useState(
  () => localStorage.getItem('ccdi-notification-sound') === 'enabled'
)
  const [activeMenu, setActiveMenu] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
const audioContextRef = useRef<AudioContext | null>(null)
const [editingReport, setEditingReport] = useState<ConcernReport | null>(null)
const [editCategory, setEditCategory] = useState('')
const [editDescription, setEditDescription] = useState('')
const [editBlockSection, setEditBlockSection] = useState('')
const [savingEdit, setSavingEdit] = useState(false)
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

    
// Load the student's reports through the secure RPC
const { data: reportData, error: reportError } =
  await supabase.rpc('student_list_concerns')

if (reportError) {
  console.error('Unable to load student reports:', reportError.message)
} else {
 const studentReports =
  (reportData ?? []) as unknown as ConcernReport[]

  setReports(
    studentReports.filter(report => report.deleted_at === null)
  )

  setTrashedReports(
    studentReports.filter(report => report.deleted_at !== null)
  )
}

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
async function handleUpdateReport() {
  if (!editingReport) return

  if (!editCategory.trim() || !editDescription.trim()) {
    alert('Please complete the category and description.')
    return
  }

  setSavingEdit(true)

  const { error } = await supabase
    .from('concern_reports')
    .update({
      category: editCategory.trim(),
      description: editDescription.trim(),
      block_section: editBlockSection.trim() || null,
    })
    .eq('id', editingReport.id)

  setSavingEdit(false)

  if (error) {
    alert('Unable to update report: ' + error.message)
    return
  }

  setReports((prev) =>
    prev.map((report) =>
      report.id === editingReport.id
        ? {
            ...report,
            category: editCategory.trim(),
            description: editDescription.trim(),
            block_section: editBlockSection.trim() || null,
          }
        : report
    )
  )

  setEditingReport(null)
  alert('Report updated successfully!')
}

async function handleDeleteReport(report: ConcernReport) {
  const confirmed = window.confirm(
    `Move report ${report.reference_number} to Trash?`
  )

  if (!confirmed) return

  const { error } = await supabase
    .from('concern_reports')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', report.id)

  if (error) {
    alert('Unable to delete report: ' + error.message)
    return
  }

  setReports((prev) => prev.filter((item) => item.id !== report.id))
  alert('Report moved to Trash.')
}
async function handleRestoreReport(report: ConcernReport) {
  const confirmed = window.confirm(
    `Restore report ${report.reference_number}?`
  )

  if (!confirmed) return

  const { data, error } = await supabase
  .from('concern_reports')
  .update({ deleted_at: null })
  .eq('id', report.id)
  .select('id')
  .maybeSingle()

  if (error) {
  alert('Unable to restore report: ' + error.message)
  return
}

if (!data) {
  alert('Restore was not saved. Supabase may be blocking this update through its Row Level Security policy.')
  return
}
  setTrashedReports((prev) =>
    prev.filter((item) => item.id !== report.id)
  )

  setReports((prev) => [report, ...prev].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  ))

  alert('Report restored successfully!')
}
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
      <aside className={`sidebar ${sidebarOpen ? '' : 'sidebar-hidden'}`}>
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
          <button
  type="button"
  className="sidebar-toggle"
  onClick={() => setSidebarOpen(prev => !prev)}
  aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
  title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
>
  ☰
</button>
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

          <button
  type="button"
  className="user-summary"
  onClick={() => setActiveMenu('Profile')}
  aria-label="Open student profile"
>
            <div className="avatar">{fullName.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <strong>{fullName}</strong>
              <span>Student</span>
            </div>
          </button>
        </header>


  
        {editingReport ? (
  <main className="dashboard-content">
    <section className="welcome-heading">
      <p className="eyebrow">STUDENT PORTAL</p>
      <h1>Edit Report</h1>
      <p>Update the details of your pending concern.</p>
    </section>

    <section className="reports-panel edit-report-panel">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleUpdateReport()
        }}
      >
        <label>Category</label>
        <input
          type="text"
          value={editCategory}
          onChange={(e) => setEditCategory(e.target.value)}
          required
        />

        <label>Description</label>
        <textarea
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          rows={5}
          required
        />

        <label>Block / Section</label>
        <input
          type="text"
          value={editBlockSection}
          onChange={(e) => setEditBlockSection(e.target.value)}
          placeholder="Optional"
        />

        <div className="edit-report-actions">
          <button
            type="button"
            className="cancel-edit-button"
            onClick={() => setEditingReport(null)}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="save-edit-button"
            disabled={savingEdit}
          >
            {savingEdit ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </section>
  </main>
) : activeMenu === 'Report a Concern' ? (
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
                <th>Actions</th>
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
                  <td>
 {['Pending', 'Submitted'].includes(report.status) && (

    <div className="report-actions">
      <button
        className="edit-report-button"
        onClick={() => {
          setEditingReport(report)
          setEditCategory(report.category)
          setEditDescription(report.description)
          setEditBlockSection(report.block_section ?? '')
        }}
      >
        Edit
      </button>

      <button
        className="delete-report-button"
        onClick={() => handleDeleteReport(report)}
      >
        Delete
      </button>
    </div>
  )}

  {!['Pending', 'Submitted'].includes(report.status) && (
    <span className="no-actions">—</span>
  )}
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
 </main>
) : activeMenu === 'Trash' ? (
  <main className="dashboard-content">
    <section className="welcome-heading">
      <p className="eyebrow">STUDENT PORTAL</p>
      <h1>Trash</h1>
      <p>View and restore reports you have deleted.</p>
    </section>

    <section className="reports-panel">
      <div className="panel-heading">
        <div>
          <h2>Deleted Reports</h2>
          <p>{trashedReports.length} report(s) in Trash</p>
        </div>
      </div>

      {loading ? (
        <p className="empty-state">Loading Trash...</p>
      ) : trashedReports.length === 0 ? (
        <div className="empty-state">
          <h3>Trash is empty</h3>
          <p>Reports you delete will appear here.</p>
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {trashedReports.map((report) => (
                <tr key={report.id}>
                  <td>{report.reference_number}</td>
                  <td>{report.category}</td>
                  <td>
                    {new Date(report.created_at).toLocaleDateString()}
                  </td>
                  <td>{report.status}</td>
                  <td>
                    {['Pending', 'Submitted'].includes(report.status) ? (
  <button
    className="edit-report-button"
    onClick={() => handleRestoreReport(report)}
  >
    Restore
  </button>
) : (
  <span className="no-actions">
    Cannot restore
  </span>
)}
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
