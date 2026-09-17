import React, { useState } from 'react';
import {
  Home,
  LogIn,
  LayoutDashboard,
  Map,
  ShieldAlert,
  Truck,
  Boxes,
  CloudRain,
  Activity,
  BarChart3,
  Radio,
  Bell,
  HelpCircle,
  Settings,
  ChevronRight,
  Bot,
  Compass,
  ChevronLeft,
  PhoneCall,
  Database,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  onOpenAIChat?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  iconColor: string;
  badge: string | null;
  badgeColor?: string;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView, onOpenAIChat }) => {
  const { t } = useLanguage();
  const { roads, alerts, pendingSyncCount, n8nCalls } = useAppState();
  const { currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const activeBlockages = roads.filter((r) => r.status === 'Blocked').length;
  const criticalAlerts = alerts.filter((a) => a.severity === 'Critical' && !a.acknowledged).length;
  const pendingN8nCalls = n8nCalls.filter(c => c.status === 'Pending Approval').length;

  const NAV_GROUPS: NavGroup[] = [
    {
      group: 'Core Workspaces',
      items: [
        { id: 'landingPage', label: t('appTitle') + ' Overview', icon: Home, iconColor: 'text-[#087F8C]', badge: 'Home' },
        { id: 'commandCenter', label: t('commandCenter'), icon: LayoutDashboard, iconColor: 'text-indigo-600', badge: null },
        { id: 'liveMap', label: t('liveMap'), icon: Map, iconColor: 'text-teal-600', badge: 'Live GIS' },
        { id: 'n8nCallAutomation', label: t('n8nCallAutomation'), icon: PhoneCall, iconColor: 'text-teal-600', badge: pendingN8nCalls > 0 ? `${pendingN8nCalls} calls` : 'IVR', badgeColor: 'bg-teal-100 text-teal-800 font-bold' },
        { id: 'driverDashboard', label: t('driverCab'), icon: Truck, iconColor: 'text-amber-600', badge: 'GPS' },
        { id: 'authorityDashboard', label: t('authorityHq'), icon: Compass, iconColor: 'text-emerald-600', badge: 'SDMA' },
      ],
    },
    {
      group: 'Logistics & Supply',
      items: [
        {
          id: 'routeGuard',
          label: t('routeGuard'),
          icon: ShieldAlert,
          iconColor: 'text-red-500',
          badge: activeBlockages > 0 ? `${activeBlockages} blocked` : null,
          badgeColor: 'bg-red-100 text-red-700 font-bold',
        },
        { id: 'fleetPulse', label: t('fleetPulse'), icon: Truck, iconColor: 'text-[#087F8C]', badge: null },
        { id: 'supplyGrid', label: t('supplyGrid'), icon: Boxes, iconColor: 'text-emerald-600', badge: null },
      ],
    },
    {
      group: 'Intelligence & Risk',
      items: [
        { id: 'analytics', label: t('analytics'), icon: BarChart3, iconColor: 'text-purple-600', badge: 'Charts' },
        { id: 'nesdrDataCenter', label: t('nesdrDataCenter'), icon: Database, iconColor: 'text-[#087F8C]', badge: 'ISRO/NESAC', badgeColor: 'bg-teal-100 text-teal-800 font-bold' },
        { id: 'weatherCore', label: t('weatherCore'), icon: CloudRain, iconColor: 'text-sky-600', badge: null },
        { id: 'riskEngine', label: t('riskEngine'), icon: Activity, iconColor: 'text-orange-500', badge: null },
      ],
    },
    {
      group: 'Field Link & System',
      items: [
        {
          id: 'fieldLink',
          label: t('fieldLink'),
          icon: Radio,
          iconColor: 'text-teal-600',
          badge: pendingSyncCount > 0 ? `${pendingSyncCount} sync` : null,
          badgeColor: 'bg-teal-100 text-teal-800 font-bold',
        },
        {
          id: 'meshDiagnostics',
          label: 'Offline Mesh Diagnostics',
          icon: Radio,
          iconColor: 'text-[#087F8C]',
          badge: 'BLE Mesh',
          badgeColor: 'bg-teal-100 text-teal-900 font-bold',
        },
        {
          id: 'alertNet',
          label: t('alertNet'),
          icon: Bell,
          iconColor: 'text-amber-500',
          badge: criticalAlerts > 0 ? `${criticalAlerts} critical` : null,
          badgeColor: 'bg-red-100 text-red-800 font-bold',
        },
        { id: 'loginPortal', label: 'User Login Panels', icon: LogIn, iconColor: 'text-slate-600', badge: currentUser ? currentUser.role.split(' ')[0] : 'Roles' },
        { id: 'helpSupport', label: t('helpSupport'), icon: HelpCircle, iconColor: 'text-slate-500', badge: null },
        { id: 'settings', label: t('settings'), icon: Settings, iconColor: 'text-slate-500', badge: null },
      ],
    },
  ];

  return (
    <aside
      className={`bg-white border-r border-slate-200/90 flex flex-col justify-between h-full overflow-hidden no-print select-none shrink-0 transition-all duration-300 font-body hidden md:flex ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Scrollable Nav Area */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
        {/* Sidebar Brand & Collapse Toggle */}
        <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100">
          {!collapsed ? (
            <div className="flex items-center space-x-2">
              <img src="/logo.png" alt="PRAVAHA Logo" className="w-6 h-6 object-contain" />
              <span className="text-xs font-black text-slate-800 tracking-tight font-display">
                PRAVAHA GIS
              </span>
            </div>
          ) : (
            <img src="/logo.png" alt="PRAVAHA Logo" className="w-6 h-6 object-contain mx-auto" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors ml-auto cursor-pointer"
            title={collapsed ? 'Expand Navigation' : 'Collapse Navigation'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {NAV_GROUPS.map((grp, idx) => (
          <div key={idx} className="space-y-1">
            {!collapsed && (
              <div className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                {grp.group}
              </div>
            )}
            <div className="space-y-1">
              {grp.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectView(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-teal-50/90 text-[#087F8C] border-l-4 border-l-[#087F8C] shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <Icon
                        className={`w-4.5 h-4.5 shrink-0 ${
                          isActive ? 'text-[#087F8C]' : item.iconColor
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!collapsed && item.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-extrabold ${
                          item.badgeColor || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Pinned Bottom Footer Info */}
      <div className="shrink-0 p-3.5 border-t border-slate-100 bg-slate-50/80 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20"></span>
            {!collapsed && <span className="text-xs text-slate-700 font-bold">PRAVAHA Active</span>}
          </div>
          {onOpenAIChat && !collapsed && (
            <button
              onClick={onOpenAIChat}
              className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Bot className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI Chat</span>
            </button>
          )}
        </div>
        {!collapsed && <p className="text-[10px] text-slate-400 font-mono">Northeast Regional GIS Node</p>}
      </div>
    </aside>
  );
};
