import React, { useState } from 'react';
import {
  Search,
  Globe,
  Bell,
  LogIn,
  LogOut,
  Menu,
  ChevronDown,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { LANGUAGES, LanguageCode } from '../../i18n/translations';
import { ROLE_NAV_GROUPS } from '../../auth/roles';
import { UserRole } from '../../types';

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
  onNavigateToView,
  currentView = 'landingPage',
}) => {
  const { isOffline, notifications, alerts } = useAppState();
  const { language, setLanguage } = useLanguage();
  const { currentUser, isAuthenticated, logout } = useAuth();

  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'Critical' && !a.acknowledged).length;

  // Mobile nav items pulled from role nav groups
  const roleNav = currentUser
    ? (ROLE_NAV_GROUPS[currentUser.role as UserRole] ?? []).flatMap((g) => g.items)
    : [];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 font-body">
      <div className="px-4 sm:px-5 h-12 flex items-center justify-between gap-3">

        {/* Left: Brand + Mobile Toggle */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer transition-colors"
            aria-label="Open navigation"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigateToView('landingPage')}
            className="flex items-center space-x-2 cursor-pointer group"
          >
            <img
              src="/logo.png"
              alt="PRAVAHA"
              className="w-6 h-6 object-contain rounded"
            />
            <span className="font-display font-black text-slate-900 text-sm tracking-tight group-hover:text-teal-700 transition-colors">
              PRAVAHA
            </span>
            <span className="hidden sm:inline text-[9px] bg-teal-700 text-white font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
              NE Region
            </span>
          </button>
        </div>

        {/* Centre: Search */}
        <div className="flex-1 max-w-sm mx-2">
          <button
            onClick={onOpenSearch}
            className="w-full bg-slate-50 hover:border-teal-500 border border-slate-200 text-slate-500 rounded-lg px-3 py-1.5 text-xs flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Search roads, vehicles, incidents…</span>
            <kbd className="hidden lg:inline-block ml-auto bg-white text-slate-400 text-[9px] font-mono px-1.5 py-0.5 rounded border border-slate-200">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right: Status + User */}
        <div className="flex items-center space-x-2 shrink-0">

          {/* Connectivity dot */}
          <div
            className={`flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
              isOffline
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
            title={isOffline ? 'System offline — data may be stale' : 'Connected'}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isOffline ? 'Offline' : 'Online'}</span>
          </div>

          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="uppercase font-mono text-[11px]">{language}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {showLangDropdown && (
              <div className="absolute right-0 mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code as LanguageCode);
                      setShowLangDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors ${
                      language === lang.code ? 'text-teal-700 font-bold' : 'text-slate-700 font-medium'
                    }`}
                  >
                    <span>{lang.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{lang.nativeName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifPopover(!showNotifPopover)}
              className="relative p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer transition-colors"
            >
              <Bell className="w-4 h-4" />
              {(unreadCount > 0 || criticalAlerts > 0) && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center">
                  {criticalAlerts > 0 ? criticalAlerts : unreadCount}
                </span>
              )}
            </button>

            {showNotifPopover && (
              <div className="absolute right-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50">
                <div className="px-4 py-1.5 flex items-center justify-between border-b border-slate-100">
                  <span className="font-bold text-xs text-slate-900">Notifications</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                    {notifications.length}
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 p-4 text-center">No notifications</p>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <div key={n.id} className="px-4 py-3 hover:bg-slate-50 text-xs">
                        <div className="flex items-center justify-between font-semibold text-slate-900">
                          <span>{n.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">{n.timestamp}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile / Login */}
          {isAuthenticated && currentUser ? (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => onNavigateToView('loginPortal')}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 cursor-pointer transition-colors"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-5 h-5 rounded-full object-cover border border-slate-300 shrink-0"
                />
                <span className="hidden sm:inline text-xs font-bold text-slate-900 whitespace-nowrap">
                  {currentUser.name.split(' ')[0]}
                </span>
                <span className="hidden md:inline text-[10px] bg-teal-700 text-white font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                  {currentUser.role.split(' ')[0]}
                </span>
              </button>

              <button
                onClick={() => {
                  logout();
                  onNavigateToView('landingPage');
                }}
                title="Sign out"
                className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigateToView('loginPortal')}
              className="bg-slate-900 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-300" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/50 flex">
          <div className="w-72 max-w-full bg-white h-full shadow-xl flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <img src="/logo.png" alt="PRAVAHA" className="w-5 h-5 object-contain" />
                <span className="font-extrabold text-sm text-slate-900">PRAVAHA</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {roleNav.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigateToView(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2.5 cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-teal-50 text-teal-800 font-bold border-l-[3px] border-teal-600'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="px-4 py-3 border-t border-slate-100 text-[10px] text-slate-400">
              {isOffline ? '⚠ Offline mode active' : '● Connected to PRAVAHA services'}
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
};
