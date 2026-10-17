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

interface LayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<LayoutProps> = ({ currentTab, setCurrentTab, children }) => {
  const { session, switchUser } = useAuth();

  const isStudent = session.role === 'STUDENT';
  const isStaff = !isStudent;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-navy-900 text-slate-200 flex flex-col justify-between shrink-0 border-r border-navy-800">
        <div>
          {/* Logo & System Brand */}
          <div className="p-5 border-b border-navy-800 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-teal to-emerald-400 flex items-center justify-center font-bold text-white shadow-md text-lg tracking-wider">
              DX
            </div>
            <div>
              <div className="font-bold text-white tracking-tight text-lg flex items-center gap-1.5">
                DORMEX
                <span className="text-[10px] font-semibold bg-brand-gold text-white px-1.5 py-0.5 rounded uppercase tracking-wider">PROD</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Hostel Allocation Platform</div>
            </div>
          </div>

          {/* Dev Role Switcher Bar */}
          <div className="p-3 bg-navy-800/60 border-b border-navy-700/60">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Active Persona (Dev Harness)
            </label>
            <select
              value={
                Object.keys(DEV_USERS).find((k) => DEV_USERS[k].userId === session.userId) || 'demo1'
              }
              onChange={(e) => switchUser(e.target.value)}
              className="w-full text-xs bg-navy-900 border border-navy-700 rounded-md px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-brand-teal"
            >
              <optgroup label="BVB Pilot Demo Students (30 Seeded)">
                <option value="demo1">Aarav Sharma (DEMO-001, Rank #1)</option>
                <option value="demo2">Diya Patel (DEMO-002, Rank #2)</option>
                <option value="demo3">Rohan Verma (DEMO-003, Rank #3)</option>
                <option value="demo10">Arjun Menon (DEMO-010, Rank #10)</option>
                <option value="demo29">Prisha Pandey (DEMO-029, Pending)</option>
                <option value="demo30">Nikhil Saxena (DEMO-030, Fee Pending)</option>
                <option value="student1">Aarav Patel (USN202401, Test Alias)</option>
              </optgroup>
              <optgroup label="Staff Administration">
                <option value="wardenBvb">Prof. Rao (Warden - BVB Block)</option>
                <option value="chiefWarden">Dr. Sharma (Chief Warden)</option>
                <option value="hostelOffice">Hostel Office Staff</option>
                <option value="superAdmin">Super Administrator (Override)</option>
              </optgroup>
            </select>
          </div>

          {/* Menu Items */}
          <nav className="p-3 space-y-1">
            {isStudent && (
              <>
                <button
                  onClick={() => setCurrentTab('student_allocation')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'student_allocation'
                      ? 'bg-brand-teal text-white shadow-sm'
                      : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Clock className="w-4 h-4 text-emerald-300" />
                    <span>Live Allocation & Map</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
                <button
                  onClick={() => setCurrentTab('student_complaints')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'student_complaints'
                      ? 'bg-brand-teal text-white shadow-sm'
                      : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-4 h-4 text-amber-300" />
                    <span>Hostel Complaints</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              </>
            )}

            {isStaff && (
              <>
                <button
                  onClick={() => setCurrentTab('admin_overview')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'admin_overview'
                      ? 'bg-brand-teal text-white shadow-sm'
                      : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-4 h-4 text-teal-300" />
                    <span>BVB Pilot Overview</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
                <button
                  onClick={() => setCurrentTab('admin_students')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'admin_students'
                      ? 'bg-brand-teal text-white shadow-sm'
                      : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Users className="w-4 h-4 text-emerald-300" />
                    <span>Student Registry (30)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
                <button
                  onClick={() => setCurrentTab('admin_floor_editor')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'admin_floor_editor'
                      ? 'bg-brand-teal text-white shadow-sm'
                      : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Map className="w-4 h-4 text-cyan-300" />
                    <span>2D Floor Plan Maker</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
                <button
                  onClick={() => setCurrentTab('admin_complaints')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    currentTab === 'admin_complaints'
                      ? 'bg-brand-teal text-white shadow-sm'
                      : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-4 h-4 text-amber-300" />
                    <span>Complaint Desk</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              </>
            )}
          </nav>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-navy-800 bg-navy-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">
              {session.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-white truncate">{session.fullName}</div>
              <div className="text-[10px] text-brand-teal font-medium uppercase tracking-wider">{session.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto min-h-screen">
        {children}
      </main>
    </div>
  );
};
