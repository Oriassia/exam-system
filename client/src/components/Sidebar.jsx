import React from 'react'
import { NavLink } from 'react-router-dom'
import '../styles/Sidebar.css'

const TABS = [
  { path: '/exam', label: 'Take Exam' },
  { path: '/history', label: 'History' }
]

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-title">Exam System</div>
      <ul className="sidebar-nav">
        {TABS.map((tab) => (
          <li key={tab.path}>
            <NavLink
              to={tab.path}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Sidebar
