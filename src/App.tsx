
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AdminDashboard from './pages/AdminDashboard'

type UserProfile = {
  role: string
  is_approved: boolean
}

function App() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [checkingProfile, setCheckingProfile] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCheckingSession(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    async function loadProfile() {
      if (!session?.user) {
        setProfile(null)
        setCheckingProfile(false)
        return
      }

      setCheckingProfile(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('role, is_approved')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Unable to load profile:', error.message)
        setProfile(null)
      } else {
        setProfile(data)
      }

      setCheckingProfile(false)
    }

    loadProfile()
  }, [session])

  if (checkingSession || (session && checkingProfile)) {
    return <p>Loading...</p>
  }

  if (!session) {
    return <LoginPage />
  }

  if (!profile || !profile.is_approved) {
    return (
      <main className="access-denied">
        <h2>Access Restricted</h2>
        <p>Your account is not approved or your profile could not be loaded.</p>
        <button onClick={() => supabase.auth.signOut()}>
          Sign Out
        </button>
      </main>
    )
  }

  if (profile.role === 'student') {
    return <DashboardPage />
  }

  if (profile.role === 'guidance') {
    return <AdminDashboard />
  }

  return (
    <main className="access-denied">
      <h2>Access Restricted</h2>
      <p>Your account does not have an authorized role.</p>
      <button onClick={() => supabase.auth.signOut()}>
        Sign Out
      </button>
    </main>
  )
}

export default App
