/**
 * PRAVAHA Role-Based Navigation Groups
 * 
 * Defines what each role sees in the sidebar — task-oriented, not feature-dump.
 * Each group has a label and a list of nav items.
 * Navigation is consumed by Sidebar.tsx based on currentUser.role.
 */

import {
  LayoutDashboard,
  Map,
  Bell,
  ShieldAlert,
  Truck,
  Boxes,
  Activity,
  Database,
  CloudRain,
  BarChart3,
  FileText,
  Radio,
  Cpu,
  Settings,
  HelpCircle,
  Navigation,
  ClipboardList,
  Users,
  PhoneCall,
} from 'lucide-react';
import { UserRole } from '../types';

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: string | null;
  badgeColor?: string;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

// ---------------------------------------------------------------------------
// Role-specific navigation definitions
// ---------------------------------------------------------------------------
export const ROLE_NAV_GROUPS: Record<UserRole, NavGroup[]> = {

  // ── LOGISTICS ADMINISTRATOR ───────────────────────────────────────────────
  'Logistics Administrator': [
    {
      group: 'Overview',
      items: [
        { id: 'commandCenter', label: 'Command Center', icon: LayoutDashboard },
        { id: 'liveMap', label: 'Live Operations Map', icon: Map },
      ],
    },
    {
      group: 'Logistics',
      items: [
        { id: 'routeGuard', label: 'Route Intelligence', icon: Navigation },
        { id: 'fleetPulse', label: 'Fleet', icon: Truck },
        { id: 'supplyGrid', label: 'Supply Network', icon: Boxes },
      ],
    },
    {
      group: 'Intelligence',
      items: [
        { id: 'riskEngine', label: 'Risk Intelligence', icon: Activity },
        { id: 'nesdrDataCenter', label: 'Earth Intelligence', icon: Database },
        { id: 'weatherCore', label: 'Weather', icon: CloudRain },
      ],
    },
    {
      group: 'Communications',
      items: [
        { id: 'alertNet', label: 'Alerts', icon: Bell },
        { id: 'meshDiagnostics', label: 'Resilient Comms', icon: Radio },
      ],
    },
    {
      group: 'Reports',
      items: [
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'reports', label: 'Reports', icon: FileText },
      ],
    },
    {
      group: 'Administration',
      items: [
        { id: 'n8nCallAutomation', label: 'IVR Automation', icon: PhoneCall, badge: 'n8n', badgeColor: 'bg-slate-100 text-slate-600' },
        { id: 'mlStudio', label: 'Intelligence Infrastructure', icon: Cpu, badge: 'Admin', badgeColor: 'bg-indigo-100 text-indigo-800' },
        { id: 'settings', label: 'System Settings', icon: Settings },
        { id: 'helpSupport', label: 'Help & Support', icon: HelpCircle },
      ],
    },
  ],

  // ── ADMIN (same as Logistics Administrator) ───────────────────────────────
  'Admin': [
    {
      group: 'Overview',
      items: [
        { id: 'commandCenter', label: 'Command Center', icon: LayoutDashboard },
        { id: 'liveMap', label: 'Live Operations Map', icon: Map },
      ],
    },
    {
      group: 'Logistics',
      items: [
        { id: 'routeGuard', label: 'Route Intelligence', icon: Navigation },
        { id: 'fleetPulse', label: 'Fleet', icon: Truck },
        { id: 'supplyGrid', label: 'Supply Network', icon: Boxes },
      ],
    },
    {
      group: 'Intelligence',
      items: [
        { id: 'riskEngine', label: 'Risk Intelligence', icon: Activity },
        { id: 'nesdrDataCenter', label: 'Earth Intelligence', icon: Database },
        { id: 'weatherCore', label: 'Weather', icon: CloudRain },
      ],
    },
    {
      group: 'Communications',
      items: [
        { id: 'alertNet', label: 'Alerts', icon: Bell },
        { id: 'meshDiagnostics', label: 'Resilient Comms', icon: Radio },
      ],
    },
    {
      group: 'Reports',
      items: [
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'reports', label: 'Reports', icon: FileText },
      ],
    },
    {
      group: 'Administration',
      items: [
        { id: 'n8nCallAutomation', label: 'IVR Automation', icon: PhoneCall, badge: 'n8n', badgeColor: 'bg-slate-100 text-slate-600' },
        { id: 'mlStudio', label: 'Intelligence Infrastructure', icon: Cpu, badge: 'Admin', badgeColor: 'bg-indigo-100 text-indigo-800' },
        { id: 'settings', label: 'System Settings', icon: Settings },
        { id: 'helpSupport', label: 'Help & Support', icon: HelpCircle },
      ],
    },
  ],

  // ── LOGISTICS OPERATOR ────────────────────────────────────────────────────
  'Logistics Operator': [
    {
      group: 'Operations',
      items: [
        { id: 'commandCenter', label: 'Command Center', icon: LayoutDashboard },
        { id: 'liveMap', label: 'Live Map', icon: Map },
        { id: 'alertNet', label: 'Alerts', icon: Bell },
      ],
    },
    {
      group: 'Logistics',
      items: [
        { id: 'routeGuard', label: 'Route Intelligence', icon: Navigation },
        { id: 'fleetPulse', label: 'Fleet', icon: Truck },
        { id: 'supplyGrid', label: 'Supply Network', icon: Boxes },
      ],
    },
    {
      group: 'Intelligence',
      items: [
        { id: 'riskEngine', label: 'Risk Intelligence', icon: Activity },
        { id: 'weatherCore', label: 'Weather', icon: CloudRain },
      ],
    },
    {
      group: 'Reports',
      items: [
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'helpSupport', label: 'Help', icon: HelpCircle },
      ],
    },
  ],

  // ── AUTHORITY VIEWER ──────────────────────────────────────────────────────
  'Authority Viewer': [
    {
      group: 'Overview',
      items: [
        { id: 'authorityDashboard', label: 'Authority Overview', icon: LayoutDashboard },
        { id: 'commandCenter', label: 'Operations Center', icon: Users },
        { id: 'liveMap', label: 'Live Map', icon: Map },
      ],
    },
    {
      group: 'Intelligence',
      items: [
        { id: 'riskEngine', label: 'Risk Intelligence', icon: Activity },
        { id: 'nesdrDataCenter', label: 'Earth Intelligence', icon: Database },
        { id: 'weatherCore', label: 'Weather', icon: CloudRain },
        { id: 'alertNet', label: 'Alerts', icon: Bell },
      ],
    },
    {
      group: 'Reports',
      items: [
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'reports', label: 'Reports', icon: FileText },
        { id: 'helpSupport', label: 'Help', icon: HelpCircle },
      ],
    },
  ],

  // ── FIELD OFFICER ─────────────────────────────────────────────────────────
  'Field Officer': [
    {
      group: 'Field Operations',
      items: [
        { id: 'fieldLink', label: 'My Tasks & Reports', icon: ClipboardList },
        { id: 'liveMap', label: 'Area Map', icon: Map },
        { id: 'alertNet', label: 'Alerts', icon: Bell },
      ],
    },
    {
      group: 'Communications',
      items: [
        { id: 'meshDiagnostics', label: 'Offline Sync & Comms', icon: Radio },
        { id: 'helpSupport', label: 'Help', icon: HelpCircle },
      ],
    },
  ],

  // ── DRIVER ────────────────────────────────────────────────────────────────
  'Driver': [
    {
      group: 'My Dashboard',
      items: [
        { id: 'driverDashboard', label: 'My Vehicle & Route', icon: Truck },
        { id: 'liveMap', label: 'Navigation Map', icon: Map },
      ],
    },
    {
      group: 'Support',
      items: [
        { id: 'helpSupport', label: 'Help', icon: HelpCircle },
      ],
    },
  ],
};
