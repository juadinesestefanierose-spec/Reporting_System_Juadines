
import './LoginPage.css'
import Header from '../components/Header'
import Footer from '../components/Footer'
import LoginForm from '../components/LoginForm'

function LoginPage() {
  return (
    <div className="login-page">
      <Header />

      <main className="login-hero">
        <section className="login-title">
          <h1>
            CCDI Student
            <br />
            Guidance
            <br />
            Counseling
            <br />
            System
          </h1>
        </section>

        <div className="login-form-container">
          <LoginForm />
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default LoginPage
