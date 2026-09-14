import React, { createContext, useContext, useState } from 'react';
import { UserRole } from '../types';

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  pass: string;
  title: string;
  department: string;
  avatar: string;
  state: string;
  district?: string;
  description: string;
  permissions: string[];
}

export const DEMO_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-driver-1',
    name: 'Rajesh Kumar',
    role: 'Driver',
    email: 'driver@pravaha.gov.in',
    pass: 'driver123',
    title: 'Senior Fleet Logistics Driver',
    department: 'National Freight Logistics – Cab #PRV-2048',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=driver&backgroundColor=b6e3f4',
    state: 'Assam',
    district: 'Guwahati',
    description:
      'Vehicle telematics terminal access, turn-by-turn navigation, speed governor, and emergency driver SOS signal dispatch.',
    permissions: [
      'View Cab Telemetry',
      'Trigger SOS Alert',
      'Report Road Obstruction',
      'View Assigned Route',
    ],
  },
  {
    id: 'usr-officer-1',
    name: 'Inspector Tashi Namgyal',
    role: 'Field Officer',
    email: 'officer@pravaha.gov.in',
    pass: 'officer123',
    title: 'Ground Field Inspection Officer',
    department: 'Border Roads Organization (BRO) / Disaster Response',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=officer&backgroundColor=c0aede',
    state: 'Sikkim',
    district: 'Gangtok',
    description:
      'Offline-first field incident reporting, road blockage verification, photo telemetry capture, and local corridor assessment.',
    permissions: [
      'Submit Field Incident',
      'Verify Ground Blockage',
      'Offline Queue Sync',
      'Inspect Corridor Hazards',
    ],
  },
  {
    id: 'usr-admin-1',
    name: 'Dr. Ananya Roy',
    role: 'Logistics Administrator',
    email: 'admin@pravaha.gov.in',
    pass: 'admin123',
    title: 'Director of Logistics Strategy',
    department: 'Central Disaster Resilient Supply Chain HQ',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin&backgroundColor=ffdfbf',
    state: 'National HQ',
    description:
      'Full administrative access to Command Center, route override control, risk thresholds, fleet allocation, and system configurations.',
    permissions: [
      'Full System Override',
      'Command Center Access',
      'Manage Users & Roles',
      'Supply Stock Re-allocation',
      'System Reset',
    ],
  },
  {
    id: 'usr-operator-1',
    name: 'Vikram Sharma',
    role: 'Logistics Operator',
    email: 'operator@pravaha.gov.in',
    pass: 'operator123',
    title: 'Chief Dispatch Operator',
    department: 'Northeast Regional Freight Control Center',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=operator&backgroundColor=d1f7c4',
    state: 'Assam',
    district: 'Dispur',
    description:
      'Real-time dispatch management, FleetPulse monitoring, RouteGuard dynamic rerouting, and alert dispatching.',
    permissions: [
      'Reroute Active Cargo',
      'Manage Fleet Dispatch',
      'Acknowledge Critical Alerts',
      'Broadcast Warnings',
    ],
  },
  {
    id: 'usr-authority-1',
    name: 'Commander Ramesh Verma',
    role: 'Authority Viewer',
    email: 'authority@ndma.gov.in',
    pass: 'authority123',
    title: 'NDMA Emergency Operations Director',
    department: 'National Disaster Management Authority (NDMA)',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=authority&backgroundColor=ffd5dc',
    state: 'National Oversight',
    description:
      'Inter-agency disaster coordination, high-level emergency dashboard, hospital stock level oversight, and regional safety advisories.',
    permissions: [
      'View Authority Dashboard',
      'Monitor Hospital Stocks',
      'Receive High-Priority Warnings',
      'Inter-Agency Coordination',
    ],
  },
];

interface AuthContextType {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => boolean;
  loginAsRole: (role: UserRole) => void;
  logout: () => void;
  demoAccounts: UserAccount[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start unauthenticated so landing page shows login options properly
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(DEMO_ACCOUNTS[2]); // Admin default
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  const login = (email: string, pass: string): boolean => {
    const acc = DEMO_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === email.toLowerCase() && a.pass === pass
    );
    if (acc) {
      setCurrentUser(acc);
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const loginAsRole = (role: UserRole) => {
    const acc = DEMO_ACCOUNTS.find((a) => a.role === role) ?? DEMO_ACCOUNTS[2];
    setCurrentUser(acc);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        login,
        loginAsRole,
        logout,
        demoAccounts: DEMO_ACCOUNTS,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const DEFAULT_AUTH: AuthContextType = {
  currentUser: null,
  isAuthenticated: false,
  login: () => false,
  loginAsRole: () => {},
  logout: () => {},
  demoAccounts: DEMO_ACCOUNTS,
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  // Return safe defaults during HMR transitions or when used outside provider
  return context ?? DEFAULT_AUTH;
};
