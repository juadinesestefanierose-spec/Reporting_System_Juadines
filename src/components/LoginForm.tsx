
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import './LoginForm.css'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage('Login failed. Check your email and password.')
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, role, is_approved')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError || !profile || !profile.is_approved) {
      await supabase.auth.signOut()
      setMessage('Your account is not approved. Contact your Guidance Office.')
      setLoading(false)
      return
    }

   setMessage(`Welcome, ${profile.full_name}! Opening your dashboard...`)
window.location.href = '/'
    setLoading(false)
  }

  return (
    <section className="login-card">
      <h2>Welcome! Login to your Account</h2>

      <form onSubmit={handleLogin}>
        <div className="login-input">
          <span aria-hidden="true">👨🏻‍⚖️</span>
          <input
            type="email"
            placeholder="EMAIL"
            aria-label="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="login-input">
          <span aria-hidden="true">🔒︎</span>
          <input
            type="password"
            placeholder="PASSWORD"
            aria-label="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <label className="remember-option">
          <input type="checkbox" defaultChecked />
          <span>Remember me</span>
        </label>

        <button className="login-button" type="submit" disabled={loading}>
          {loading ? 'LOGGING IN...' : 'LOGIN'}
        </button>

        <button
          className="forgot-button"
          type="button"
          onClick={() =>
            alert('Please contact your Guidance Office for assistance.')
          }
        >
          Forgot Password?
        </button>

        {message && <p role="status">{message}</p>}
      </form>
    </section>
  )
}

export default LoginForm
