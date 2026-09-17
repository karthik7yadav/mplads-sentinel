import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectData } from '../context/ProjectDataContext'
import { useAuth } from '../context/AuthContext'
import { AppShell } from '../components/shell/AppShell'
import { EmptyState } from '../components/common/EmptyState'
import { formatDate } from '../lib/format'
import {
  Bell,
  ShieldAlert,
  AlertTriangle,
  ClipboardCheck,
  CheckCheck,
  ArrowRight,
} from 'lucide-react'

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useProjectData()
  const { role } = useAuth()
  const navigate = useNavigate()

  const [kindFilter, setKindFilter] = useState<string>('all')

  const filteredNotifications = notifications.filter((n) => {
    if (kindFilter !== 'all' && n.kind !== kindFilter) return false
    return true
  })

  return (
    <AppShell
      title="Operational Alerts & Notifications"
      subtitle="Role-scoped review priority notices and authoritative risk compliance signals."
    >
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
            <Bell size={16} className="text-blue-600" />
            Alert Dispatch Center
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Filtered automatically for your administrative tier ({role.toUpperCase()}).
          </p>
        </div>

        <button
          type="button"
          onClick={markAllNotificationsRead}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
        >
          <CheckCheck size={14} className="text-blue-600" /> Mark All as Read
        </button>
      </div>

      {/* Filter Chips (Critical, High, Inspection, Update) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-mono">
        {['all', 'critical', 'high', 'inspection', 'update'].map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setKindFilter(kind)}
            className={`px-3 py-1 rounded-md uppercase transition-colors cursor-pointer ${
              kindFilter === kind
                ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {kind}
          </button>
        ))}
      </div>

      {/* Notification Items List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <EmptyState
            title="No alerts in this category"
            description="You are caught up with all operational notices for your jurisdiction."
            variant="success"
          />
        ) : (
          filteredNotifications.map((notif) => {
            const isCritical = notif.kind === 'critical'
            const isHigh = notif.kind === 'high'
            const isInsp = notif.kind === 'inspection'

            const borderStyle = isCritical
              ? 'border-rose-300 bg-rose-50/30'
              : isHigh
                ? 'border-amber-300 bg-amber-50/30'
                : isInsp
                  ? 'border-blue-300 bg-blue-50/30'
                  : 'border-slate-200 bg-white'

            return (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border transition-all ${borderStyle} ${
                  !notif.read ? 'shadow-xs ring-1 ring-blue-500/20' : 'opacity-85'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs shrink-0 mt-0.5">
                      {isCritical ? (
                        <ShieldAlert size={18} className="text-rose-600" />
                      ) : isHigh ? (
                        <AlertTriangle size={18} className="text-amber-600" />
                      ) : isInsp ? (
                        <ClipboardCheck size={18} className="text-blue-600" />
                      ) : (
                        <Bell size={18} className="text-slate-600" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">{notif.title}</h4>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                            isCritical
                              ? 'bg-rose-100 text-rose-800'
                              : isHigh
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {notif.kind}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-700 leading-relaxed max-w-2xl">
                        {notif.message}
                      </p>

                      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>{formatDate(notif.createdAt)}</span>
                        {notif.district && <span>• {notif.district}</span>}
                        {notif.projectId && (
                          <span className="text-blue-700 font-bold">
                            • Work ID: {notif.projectId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {notif.projectId && (
                      <button
                        type="button"
                        onClick={() => {
                          markNotificationRead(notif.id)
                          if (notif.projectId) {
                            navigate(`/projects/${encodeURIComponent(notif.projectId)}`)
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        Inspect Work <ArrowRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </AppShell>
  )
}
