/**
 * PRAVAHA Role Permission Architecture
 * 
 * Centralized source of truth for what each role can access.
 * This governs:
 *   - UI view rendering (PermissionGuard in App.tsx)
 *   - Sidebar navigation generation
 *   - Feature-level access checks (useHasPermission hook)
 * 
 * Rule: A view must be listed here for a role to access it.
 * Anything not listed = unauthorized redirect to role home.
 */

import { UserRole } from '../types';

// ---------------------------------------------------------------------------
// View ID registry — every navigable view in App.tsx must appear here
// ---------------------------------------------------------------------------
export type ViewId =
  // Core
  | 'landingPage'
  | 'loginPortal'

  // Operations
  | 'commandCenter'
  | 'liveMap'
  | 'alertNet'

  // Logistics
  | 'routeGuard'
  | 'fleetPulse'
  | 'supplyGrid'

  // Intelligence
  | 'riskEngine'
  | 'nesdrDataCenter'
  | 'weatherCore'

  // Field & Comms
  | 'fieldLink'
  | 'meshDiagnostics'

  // Role-specific dashboards
  | 'driverDashboard'
  | 'authorityDashboard'

  // Analytics & Reports
  | 'analytics'
  | 'reports'

  // Administration (Admin-only)
  | 'mlStudio'
  | 'n8nCallAutomation'
  | 'settings'
  | 'helpSupport'
  | 'privacyPolicy'
  | 'terms';

// ---------------------------------------------------------------------------
// Permission matrix: role → set of allowed view IDs
// ---------------------------------------------------------------------------
export const ROLE_PERMISSIONS: Record<UserRole, Set<ViewId>> = {

  'Logistics Administrator': new Set<ViewId>([
    'landingPage', 'loginPortal',
    'commandCenter', 'liveMap', 'alertNet',
    'routeGuard', 'fleetPulse', 'supplyGrid',
    'riskEngine', 'nesdrDataCenter', 'weatherCore',
    'fieldLink', 'meshDiagnostics',
    'analytics', 'reports',
    'mlStudio', 'n8nCallAutomation', 'settings',
    'helpSupport', 'privacyPolicy', 'terms',
    'authorityDashboard',
  ]),

  'Admin': new Set<ViewId>([
    'landingPage', 'loginPortal',
    'commandCenter', 'liveMap', 'alertNet',
    'routeGuard', 'fleetPulse', 'supplyGrid',
    'riskEngine', 'nesdrDataCenter', 'weatherCore',
    'fieldLink', 'meshDiagnostics',
    'analytics', 'reports',
    'mlStudio', 'n8nCallAutomation', 'settings',
    'helpSupport', 'privacyPolicy', 'terms',
    'authorityDashboard',
  ]),

  'Logistics Operator': new Set<ViewId>([
    'landingPage', 'loginPortal',
    'commandCenter', 'liveMap', 'alertNet',
    'routeGuard', 'fleetPulse', 'supplyGrid',
    'riskEngine', 'weatherCore',
    'analytics', 'reports',
    'helpSupport', 'privacyPolicy', 'terms',
  ]),

  'Authority Viewer': new Set<ViewId>([
    'landingPage', 'loginPortal',
    'commandCenter', 'liveMap', 'alertNet',
    'riskEngine', 'nesdrDataCenter', 'weatherCore',
    'analytics', 'reports',
    'authorityDashboard',
    'helpSupport', 'privacyPolicy', 'terms',
  ]),

  'Field Officer': new Set<ViewId>([
    'landingPage', 'loginPortal',
    'fieldLink', 'meshDiagnostics',
    'liveMap', 'alertNet',
    'helpSupport', 'privacyPolicy', 'terms',
  ]),

  'Driver': new Set<ViewId>([
    'landingPage', 'loginPortal',
    'driverDashboard',
    'liveMap',
    'helpSupport', 'privacyPolicy', 'terms',
  ]),
};

// ---------------------------------------------------------------------------
// Role home views — where to redirect after login (or unauthorized access)
// ---------------------------------------------------------------------------
export const ROLE_HOME: Record<UserRole, ViewId> = {
  'Logistics Administrator': 'commandCenter',
  'Admin':                   'commandCenter',
  'Logistics Operator':      'commandCenter',
  'Authority Viewer':        'authorityDashboard',
  'Field Officer':           'fieldLink',
  'Driver':                  'driverDashboard',
};

// ---------------------------------------------------------------------------
// Permission check utility
// ---------------------------------------------------------------------------
export function canAccess(role: UserRole | undefined, viewId: ViewId): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.has(viewId) ?? false;
}
