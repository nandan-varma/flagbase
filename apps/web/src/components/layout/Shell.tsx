import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { EnvSwitcher } from './EnvSwitcher'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
          <div />
          <EnvSwitcher />
        </header>
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
