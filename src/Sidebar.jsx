// Sidebar.jsx
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {
  return (
    <aside className="sidebar">
      <h3 className="sidebar-title">Menu</h3>

      <nav className="sidebar-nav">
        <NavLink to="/" end className="sidebar-link">
          🏠 Home Feed
        </NavLink>

        <NavLink to="/explore" className="sidebar-link">
          🔍 Explore
        </NavLink>

        <NavLink to="/profile" className="sidebar-link">
          🙋 My Profile
        </NavLink>

        <NavLink to="/add-book" className="sidebar-link">
          ➕ Add Book
        </NavLink>

        <NavLink to="/saved" className="sidebar-link">
          ⭐ Saved
        </NavLink>
      </nav>

      <div className="sidebar-footer">Book Social Platform</div>
    </aside>
  );
}

export default Sidebar;
