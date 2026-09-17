import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useProjectData } from '../../context/ProjectDataContext'
import type { Role } from '../../types'
import {
  Bell,
  Search,
  RotateCcw,
  LogOut,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
  CheckCircle2,
} from 'lucide-react'

interface TopBarProps {
  title?: string
  subtitle?: string
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle }) => {
  const { currentUser, role, users, switchRole, switchUser, logout } = useAuth()
  const { notifications, unreadAlertsCount, markNotificationRead, resetDemoData } = useProjectData()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState(false)

  const roleMenuRef = useRef<HTMLDivElement>(null)
  const notifMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setShowRoleMenu(false)
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRoleMenu(false)
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/projects?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const roleLabelMap: Record<Role, string> = {
    dm: 'District Authority',
    mp: 'Member of Parliament',
    nodal: 'State Nodal Authority',
    mospi: 'Central MoSPI Authority',
  }

  const roleJurisdictionMap: Record<Role, string> = {
    dm: `District Administration • ${currentUser.district || 'Rajsamand'}`,
    mp: `Parliamentary Constituency • ${currentUser.constituency || 'Rajsamand'}, ${currentUser.state || 'Rajasthan'}`,
    nodal: `State Monitoring • ${currentUser.state || 'Rajasthan'}`,
    mospi: 'National MPLADS Cell • New Delhi',
  }

  const PRIMARY_ROLE_PERSONAS: Array<{
    role: Role
    title: string
    subtitle: string
  }> = [
    {
      role: 'mospi',
      title: 'Central MoSPI Authority',
      subtitle: 'National MPLADS Cell',
    },
    {
      role: 'mp',
      title: 'Member of Parliament',
      subtitle: 'Parliamentary Constituency',
    },
    {
      role: 'dm',
      title: 'District Authority',
      subtitle: 'District Administration',
    },
    {
      role: 'nodal',
      title: 'State Nodal Officer',
      subtitle: 'State Monitoring',
    },
  ]

  const handleRoleSelect = (targetRole: Role) => {
    if (role === targetRole) {
      setShowRoleMenu(false)
      return
    }
    switchRole(targetRole)
    setShowRoleMenu(false)
    navigate('/dashboard')
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0">
      {/* Government Tricolor Micro Strip */}
      <div className="h-1 w-full flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      <div className="px-6 py-3 flex items-center justify-between gap-4">
        {/* Contextual Title & Breadcrumb */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {roleLabelMap[role]}
            </span>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs font-medium text-slate-600 truncate">
              {role === 'dm' && `${currentUser.district} District, ${currentUser.state}`}
              {role === 'mp' && `${currentUser.constituency} Constituency`}
              {role === 'nodal' && `${currentUser.state} State`}
              {role === 'mospi' && 'National MPLADS Cell, New Delhi'}
            </span>
          </div>
          {title && (
            <h1 className="text-lg font-bold text-slate-900 tracking-tight truncate mt-1">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-xs text-slate-500 truncate mt-0.5 hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>

        {/* Center: Search */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative max-w-sm w-full">
          <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Work ID, Project, Contractor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:bg-white text-slate-900 placeholder:text-slate-400"
          />
        </form>

        {/* Right Controls: Role Switcher, Alerts, User Profile */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* SIH Hackathon Role Switcher Dropdown */}
          <div className="relative" ref={roleMenuRef}>
            <button
              type="button"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border transition-all cursor-pointer shadow-2xs ${
                showRoleMenu
                  ? 'bg-blue-50/80 border-blue-400 text-blue-900 ring-2 ring-blue-500/20'
                  : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800 hover:border-slate-400'
              }`}
              title="Switch demo persona for SIH presentation"
              aria-expanded={showRoleMenu}
              aria-haspopup="true"
            >
              <SlidersHorizontal size={13} className="text-blue-600 shrink-0" />
              <span className="hidden sm:inline text-slate-600 font-medium">Demo Role:</span>
              <span className="font-mono font-bold text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded text-[11px]">
                {role.toUpperCase()}
              </span>
              <span className="text-slate-600 font-bold text-xs">
                {showRoleMenu ? '▴' : '▾'}
              </span>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3.5 py-1.5 text-xs font-mono text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between font-semibold">
                  <span>SWITCH PERSONA (SIH DEMO)</span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-sans">Simulated</span>
                </div>
                <div className="p-2 space-y-1">
                  {PRIMARY_ROLE_PERSONAS.map((p) => {
                    const isActive = role === p.role
                    return (
                      <button
                        key={p.role}
                        onClick={() => handleRoleSelect(p.role)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-blue-50/90 text-blue-950 font-semibold border border-blue-200/80 shadow-2xs'
                            : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="mt-0.5 shrink-0">
                            {isActive ? (
                              <CheckCircle2 size={16} className="text-blue-600" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">{p.title}</div>
                            <div className="text-[11px] text-slate-500 font-mono truncate">{p.subtitle}</div>
                          </div>
                        </div>
                        {isActive && (
                          <span className="text-[10px] font-mono uppercase bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded shrink-0 ml-2">
                            ✓ ACTIVE
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* MP Constituency Persona Switcher (Section 4, 17, 18) */}
                {role === 'mp' && (
                  <div className="border-t border-slate-100 mt-1 pt-2 px-3 pb-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block mb-1">
                      SELECT MP CONSTITUENCY:
                    </span>
                    <div className="space-y-1">
                      {users
                        .filter((u) => u.role === 'mp')
                        .map((u) => {
                          const isCurrentMp = currentUser.id === u.id
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                switchUser(u.id)
                                setShowRoleMenu(false)
                                navigate('/dashboard')
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                isCurrentMp
                                  ? 'bg-blue-100/70 text-blue-950 font-bold border border-blue-200'
                                  : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="truncate font-semibold">{u.displayName}</div>
                                <div className="text-[10px] text-slate-500 font-mono truncate">
                                  {u.constituency} Constituency, {u.state}
                                </div>
                              </div>
                              {isCurrentMp && (
                                <span className="text-[10px] text-blue-700 bg-blue-100 font-mono font-bold px-1.5 py-0.5 rounded ml-1.5 shrink-0">
                                  ACTIVE
                                </span>
                              )}
                            </button>
                          )
                        })}
                    </div>
                  </div>
                )}

                {/* Secondary Jurisdiction Context */}
                <div className="border-t border-slate-100 mt-1 pt-2 px-3.5 pb-1">
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    <span className="text-slate-400">Active Jurisdiction:</span>{' '}
                    <strong className="text-slate-700">{currentUser.displayName}</strong>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {roleJurisdictionMap[role]}
                  </div>
                </div>

                <div className="border-t border-slate-100 mt-1 pt-1.5 px-3.5">
                  <button
                    onClick={() => {
                      resetDemoData()
                      setShowRoleMenu(false)
                    }}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 w-full py-1 cursor-pointer font-medium"
                  >
                    <RotateCcw size={12} />
                    Reset Prototype State to Default
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications Popover */}
          <div className="relative" ref={notifMenuRef}>
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Open notifications"
            >
              <Bell size={18} />
              {unreadAlertsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-mono font-bold flex items-center justify-center">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 tracking-tight">
                    Operational Alerts ({unreadAlertsCount} unread)
                  </span>
                  <button
                    onClick={() => {
                      setShowNotifications(false)
                      navigate('/notifications')
                    }}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    View All <ExternalLink size={11} />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.slice(0, 5).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationRead(notif.id)
                        setShowNotifications(false)
                        if (notif.projectId) navigate(`/projects/${encodeURIComponent(notif.projectId)}`)
                      }}
                      className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                        !notif.read ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {notif.kind === 'critical' ? (
                          <ShieldAlert size={15} className="text-rose-600 shrink-0 mt-0.5" />
                        ) : (
                          <Bell size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 line-clamp-1">{notif.title}</div>
                          <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">{notif.message}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-1">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-7 h-7 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center justify-center font-mono">
              {currentUser.displayName.charAt(0)}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-slate-900 line-clamp-1 leading-tight">
                {currentUser.displayName}
              </div>
              <div className="text-[10px] text-slate-500 line-clamp-1 font-mono leading-tight">
                {currentUser.designation}
              </div>
            </div>
            <button
              onClick={() => {
                logout()
                navigate('/')
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 ml-1 cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
