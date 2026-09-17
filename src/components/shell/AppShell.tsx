import React from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ActionCenter } from './ActionCenter'

interface AppShellProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  hideActionCenter?: boolean
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  title,
  subtitle,
  hideActionCenter = false,
}) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100/70 font-sans antialiased text-slate-900">
      {/* Dynamic Left Sidebar */}
      <Sidebar />

      {/* Main Column */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Top Command Bar */}
        <TopBar title={title} subtitle={subtitle} />

        {/* Content Area + Action Center */}
        <div className="flex flex-1 min-w-0 overflow-hidden">
          {/* Main Scrollable Viewport */}
          <main className="flex-1 min-w-0 overflow-y-auto p-5 sm:p-6 lg:p-7">
            <div className="w-full max-w-7xl mx-auto space-y-6">{children}</div>
          </main>

          {/* Right Action Center Strip */}
          {!hideActionCenter && <ActionCenter />}
        </div>
      </div>
    </div>
  )
}
