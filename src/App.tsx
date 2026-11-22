import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { CloakingStudio } from './components/CloakingStudio';
import { CloakResultsView } from './components/CloakResultsView';
import { DashboardLayout } from './components/DashboardLayout';
import { ImageHistoryView } from './components/ImageHistoryView';
import { LandingPage } from './components/LandingPage';
import { ModelInfoView } from './components/ModelInfoView';
import { OverviewDashboard } from './components/OverviewDashboard';
import { ProfileView } from './components/ProfileView';
import { ResearchAnalytics } from './components/ResearchAnalytics';
import { SettingsView } from './components/SettingsView';
import type { DashboardTab } from './types';

function AppShell() {
  const { user, authReady } = useApp();
  const [view, setView] = useState<'landing' | 'workspace'>('landing');
  const [activeTab, setActiveTab] = useState<DashboardTab>('studio');
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(null);
  const [pendingTab, setPendingTab] = useState<DashboardTab>('studio');

  const openWorkspace = (targetTab: DashboardTab = 'studio') => {
    if (user) {
      setActiveTab(targetTab);
      setView('workspace');
    } else {
      setPendingTab(targetTab);
      setAuthModalMode('register');
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#080D1B] flex items-center justify-center text-sm text-slate-400">
        Initializing secure session...
      </div>
    );
  }

  // Protected Dashboard Route Gate: require authentication before rendering workspace
  if (view === 'workspace') {
    if (!user) {
      return (
        <AuthModal
          embedded
          initialMode="login"
          onSuccess={() => {
            setActiveTab(pendingTab);
            setView('workspace');
          }}
        />
      );
    }

    return (
      <DashboardLayout
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onBackToLanding={() => setView('landing')}
      >
        {activeTab === 'dashboard' && <OverviewDashboard onNavigate={setActiveTab} />}
        {activeTab === 'studio' && (
          <CloakingStudio
            onComplete={() => setActiveTab('results')}
            onOpenSettings={() => setActiveTab('settings')}
          />
        )}
        {activeTab === 'results' && (
          <CloakResultsView onBackToStudio={() => setActiveTab('studio')} />
        )}
        {activeTab === 'history' && (
          <ImageHistoryView
            onOpenResult={() => setActiveTab('results')}
            onOpenStudio={() => setActiveTab('studio')}
          />
        )}
        {activeTab === 'models' && (
          <ModelInfoView onSelectForStudio={() => setActiveTab('studio')} />
        )}
        {activeTab === 'analytics' && <ResearchAnalytics />}
        {activeTab === 'settings' && <SettingsView />}
        {activeTab === 'profile' && <ProfileView />}
      </DashboardLayout>
    );
  }

  return (
    <>
      <LandingPage
        isAuthenticated={Boolean(user)}
        onStartCloaking={() => openWorkspace('studio')}
        onOpenAuth={(mode) => {
          setPendingTab('dashboard');
          setAuthModalMode(mode);
        }}
      />

      {authModalMode && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setAuthModalMode(null)}
          onSuccess={() => {
            setAuthModalMode(null);
            setActiveTab(pendingTab);
            setView('workspace');
          }}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
