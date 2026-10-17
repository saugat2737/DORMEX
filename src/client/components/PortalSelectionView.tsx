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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-teal to-emerald-400 flex items-center justify-center font-bold text-white shadow-md text-xl tracking-wider">
            DX
          </div>
          <div>
            <div className="font-bold text-navy-900 tracking-tight text-xl flex items-center gap-2">
              DORMEX
              <span className="text-[10px] font-semibold bg-brand-teal/10 text-brand-teal px-2 py-0.5 rounded uppercase tracking-wider">
                Pilot Portal
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium">B.V.B. Campus Hostel Allocation Platform</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">Pilot Scope: BVB Block • Floor 2</span>
          <div className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Institutional Portal
          </div>
        </div>
      </header>

      {/* Main Content: 3 Login Portals */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center w-full">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-50 border border-teal-200 text-teal-800 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-brand-teal" />
            Welcome to DORMEX Hostel Management
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight">
            Select Your Allocation Portal
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            Please select your institutional account type to enter the authorized onboarding, allocation, or administration workspace.
          </p>
        </div>

        {errorMsg && (
          <div className="max-w-md mx-auto mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 3 Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Student Login */}
          <div 
            onClick={() => handlePortalSelect('STUDENT')}
            className={`p-6 rounded-2xl border-2 transition-all cursor-pointer bg-white flex flex-col justify-between ${
              selectedPortal === 'STUDENT'
                ? 'border-brand-teal ring-4 ring-brand-teal/10 shadow-lg -translate-y-1'
                : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-brand-teal flex items-center justify-center font-bold">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-navy-900">Student Portal</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Student onboarding, hostel terms agreement, verified fee status, priority seat selection, and roommate coordination.
                </p>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Personal & guardian profile completion</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Mandatory room responsibility agreement</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Live 3-color floor map turn selection</span>
                </li>
              </ul>
            </div>

            <button 
              type="button"
              className={`mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                selectedPortal === 'STUDENT'
                  ? 'bg-brand-teal text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{selectedPortal === 'STUDENT' ? 'Selected' : 'Select Student Portal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2. Admin / Staff Login */}
          <div 
            onClick={() => handlePortalSelect('ADMIN')}
            className={`p-6 rounded-2xl border-2 transition-all cursor-pointer bg-white flex flex-col justify-between ${
              selectedPortal === 'ADMIN'
                ? 'border-brand-teal ring-4 ring-brand-teal/10 shadow-lg -translate-y-1'
                : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-navy-900">Admin & Wardens</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Administrative cycle control, BVB Block Floor 2 oversight, central complaint inbox, room-change approvals, and audit log.
                </p>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Start, monitor, and close allocation cycles</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>Unified complaint inbox (Public & Private)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>48-hour room-change atomic review</span>
                </li>
              </ul>
            </div>

            <button 
              type="button"
              className={`mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                selectedPortal === 'ADMIN'
                  ? 'bg-brand-teal text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{selectedPortal === 'ADMIN' ? 'Selected' : 'Select Admin Portal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3. Hostel Office Login */}
          <div 
            onClick={() => handlePortalSelect('HOSTEL_OFFICE')}
            className={`p-6 rounded-2xl border-2 transition-all cursor-pointer bg-white flex flex-col justify-between ${
              selectedPortal === 'HOSTEL_OFFICE'
                ? 'border-brand-teal ring-4 ring-brand-teal/10 shadow-lg -translate-y-1'
                : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-navy-900">Hostel Office</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Admissions, authoritative fee evidence verification, payment timestamp recording, and priority assignment.
                </p>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Authoritative fee verification & timestamping</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Chronological priority calculation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Hostel admission & readiness checks</span>
                </li>
              </ul>
            </div>

            <button 
              type="button"
              className={`mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                selectedPortal === 'HOSTEL_OFFICE'
                  ? 'bg-brand-teal text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
