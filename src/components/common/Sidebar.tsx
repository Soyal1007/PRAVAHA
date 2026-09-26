import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Bot,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { ROLE_NAV_GROUPS } from '../../auth/roles';
import { UserRole } from '../../types';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  onOpenAIChat?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView, onOpenAIChat }) => {
  const { alerts, pendingSyncCount } = useAppState();
  const { currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const role = currentUser?.role as UserRole | undefined;
  const navGroups = role && ROLE_NAV_GROUPS[role] ? ROLE_NAV_GROUPS[role] : [];

  // Dynamic badge counts for specific items
  const criticalAlerts = alerts.filter((a) => a.severity === 'Critical' && !a.acknowledged).length;

  const getBadge = (id: string, staticBadge?: string | null) => {
    if (id === 'alertNet' && criticalAlerts > 0) return `${criticalAlerts} critical`;
    if (id === 'meshDiagnostics' && pendingSyncCount > 0) return `${pendingSyncCount} pending`;
    if (id === 'fieldLink' && pendingSyncCount > 0) return `${pendingSyncCount} sync`;
    return staticBadge ?? null;
  };

  const getBadgeColor = (id: string, staticColor?: string) => {
    if (id === 'alertNet' && criticalAlerts > 0) return 'bg-red-100 text-red-800 font-bold';
    if ((id === 'meshDiagnostics' || id === 'fieldLink') && pendingSyncCount > 0)
      return 'bg-amber-100 text-amber-800 font-bold';
    return staticColor ?? 'bg-slate-100 text-slate-600';
  };

  return (
    <aside
      className={`bg-white border-r border-slate-200/80 flex flex-col justify-between h-full overflow-hidden no-print select-none shrink-0 transition-all duration-300 font-body hidden md:flex ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Scrollable Nav Area */}
      <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5">
        {/* Brand & Collapse */}
        <div className="flex items-center justify-between px-1.5 pb-3 border-b border-slate-100">
          {!collapsed ? (
            <div className="flex items-center space-x-2">
              <img src="/logo.png" alt="PRAVAHA" className="w-6 h-6 object-contain" />
              <span className="text-xs font-black text-slate-900 tracking-tight font-display">PRAVAHA</span>
            </div>
          ) : (
            <img src="/logo.png" alt="PRAVAHA" className="w-6 h-6 object-contain mx-auto" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Role Badge */}
        {!collapsed && currentUser && (
          <div className="px-1.5">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 flex items-center space-x-2.5">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-slate-300 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-900 truncate">{currentUser.name.split(' ')[0]}</div>
                <div className="text-[10px] text-slate-500 font-medium truncate">{currentUser.role}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Groups */}
        {navGroups.map((grp, idx) => (
          <div key={idx} className="space-y-0.5">
            {!collapsed && (
              <div className="px-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {grp.group}
              </div>
            )}
            <div className="space-y-0.5">
              {grp.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                const badge = getBadge(item.id, item.badge);
                const badgeColor = getBadgeColor(item.id, item.badgeColor);

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectView(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-teal-50 text-teal-800 border-l-[3px] border-teal-600 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    <div className="flex items-center space-x-2.5 truncate min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-teal-700' : 'text-slate-400'
                        }`}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!collapsed && badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md shrink-0 font-bold ${badgeColor}`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="shrink-0 p-3 border-t border-slate-100 bg-slate-50/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
            {!collapsed && <span className="text-[10px] text-slate-600 font-semibold">System Online</span>}
          </div>
          {onOpenAIChat && !collapsed && (
            <button
              onClick={onOpenAIChat}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <Bot className="w-3 h-3 text-slate-500" />
              <span>AI Assistant</span>
            </button>
          )}
        </div>
        {!collapsed && (
          <p className="text-[9px] text-slate-400 font-mono">Northeast Regional GIS Node</p>
        )}
      </div>
    </aside>
  );
};
