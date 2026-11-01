
import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import './ProfilePage.css'

type ProfilePageProps = {
  fullName: string
  email: string
}

function ProfilePage({ fullName, email }: ProfilePageProps) {
  const [schoolId, setSchoolId] = useState('Loading...')

  const [currentName, setCurrentName] = useState(fullName)
const [currentEmail] = useState(email)

  const [newName, setNewName] = useState(fullName)
  const [newEmail, setNewEmail] = useState(email)

  const [nameMessage, setNameMessage] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')

  const [nameMessageType, setNameMessageType] = useState<'success' | 'error' | ''>('')
  const [emailMessageType, setEmailMessageType] = useState<'success' | 'error' | ''>('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  const [savingName, setSavingName] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    async function loadSchoolId() {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        setSchoolId('Not available')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', userData.user.id)
        .maybeSingle()

      if (error) {
        console.error('Unable to load school ID:', error.message)
        setSchoolId('Not available')
      } else {
        setSchoolId(data?.school_id || 'Not available')
      }
    }

    loadSchoolId()
  }, [])

  async function handleNameChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setNameMessage('')
    setNameMessageType('')

    if (!newName.trim()) {
      setNameMessage('Please enter your full name.')
      setNameMessageType('error')
      return
    }

    setSavingName(true)

    const { data: userData, error: userError } =
      await supabase.auth.getUser()

    if (userError || !userData.user) {
      setNameMessage('Unable to verify your account. Please log in again.')
      setNameMessageType('error')
      setSavingName(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: newName.trim() })
      .eq('id', userData.user.id)

    if (error) {
      console.error('Name update error:', error.message)
      setNameMessage(`Unable to update name: ${error.message}`)
      setNameMessageType('error')
    } else {
      setCurrentName(newName.trim())
      setNewName(newName.trim())
      setNameMessage('Your name has been updated successfully.')
      setNameMessageType('success')
    }

    setSavingName(false)
  }

  async function handleEmailChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setEmailMessage('')
    setEmailMessageType('')

    const trimmedEmail = newEmail.trim().toLowerCase()

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailMessage('Please enter a valid email address.')
      setEmailMessageType('error')
      return
    }

    if (trimmedEmail === currentEmail.toLowerCase()) {
      setEmailMessage('Please enter a different email address.')
      setEmailMessageType('error')
      return
    }

    setSavingEmail(true)

    const { error } = await supabase.auth.updateUser({
      email: trimmedEmail,
    })

    if (error) {
      setEmailMessage(error.message)
      setEmailMessageType('error')
    } else {
      setEmailMessage(
        'Email change requested. Check your new email inbox for the verification link.'
      )
      setEmailMessageType('success')
    }

    setSavingEmail(false)
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setPasswordMessage('')
    setMessageType('')

    if (newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters.')
      setMessageType('error')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match.')
      setMessageType('error')
      return
    }

    setSavingPassword(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setPasswordMessage(error.message)
      setMessageType('error')
    } else {
      setPasswordMessage('Your password has been changed successfully.')
      setMessageType('success')
      setNewPassword('')
      setConfirmPassword('')
    }

    setSavingPassword(false)
  }

  return (
    <main className="profile-page">
      <p className="profile-eyebrow">STUDENT PORTAL</p>
      <h1>My Profile</h1>
      <p className="profile-subtitle">
        Manage your account information and password.
      </p>

      <section className="profile-card">
        <div className="profile-heading">
          <div className="profile-avatar">
            {currentName.charAt(0).toUpperCase()}
          </div>

          <div>
            <h2>{currentName}</h2>
            <p className="profile-role">Student Account</p>
          </div>
        </div>

        <div className="profile-section-title">
          <h3>Account Information</h3>
          <p>Your registered student details.</p>
        </div>

        <div className="profile-detail">
          <span>Full Name</span>
          <strong>{currentName}</strong>
        </div>

        <div className="profile-detail">
          <span>School ID</span>
          <strong>{schoolId}</strong>
        </div>

        <div className="profile-detail">
          <span>Email Address</span>
          <strong>{currentEmail || 'Not available'}</strong>
        </div>

        <div className="profile-detail">
          <span>Account Type</span>
          <strong>Student</strong>
        </div>
      </section>

      <section className="password-card">
        <div className="profile-section-title">
          <h3>Edit Full Name</h3>
          <p>Update the name displayed on your student account.</p>
        </div>

        <form onSubmit={handleNameChange}>
          <div className="password-field">
            <label htmlFor="newName">Full Name</label>
            <input
              id="newName"
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>

          {nameMessage && (
            <p className={`password-message ${nameMessageType}`}>
              {nameMessage}
            </p>
          )}

          <button
            type="submit"
            className="change-password-button"
            disabled={savingName}
          >
            {savingName ? 'Saving...' : 'Save Name'}
          </button>
        </form>
      </section>

      <section className="password-card">
        <div className="profile-section-title">
          <h3>Change Email Address</h3>
          <p>Update the email address used to log in to your account.</p>
        </div>

        <form onSubmit={handleEmailChange}>
          <div className="password-field">
            <label htmlFor="newEmail">New Email Address</label>
            <input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="Enter your new email address"
              required
            />
          </div>

          {emailMessage && (
            <p className={`password-message ${emailMessageType}`}>
              {emailMessage}
            </p>
          )}

          <button
            type="submit"
            className="change-password-button"
            disabled={savingEmail}
          >
            {savingEmail ? 'Updating...' : 'Update Email'}
          </button>
        </form>
      </section>

      <section className="password-card">
        <div className="profile-section-title">
          <h3>Change Password</h3>
          <p>Update your account password regularly to keep your account secure.</p>
        </div>

        <form onSubmit={handlePasswordChange}>
          <div className="password-field">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Enter new password"
              minLength={6}
              required
            />
          </div>

          <div className="password-field">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter new password"
              minLength={6}
              required
            />
          </div>

          {passwordMessage && (
            <p className={`password-message ${messageType}`}>
              {passwordMessage}
            </p>
          )}

          <button
            type="submit"
            className="change-password-button"
            disabled={savingPassword}
          >
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default ProfilePage
