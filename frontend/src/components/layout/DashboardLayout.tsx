import { FC } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import './layout.css'

export const DashboardLayout: FC = () => {
  return (
    <div className="app-container">
      <Navbar />
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  )
}

