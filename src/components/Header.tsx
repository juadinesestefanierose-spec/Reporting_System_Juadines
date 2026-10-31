
import './Header.css'
import logo from '../assets/ccdilogo.png'

function Header() {
  return (
    <header className="site-header">
      <img src={logo} alt="CCDI Logo" className="site-header-logo" />
    </header>
  )
}

export default Header
