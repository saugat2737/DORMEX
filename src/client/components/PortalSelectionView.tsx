import React, { useState } from 'react';
import { useAuth, DEV_USERS } from '../context/AuthContext.js';
import { 
  GraduationCap, 
  ShieldCheck, 
  Building, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Sparkles, 
  School,
  KeyRound,
  UserCheck,
  Eye,
  EyeOff
} from 'lucide-react';
import { DormexLogo } from './DormexLogo.js';

export const PortalSelectionView: React.FC = () => {
  const { login, loginWithCredentials, isDevMode } = useAuth();
  const [selectedPortal, setSelectedPortal] = useState<'STUDENT' | 'ADMIN' | 'HOSTEL_OFFICE'>('STUDENT');
  const [selectedUserKey, setSelectedUserKey] = useState<string>('demo1');
  const [authIdInput, setAuthIdInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePortalSelect = (portal: 'STUDENT' | 'ADMIN' | 'HOSTEL_OFFICE') => {
    setSelectedPortal(portal);
    setErrorMsg(null);
    if (portal === 'STUDENT') {
      setSelectedUserKey('demo1');
      setAuthIdInput('DEMO-001');
      setPasswordInput('••••••••');
    }
    if (portal === 'ADMIN') {
      setSelectedUserKey('superAdmin');
      setAuthIdInput('ADM001');
      setPasswordInput('••••••••');
    }
    if (portal === 'HOSTEL_OFFICE') {
      setSelectedUserKey('hostelOffice');
      setAuthIdInput('OFF001');
      setPasswordInput('••••••••');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortal) return;
    setErrorMsg(null);
    try {
      if (authIdInput.trim()) {
        loginWithCredentials(selectedPortal, authIdInput, passwordInput || 'password');
      } else if (selectedUserKey) {
        login(selectedPortal, selectedUserKey);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F1] flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-[#E2E6E8] px-6 py-3.5 flex items-center justify-between">
        <DormexLogo theme="primary" size="md" />

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#627084] hidden sm:inline">Pilot Scope: BVB Block • Floor 2</span>
          <div className="px-2.5 py-1 bg-[#E7F2ED] text-[#1E7B54] text-xs font-semibold rounded border border-[#A8D5C2] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1E7B54] animate-pulse" />
            Institutional Portal
          </div>
        </div>
      </header>

      {/* Main Content: 3 Login Portals */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center w-full">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E7F2ED] border border-[#2C8279]/30 text-[#2C8279] rounded text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#2C8279]" />
            Welcome to DORMEX Hostel Management
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#203653] tracking-tight">
            Select Your Allocation Portal
          </h1>
          <p className="text-[#627084] text-sm leading-relaxed">
            Please select your institutional account type to enter the authorized onboarding, allocation, or administration workspace.
          </p>
        </div>

        {errorMsg && (
          <div className="max-w-md mx-auto mb-6 p-3.5 bg-[#FDE8E8] border border-[#F8B4B4] rounded text-[#C93B3B] text-xs font-medium flex items-center gap-2.5 shadow-xs">
            <AlertCircle className="w-4 h-4 text-[#C93B3B] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 3 Portal Cards with Integrated Institutional Identity & Password Login */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Student Login */}
          <div 
            onClick={() => handlePortalSelect('STUDENT')}
            className={`p-6 rounded-xl border-2 transition-all cursor-pointer bg-white flex flex-col justify-between ${
              selectedPortal === 'STUDENT'
                ? 'border-[#2C8279] ring-4 ring-[#2C8279]/15 shadow-sm -translate-y-0.5'
                : 'border-[#E2E6E8] hover:border-[#627084]/40 hover:shadow-xs'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#E7F2ED] text-[#2C8279] border border-[#2C8279]/30 flex items-center justify-center font-bold">
                  <GraduationCap className="w-6 h-6" />
                </div>
                {selectedPortal === 'STUDENT' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#E7F2ED] text-[#1E7B54] rounded-full border border-[#A8D5C2]">
                    Active Option
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#203653]">Student Portal</h3>
                <p className="text-xs text-[#627084] mt-1.5 leading-relaxed">
                  Student onboarding, hostel terms agreement, verified fee status, priority seat selection, and roommate coordination.
                </p>
              </div>
              <ul className="space-y-1.5 text-xs text-[#263345] pt-2 border-t border-[#E2E6E8]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E7B54] shrink-0" />
                  <span>Personal & guardian profile completion</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E7B54] shrink-0" />
                  <span>Mandatory room responsibility agreement</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#1E7B54] shrink-0" />
                  <span>Live 3-color floor map turn selection</span>
                </li>
              </ul>
            </div>

            <button 
              type="button"
              className={`mt-6 w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                selectedPortal === 'STUDENT'
                  ? 'bg-[#2C8279] text-white shadow-xs'
                  : 'bg-[#F7F6F1] text-[#263345] border border-[#E2E6E8] hover:bg-[#eaeef0]'
              }`}
            >
              <span>{selectedPortal === 'STUDENT' ? 'Selected' : 'Select Student Portal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Admin / Staff Login */}
          <div 
            onClick={() => handlePortalSelect('ADMIN')}
            className={`p-6 rounded-xl border-2 transition-all cursor-pointer bg-white flex flex-col justify-between ${
              selectedPortal === 'ADMIN'
                ? 'border-[#203653] ring-4 ring-[#203653]/15 shadow-sm -translate-y-0.5'
                : 'border-[#E2E6E8] hover:border-[#627084]/40 hover:shadow-xs'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#E5E9EB] text-[#203653] border border-[#203653]/30 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                {selectedPortal === 'ADMIN' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#E5E9EB] text-[#203653] rounded-full border border-[#C4C6CE]">
                    Active Option
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#203653]">Admin & Wardens</h3>
                <p className="text-xs text-[#627084] mt-1.5 leading-relaxed">
                  Administrative cycle control, BVB Block Floor 2 oversight, central complaint inbox, room-change approvals, and audit log.
                </p>
              </div>
              <ul className="space-y-1.5 text-xs text-[#263345] pt-2 border-t border-[#E2E6E8]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#203653] shrink-0" />
                  <span>Start, monitor, and close allocation cycles</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#203653] shrink-0" />
                  <span>Unified complaint inbox (Public & Private)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#203653] shrink-0" />
                  <span>48-hour room-change atomic review</span>
                </li>
              </ul>
            </div>

            <button 
              type="button"
              className={`mt-6 w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                selectedPortal === 'ADMIN'
                  ? 'bg-[#203653] text-white shadow-xs'
                  : 'bg-[#F7F6F1] text-[#263345] border border-[#E2E6E8] hover:bg-[#eaeef0]'
              }`}
            >
              <span>{selectedPortal === 'ADMIN' ? 'Selected' : 'Select Admin Portal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3. Hostel Office Login */}
          <div 
            onClick={() => handlePortalSelect('HOSTEL_OFFICE')}
            className={`p-6 rounded-xl border-2 transition-all cursor-pointer bg-white flex flex-col justify-between ${
              selectedPortal === 'HOSTEL_OFFICE'
                ? 'border-[#9C7A2E] ring-4 ring-[#9C7A2E]/15 shadow-sm -translate-y-0.5'
                : 'border-[#E2E6E8] hover:border-[#627084]/40 hover:shadow-xs'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-[#FAF4E6] text-[#9C7A2E] border border-[#D4B779] flex items-center justify-center font-bold">
                  <Building className="w-6 h-6" />
                </div>
                {selectedPortal === 'HOSTEL_OFFICE' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FAF4E6] text-[#9C7A2E] rounded-full border border-[#D4B779]">
                    Active Option
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#203653]">Hostel Office</h3>
                <p className="text-xs text-[#627084] mt-1.5 leading-relaxed">
                  Admissions, authoritative fee evidence verification, payment timestamp recording, and priority assignment.
                </p>
              </div>
              <ul className="space-y-1.5 text-xs text-[#263345] pt-2 border-t border-[#E2E6E8]">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#9C7A2E] shrink-0" />
                  <span>Authoritative fee verification & timestamping</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#9C7A2E] shrink-0" />
                  <span>Chronological priority calculation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#9C7A2E] shrink-0" />
                  <span>Hostel admission & readiness checks</span>
                </li>
              </ul>
            </div>

            <button 
              type="button"
              className={`mt-6 w-full py-2.5 px-4 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                selectedPortal === 'HOSTEL_OFFICE'
                  ? 'bg-[#203653] text-white shadow-xs'
                  : 'bg-[#F7F6F1] text-[#263345] border border-[#E2E6E8] hover:bg-[#eaeef0]'
              }`}
            >
              <span>{selectedPortal === 'HOSTEL_OFFICE' ? 'Selected' : 'Select Hostel Office'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Three-Toggle Option Login Panel: ID + Password Credentials */}
        {selectedPortal && (
          <div className="mt-10 bg-white p-7 rounded-2xl border border-[#E2E6E8] shadow-sm max-w-xl mx-auto w-full animate-fadeIn">
            {/* 3-Toggle Portal Switcher */}
            <div className="mb-6 space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#627084] block">
                Select Portal Access Option
              </label>
              <div className="grid grid-cols-3 p-1 bg-[#F0F4F6] rounded-xl border border-[#E5E9EB] gap-1">
                <button
                  type="button"
                  onClick={() => handlePortalSelect('STUDENT')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    selectedPortal === 'STUDENT'
                      ? 'bg-white text-[#07203C] shadow-xs'
                      : 'text-[#627084] hover:text-[#07203C]'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 text-[#016A62]" />
                  <span>Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePortalSelect('ADMIN')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    selectedPortal === 'ADMIN'
                      ? 'bg-white text-[#07203C] shadow-xs'
                      : 'text-[#627084] hover:text-[#07203C]'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-[#203653]" />
                  <span>Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePortalSelect('HOSTEL_OFFICE')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    selectedPortal === 'HOSTEL_OFFICE'
                      ? 'bg-white text-[#07203C] shadow-xs'
                      : 'text-[#627084] hover:text-[#07203C]'
                  }`}
                >
                  <Building className="w-4 h-4 text-[#9C7A2E]" />
                  <span>Hostel Office</span>
                </button>
              </div>
            </div>

            {/* Panel Title & Subtitle */}
            <div className="pb-4 mb-4 border-b border-[#E2E6E8]">
              <h4 className="text-sm font-bold text-[#203653] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#016A62]" />
                <span>
                  {selectedPortal === 'STUDENT'
                    ? 'Student Portal Sign In'
                    : selectedPortal === 'ADMIN'
                    ? 'Administrative Staff Sign In'
                    : 'Hostel Office Sign In'}
                </span>
              </h4>
              <p className="text-xs text-[#627084] mt-1 leading-relaxed">
                {selectedPortal === 'STUDENT'
                  ? 'Enter your Student USN / Institutional ID and account password to enter your turn allocation queue.'
                  : selectedPortal === 'ADMIN'
                  ? 'Enter your Warden / Administrator Staff ID and security key to open the administration console.'
                  : 'Enter your Hostel Admissions Officer ID and credential to access student application registries.'}
              </p>
            </div>

            {/* Credentials Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#203653] block mb-1.5">
                  {selectedPortal === 'STUDENT'
                    ? 'Student USN / Institutional ID'
                    : selectedPortal === 'ADMIN'
                    ? 'Staff ID / Administrator ID'
                    : 'Office Desk ID'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={authIdInput}
                    onChange={(e) => setAuthIdInput(e.target.value)}
                    placeholder={
                      selectedPortal === 'STUDENT'
                        ? 'e.g. DEMO-001 or 1SI21CS094'
                        : selectedPortal === 'ADMIN'
                        ? 'e.g. ADM001 or WRD001'
                        : 'e.g. OFF001'
                    }
                    className="w-full text-xs font-mono bg-[#F7F6F1] border border-[#E2E6E8] rounded-lg px-3.5 py-2.5 text-[#203653] focus:outline-none focus:ring-2 focus:ring-[#016A62] transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#627084]">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#203653]">
                    Account Password / Security Credential
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-[#016A62] hover:text-[#0d6f66] font-medium flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter account password..."
                    className="w-full text-xs font-mono bg-[#F7F6F1] border border-[#E2E6E8] rounded-lg px-3.5 py-2.5 text-[#203653] focus:outline-none focus:ring-2 focus:ring-[#016A62] transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#627084]">
                    <KeyRound className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Quick Preset Selector for Fast Local Pilot Evaluation */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-[#627084]">
                    Quick Pilot Preset Directory:
                  </span>
                  <span className="text-[10px] text-[#016A62] font-mono">Auto-populates ID</span>
                </div>
                <select
                  value={selectedUserKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    setSelectedUserKey(key);
                    const user = DEV_USERS[key];
                    if (user) {
                      setAuthIdInput(user.collegeId);
                      setPasswordInput('••••••••');
                    }
                  }}
                  className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded-lg px-3 py-2 text-[#203653] focus:outline-none focus:ring-1 focus:ring-[#016A62]"
                >
                  {selectedPortal === 'STUDENT' && (
                    <optgroup label="Seeded Demo Students (Pilot Participants)">
                      <option value="demo1">Aarav Sharma (DEMO-001, Verified Fee, Priority #1)</option>
                      <option value="demo2">Diya Patel (DEMO-002, Verified Fee, Priority #2)</option>
                      <option value="demo3">Rohan Verma (DEMO-003, Verified Fee, Priority #3)</option>
                      <option value="demo10">Arjun Menon (DEMO-010, Verified Fee, Priority #10)</option>
                      <option value="demo29">Prisha Pandey (DEMO-029, Fee Submitted - Pending Review)</option>
                      <option value="demo30">Nikhil Saxena (DEMO-030, Unpaid / Fee Pending)</option>
                    </optgroup>
                  )}

                  {selectedPortal === 'ADMIN' && (
                    <>
                      <option value="superAdmin">System Administrator (Super Admin · ADM001)</option>
                      <option value="chiefWarden">Dr. Sharma (Chief Warden · CW001)</option>
                      <option value="wardenBvb">Prof. Rao (Warden - BVB Block · WRD001)</option>
                    </>
                  )}

                  {selectedPortal === 'HOSTEL_OFFICE' && (
                    <>
                      <option value="hostelOffice">Hostel Office Staff (Admissions & Verification · OFF001)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#016A62] hover:bg-[#0d6f66] text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <span>Authenticate with ID & Password</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-500">
        DORMEX College Hostel Allocation Platform • BVB Block Floor 2 Pilot • Authorized Institutional Access Only
      </footer>
    </div>
  );
};
