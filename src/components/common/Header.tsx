import React, { useState } from 'react';
import {
  Search,
  Globe,
  Wifi,
  WifiOff,
  Bell,
  AlertTriangle,
  Bot,
  LogIn,
  LogOut,
  Sparkles,
  LayoutDashboard,
  Map,
  BarChart3,
  Truck,
  HelpCircle,
  Menu,
  ChevronDown,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { LANGUAGES, LanguageCode } from '../../i18n/translations';

import { MeshStatusBadge } from './MeshStatusBadge';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenReportModal: () => void;
  onToggleAIChat: () => void;
  onNavigateToView: (view: string) => void;
  onOpenTour?: () => void;
  onOpenDiagnostics?: () => void;
  onOpenDemoModal?: () => void;
  currentView?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenReportModal,
  onToggleAIChat,
  onNavigateToView,
  onOpenTour,
  currentView = 'landingPage',
}) => {
  const { isOffline, setIsOffline, pendingSyncCount, notifications } = useAppState();
  const { language, setLanguage, t } = useLanguage();
  const { currentUser, isAuthenticated, logout } = useAuth();

  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showQuickNav, setShowQuickNav] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const QUICK_SECTIONS = [
    { id: 'landingPage', label: 'Main Overview', icon: LayoutDashboard },
    { id: 'commandCenter', label: 'Command Center', icon: LayoutDashboard },
    { id: 'liveMap', label: 'Live GIS Map', icon: Map },
    { id: 'n8nCallAutomation', label: 'n8n Phone Hotline', icon: LayoutDashboard },
    { id: 'routeGuard', label: 'RouteGuard Engine', icon: LayoutDashboard },
    { id: 'fleetPulse', label: 'Fleet Pulse', icon: Truck },
    { id: 'analytics', label: 'Analytics & Charts', icon: BarChart3 },
    { id: 'helpSupport', label: 'Help & Guides', icon: HelpCircle },
    { id: 'settings', label: 'Settings', icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs font-body transition-all">
      <div className="px-3 sm:px-5 py-2 flex items-center justify-between gap-2.5">
        {/* Left Branding & Quick Section Menu */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Mobile Navigation Drawer Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-100 hover:bg-teal-50 border border-slate-200 text-slate-700 hover:text-[#087F8C] cursor-pointer transition-colors shrink-0"
            aria-label="Toggle Mobile Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigateToView('landingPage')}
            className="flex items-center space-x-2 text-left cursor-pointer group"
          >
            <img
              src="/logo.png"
              alt="PRAVAHA Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-lg shadow-sm group-hover:scale-105 transition-transform"
            />
            <div>
              <div className="flex items-center space-x-1">
                <h1 className="font-display font-black text-slate-900 text-base sm:text-lg tracking-tight leading-none group-hover:text-[#087F8C] transition-colors">
                  PRAVAHA
                </h1>
                <span className="text-[8px] sm:text-[9px] bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  GIS
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold hidden xl:block">
                Predict. Navigate. Deliver.
              </p>
            </div>
          </button>

          {/* Quick View Menu Switcher */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowQuickNav(!showQuickNav)}
              className="bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-[#087F8C] px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer border border-slate-200/80"
            >
              <Menu className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Quick Nav</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showQuickNav && (
              <div className="absolute left-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 divide-y divide-slate-100">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Jump to Workspace
                </div>
                <div className="py-1">
                  {QUICK_SECTIONS.map((sec) => {
                    const Icon = sec.icon;
                    return (
                      <button
                        key={sec.id}
                        onClick={() => {
                          onNavigateToView(sec.id);
                          setShowQuickNav(false);
                        }}
                        className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center space-x-2 hover:bg-teal-50/80 cursor-pointer font-semibold transition-colors ${
                          currentView === sec.id ? 'text-[#087F8C] bg-teal-50 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-[#087F8C]" />
                        <span>{sec.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Search Bar */}
        <div className="flex-1 max-w-md mx-1 sm:mx-2">
          <button
            onClick={onOpenSearch}
            data-tour="search-bar"
            className="w-full bg-slate-100/90 hover:bg-white hover:border-[#087F8C] border border-slate-200 text-slate-600 rounded-xl px-3 py-1.5 text-xs flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center space-x-2 truncate">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#087F8C] shrink-0" />
              <span className="truncate text-slate-500 font-medium">Search highways, trucks...</span>
            </div>
            <kbd className="hidden lg:inline-block bg-white text-slate-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right Actions & Tools */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Guided Tour */}
          {onOpenTour && (
            <button
              onClick={onOpenTour}
              data-tour="tour-button"
              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-2xs shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span className="hidden lg:inline">Tour</span>
            </button>
          )}

          {/* Report Situation */}
          <button
            onClick={onOpenReportModal}
            data-tour="report-button"
            className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Report</span>
          </button>

          {/* AI Bot */}
          <button
            onClick={onToggleAIChat}
            data-tour="ai-button"
            className="bg-[#087F8C] hover:bg-[#065F66] text-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Bot className="w-3.5 h-3.5 text-teal-200" />
            <span className="hidden xl:inline">AI Bot</span>
          </button>

          {/* Offline Switcher */}
          <button
            onClick={() => setIsOffline(!isOffline)}
            data-tour="offline-switcher"
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 border transition-all cursor-pointer ${
              isOffline
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-600" /> : <Wifi className="w-3.5 h-3.5 text-emerald-600" />}
            <span className="hidden 2xl:inline">{isOffline ? 'Offline' : 'Online'}</span>
            {pendingSyncCount > 0 && (
              <span className="bg-amber-600 text-white text-[9px] px-1 py-0.2 rounded-full font-extrabold">
                {pendingSyncCount}
              </span>
            )}
          </button>

          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-2 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span className="uppercase font-mono text-[11px]">{language}</span>
            </button>

            {showLangDropdown && (
              <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code as LanguageCode);
                      setShowLangDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-teal-50 cursor-pointer ${
                      language === lang.code ? 'font-black text-[#087F8C] bg-teal-50/70' : 'text-slate-700 font-medium'
                    }`}
                  >
                    <span>{lang.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{lang.nativeName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Role Profile */}
          {isAuthenticated && currentUser ? (
            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                onClick={() => onNavigateToView('loginPortal')}
                className="bg-slate-100 hover:bg-teal-50 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer transition-colors"
              >
                <img src={currentUser.avatar} alt={currentUser.name} className="w-5 h-5 rounded-full object-cover border border-teal-500 shrink-0" />
                <span className="hidden sm:inline text-xs font-bold text-slate-900 whitespace-nowrap">
                  {currentUser.name.startsWith('Dr.') || currentUser.name.startsWith('Mr.') || currentUser.name.startsWith('Ms.')
                    ? currentUser.name.split(' ').slice(0, 2).join(' ')
                    : currentUser.name.split(' ')[0]}
                </span>
                <span className="bg-[#087F8C] text-white text-[10px] font-black px-2 py-0.5 rounded-lg whitespace-nowrap shadow-2xs">
                  {currentUser.role}
                </span>
              </button>

              <button
                onClick={() => {
                  logout();
                  onNavigateToView('landingPage');
                }}
                title="Log Out"
                className="p-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 cursor-pointer transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigateToView('loginPortal')}
              className="bg-slate-900 hover:bg-[#087F8C] text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1 shadow-xs cursor-pointer shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 text-teal-300" />
              <span>Login</span>
            </button>
          )}

          {/* Notifications */}
          <div className="relative shrink-0 pr-1">
            <button
              onClick={() => setShowNotifPopover(!showNotifPopover)}
              className="p-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 relative cursor-pointer transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifPopover && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 z-50">
                <div className="px-4 py-1 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-xs text-slate-900">Notifications</span>
                  <span className="text-[10px] bg-teal-50 text-[#087F8C] font-bold px-2 py-0.5 rounded-full">
                    {notifications.length} total
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className="p-3 hover:bg-slate-50 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{n.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{n.timestamp}</span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Slide-Out Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex animate-fadeIn">
          <div className="w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto p-4 space-y-4 font-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <img src="/logo.png" alt="PRAVAHA Logo" className="w-6 h-6 object-contain" />
                  <span className="font-extrabold text-sm text-slate-900 font-display">
                    PRAVAHA Menu
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-1">
                  Navigation Workspaces
                </div>
                {[
                  { id: 'landingPage', label: 'Main Overview', icon: LayoutDashboard },
                  { id: 'commandCenter', label: 'Command Center', icon: LayoutDashboard },
                  { id: 'liveMap', label: 'Live GIS Map', icon: Map },
                  { id: 'n8nCallAutomation', label: 'n8n Voice Hotline', icon: LayoutDashboard },
                  { id: 'routeGuard', label: 'RouteGuard AI Engine', icon: LayoutDashboard },
                  { id: 'fleetPulse', label: 'Fleet Pulse Telemetry', icon: Truck },
                  { id: 'weatherCore', label: 'Weather Core Radar', icon: LayoutDashboard },
                  { id: 'nesdrDataCenter', label: 'ISRO/NESDR Data Center', icon: LayoutDashboard },
                  { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
                  { id: 'helpSupport', label: 'Help & Documentation', icon: HelpCircle },
                  { id: 'settings', label: 'Settings', icon: LayoutDashboard },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigateToView(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2.5 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-teal-50 text-[#087F8C] border-l-4 border-l-[#087F8C]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-[#087F8C]" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-2">
              <div className="flex items-center justify-between font-bold">
                <span>Network State:</span>
                <span className={isOffline ? 'text-amber-600' : 'text-emerald-600'}>
                  {isOffline ? 'OFFLINE' : 'ONLINE'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">PRAVAHA Mobile GIS Node v2.4.0</p>
            </div>
          </div>

          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
};
