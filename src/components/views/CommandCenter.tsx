import React from 'react';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { AdminDashboard } from '../dashboards/AdminDashboard';
import { OperatorDashboard } from '../dashboards/OperatorDashboard';
import { FieldOfficerDashboard } from '../dashboards/FieldOfficerDashboard';
import { DriverDashboard } from '../dashboards/DriverDashboard';
import { AuthorityDashboard } from '../dashboards/AuthorityDashboard';

interface CommandCenterProps {
  onNavigateToView: (view: string) => void;
  onSelectEntity: (type: 'vehicle' | 'shipment' | 'road' | 'warehouse' | 'incident', id: string) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ onNavigateToView, onSelectEntity }) => {
  // Use Auth context for accurate current role (Auth drives role, not legacy AppState)
  const { currentUser } = useAuth();
  const { userRole } = useAppState();

  // Authoritative role from Auth context; fallback to AppState legacy role
  const activeRole = currentUser?.role ?? userRole;

  return (
    <div>
      {activeRole === 'Logistics Operator' && (
        <OperatorDashboard onNavigateToView={onNavigateToView} onSelectEntity={onSelectEntity} />
      )}

      {activeRole === 'Field Officer' && (
        <FieldOfficerDashboard onNavigateToView={onNavigateToView} onSelectEntity={onSelectEntity} />
      )}

      {activeRole === 'Driver' && (
        <DriverDashboard onNavigateToView={onNavigateToView} onSelectEntity={onSelectEntity} />
      )}

      {activeRole === 'Authority Viewer' && (
        <AuthorityDashboard onNavigateToView={onNavigateToView} onSelectEntity={onSelectEntity} />
      )}

      {(activeRole === 'Logistics Administrator' || !activeRole) && (
        <AdminDashboard onNavigateToView={onNavigateToView} onSelectEntity={onSelectEntity} />
      )}
    </div>
  );
};
