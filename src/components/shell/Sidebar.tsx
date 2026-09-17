import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useProjectData } from '../../context/ProjectDataContext'
import {
  LayoutDashboard,
  FolderKanban,
  ListOrdered,
  ClipboardCheck,
  Bell,
  FileText,
  Lightbulb,
  Compass,
  MapPin,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react'

export const Sidebar: React.FC = () => {
  const { role, currentUser } = useAuth()
  const { priorityQueue, unreadAlertsCount } = useProjectData()
  const location = useLocation()

  // Dynamic Navigation Items per role specified in Section 8
  const getNavItems = () => {
    switch (role) {
      case 'mp':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/suggestions', label: 'Citizen Needs & Suggestions', icon: Lightbulb },
          { to: '/recommendations', label: 'My Recommendations', icon: Compass },
          { to: '/projects', label: 'Projects', icon: FolderKanban },
          { to: '/notifications', label: 'Notifications', icon: Bell, badge: unreadAlertsCount },
        ]
      case 'dm':
        return [
          { to: '/dashboard', label: 'District Monitoring', icon: LayoutDashboard },
          { to: '/projects', label: 'Projects', icon: FolderKanban },
          {
            to: '/priority-queue',
            label: 'Priority Queue',
            icon: ListOrdered,
            badge: priorityQueue.length > 0 ? priorityQueue.length : undefined,
          },
          { to: '/verification', label: 'Verification & Findings', icon: ClipboardCheck },
          { to: '/notifications', label: 'Notifications', icon: Bell, badge: unreadAlertsCount },
          { to: '/reports', label: 'Reports', icon: FileText },
        ]
      case 'nodal':
        return [
          { to: '/dashboard', label: 'State Dashboard', icon: LayoutDashboard },
          { to: '/projects', label: 'Projects', icon: FolderKanban },
          {
            to: '/priority-queue',
            label: 'State Priority Queue',
            icon: ListOrdered,
            badge: priorityQueue.length > 0 ? priorityQueue.length : undefined,
          },
          { to: '/verification', label: 'Verification Monitor', icon: ClipboardCheck },
          { to: '/district-monitoring', label: 'District Comparison', icon: MapPin },
          { to: '/reports', label: 'Reports', icon: FileText },
          { to: '/notifications', label: 'Notifications', icon: Bell, badge: unreadAlertsCount },
        ]
      case 'mospi':
      default:
        return [
          { to: '/dashboard', label: 'National Command Center', icon: LayoutDashboard },
          { to: '/projects', label: 'Projects', icon: FolderKanban },
          {
            to: '/priority-queue',
            label: 'Priority Queue',
            icon: ListOrdered,
            badge: priorityQueue.length > 0 ? priorityQueue.length : undefined,
          },
          { to: '/state-monitoring', label: 'State Risk Overview', icon: MapPin },
          { to: '/risk-analysis', label: 'Risk Patterns', icon: TrendingUp },
          { to: '/verification', label: 'Investigations & Review', icon: ClipboardCheck },
          { to: '/reports', label: 'Reports', icon: FileText },
          { to: '/notifications', label: 'Notifications', icon: Bell, badge: unreadAlertsCount },
        ]
    }
  }

  const navItems = getNavItems()

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <ShieldCheck size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
              MPLADS SENTINEL
            </div>
            <div className="text-xs text-slate-400 font-mono tracking-wider uppercase">
              Risk Intelligence Cell
            </div>
          </div>
        </div>
      </div>

      {/* Role Context Pill */}
      <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-800 text-xs">
        <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">Active Scope</div>
        <div className="font-semibold text-slate-100 text-sm truncate mt-0.5">
          {role === 'dm' && `${currentUser.district} District`}
          {role === 'mp' && `${currentUser.constituency} Constituency`}
          {role === 'nodal' && `${currentUser.state} State`}
          {role === 'mospi' && 'National Overview'}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to))

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-semibold ring-1 ring-blue-400/40'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white active:scale-[0.98]'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  size={18}
                  className={`shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    isActive ? 'bg-white text-blue-700' : 'bg-rose-500 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer Authority Info */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase text-slate-500 font-semibold">Decision Support</span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Engine active" />
        </div>
        <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
          AI-assisted monitoring layer. Administrative decisions remain human-authorized.
        </p>
      </div>
    </aside>
  )
}
