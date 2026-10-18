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
  School
} from 'lucide-react';

export const PortalSelectionView: React.FC = () => {
  const { login, isDevMode } = useAuth();
  const [selectedPortal, setSelectedPortal] = useState<'STUDENT' | 'ADMIN' | 'HOSTEL_OFFICE' | null>(null);
  const [selectedUserKey, setSelectedUserKey] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePortalSelect = (portal: 'STUDENT' | 'ADMIN' | 'HOSTEL_OFFICE') => {
    setSelectedPortal(portal);
    setErrorMsg(null);
    if (portal === 'STUDENT') setSelectedUserKey('demo1');
    if (portal === 'ADMIN') setSelectedUserKey('superAdmin');
    if (portal === 'HOSTEL_OFFICE') setSelectedUserKey('hostelOffice');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortal || !selectedUserKey) return;
    try {
      login(selectedPortal, selectedUserKey);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F1] flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-[#E2E6E8] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[#203653] flex items-center justify-center font-bold text-white shadow-xs text-lg tracking-wider">
            DX
          </div>
          <div>
            <div className="font-bold text-[#203653] tracking-tight text-lg flex items-center gap-2">
              DORMEX
              <span className="text-[10px] font-semibold bg-[#E7F2ED] text-[#2C8279] border border-[#2C8279]/30 px-2 py-0.5 rounded uppercase tracking-wider">
                Pilot Portal
              </span>
            </div>
            <div className="text-xs text-[#627084] font-medium">B.V.B. Campus Hostel Allocation Platform</div>
          </div>
        </div>

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

        {/* 3 Portal Cards */}
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
              <div className="w-12 h-12 rounded bg-[#E7F2ED] text-[#2C8279] border border-[#2C8279]/30 flex items-center justify-center font-bold">
                <GraduationCap className="w-6 h-6" />
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
              className={`mt-6 w-full py-2.5 px-4 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
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
              <div className="w-12 h-12 rounded bg-[#E5E9EB] text-[#203653] border border-[#203653]/30 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
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
              className={`mt-6 w-full py-2.5 px-4 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
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
                ? 'border-[#2C8279] ring-4 ring-[#2C8279]/15 shadow-sm -translate-y-0.5'
                : 'border-[#E2E6E8] hover:border-[#627084]/40 hover:shadow-xs'
            }`}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded bg-[#FAF4E6] text-[#9C7A2E] border border-[#D4B779] flex items-center justify-center font-bold">
                <Building className="w-6 h-6" />
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
              className={`mt-6 w-full py-2.5 px-4 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
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

        {/* Selected Portal Sign In Panel */}
        {selectedPortal && (
          <div className="mt-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto w-full animate-fadeIn">
            <h4 className="text-sm font-bold text-navy-900 mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4 text-brand-teal" />
              Sign In to {selectedPortal === 'STUDENT' ? 'Student Workspace' : selectedPortal === 'ADMIN' ? 'Administrative Workspace' : 'Hostel Office'}
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Select an authorized pilot identity from the institutional directory to authenticate:
            </p>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Select Institutional Identity
                </label>
                <select
                  value={selectedUserKey}
                  onChange={(e) => setSelectedUserKey(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 text-navy-900 focus:outline-none focus:ring-2 focus:ring-brand-teal"
                >
                  {selectedPortal === 'STUDENT' && (
                    <>
                      <optgroup label="Seeded Demo Students (Pilot Participants)">
                        <option value="demo1">Aarav Sharma (DEMO-001, Verified Fee, Rank #1)</option>
                        <option value="demo2">Diya Patel (DEMO-002, Verified Fee, Rank #2)</option>
                        <option value="demo3">Rohan Verma (DEMO-003, Verified Fee, Rank #3)</option>
                        <option value="demo10">Arjun Menon (DEMO-010, Verified Fee, Rank #10)</option>
                        <option value="demo29">Prisha Pandey (DEMO-029, Fee Submitted - Pending Review)</option>
                        <option value="demo30">Nikhil Saxena (DEMO-030, Unpaid / Fee Pending)</option>
                      </optgroup>
                    </>
                  )}

                  {selectedPortal === 'ADMIN' && (
                    <>
                      <option value="superAdmin">System Administrator (Super Admin)</option>
                      <option value="chiefWarden">Dr. Sharma (Chief Warden)</option>
                      <option value="wardenBvb">Prof. Rao (Warden - BVB Block)</option>
                    </>
                  )}

                  {selectedPortal === 'HOSTEL_OFFICE' && (
                    <>
                      <option value="hostelOffice">Hostel Office Staff (Admissions & Verification)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-brand-teal hover:bg-brand-tealHover text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  <span>Authenticate & Enter Workspace</span>
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
