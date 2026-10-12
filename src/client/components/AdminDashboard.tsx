import React, { useState, useEffect } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext.js';
import { 
  Building2, 
  Users, 
  Bed, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck,
  Calendar
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { session } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  const [cycles, setCycles] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/admin/overview').then((r) => r.ok ? r.json() : null),
      apiFetch('/api/allocation-cycles').then((r) => r.ok ? r.json() : []),
      apiFetch('/api/buildings').then((r) => r.ok ? r.json() : []),
    ]).then(([ov, cyc, bld]) => {
      setOverview(ov);
      setCycles(cyc);
      setBuildings(bld);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-teal" />
            Hostel Operations & Occupancy Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative campus inventory, live occupancy telemetry, and allocation cycles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full">
            System Status: Operational
          </span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Hostels</div>
          <div className="text-2xl font-bold text-navy-900 font-mono">
            {overview?.totalBuildings ?? 4} <span className="text-xs font-normal text-slate-500">Blocks</span>
          </div>
          <div className="text-[11px] text-slate-500">Aryabhata, Bhaskara, Gargi, Maitreyi</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Authoritative Beds</div>
          <div className="text-2xl font-bold text-navy-900 font-mono">
            {overview?.totalSeats ?? 16} <span className="text-xs font-normal text-slate-500">Seats</span>
          </div>
          <div className="text-[11px] text-slate-500">Derived from room inventory records</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Occupancy</div>
          <div className="text-2xl font-bold text-brand-teal font-mono">
            {overview?.occupiedSeats ?? 0} <span className="text-xs font-normal text-slate-500">Allocated</span>
          </div>
          <div className="text-[11px] text-slate-500">Conflict-free partial unique index enforced</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Open Complaints</div>
          <div className="text-2xl font-bold text-amber-600 font-mono">
            {overview?.openComplaints ?? 0} <span className="text-xs font-normal text-slate-500">Tickets</span>
          </div>
          <div className="text-[11px] text-slate-500">Public & private maintenance desk</div>
        </div>
      </div>

      {/* Buildings & Allocation Cycles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buildings Inventory */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-teal" />
              Campus Halls of Residence
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {buildings.map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">{b.name}</div>
                  <div className="text-xs text-slate-500">
                    Code: <span className="font-mono">{b.code}</span> • Gender: {b.gender_designation} • {b.total_floors} Floors
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Allocation Cycles */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-teal" />
              Configured Allocation Cycles
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {cycles.map((c) => (
              <div key={c.id} className="py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-slate-900">{c.name}</div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {c.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Academic Year {c.academic_year} • Turn Duration: {c.turn_duration_seconds}s • Threshold: {c.waiting_room_threshold} students
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
