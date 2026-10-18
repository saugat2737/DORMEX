import React from 'react';
import { useAuth, DEV_USERS } from '../context/AuthContext.js';
import { 
  Building2, 
  Map, 
  Users, 
  Clock, 
  AlertCircle, 
  Settings, 
  ShieldCheck, 
  LogOut,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { DormexLogo } from './DormexLogo.js';

interface LayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<LayoutProps> = ({ currentTab, setCurrentTab, children }) => {
  const { session, logout, isDevMode, switchUser } = useAuth();

  if (!session) return null;

  const isStudent = session.role === 'STUDENT';
  const isHostelOffice = session.role === 'HOSTEL_OFFICE';
  const isAdmin = ['SUPER_ADMIN', 'CHIEF_WARDEN', 'WARDEN'].includes(session.role);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F7F6F1] font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#203653] text-slate-200 flex flex-col justify-between shrink-0 border-r border-[#17283B]">
        <div>
          {/* Logo & System Brand matching Stitch Brand Board */}
          <div className="p-4 border-b border-[#17283B]">
            <DormexLogo variant="dark" size="sm" showSubtitle={true} />
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#17283B]/80 text-[10px]">
              <span className="text-slate-300 font-medium">B.V.B. Campus Allocation</span>
              {isDevMode ? (
                <span className="text-[9px] font-semibold bg-[#D4B779] text-[#203653] px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                  DEV
                </span>
              ) : (
                <span className="text-[9px] font-semibold bg-[#2C8279]/40 text-[#84d5ca] px-1.5 py-0.5 rounded uppercase tracking-wider">
                  PILOT
                </span>
              )}
            </div>
          </div>

          {/* Dev Role Switcher Bar (Appears ONLY in explicitly enabled development mode) */}
          {isDevMode && (
            <div className="p-3 bg-[#17283B]/80 border-b border-[#17283B]">
              <label className="text-[9px] font-semibold text-[#D4B779] uppercase tracking-wider block mb-1 flex items-center gap-1">
                <span>Dev Persona Switcher</span>
              </label>
              <select
                value={
                  Object.keys(DEV_USERS).find((k) => DEV_USERS[k].userId === session.userId) || 'demo1'
                }
                onChange={(e) => switchUser(e.target.value)}
                className="w-full text-xs bg-[#203653] border border-[#263345] rounded px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-[#2C8279]"
              >
                <optgroup label="BVB Pilot Demo Students (30 Seeded)">
                  <option value="demo1">Aarav Sharma (DEMO-001, Rank #1)</option>
                  <option value="demo2">Diya Patel (DEMO-002, Rank #2)</option>
                  <option value="demo3">Rohan Verma (DEMO-003, Rank #3)</option>
                  <option value="demo10">Arjun Menon (DEMO-010, Rank #10)</option>
                  <option value="demo29">Prisha Pandey (DEMO-029, Fee Pending)</option>
                  <option value="demo30">Nikhil Saxena (DEMO-030, Unpaid)</option>
                </optgroup>
                <optgroup label="Staff Administration">
                  <option value="hostelOffice">Hostel Office Staff</option>
                  <option value="superAdmin">System Administrator (Super Admin)</option>
                  <option value="chiefWarden">Dr. Sharma (Chief Warden)</option>
                  <option value="wardenBvb">Prof. Rao (Warden - BVB Block)</option>
                </optgroup>
              </select>
            </div>
          )}

          {/* Menu Items */}
          <nav className="p-3 space-y-1">
            {isStudent && (
              <>
                <button
                  onClick={() => setCurrentTab('student_allocation')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition-colors ${
                    currentTab === 'student_allocation'
                      ? 'bg-[#2C8279] text-white shadow-xs'
                      : 'text-slate-300 hover:bg-[#17283B] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-[#84d5ca]" />
                    <span>Onboarding & Allocation</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
                <button
                  onClick={() => setCurrentTab('student_complaints')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition-colors ${
                    currentTab === 'student_complaints'
                      ? 'bg-[#2C8279] text-white shadow-xs'
                      : 'text-slate-300 hover:bg-[#17283B] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-4 h-4 text-[#D4B779]" />
                    <span>Hostel Complaints</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              </>
            )}

            {(isAdmin || isHostelOffice) && (
              <>
                <button
                  onClick={() => setCurrentTab('admin_overview')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition-colors ${
                    currentTab === 'admin_overview'
                      ? 'bg-[#2C8279] text-white shadow-xs'
                      : 'text-slate-300 hover:bg-[#17283B] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-4 h-4 text-[#84d5ca]" />
                    <span>Allocation Console</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
                <button
                  onClick={() => setCurrentTab('admin_students')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition-colors ${
                    currentTab === 'admin_students'
                      ? 'bg-[#2C8279] text-white shadow-xs'
                      : 'text-slate-300 hover:bg-[#17283B] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Users className="w-4 h-4 text-[#84d5ca]" />
                    <span>Hostel Office Registry (30)</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
                <button
                  onClick={() => setCurrentTab('admin_complaints')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition-colors ${
                    currentTab === 'admin_complaints'
                      ? 'bg-[#2C8279] text-white shadow-xs'
                      : 'text-slate-300 hover:bg-[#17283B] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-4 h-4 text-[#D4B779]" />
                    <span>Complaint Desk</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
                {(isAdmin || isHostelOffice) && (
                  <button
                    onClick={() => setCurrentTab('admin_floor_editor')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition-colors ${
                      currentTab === 'admin_floor_editor'
                        ? 'bg-[#2C8279] text-white shadow-xs'
                        : 'text-slate-300 hover:bg-[#17283B] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Map className="w-4 h-4 text-cyan-300" />
                      <span>2D Floor Plan Maker</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                )}
              </>
            )}
          </nav>
        </div>

        {/* User Card & Sign Out */}
        <div className="p-4 border-t border-[#17283B] bg-[#17283B]/50 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded bg-[#263345] border border-slate-600 flex items-center justify-center font-bold text-xs text-white shrink-0">
              {session.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">{session.fullName}</div>
              <div className="text-[10px] text-[#84d5ca] font-medium uppercase tracking-wider">{session.role}</div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#203653] rounded transition-colors ml-2"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto min-h-screen">
        {children}
      </main>
    </div>
  );
};
