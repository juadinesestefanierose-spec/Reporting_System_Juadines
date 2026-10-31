import './ProfilePage.css'

type ProfilePageProps = {
  fullName: string
  email: string
}

function ProfilePage({ fullName, email }: ProfilePageProps) {
  return (
    <main className="profile-page">
      <p className="profile-eyebrow">STUDENT PORTAL</p>
      <h1>My Profile</h1>
      <p className="profile-subtitle">
        View your account information.
      </p>

      <section className="profile-card">
        <div className="profile-avatar">
          {fullName.charAt(0).toUpperCase()}
        </div>

        <h2>{fullName}</h2>
        <p className="profile-role">Student</p>

        <div className="profile-detail">
          <span>Full Name</span>
          <strong>{fullName}</strong>
        </div>

        <div className="profile-detail">
          <span>Email Address</span>
          <strong>{email}</strong>
        </div>
      </section>
    </main>
  )
}

export default ProfilePage