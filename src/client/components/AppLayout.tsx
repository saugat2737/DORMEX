import React, { useState } from 'react';
import { useAuth, DEV_USERS } from '../context/AuthContext.js';
import { 
  Building2, 
  Map, 
  Users, 
  Clock, 
  AlertCircle, 
  LogOut,
  ChevronRight,
  Bell,
  Menu,
  X,
  UserCheck
} from 'lucide-react';
import { DormexLogo } from './DormexLogo.js';
import { NotificationCenter } from './NotificationCenter.js';

interface LayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<LayoutProps> = ({ currentTab, setCurrentTab, children }) => {
  const { session, logout, isDevMode, switchUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!session) return null;

  const isStudent = session.role === 'STUDENT';
  const isHostelOffice = session.role === 'HOSTEL_OFFICE';
  const isAdmin = ['SUPER_ADMIN', 'CHIEF_WARDEN', 'WARDEN'].includes(session.role);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F7F6F1] font-sans antialiased text-[#263345]">
      {/* Mobile Top Navbar with Hamburger */}
      <div className="md:hidden bg-[#07203C] text-white px-4 py-3 flex items-center justify-between border-b border-[#203653]">
        <div className="flex items-center gap-2">
          <DormexLogo theme="white" size="sm" className="h-7" />
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#203653] transition-colors"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation (250px, dark navy with strong readable contrast) */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#07203C] text-white flex flex-col justify-between shrink-0 border-r border-[#17283B] transition-transform duration-200 ease-in-out
        md:translate-x-0 md:static md:w-[250px]
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col">
          {/* Logo & Platform Context */}
          <div className="px-5 py-4 border-b border-[#203653]/60 bg-[#07203C]">
            <DormexLogo theme="white" size="md" className="h-8 w-auto" />
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-medium text-slate-200 tracking-tight">SIT Tumakuru · ResAdmin</span>
              <span className="font-semibold bg-[#2C8279]/30 text-[#84d5ca] px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">
                BVB Pilot
              </span>
            </div>
          </div>

          {/* Dev Role Switcher Bar (Isolated to dev mode only) */}
          {isDevMode && (
            <div className="p-3 bg-[#112947] border-b border-[#203653]">
              <label className="text-[10px] font-bold text-[#D4B779] uppercase tracking-wider block mb-1">
                Active Persona (Dev Test)
              </label>
              <select
                value={
                  Object.keys(DEV_USERS).find((k) => DEV_USERS[k].userId === session.userId) || 'demo1'
                }
                onChange={(e) => switchUser(e.target.value)}
                className="w-full text-xs bg-[#07203C] border border-[#203653] rounded px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-[#2C8279]"
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

          {/* Nav Item Links */}
          <nav className="p-3 space-y-1">
            {isStudent && (
              <>
                <button
                  onClick={() => {
                    setCurrentTab('student_allocation');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    currentTab === 'student_allocation'
                      ? 'bg-[#2C8279] text-white shadow-sm'
                      : 'text-slate-200 hover:bg-[#112947] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Clock className={`w-4 h-4 ${currentTab === 'student_allocation' ? 'text-white' : 'text-[#84d5ca]'}`} />
                    <span className="tracking-normal">Floor Map & Allocation</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  onClick={() => {
                    setCurrentTab('student_complaints');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    currentTab === 'student_complaints'
                      ? 'bg-[#2C8279] text-white shadow-sm'
                      : 'text-slate-200 hover:bg-[#112947] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <AlertCircle className={`w-4 h-4 ${currentTab === 'student_complaints' ? 'text-white' : 'text-[#D4B779]'}`} />
                    <span className="tracking-normal">Hostel Complaints</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
              </>
            )}

            {(isAdmin || isHostelOffice) && (
              <>
                <button
                  onClick={() => {
                    setCurrentTab('admin_overview');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    currentTab === 'admin_overview'
                      ? 'bg-[#2C8279] text-white shadow-sm'
                      : 'text-slate-200 hover:bg-[#112947] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Building2 className={`w-4 h-4 ${currentTab === 'admin_overview' ? 'text-white' : 'text-[#84d5ca]'}`} />
                    <span className="tracking-normal">Admin Allocation Console</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
                <button
                  onClick={() => {
                    setCurrentTab('admin_students');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    currentTab === 'admin_students'
                      ? 'bg-[#2C8279] text-white shadow-sm'
                      : 'text-slate-200 hover:bg-[#112947] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Users className={`w-4 h-4 ${currentTab === 'admin_students' ? 'text-white' : 'text-[#84d5ca]'}`} />
                    <span className="tracking-normal">Hostel Office Registry</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
                <button
                  onClick={() => {
                    setCurrentTab('admin_complaints');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    currentTab === 'admin_complaints'
                      ? 'bg-[#2C8279] text-white shadow-sm'
                      : 'text-slate-200 hover:bg-[#112947] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <AlertCircle className={`w-4 h-4 ${currentTab === 'admin_complaints' ? 'text-white' : 'text-[#D4B779]'}`} />
                    <span className="tracking-normal">Central Complaint Inbox</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
                <button
                  onClick={() => {
                    setCurrentTab('admin_floor_editor');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                    currentTab === 'admin_floor_editor'
                      ? 'bg-[#2C8279] text-white shadow-sm'
                      : 'text-slate-200 hover:bg-[#112947] hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Map className={`w-4 h-4 ${currentTab === 'admin_floor_editor' ? 'text-white' : 'text-cyan-300'}`} />
                    <span className="tracking-normal">2D Floor Plan Maker</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
              </>
            )}
          </nav>
        </div>

        {/* User Card & Sign Out at Bottom of Sidebar */}
        <div className="p-4 border-t border-[#203653]/60 bg-[#07203C] flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#112947] border border-[#203653] flex items-center justify-center font-bold text-xs text-white shrink-0">
              {session.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">{session.fullName}</div>
              <div className="text-[10px] text-[#84d5ca] font-medium uppercase tracking-wider truncate">{session.role}</div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-[#203653] rounded transition-colors ml-2 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main View Area with Clean Header */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Spacious Top Navigation Header (64px) */}
        <header className="h-16 bg-white border-b border-[#E2E6E8] px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span className="text-[#627084] font-medium hidden sm:inline">Campus Hostels</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#627084] opacity-60 hidden sm:inline" />
            <span className="text-[#627084] font-medium hidden md:inline">BVB Block</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#627084] opacity-60 hidden md:inline" />
            <span className="text-[#203653] font-bold truncate">Floor 2 Allocation Console</span>
            <span className="hidden lg:inline-flex items-center ml-2 px-2 py-0.5 rounded-full bg-[#F7F6F1] border border-[#E2E6E8] text-[10px] text-[#627084] font-semibold">
              AY 2024–25
            </span>
          </div>

          {/* Right Area: Status & Compact User Pill */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E7F2ED] text-[#1E7B54] border border-[#A8D5C2] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#1E7B54] animate-pulse" />
              <span>Pilot Cycle: Floor 2</span>
            </div>

            <NotificationCenter onNavigateTab={setCurrentTab} />

            <div className="h-6 w-px bg-[#E2E6E8] hidden sm:block" />

            <div className="flex items-center gap-2 pl-1">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-[#203653] leading-tight truncate max-w-[140px]">{session.fullName}</div>
                <div className="text-[10px] text-[#627084] font-mono leading-tight">{session.collegeId || session.role}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#203653] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {session.fullName.substring(0, 1)}
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

