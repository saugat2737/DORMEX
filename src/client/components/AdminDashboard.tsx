import React, { useState, useEffect } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext.js';
import { 
  Building2, 
  Users, 
  Bed, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  ShieldCheck,
  Calendar,
  Layers,
  Wrench,
  Ban,
  Check,
  RefreshCw,
  Info
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { session } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  const [cycles, setCycles] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [floorMap, setFloorMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isSuperAdminOrOffice = ['HOSTEL_OFFICE', 'SUPER_ADMIN'].includes(session.role);

  const loadData = async () => {
    try {
      const [ov, cyc, rms, mp] = await Promise.all([
        apiFetch('/api/admin/overview').then((r) => r.ok ? r.json() : null),
        apiFetch('/api/allocation-cycles').then((r) => r.ok ? r.json() : []),
        apiFetch('/api/floors/flr_bvb_2/rooms').then((r) => r.ok ? r.json() : []),
        apiFetch('/api/floors/flr_bvb_2/map').then((r) => r.ok ? r.json() : null),
      ]);
      setOverview(ov);
      setCycles(cyc);
      setRooms(rms);
      setFloorMap(mp);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartCycleEarly = async (cycleId: string) => {
    setActionMsg(null);
    try {
      const res = await apiFetch(`/api/allocation-cycles/${cycleId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'READY', waitingRoomThreshold: 30 }),
      });
      if (!res.ok) throw new Error('Failed to update cycle');
      setActionMsg({ type: 'success', text: 'Pilot cycle activated and ready for allocation turns!' });
      loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  const handleToggleSeatStatus = async (seatId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'MAINTENANCE' : (currentStatus === 'MAINTENANCE' ? 'BLOCKED' : 'ACTIVE');
    try {
      const res = await apiFetch(`/api/seats/${seatId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update seat status');
      }
      setActionMsg({ type: 'success', text: `Seat ${seatId} status changed to ${nextStatus}` });
      loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-teal" />
            <h1 className="text-xl font-bold text-navy-900 tracking-tight">
              BVB Block Pilot Administration Dashboard
            </h1>
            <span className="text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full">
              Floor 2 • 30 Students
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative scope-controlled pilot overview: 30 synthetic students, 72 SVG rooms, provisional bed inventory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            BVB Pilot: Active & Configured
          </span>
        </div>
      </div>

      {actionMsg && (
        <div className={`p-3.5 border rounded-lg text-xs font-medium flex items-center gap-2 ${
          actionMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Primary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registered Students</div>
          <div className="text-2xl font-bold text-navy-900 font-mono">
            {overview?.registeredStudents ?? 30} <span className="text-xs font-normal text-slate-500">Demo Records</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {overview?.eligibleStudents ?? 28} Verified Eligible • Exactly 30 Seeded
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Configured Demo Beds</div>
          <div className="text-2xl font-bold text-navy-900 font-mono">
            {overview?.totalSeats ?? 184} <span className="text-xs font-normal text-slate-500">Beds</span>
          </div>
          <div className="text-[11px] text-slate-500">72 Rooms (Provisional capacities)</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Occupancy</div>
          <div className="text-2xl font-bold text-brand-teal font-mono">
            {overview?.occupiedSeats ?? 0} <span className="text-xs font-normal text-slate-500">Allocated</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {overview?.availableSeats ?? (overview?.totalSeats ?? 184)} Available for Selection
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inventory Status</div>
          <div className="text-2xl font-bold text-slate-800 font-mono">
            {overview?.totalRooms ?? 72} <span className="text-xs font-normal text-slate-500">Rooms</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {overview?.maintenanceSeats ?? 0} Maintenance • {overview?.blockedSeats ?? 0} Blocked
          </div>
        </div>
      </div>

      {/* Pilot Cycle Management & Inventory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pilot Allocation Cycle */}
        <div className="lg:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-teal" />
              Pilot Allocation Cycle
            </h2>
          </div>

          <div className="space-y-3">
            {cycles.filter((c) => c.id === 'cyc_bvb_pilot_2026' || c.id === 'cyc_fall_2026').slice(0, 1).map((c) => (
              <div key={c.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-navy-900">{c.name}</div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {c.status}
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div><strong>Turn Window:</strong> {c.turn_duration_seconds}s per student</div>
                  <div><strong>Waiting Threshold:</strong> {c.waiting_room_threshold} students (Pilot configured)</div>
                  <div><strong>Late Grace:</strong> {c.late_grace_seconds}s (max {c.max_penalty_turns} turns)</div>
                  <div><strong>Inventory Pool:</strong> BVB Floor 2 Seats</div>
                </div>

                {isSuperAdminOrOffice && (
                  <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                    <button
                      onClick={() => handleStartCycleEarly(c.id)}
                      className="w-full py-1.5 bg-brand-teal hover:bg-brand-tealHover text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Manual Early Cycle Start
                    </button>
                  </div>
                )}
              </div>
            ))}

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Pilot Scope Guard:
              </div>
              <div>
                The active pilot interface displays only BVB Block Floor 2 and 30 demo students. The architecture remains expandable to additional buildings and floors through standard data records.
              </div>
            </div>
          </div>
        </div>

        {/* BVB Floor 2 Room & Seat Inventory */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-teal" />
              BVB Floor 2 Room & Bed Inspection (Rooms 201–272)
            </h2>
            <span className="text-[11px] text-slate-400">Click any room to view or toggle bed maintenance</span>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-12 gap-1.5 max-h-[300px] overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-lg">
            {rooms.map((rm) => {
              const isSelected = selectedRoom?.id === rm.id;
              const hasOccupied = parseInt(rm.occupied_seats, 10) > 0;

              return (
                <button
                  key={rm.id}
                  onClick={() => setSelectedRoom(rm)}
                  className={`p-1.5 rounded text-center text-xs font-mono font-bold transition-all border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                      : hasOccupied
                      ? 'bg-slate-200 text-slate-800 border-slate-300'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-brand-teal'
                  }`}
                >
                  <div className="text-[10px] leading-tight">{rm.room_number}</div>
                  <div className="text-[8px] opacity-75 font-normal">
                    {rm.available_seats}/{rm.total_seats}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedRoom ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-navy-900">
                    Room {selectedRoom.room_number} Details
                  </h3>
                  <div className="text-xs text-slate-500">
                    Capacity: {selectedRoom.capacity} beds ({selectedRoom.room_type}) • Provisional Demo Data
                  </div>
                </div>
                <div className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-200 text-slate-700">
                  {selectedRoom.occupied_seats} / {selectedRoom.total_seats} Beds Occupied
                </div>
              </div>

              {/* Seats list for room */}
              <div className="flex flex-wrap gap-2">
                {['A', 'B', 'C'].slice(0, selectedRoom.capacity).map((label) => {
                  const seatId = `st_${selectedRoom.id}_${label}`;
                  return (
                    <div
                      key={seatId}
                      className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800 font-mono">Seat {label}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{seatId}</div>
                      </div>

                      {isSuperAdminOrOffice && (
                        <button
                          onClick={() => handleToggleSeatStatus(seatId, 'ACTIVE')}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold transition-colors flex items-center gap-1"
                          title="Cycle status: Active -> Maintenance -> Blocked"
                        >
                          <Wrench className="w-3 h-3 text-slate-500" />
                          Toggle State
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-400">
              Select a room above to inspect bed inventory and manage operational maintenance status.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
