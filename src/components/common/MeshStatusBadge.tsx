import React, { useState, useEffect } from 'react';
import { Radio, Signal, Cpu, ShieldCheck, PlayCircle, Activity } from 'lucide-react';
import { meshManager } from '../../services/mesh/MeshManager';
import { meshEventBus } from '../../services/mesh/MeshEventBus';
import { MeshDiagnosticsStats } from '../../services/mesh/meshTypes';

interface MeshStatusBadgeProps {
  onOpenDiagnostics: () => void;
  onOpenDemoModal: () => void;
}

export const MeshStatusBadge: React.FC<MeshStatusBadgeProps> = ({
  onOpenDiagnostics,
  onOpenDemoModal,
}) => {
  const [diag, setDiag] = useState<MeshDiagnosticsStats>(meshManager.getDiagnostics());

  useEffect(() => {
    const refresh = () => setDiag(meshManager.getDiagnostics());
    
    const unsub1 = meshEventBus.on('messageCreated', refresh);
    const unsub2 = meshEventBus.on('messageReceived', refresh);
    const unsub3 = meshEventBus.on('messageRelayed', refresh);
    const unsub4 = meshEventBus.on('messageSyncedToCloud', refresh);
    const unsub5 = meshEventBus.on('powerModeChanged', refresh);
    const unsub6 = meshEventBus.on('connectivityStatusChanged', refresh);

    const interval = setInterval(refresh, 2000);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      unsub5();
      unsub6();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center space-x-1.5 shrink-0">
      {/* Mesh Status Pill */}
      <button
        onClick={onOpenDiagnostics}
        title="Open PRAVAHA Mesh Network Diagnostics"
        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border transition-all cursor-pointer shadow-2xs ${
          diag.meshActive
            ? 'bg-teal-50 hover:bg-teal-100/80 text-teal-900 border-teal-300'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}
      >
        <Radio className={`w-3.5 h-3.5 ${diag.meshActive ? 'text-teal-600 animate-pulse' : 'text-slate-400'}`} />
        <span className="hidden sm:inline font-mono text-[11px]">
          Mesh: <strong className="font-extrabold text-teal-900">{diag.meshActive ? 'ACTIVE' : 'OFF'}</strong>
        </span>

        {/* Nearby peers count badge */}
        <span className="bg-teal-700 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black flex items-center space-x-0.5">
          <Signal className="w-2.5 h-2.5" />
          <span>{diag.nearbyNodesCount}</span>
        </span>

        {/* Pending Mesh Queue Badge */}
        {diag.queueSize > 0 && (
          <span className="bg-amber-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black animate-bounce">
            {diag.queueSize} Q
          </span>
        )}
      </button>

      {/* Judge Demo Trigger Button */}
      <button
        onClick={onOpenDemoModal}
        className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-xs border border-emerald-600 shrink-0"
        title="Launch 2-Minute Judge Demo of Offline Multi-Hop Mesh"
      >
        <PlayCircle className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
        <span className="hidden md:inline font-black tracking-tight">Judge Demo</span>
      </button>
    </div>
  );
};
