import React, { useState } from 'react';
import { LogIn, Shield, CheckCircle2, Lock, User, Key, ArrowRight, Truck, Radio, Building2, Activity, ShieldCheck, HelpCircle, Compass } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppStateContext';
import { UserRole } from '../../types';

interface LoginPortalViewProps {
  onNavigateToView: (view: string) => void;
  onOpenTour?: () => void;
}

export const LoginPortalView: React.FC<LoginPortalViewProps> = ({ onNavigateToView, onOpenTour }) => {
  const { demoAccounts, login, loginAsRole, currentUser, isAuthenticated, logout } = useAuth();
  const { setUserRole } = useAppState();

  const [selectedRole, setSelectedRole] = useState<UserRole>(
    currentUser?.role ?? 'Logistics Administrator'
  );
  const [email, setEmail] = useState<string>(
    demoAccounts.find((a) => a.role === (currentUser?.role ?? 'Logistics Administrator'))?.email ?? ''
  );
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // First time login prompt state
  const [pendingLoginRole, setPendingLoginRole] = useState<UserRole | null>(null);

  const activeAccount = demoAccounts.find((a) => a.role === selectedRole) ?? demoAccounts[0];

  const ROLE_ICONS: Record<string, typeof Truck> = {
    Driver: Truck,
    'Field Officer': Radio,
    'Logistics Administrator': ShieldCheck,
    'Logistics Operator': Activity,
    'Authority Viewer': Building2,
  };

  const roleDestinationMap: Record<string, string> = {
    Driver: 'driverDashboard',
    'Field Officer': 'fieldLink',
    'Authority Viewer': 'authorityDashboard',
    'Logistics Operator': 'fleetPulse',
    'Logistics Administrator': 'commandCenter',
  };

  const handleRoleTabChange = (role: UserRole) => {
    setSelectedRole(role);
    const acc = demoAccounts.find((a) => a.role === role);
    if (acc) {
      setEmail(acc.email);
      setPassword('');
      setErrorMsg(null);
    }
  };

  const finalizeLogin = (role: UserRole, launchTour: boolean) => {
    const dest = roleDestinationMap[role] ?? 'commandCenter';
    setPendingLoginRole(null);
    setSuccessMsg(`Logged in as ${role}! Launching workspace...`);
    setTimeout(() => {
      setSuccessMsg(null);
      onNavigateToView(dest);
      if (launchTour && onOpenTour) {
        setTimeout(onOpenTour, 300);
      }
    }, 400);
  };

  const triggerFirstTimePrompt = (role: UserRole) => {
    setPendingLoginRole(role);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const success = login(email, password);
    if (success) {
      const acc = demoAccounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
      if (acc) {
        setUserRole(acc.role);
        triggerFirstTimePrompt(acc.role);
      }
    } else {
      setErrorMsg(
        'Invalid credentials. Click "Auto-fill & Launch Workspace" below to use demo access.'
      );
    }
  };

  const handleInstantDemoLogin = () => {
    loginAsRole(selectedRole);
    setUserRole(selectedRole);
    triggerFirstTimePrompt(selectedRole);
  };

  return (
    <div className="min-h-[calc(100vh-53px)] bg-gradient-to-br from-slate-50 to-teal-50 flex items-center justify-center p-5 font-body">
      <div className="w-full max-w-4xl space-y-6">
        {/* Page Header */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <img
            src="/logo.png"
            alt="PRAVAHA Logo"
            className="w-16 h-16 object-contain drop-shadow-md"
          />
          <div className="inline-flex items-center space-x-2 bg-teal-50 border border-teal-200 px-3.5 py-1 rounded-full text-xs font-extrabold text-[#087F8C]">
            <Shield className="w-4 h-4" />
            <span>Role-Based Workspace Separation</span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">PRAVAHA Multi-Role Login Portal</h2>
            <p className="text-xs text-slate-500 font-medium">Predict. Navigate. Deliver. — Select your role to access isolated tools</p>
          </div>
        </div>

        {/* Currently Logged In Banner */}
        {isAuthenticated && currentUser && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full bg-slate-200"
              />
              <div>
                <p className="text-xs font-bold text-emerald-800">Currently logged in as:</p>
                <p className="text-sm font-extrabold text-slate-900">{currentUser.name}</p>
                <p className="text-xs text-emerald-700 font-medium">{currentUser.title}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onNavigateToView(roleDestinationMap[currentUser.role] ?? 'commandCenter')}
                className="bg-[#087F8C] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#075E68] transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Launch My Workspace</span>
              </button>
              <button
                onClick={() => logout()}
                className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        )}

        {/* Role Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {demoAccounts.map((acc) => {
            const RoleIcon = ROLE_ICONS[acc.role] ?? Shield;
            const isSelected = selectedRole === acc.role;
            return (
              <button
                key={acc.role}
                onClick={() => handleRoleTabChange(acc.role)}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer space-y-1.5 ${
                  isSelected
                    ? 'bg-[#087F8C] text-white border-[#087F8C] shadow-lg scale-[1.02]'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex justify-center">
                  <RoleIcon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <div className="text-xs font-bold leading-tight">{acc.role}</div>
              </button>
            );
          })}
        </div>

        {/* Main Login Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="font-bold text-lg text-slate-900">{selectedRole} Login</h3>
              <p className="text-xs text-slate-500 mt-0.5">Enter credentials or use demo access</p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={activeAccount.email}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-[#087F8C] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-[#087F8C]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#087F8C] hover:bg-[#075E68] text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In as {selectedRole}</span>
              </button>
            </form>

            {/* Demo Fill */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[11px] text-slate-500 mb-1 font-semibold">Demo Credentials:</p>
                <p className="text-xs font-mono text-slate-800">{activeAccount.email}</p>
                <p className="text-xs font-mono text-slate-800">{activeAccount.pass}</p>
              </div>
              <button
                onClick={handleInstantDemoLogin}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-teal-300" />
                <span>Auto-fill & Launch {selectedRole} Workspace</span>
              </button>
            </div>
          </div>

          {/* Role Info Card */}
          <div className="bg-[#F7F9FA] p-6 rounded-3xl border border-slate-200 space-y-5">
            <div className="flex items-start space-x-4 border-b border-slate-200 pb-4">
              <img
                src={activeAccount.avatar}
                alt={activeAccount.name}
                className="w-16 h-16 rounded-2xl bg-white border border-slate-200 object-cover"
              />
              <div>
                <h3 className="font-bold text-lg text-slate-900">{activeAccount.name}</h3>
                <p className="text-xs text-[#087F8C] font-bold">{activeAccount.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{activeAccount.department}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{activeAccount.description}</p>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Access Permissions:
              </h4>
              {activeAccount.permissions.map((perm, idx) => (
                <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center space-x-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="font-semibold text-slate-800">{perm}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* First Time Login Prompt Modal */}
      {pendingLoginRole && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center space-x-3 text-[#087F8C]">
              <div className="p-2 bg-teal-50 rounded-xl">
                <HelpCircle className="w-6 h-6 text-[#087F8C]" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Welcome to PRAVAHA</h3>
                <p className="text-xs text-slate-500">First-Time Setup Assistance</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p className="text-sm font-extrabold text-slate-900">
                Are you logging in for the first time?
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                We can launch an interactive spotlight tour to walk you through your {pendingLoginRole} controls, hazard reporting, and live map tools.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => finalizeLogin(pendingLoginRole, true)}
                className="py-3 px-4 bg-[#087F8C] hover:bg-[#075E68] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
              >
                <Compass className="w-4 h-4" />
                <span>Yes, Show Guided Tour</span>
              </button>

              <button
                onClick={() => finalizeLogin(pendingLoginRole, false)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
              >
                No, Go to Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
