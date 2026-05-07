import { NavLink } from "react-router-dom";
import "./Navbar.css";

function Navbar({ onLogout, user, searchQuery, onSearchChange }) {
  const userName =
    user?.firstName || user?.lastName
      ? `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
      : "User";

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Left: brand */}
        <div className="navbar-left">
          <div className="navbar-logo">B</div>
          <div className="navbar-title">BookSocial</div>
        </div>

        {/* Center: search */}
        <div className="navbar-center">
          <div className="navbar-search">
            <input
              className="input navbar-search"
              placeholder="Search books, authors..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
            />
          </div>
        </div>

        {/* Right: nav + user + logout */}
        <div className="navbar-right">
          <nav className="navbar-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `navbar-link ${isActive ? "navbar-link-active" : ""}`
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `navbar-link ${isActive ? "navbar-link-active" : ""}`
              }
            >
              Profile
            </NavLink>
          </nav>

          <div className="navbar-user">Hi, {userName}</div>

          <button className="btn btn-primary navbar-upload-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
