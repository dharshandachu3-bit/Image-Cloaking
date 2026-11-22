import React, { useState } from 'react';
import {
  BarChart3,
  Cpu,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  Sliders,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../context/AuthContext';
import type { DashboardTab } from '../types';

interface DashboardLayoutProps {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  onBackToLanding: () => void;
  children: React.ReactNode;
}

const SIDEBAR_ITEMS: { id: DashboardTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'studio', label: 'Cloaking Studio', icon: Sliders },
  { id: 'history', label: 'Image History', icon: History },
  { id: 'models', label: 'Model Information', icon: Cpu },
  { id: 'analytics', label: 'Research Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'profile', label: 'Profile', icon: User },
];

const TAB_TITLES: Record<DashboardTab, string> = {
  dashboard: 'Dashboard',
  studio: 'Cloaking Studio',
  results: 'Results & Comparison',
  history: 'Image History',
  models: 'Model Information',
  analytics: 'Research Analytics',
  settings: 'Settings',
  profile: 'Profile',
};

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  activeTab,
  onSelectTab,
  onBackToLanding,
  children,
}) => {
  const { user, logout, backendStatus, backendHealth, latestResult } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    onBackToLanding();
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between bg-[#0B1222] border-r border-slate-800/80">
      <div>
        {/* Brand */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80">
          <button
            type="button"
            onClick={onBackToLanding}
            className="flex items-center gap-2.5 text-left focus-visible:outline-none"
          >
            <Shield className="h-5 w-5 text-[#397BFF] shrink-0" />
            <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
              CloakVision
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary 7 Sidebar Items */}
        <nav aria-label="Workspace navigation" className="px-3 py-4 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id || (item.id === 'studio' && activeTab === 'results');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#397BFF]/15 text-white border border-[#397BFF]/35'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#00D4FF]' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {latestResult && (
            <button
              type="button"
              onClick={() => {
                onSelectTab('results');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between rounded-lg px-3.5 py-2 text-xs font-medium transition-colors mt-2 ${
                activeTab === 'results'
                  ? 'bg-[#00D4FF]/15 text-[#00D4FF]'
                  : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <span className="truncate">Latest Result: {latestResult.fileName}</span>
            </button>
          )}
        </nav>
      </div>

      {/* 8th Item: Logout + User Footer */}
      <div className="border-t border-slate-800/80 p-4 space-y-3">
        {user && (
          <div className="px-2">
            <p className="text-xs font-semibold text-white truncate">{user.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080D1B] text-slate-100 flex">
      {/* Desktop Fixed Sidebar (256px) */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 max-w-[80vw] h-full">{renderSidebarContent()}</div>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-800/80 bg-[#080D1B]/90 backdrop-blur-md px-5 py-3.5 lg:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden rounded-lg border border-slate-800 p-2 text-slate-300 hover:text-white"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
              <span className="hidden sm:inline">Workspace</span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-white truncate">{TAB_TITLES[activeTab]}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 text-xs">
            <button
              type="button"
              onClick={() => onSelectTab('settings')}
              className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  backendStatus === 'connected'
                    ? 'bg-emerald-400'
                    : backendStatus === 'checking'
                    ? 'bg-[#00D4FF]'
                    : 'bg-amber-400'
                }`}
              />
              <span>
                {backendStatus === 'connected'
                  ? `FastAPI Connected (${backendHealth?.device.toUpperCase()})`
                  : backendStatus === 'checking'
                  ? 'Checking FastAPI...'
                  : 'FastAPI Offline'}
              </span>
            </button>

            {activeTab !== 'studio' && (
              <button
                type="button"
                onClick={() => onSelectTab('studio')}
                className="hidden sm:inline-flex items-center rounded-lg bg-[#397BFF] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#2B68E8] whitespace-nowrap"
              >
                New Cloak
              </button>
            )}
          </div>
        </header>

        {/* Active Module Content */}
        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
