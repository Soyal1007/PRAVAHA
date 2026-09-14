import React, { useState } from 'react';
import { AppStateProvider } from './context/AppStateContext';
import { LanguageProvider } from './context/LanguageContext';
import { SimulationProvider } from './context/SimulationContext';
import { AuthProvider } from './context/AuthContext';

import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { DemoPlayerBar } from './components/common/DemoPlayerBar';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { EntityDetailModal } from './components/common/EntityDetailModal';
import { ReportSituationModal } from './components/common/ReportSituationModal';
import { AIChatbot } from './components/common/AIChatbot';
import { InSituGuidedTour } from './components/common/InSituGuidedTour';
import { StartupSplashScreen } from './components/common/StartupSplashScreen';
import { FirstTimeVisitorModal } from './components/common/FirstTimeVisitorModal';

import { LandingPageView } from './components/views/LandingPageView';
import { LoginPortalView } from './components/views/LoginPortalView';
import { CommandCenter } from './components/views/CommandCenter';
import { LiveMapView } from './components/views/LiveMapView';
import { N8nCallAutomationView } from './components/views/N8nCallAutomationView';
import { RouteGuardView } from './components/views/RouteGuardView';
import { FleetPulseView } from './components/views/FleetPulseView';
import { SupplyGridView } from './components/views/SupplyGridView';
import { WeatherCoreView } from './components/views/WeatherCoreView';
import { RiskEngineView } from './components/views/RiskEngineView';
import { FieldLinkView } from './components/views/FieldLinkView';
import { AlertNetView } from './components/views/AlertNetView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { NesdrDataCenterView } from './components/views/NesdrDataCenterView';
import { ReportsView } from './components/views/ReportsView';
import { HelpSupportView } from './components/views/HelpSupportView';
import { SettingsView } from './components/views/SettingsView';
import { PrivacyPolicyView } from './components/views/PrivacyPolicyView';
import { TermsView } from './components/views/TermsView';

import { DriverDashboard } from './components/dashboards/DriverDashboard';
import { AuthorityDashboard } from './components/dashboards/AuthorityDashboard';

const MainApp: React.FC = () => {
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [showFirstTimePrompt, setShowFirstTimePrompt] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<string>('landingPage');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState<boolean>(false);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);

  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'vehicle' | 'shipment' | 'incident' | 'road' | 'warehouse';
    id: string;
  } | null>(null);

  const handleSelectSearchResult = (
    type: 'vehicle' | 'shipment' | 'road' | 'warehouse',
    id: string
  ) => {
    setSelectedEntity({ type, id });
  };

  const isLanding = currentView === 'landingPage';

  const renderView = () => {
    switch (currentView) {
      case 'landingPage':
        return (
          <LandingPageView
            onNavigateToView={setCurrentView}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onOpenAIChat={() => setIsAIChatOpen(true)}
            onOpenTour={() => setIsTourOpen(true)}
          />
        );

      case 'loginPortal':
        return (
          <LoginPortalView
            onNavigateToView={setCurrentView}
            onOpenTour={() => setIsTourOpen(true)}
          />
        );

      case 'commandCenter':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <CommandCenter
              onNavigateToView={setCurrentView}
              onSelectEntity={(type, id) => setSelectedEntity({ type, id })}
            />
          </div>
        );

      case 'driverDashboard':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <DriverDashboard
              onNavigateToView={setCurrentView}
              onSelectEntity={(type, id) => setSelectedEntity({ type, id })}
            />
          </div>
        );

      case 'authorityDashboard':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <AuthorityDashboard
              onNavigateToView={setCurrentView}
              onSelectEntity={(type, id) => setSelectedEntity({ type, id })}
            />
          </div>
        );

      case 'liveMap':
        return (
          <div className="view-enter-animation">
            <LiveMapView
              onSelectEntity={(type, id) => setSelectedEntity({ type, id })}
            />
          </div>
        );

      case 'n8nCallAutomation':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <N8nCallAutomationView />
          </div>
        );

      case 'routeGuard':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <RouteGuardView />
          </div>
        );

      case 'fleetPulse':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <FleetPulseView
              onNavigateToView={setCurrentView}
              onSelectEntity={(type, id) => setSelectedEntity({ type, id })}
            />
          </div>
        );

      case 'supplyGrid':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <SupplyGridView />
          </div>
        );

      case 'weatherCore':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <WeatherCoreView />
          </div>
        );

      case 'riskEngine':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <RiskEngineView />
          </div>
        );

      case 'nesdrDataCenter':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <NesdrDataCenterView />
          </div>
        );

      case 'fieldLink':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <FieldLinkView />
          </div>
        );

      case 'alertNet':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <AlertNetView onNavigateToView={setCurrentView} />
          </div>
        );

      case 'analytics':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <AnalyticsView />
          </div>
        );

      case 'reports':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <ReportsView />
          </div>
        );

      case 'helpSupport':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <HelpSupportView />
          </div>
        );

      case 'privacyPolicy':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <PrivacyPolicyView onNavigateToView={setCurrentView} />
          </div>
        );

      case 'terms':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <TermsView onNavigateToView={setCurrentView} />
          </div>
        );

      case 'settings':
        return (
          <div className="p-6 max-w-[1650px] mx-auto view-enter-animation">
            <SettingsView />
          </div>
        );

      default:
        return (
          <LandingPageView
            onNavigateToView={setCurrentView}
            onOpenReportModal={() => setIsReportModalOpen(true)}
            onOpenAIChat={() => setIsAIChatOpen(true)}
            onOpenTour={() => setIsTourOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#EFF3F1] text-slate-900 flex flex-col font-body antialiased selection:bg-teal-100 selection:text-[#087F8C]">
      {/* Startup Animated Splash Screen */}
      {showSplash && (
        <StartupSplashScreen
          onComplete={() => {
            setShowSplash(false);
            setShowFirstTimePrompt(true);
          }}
        />
      )}

      {/* First-Time Visitor Notification Prompt */}
      <FirstTimeVisitorModal
        isOpen={showFirstTimePrompt}
        onAccept={() => {
          setShowFirstTimePrompt(false);
          setIsTourOpen(true);
        }}
        onDecline={() => {
          setShowFirstTimePrompt(false);
        }}
      />

      {/* Header */}
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onToggleAIChat={() => setIsAIChatOpen((prev) => !prev)}
        onNavigateToView={setCurrentView}
        onOpenTour={() => setIsTourOpen(true)}
        currentView={currentView}
      />

      {/* Demo Player Floating Banner */}
      <DemoPlayerBar />

      {/* Main Body Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar rendered for non-landing pages */}
        {!isLanding && (
          <Sidebar
            currentView={currentView}
            onSelectView={setCurrentView}
            onOpenAIChat={() => setIsAIChatOpen(true)}
          />
        )}

        {/* Dynamic Workspace Container */}
        <main className={`flex-1 overflow-y-auto ${isLanding ? 'p-0 w-full' : 'pb-16'}`}>
          {renderView()}
        </main>
      </div>

      {/* Modals & Overlays */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
      />

      <EntityDetailModal
        entity={selectedEntity}
        onClose={() => setSelectedEntity(null)}
        onNavigateToView={setCurrentView}
      />

      <ReportSituationModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      <AIChatbot
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
      />

      {/* In-Situ Spotlight Guided Tour */}
      <InSituGuidedTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigateToView={setCurrentView}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenAIChat={() => setIsAIChatOpen(true)}
        currentView={currentView}
      />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 px-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 font-body z-20">
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="PRAVAHA Logo" className="w-5 h-5 object-contain" />
          <span className="font-black text-white tracking-wide">PRAVAHA</span>
          <span>Logistics & Geo-Hazard Engine © 2026. All rights reserved.</span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentView('privacyPolicy')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setCurrentView('terms')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Terms & Conditions
          </button>
          <button
            onClick={() => setCurrentView('helpSupport')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Help & Support
          </button>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppStateProvider>
      <AuthProvider>
        <LanguageProvider>
          <SimulationProvider>
            <MainApp />
          </SimulationProvider>
        </LanguageProvider>
      </AuthProvider>
    </AppStateProvider>
  );
}
