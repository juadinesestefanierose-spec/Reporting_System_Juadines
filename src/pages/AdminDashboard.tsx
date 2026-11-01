import { useEffect, useState, useRef, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import ccdilogo from '../assets/ccdilogo.png'
import './AdminDashboard.css'
import CustomDialog from '../components/CustomDialog'
type AdminNotification = {
  id: string
  report_id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}
type Concern = {
  id: string
  reference_number: string
  category: string
  description: string
  block_section: string | null
  status: string
  created_at: string
   deleted_at: string | null
   previous_status: string | null
   is_anonymous: boolean
   student_name: string | null
   photo_path: string | null
}

const menuItems = [
  { label: 'Dashboard', icon: '▦' },
  { label: 'Concern Reports', icon: '▤' },
  { label: 'Trash', icon: '🗑' },
  { label: 'Notifications', icon: '♧' },
  { label: 'Account Settings', icon: '⚙' },
]

function AdminDashboard() {
    const [notifications, setNotifications] = useState<AdminNotification[]>([])
const [unreadCount, setUnreadCount] = useState(0)
const [soundOn, setSoundOn] = useState(
  () => localStorage.getItem('ccdi-notification-sound') === 'enabled'
)

const audioContextRef = useRef<AudioContext | null>(null)

const soundEnabled = () =>
  localStorage.getItem('ccdi-notification-sound') === 'enabled'

  const [reports, setReports] = useState<Concern[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedReport, setSelectedReport] = useState<Concern | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
const [photoLoading, setPhotoLoading] = useState(false)
  const [guidanceRemarks, setGuidanceRemarks] = useState('')
  const [activeMenu, setActiveMenu] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [fullName, setFullName] = useState('Guidance Office')
  const [userEmail, setUserEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
const [dialog, setDialog] = useState<{
  title: string
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  confirmLabel?: string
  cancelLabel?: string
  showCancel?: boolean
  onConfirm: () => void
} | null>(null)
  async function loadNotifications() {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  const { data, error } = await supabase
    .from('notifications')
    .select('id, report_id, title, message, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Notification error:', error.message)
    return
  }

  setNotifications(data ?? [])
  setUnreadCount((data ?? []).filter(n => !n.is_read).length)
}
function playNotificationSound() {
  if (!soundEnabled()) return

  const audio = audioContextRef.current
  if (!audio || audio.state !== 'running') return

  try {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, audio.currentTime)
    oscillator.frequency.setValueAtTime(1175, audio.currentTime + 0.12)

    gain.gain.setValueAtTime(0.0001, audio.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.15, audio.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.5)

    oscillator.connect(gain)
    gain.connect(audio.destination)

    oscillator.start()
    oscillator.stop(audio.currentTime + 0.5)
  } catch (error) {
    console.error('Notification sound failed:', error)
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

    let audio = audioContextRef.current

    if (!audio || audio.state === 'closed') {
      audio = new AudioContextClass()
      audioContextRef.current = audio
    }

    await audio.resume()

    localStorage.setItem('ccdi-notification-sound', 'enabled')
    setSoundOn(true)

    playNotificationSound()
  } catch (error) {
    console.error('Unable to enable notification sound:', error)
  }
}
async function markAsRead(notificationId: string) {
  const notification = notifications.find(n => n.id === notificationId)

  if (!notification || notification.is_read) return

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) {
    console.error(error.message)
    return
  }

  setNotifications(prev =>
    prev.map(n =>
      n.id === notificationId ? { ...n, is_read: true } : n
    )
  )

  setUnreadCount(prev => Math.max(0, prev - 1))
}
async function openNotification(notification: AdminNotification) {
  await markAsRead(notification.id)

  const { data, error } = await supabase
    .rpc('guidance_list_concerns')

  if (error || !data) {
    alert('Unable to find this concern report.')
    return
  }

  const report = (data as unknown as Concern[]).find(
    item => item.id === notification.report_id
  )

  if (!report) {
    alert('Unable to find this concern report.')
    return
  }

  setSelectedReport(report)
}

 async function loadReports() {
  setLoading(true)

  const { data, error } = await supabase
    .rpc('guidance_list_concerns')

  if (error) {
    console.error(error.message)
    setErrorMessage('Unable to load concern reports.')
  } else {
    setReports((data ?? []) as unknown as Concern[])
    setErrorMessage('')
  }

  setLoading(false)
}

  async function loadStaffProfile() {
    const { data: userData } = await supabase.auth.getUser()

    if (!userData.user) return

    setUserEmail(userData.user.email ?? '')

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userData.user.id)
      .maybeSingle()

    if (profile?.full_name) {
      setFullName(profile.full_name)
    }
  }

  async function updateStatus(reportId: string, newStatus: string) {
  const { error } = await supabase.rpc('guidance_update_concern_status', {
    p_report_id: reportId,
    p_new_status: newStatus,
    p_remarks: guidanceRemarks.trim() || null,
  })

  if (error) {
    setDialog({
      title: 'Update Failed',
      message: error.message,
      type: 'error',
      confirmLabel: 'Okay',
      onConfirm: () => setDialog(null),
    })
    return
  }

  await loadReports()
  setSelectedReport(null)
  setGuidanceRemarks('')

  setDialog({
    title: 'Report Updated',
    message: 'The report status has been updated successfully.',
    type: 'success',
    confirmLabel: 'Okay',
    onConfirm: () => setDialog(null),
  })
}

async function handleRestoreReport(report: Concern) {
  setDialog({
    title: 'Restore Report',
    message: `Are you sure you want to restore report ${report.reference_number}?`,
    type: 'warning',
    confirmLabel: 'Restore',
    cancelLabel: 'Go Back',
    showCancel: true,
    onConfirm: async () => {
      setDialog(null)

      const { error } = await supabase.rpc('guidance_restore_concern', {
        p_report_id: report.id,
      })

      if (error) {
        setDialog({
          title: 'Restore Failed',
          message: 'Unable to restore report: ' + error.message,
          type: 'error',
          confirmLabel: 'Okay',
          onConfirm: () => setDialog(null),
        })
        return
      }

      await loadReports()
      setSelectedReport(null)

      setDialog({
        title: 'Report Restored',
        message: 'The report has been restored successfully.',
        type: 'success',
        confirmLabel: 'Okay',
        onConfirm: () => setDialog(null),
      })
    },
  })
}

async function handleReviewAction(newStatus: string) {
  if (!selectedReport) return

  if (newStatus === 'Cancelled' && !guidanceRemarks.trim()) {
    setDialog({
      title: 'Remarks Required',
      message: 'Please provide a reason before cancelling this report.',
      type: 'warning',
      confirmLabel: 'Okay',
      onConfirm: () => setDialog(null),
    })
    return
  }

  const reportId = selectedReport.id

  setDialog({
    title: 'Confirm Status Change',
    message: `Are you sure you want to change this report to ${newStatus}?`,
    type: 'warning',
    confirmLabel: 'Confirm',
    cancelLabel: 'Go Back',
    showCancel: true,
    onConfirm: () => {
      setDialog(null)
      void updateStatus(reportId, newStatus)
    },
  })
}
async function handleLogout() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    alert(error.message)
    return
  }

  window.location.href = '/login'
}
useEffect(() => {
  let isActive = true

  async function loadConcernPhoto() {
    setPhotoUrl('')

    if (!selectedReport?.photo_path) {
      setPhotoLoading(false)
      return
    }

    setPhotoLoading(true)

    const { data, error } = await supabase.storage
      .from('concern-photos')
      .createSignedUrl(selectedReport.photo_path, 60 * 60)

    if (!isActive) return

    if (error) {
      console.error('Unable to load concern photo:', error.message)
      setPhotoUrl('')
    } else {
      setPhotoUrl(data.signedUrl)
    }

    setPhotoLoading(false)
  }

  void loadConcernPhoto()

  return () => {
    isActive = false
  }
}, [selectedReport?.photo_path])
  async function handlePasswordChange(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPasswordMessage('')

    if (newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match.')
      return
    }

    setSavingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setSavingPassword(false)

    if (error) {
      setPasswordMessage(error.message)
      return
    }

    setPasswordMessage('Password changed successfully!')
    setNewPassword('')
    setConfirmPassword('')
  }

  useEffect(() => {
    loadReports()
    loadStaffProfile()
  }, [])
  useEffect(() => {
  let channel: ReturnType<typeof supabase.channel>

  async function setupNotifications() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    await loadNotifications()

    channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          playNotificationSound()
          loadNotifications()
        }
      )
      .subscribe()
  }

  setupNotifications()

  return () => {
    if (channel) {
      supabase.removeChannel(channel)
    }
  }
}, [soundOn])

  const total = reports.length
  const pending = reports.filter(r =>
  ['pending', 'submitted'].includes(r.status.toLowerCase())
).length
  const inProgress = reports.filter(r => r.status.toLowerCase() === 'in progress').length
  const resolved = reports.filter(r => r.status.toLowerCase() === 'resolved').length
  const cancelled = reports.filter(r => r.status.toLowerCase() === 'cancelled').length

  function renderReportTable(reportList: Concern[]) {
    if (loading) {
      return <p className="admin-empty">Loading reports...</p>
    }

    if (reportList.length === 0) {
      return <p className="admin-empty">No concern reports found.</p>
    }

    return (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Reference No.</th>
              <th>Category</th>
              <th>Block / Section</th>
              <th>Status</th>
              <th>Date Submitted</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {reportList.map(report => (
              <tr key={report.id}>
                <td>{report.reference_number}</td>
                <td>{report.category}</td>
                <td>{report.block_section || 'N/A'}</td>
                <td>
                  <span className={`admin-status ${report.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    {report.status}
                  </span>
                </td>
                <td>{new Date(report.created_at).toLocaleDateString()}</td>
                <td>
  <button
    className="admin-view-button"
    onClick={() => setSelectedReport(report)}
  >
    View Details
  </button>

  {(report.status === 'Cancelled' &&
    ['Pending', 'Submitted', 'In Progress'].includes(report.previous_status || '')) ||
  (report.deleted_at !== null &&
    ['Pending', 'Submitted'].includes(report.status)) ? (
    <button
      className="admin-view-button"
      onClick={() => handleRestoreReport(report)}
      style={{ marginLeft: '8px' }}
    >
      Restore
    </button>
  ) : null}
</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-hidden'}`}>
        <div className="admin-sidebar-brand">
          <img src={ccdilogo} alt="CCDI Logo" className="admin-sidebar-logo" />
        </div>

        <nav className="admin-sidebar-menu" aria-label="Admin navigation">
          {menuItems.map(item => (
            <button
              key={item.label}
              className={`admin-menu-item ${activeMenu === item.label ? 'active' : ''}`}
              onClick={() => setActiveMenu(item.label)}
            >
              <span className="admin-menu-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button className="admin-menu-item admin-logout" onClick={handleLogout}>
          <span className="admin-menu-icon">↪</span>
          <span>Log Out</span>
        </button>
      </aside>

      <div className="admin-main">
       <header className="admin-topbar">
  <button
  className="admin-sidebar-toggle"
  onClick={() => setSidebarOpen(!sidebarOpen)}
  title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
  aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
>
  ☰
</button>

<div className="admin-mobile-brand">CCDI</div>
<div className="admin-topbar-spacer" />

  {/* Notification sound toggle */}
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
  {/* Notification bell */}
  <button
    className="topbar-icon notification-bell"
    onClick={() => setActiveMenu('Notifications')}
    aria-label={`Notifications, ${unreadCount} unread`}
    title="Notifications"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
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
  className="admin-user-summary admin-profile-button"
  onClick={() => setActiveMenu('Account Settings')}
  title="Open Account Settings"
>
  <div className="admin-avatar">
    {fullName.charAt(0).toUpperCase()}
  </div>

  <div className="admin-user-info">
    <strong>{fullName}</strong>
    <span>Guidance Office</span>
  </div>
</button>
</header>

        <main className="admin-content">
          {errorMessage && (
            <p className="admin-error">{errorMessage}</p>
          )}

          {activeMenu === 'Dashboard' && (
            <>
              <section className="admin-welcome">
                <p className="admin-eyebrow">CCDI GUIDANCE OFFICE</p>
                <h1>Good day, {fullName}!</h1>
                <p>Here's an overview of the student concerns.</p>
              </section>

              <section className="admin-stats">
                <article className="admin-stat">
                  <div className="admin-stat-icon blue">▤</div>
                  <div><span>Total Reports</span><strong>{total}</strong></div>
                </article>
                <article className="admin-stat">
                  <div className="admin-stat-icon yellow">◷</div>
                  <div><span>Pending</span><strong>{pending}</strong></div>
                </article>
                <article className="admin-stat">
                  <div className="admin-stat-icon purple">◉</div>
                  <div><span>In Progress</span><strong>{inProgress}</strong></div>
                </article>
                <article className="admin-stat">
                  <div className="admin-stat-icon green">✓</div>
                  <div><span>Resolved</span><strong>{resolved}</strong></div>
                </article>
                <article className="admin-stat">
                  <div className="admin-stat-icon red">×</div>
                  <div><span>Cancelled</span><strong>{cancelled}</strong></div>
                </article>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h2>Recent Concern Reports</h2>
                    <p>Latest concerns submitted by students.</p>
                  </div>
                  <button
                    className="admin-text-action"
                    onClick={() => setActiveMenu('Concern Reports')}
                  >
                    View All →
                  </button>
                </div>

                {renderReportTable(reports.slice(0, 5))}
              </section>
            </>
          )}

          {activeMenu === 'Concern Reports' && (
            <>
              <section className="admin-welcome">
                <p className="admin-eyebrow">STUDENT RECORDS</p>
                <h1>Concern Reports</h1>
                <p>Review and manage all submitted student concerns.</p>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h2>All Student Reports</h2>
                    <p>{total} report(s) submitted</p>
                  </div>
                 
                </div>
                {renderReportTable(reports)}
              </section>
            </>
          )}
{activeMenu === 'Trash' && (
  <>
    <section className="admin-welcome">
      <p className="admin-eyebrow">ARCHIVED REPORTS</p>
      <h1>Trash</h1>
      <p>Cancelled and deleted student concern reports.</p>
    </section>

    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>Cancelled and Deleted Reports</h2>
          <p>
            {reports.filter(r =>
              r.status.toLowerCase() === 'cancelled' ||
              r.deleted_at !== null
            ).length} report(s)
          </p>
        </div>
      </div>

      {renderReportTable(
        reports.filter(r =>
          r.status.toLowerCase() === 'cancelled' ||
          r.deleted_at !== null
        )
      )}
    </section>
  </>
)}
          {activeMenu === 'Notifications' && (
  <section className="admin-welcome">
    <p className="admin-eyebrow">UPDATES</p>
    <h1>Notifications</h1>
    <p>Stay updated on newly submitted student concerns.</p>

    <section className="admin-panel">
      <div className="admin-panel-heading">
        <div>
          <h2>All Notifications</h2>
          <p>{unreadCount} unread notification(s)</p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="admin-placeholder">
          <div className="admin-placeholder-icon">♧</div>
          <h2>No notifications yet</h2>
          <p>New student concern submissions will appear here.</p>
        </div>
      ) : (
        <div className="admin-notification-list">
          {notifications.map(notification => (
            <button
  key={notification.id}
  className={`admin-notification-item ${
    notification.is_read ? 'read' : 'unread'
  }`}
  onClick={() => openNotification(notification)}
>
  <div className="admin-notification-item-icon">♧</div>

  <div className="admin-notification-item-content">
    <div className="admin-notification-item-heading">
      <strong>{notification.title}</strong>

      {!notification.is_read && (
        <span className="admin-unread-dot" />
      )}
    </div>

    <p>{notification.message}</p>

    <time dateTime={notification.created_at}>
      {new Date(notification.created_at).toLocaleString()}
    </time>
  </div>
</button>
          ))}
        </div>
      )}
    </section>
  </section>
)}

          {activeMenu === 'Account Settings' && (
            <>
              <section className="admin-welcome">
                <p className="admin-eyebrow">ACCOUNT</p>
                <h1>Account Settings</h1>
                <p>Manage your Guidance Office account.</p>
              </section>

              <section className="admin-panel admin-settings-panel">
                <h2>Account Information</h2>
                <div className="admin-setting-row">
                  <span>Full Name</span>
                  <strong>{fullName}</strong>
                </div>
                <div className="admin-setting-row">
                  <span>Email Address</span>
                  <strong>{userEmail}</strong>
                </div>
                <div className="admin-setting-row">
                  <span>Account Role</span>
                  <strong>Guidance Office</strong>
                </div>

                <div className="admin-settings-divider" />

                <h2>Change Password</h2>
                <p className="admin-settings-description">
                  Use a new password that you can remember and keep private.
                </p>

                <form className="admin-password-form" onSubmit={handlePasswordChange}>
                  <label>
                    New Password
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                    />
                  </label>

                  <label>
                    Confirm New Password
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                    />
                  </label>

                  {passwordMessage && (
                    <p className="admin-password-message">{passwordMessage}</p>
                  )}

                  <button type="submit" disabled={savingPassword}>
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </section>
            </>
          )}
        </main>
      </div>

      {selectedReport && (
        <div
          className="admin-modal-overlay"
          onClick={() => setSelectedReport(null)}
        >
          {selectedReport.photo_path && (
  <div className="admin-description admin-attachment">
    <span>Photo Attachment</span>

    {photoLoading ? (
      <p>Loading photo...</p>
    ) : photoUrl ? (
      <a href={photoUrl} target="_blank" rel="noreferrer">
        <img src={photoUrl} alt="Concern attachment" />
      </a>
    ) : (
      <p>Unable to load photo attachment.</p>
    )}
  </div>
)}
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <p className="admin-eyebrow">CONCERN DETAILS</p>
                <h2>{selectedReport.reference_number}</h2>
              </div>
              <button
                className="admin-modal-close"
                onClick={() => setSelectedReport(null)}
              >
                ×
              </button>
            </div>

            <div className="admin-modal-content">
             <div className="admin-detail">
  <span>Reporting Identity</span>
  <strong>
    {selectedReport.is_anonymous
      ? 'Anonymous Student'
      : selectedReport.student_name || 'Student name unavailable'}
  </strong>
</div>
              <div className="admin-detail">
                <span>Category</span>
                <strong>{selectedReport.category}</strong>
              </div>

              <div className="admin-detail">
  <span>Report Status</span>
  <strong>{selectedReport.status}</strong>
</div>
<div className="admin-remarks-field">
  <label htmlFor="guidanceRemarks">Guidance Remarks</label>
  <textarea
    id="guidanceRemarks"
    className="admin-remarks-input"
    value={guidanceRemarks}
    onChange={(e) => setGuidanceRemarks(e.target.value)}
    placeholder="Explain your review decision or resolution..."
    rows={4}
  />
</div>
<div className="admin-review-actions">
  {!selectedReport.deleted_at &&
  ['Pending', 'Submitted'].includes(selectedReport.status) && (
    <>
      <button
        className="admin-accept-button"
        onClick={() => handleReviewAction('In Progress')}
      >
        Accept & Start Review
      </button>

      <button
        className="admin-reject-button"
        onClick={() => handleReviewAction('Cancelled')}
      >
        Reject / Cancel
      </button>
    </>
  )}

 {!selectedReport.deleted_at &&
  selectedReport.status === 'In Progress' && (
    <>
      <button
        className="admin-resolve-button"
        onClick={() => handleReviewAction('Resolved')}
      >
        Mark as Resolved
      </button>

      <button
        className="admin-reject-button"
        onClick={() => handleReviewAction('Cancelled')}
      >
        Cancel Report
      </button>
    </>
  )}

  {['Resolved', 'Cancelled'].includes(selectedReport.status) && (
    <p>This report has already been closed.</p>
  )}
</div>

              <div className="admin-detail">
                <span>Block / Section</span>
                <strong>{selectedReport.block_section || 'N/A'}</strong>
              </div>

              <div className="admin-detail">
                <span>Date Submitted</span>
                <strong>{new Date(selectedReport.created_at).toLocaleString()}</strong>
              </div>

              <div className="admin-description">
                <span>Concern Description</span>
                <p>{selectedReport.description}</p>
              </div>
            </div>

            <button
              className="admin-modal-done"
              onClick={() => setSelectedReport(null)}
            >
              Close
            </button>
          </div>
        </div>
        
      )}
      {dialog && (
  <CustomDialog
    {...dialog}
    onCancel={() => setDialog(null)}
  />
)}
    </div>
  )
}

export default AdminDashboard
