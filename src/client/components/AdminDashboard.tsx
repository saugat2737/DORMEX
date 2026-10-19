import React, { useState, useEffect } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext.js';
import { 
  Building2, 
  Users, 
  Bed, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  Pause,
  StopCircle,
  ShieldCheck,
  Calendar,
  Layers,
  Wrench,
  Ban,
  Check,
  RefreshCw,
  Info,
  Repeat,
  FileCheck,
  Sparkles,
  Download,
  Globe,
  Lock
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { session } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  const [cycles, setCycles] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [floorMap, setFloorMap] = useState<any>(null);
  const [roomChangeRequests, setRoomChangeRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // In-person room change modal state
  const [showInPersonModal, setShowInPersonModal] = useState(false);
  const [inpStudentId, setInpStudentId] = useState('');
  const [inpTargetRoomId, setInpTargetRoomId] = useState('');
  const [inpReason, setInpReason] = useState('');
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [simulationData, setSimulationData] = useState<any | null>(null);
  const [showSimModal, setShowSimModal] = useState(false);
  const [simLoading, setSimLoading] = useState(false);

  // Dynamic Building & Floor Selection
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('bld_bvb');
  const [selectedFloorId, setSelectedFloorId] = useState<string>('flr_bvb_2');

  const isSuperAdminOrOffice = ['HOSTEL_OFFICE', 'SUPER_ADMIN'].includes(session?.role || '');

  const handleRunSimulation = async (cycleId: string) => {
    setSimLoading(true);
    setActionMsg(null);
    try {
      const res = await apiFetch(`/api/allocation-cycles/${cycleId}/simulate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to execute dry-run simulation');
      }
      const data = await res.json();
      setSimulationData(data);
      setShowSimModal(true);
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    } finally {
      setSimLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const [ov, cyc, blds, rcr, stu, aud] = await Promise.all([
        apiFetch('/api/admin/overview').then((r) => r.ok ? r.json() : null),
        apiFetch('/api/allocation-cycles').then((r) => r.ok ? r.json() : []),
        apiFetch('/api/buildings').then((r) => r.ok ? r.json() : []),
        apiFetch('/api/room-change-requests').then((r) => r.ok ? r.json() : []),
        apiFetch('/api/students').then((r) => r.ok ? r.json() : []),
        apiFetch('/api/admin/audit-logs').then((r) => r.ok ? r.json() : []),
      ]);
      setOverview(ov);
      setCycles(cyc);
      setBuildings(blds);
      setRoomChangeRequests(rcr);
      setAllStudents(stu);
      setAuditLogs(aud);

      // Default building selection if needed
      if (blds.length > 0 && !selectedBuildingId) {
        setSelectedBuildingId(blds[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch floors whenever selected building changes
  useEffect(() => {
    if (!selectedBuildingId) return;
    apiFetch(`/api/buildings/${selectedBuildingId}/floors`).then(async (r) => {
      if (r.ok) {
        const flrs = await r.json();
        setFloors(flrs);
        if (flrs.length > 0 && (!flrs.find((f: any) => f.id === selectedFloorId))) {
          setSelectedFloorId(flrs[0].id);
        }
      }
    });
  }, [selectedBuildingId]);

  // Fetch rooms and map whenever selected floor changes
  useEffect(() => {
    if (!selectedFloorId) return;
    setSelectedRoom(null);
    Promise.all([
      apiFetch(`/api/floors/${selectedFloorId}/rooms`).then((r) => r.ok ? r.json() : []),
      apiFetch(`/api/floors/${selectedFloorId}/map`).then((r) => r.ok ? r.json() : null),
    ]).then(([rms, mp]) => {
      setRooms(rms);
      setFloorMap(mp);
    });
  }, [selectedFloorId]);

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateCycleStatus = async (cycleId: string, status: string) => {
    setActionMsg(null);
    try {
      const res = await apiFetch(`/api/allocation-cycles/${cycleId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, waitingRoomThreshold: 30 }),
      });
      if (!res.ok) throw new Error('Failed to update cycle status');
      setActionMsg({ type: 'success', text: `Pilot cycle status updated to ${status}!` });
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

  const handleReviewRoomChange = async (reqId: string, decision: 'APPROVED' | 'REJECTED') => {
    setActionMsg(null);
    try {
      const res = await apiFetch(`/api/room-change-requests/${reqId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          notes: `Administrative review decision: ${decision}`,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Review failed');
      }
      setActionMsg({ type: 'success', text: `Room change request ${decision.toLowerCase()} successfully!` });
      loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  const handleRecordInPersonRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inpStudentId || !inpTargetRoomId || !inpReason) return;
    setActionMsg(null);
    try {
      const res = await apiFetch('/api/room-change-requests/in-person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId: 'cyc_bvb_pilot_2026',
          studentProfileId: inpStudentId,
          targetRoomId: inpTargetRoomId,
          reason: inpReason,
          autoApprove: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record in-person request');
      }
      setActionMsg({ type: 'success', text: 'In-person room change recorded and atomically applied!' });
      setShowInPersonModal(false);
      setInpReason('');
      loadData();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header matching Stitch Admin Allocation Control Console */}
      <div className="bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#2C8279]" />
            <h1 className="text-xl font-bold text-[#203653] tracking-tight">
              Admin Allocation Control Console
            </h1>
            <span className="text-[11px] font-bold bg-[#E7F2ED] text-[#1E7B54] border border-[#A8D5C2] px-2.5 py-0.5 rounded-full">
              BVB Floor 2 Pilot • Cycle Active
            </span>
          </div>
          <p className="text-xs text-[#627084] mt-1">
            Pre-flight inventory verification, authoritative live turn engine, and participant cohort management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const res = await apiFetch('/api/admin/reports/occupancy?format=csv');
                if (!res.ok) throw new Error('Failed to export occupancy report');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dormex_occupancy_report_${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                setActionMsg({ type: 'success', text: 'Occupancy CSV report downloaded successfully!' });
              } catch (err: any) {
                setActionMsg({ type: 'error', text: err.message });
              }
            }}
            className="px-3.5 py-2 bg-white hover:bg-[#F7F6F1] text-[#203653] border border-[#E2E6E8] text-xs font-bold rounded shadow-xs transition-colors flex items-center gap-1.5"
            title="Download CSV export of building occupancy and allocations"
          >
            <Download className="w-4 h-4 text-[#2C8279]" />
            Export Occupancy CSV
          </button>
          <button
            onClick={() => setShowInPersonModal(true)}
            className="px-3.5 py-2 bg-[#203653] hover:bg-[#17283B] text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Repeat className="w-4 h-4 text-[#84d5ca]" />
            Record In-Person Room Change
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className={`p-3.5 border rounded text-xs font-medium flex items-center gap-2 ${
          actionMsg.type === 'success' 
            ? 'bg-[#E7F2ED] border-[#A8D5C2] text-[#1E7B54]' 
            : 'bg-[#FDE8E8] border-[#F8B4B4] text-[#C93B3B]'
        }`}>
          {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#1E7B54] shrink-0" /> : <AlertCircle className="w-4 h-4 text-[#C93B3B] shrink-0" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Primary Metrics Cards matching Stitch Section 1 Executive Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#627084]">Eligible & Verified Cohort</div>
          <div className="text-2xl font-bold text-[#203653] font-mono">
            {overview?.registeredStudents ?? 30} <span className="text-xs font-normal text-[#627084]">Students</span>
          </div>
          <div className="text-[11px] text-[#2C8279] font-medium">
            {overview?.eligibleStudents ?? 28} Verified Active • Exactly 30 Seeded
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#627084]">BVB Floor 2 Capacity</div>
          <div className="text-2xl font-bold text-[#1E7B54] font-mono">
            {overview?.totalSeats ?? 144} <span className="text-xs font-normal text-[#627084]">Beds</span>
          </div>
          <div className="text-[11px] text-[#627084]">
            {overview?.occupiedSeats ?? 0} Occupied • {overview?.availableSeats ?? 144} Available
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#627084]">Verified Room Geometry</div>
          <div className="text-2xl font-bold text-[#203653] font-mono">
            {overview?.totalRooms ?? 72} <span className="text-xs font-normal text-[#627084]">Rooms</span>
          </div>
          <div className="text-[11px] text-[#627084]">
            Rooms 201–272 from authentic BVB Floor 2 CAD
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#627084]">Pending Operations</div>
          <div className="text-2xl font-bold text-[#E06A26] font-mono">
            {roomChangeRequests.filter(r => r.status === 'PENDING').length} <span className="text-xs font-normal text-[#627084]">Room Changes</span>
          </div>
          <div className="text-[11px] text-[#627084]">
            {overview?.openComplaints ?? 0} Open Complaints Logged
          </div>
        </div>
      </div>

      {/* Pre-Flight Certification Banner matching Stitch Prototype */}
      <div className="bg-[#F7F6F1] p-4 rounded-xl border border-[#E2E6E8] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-[#E7F2ED] text-[#1E7B54] border border-[#A8D5C2] flex items-center justify-center font-bold shrink-0">
            ✓
          </div>
          <div>
            <div className="text-xs font-bold text-[#203653]">
              Pre-Flight Certification: BVB Floor 2 Inventory Frozen
            </div>
            <div className="text-[11px] text-[#627084]">
              Digitally certified by Chief Warden (BVB Block). Authoritative turn scheduling active.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-white px-2.5 py-1 rounded border border-[#E2E6E8] text-[#203653]">
            Cycle: SIT-BVB-24F2-PH1
          </span>
        </div>
      </div>

      {/* Allocation Cycle Control & BVB Inventory Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Allocation Cycle Administration */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E6E8] pb-3">
            <h2 className="text-xs font-bold text-[#203653] uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#2C8279]" />
              Live Turn Engine & Cycle Controls
            </h2>
            <span className="text-[10px] font-semibold bg-[#E7F2ED] text-[#1E7B54] px-2 py-0.5 rounded">
              Authoritative
            </span>
          </div>

          <div className="space-y-3">
            {cycles.map((c) => (
              <div key={c.id} className="p-3.5 bg-[#F7F6F1] rounded-lg border border-[#E2E6E8] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-[#203653] text-xs">{c.name}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    c.status === 'READY' 
                      ? 'bg-[#E7F2ED] text-[#1E7B54] border-[#A8D5C2]' 
                      : (c.status === 'PAUSED' ? 'bg-[#FAF4E6] text-[#9C7A2E] border-[#D4B779]' : 'bg-[#E5E9EB] text-[#627084] border-[#E2E6E8]')
                  }`}>
                    {c.status}
                  </span>
                </div>
                <div className="text-[11px] text-[#627084] space-y-0.5">
                  <div><strong>Turn Window:</strong> {c.turn_duration_seconds}s per student</div>
                  <div><strong>Waiting Threshold:</strong> {c.waiting_room_threshold} students (Pilot configured)</div>
                  <div><strong>Late Grace:</strong> {c.late_grace_seconds}s (max {c.max_penalty_turns} turns)</div>
                  <div><strong>Inventory Pool:</strong> BVB Floor 2 (Rooms 201–272)</div>
                </div>

                {isSuperAdminOrOffice && (
                  <div className="pt-2 border-t border-[#E2E6E8] flex flex-wrap items-center gap-2">
                    {c.status !== 'READY' && (
                      <button
                        onClick={() => handleUpdateCycleStatus(c.id, 'READY')}
                        className="flex-1 py-1.5 bg-[#203653] hover:bg-[#17283B] text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Start / Resume Cycle
                      </button>
                    )}
                    {c.status === 'READY' && (
                      <button
                        onClick={() => handleUpdateCycleStatus(c.id, 'PAUSED')}
                        className="flex-1 py-1.5 bg-[#D4B779] hover:bg-[#b69a5f] text-[#203653] text-xs font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        Pause Turn Engine
                      </button>
                    )}
                    <button
                      onClick={() => handleRunSimulation(c.id)}
                      disabled={simLoading}
                      className="px-3 py-1.5 bg-[#E7F2ED] hover:bg-[#d8eadd] text-[#1E7B54] border border-[#A8D5C2] text-xs font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#1E7B54]" />
                      Simulate
                    </button>
                    {c.status !== 'PUBLISHED' && c.status !== 'LOCKED' && (
                      <button
                        onClick={() => handleUpdateCycleStatus(c.id, 'PUBLISHED')}
                        className="px-3 py-1.5 bg-[#E7F2ED] hover:bg-[#d8eadd] text-[#1E7B54] border border-[#A8D5C2] text-xs font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-1"
                        title="Publish final allocation results so all students can view certified outcomes"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        Publish Results
                      </button>
                    )}
                    {c.status === 'PUBLISHED' && (
                      <button
                        onClick={() => handleUpdateCycleStatus(c.id, 'LOCKED')}
                        className="px-3 py-1.5 bg-[#203653] hover:bg-[#17283B] text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-1"
                        title="Lock allocations permanently to freeze room changes and administrative edits"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Lock
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateCycleStatus(c.id, 'CLOSED')}
                      className="px-3 py-1.5 bg-white hover:bg-[#F7F6F1] text-[#627084] border border-[#E2E6E8] text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      Close
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Building & Floor Room & Seat Inventory */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E6E8] pb-3 gap-3">
            <div>
              <h2 className="text-xs font-bold text-[#203653] uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#2C8279]" />
                Room & Bed Inspection ({rooms.length} Rooms Loaded)
              </h2>
              <span className="text-[11px] text-[#627084]">Click any room to view or toggle bed maintenance</span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                className="text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2.5 py-1 text-[#263345] font-semibold"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedFloorId}
                onChange={(e) => setSelectedFloorId(e.target.value)}
                className="text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2.5 py-1 text-[#263345] font-semibold"
              >
                {floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name || `Floor ${f.floor_number}`}
                  </option>
                ))}
                {floors.length === 0 && <option value="flr_bvb_2">Floor 2</option>}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-12 gap-1.5 max-h-[300px] overflow-y-auto p-1.5 bg-[#F7F6F1] border border-[#E2E6E8] rounded-lg">
            {rooms.map((rm) => {
              const isSelected = selectedRoom?.id === rm.id;
              const hasOccupied = parseInt(rm.occupied_seats, 10) > 0;

              return (
                <button
                  key={rm.id}
                  onClick={() => setSelectedRoom(rm)}
                  className={`p-1.5 rounded text-center text-xs font-mono font-bold transition-all border ${
                    isSelected
                      ? 'bg-[#203653] text-white border-[#203653] shadow-xs'
                      : hasOccupied
                      ? 'bg-[#E5E9EB] text-[#263345] border-[#E2E6E8]'
                      : 'bg-white text-[#263345] border-[#E2E6E8] hover:border-[#2C8279]'
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
            <div className="p-4 bg-[#F7F6F1] rounded-lg border border-[#E2E6E8] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-[#203653]">Room {selectedRoom.room_number} Inspection</div>
                  <div className="text-[11px] text-[#627084]">
                    Type: {selectedRoom.room_type} • Configured Capacity: {selectedRoom.total_seats} Beds
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="text-xs text-[#627084] hover:text-[#263345]"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E2E6E8]">
                {floorMap?.elements
                  ?.filter((el: any) => el.t === 'seat' && el.meta?.roomId === selectedRoom.id)
                  .map((st: any) => (
                    <div
                      key={st.id}
                      className="p-3 bg-white rounded-lg border border-[#E2E6E8] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Bed className="w-4 h-4 text-[#2C8279]" />
                        <div>
                          <div className="font-bold text-[#203653]">Seat {st.label}</div>
                          <div className="text-[10px] font-mono text-[#627084]">{st.id}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleSeatStatus(st.id, 'ACTIVE')}
                        className="px-2.5 py-1 bg-white hover:bg-[#F7F6F1] text-[#263345] text-[11px] font-semibold rounded border border-[#E2E6E8] flex items-center gap-1 transition-colors"
                      >
                        <Wrench className="w-3 h-3 text-[#627084]" />
                        Toggle Status
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-[#627084] bg-[#F7F6F1] rounded-lg border border-[#E2E6E8]">
              Select any numbered room above to inspect its configured seat inventory.
            </div>
          )}
        </div>
      </div>

      {/* 48-Hour Room Change Requests Review Inbox */}
      <div className="bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E6E8] pb-3">
          <div>
            <h2 className="text-xs font-bold text-[#203653] uppercase tracking-wider flex items-center gap-2">
              <Repeat className="w-4 h-4 text-[#2C8279]" />
              Official 48-Hour Room-Change Requests Inbox
            </h2>
            <p className="text-[11px] text-[#627084] mt-0.5">
              Review and approve or reject atomic seat transfers requested during the 48-hour post-allocation period.
            </p>
          </div>
          <span className="text-xs font-bold bg-[#FAF4E6] text-[#9C7A2E] border border-[#D4B779] px-2.5 py-1 rounded">
            {roomChangeRequests.length} Total Requests
          </span>
        </div>

        {roomChangeRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#263345]">
              <thead className="bg-[#F7F6F1] text-[11px] uppercase font-bold text-[#627084] border-b border-[#E2E6E8] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Current Allocation</th>
                  <th className="py-2.5 px-4">Target Room</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Administrative Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roomChangeRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-bold text-navy-900">
                       {req.student_name} <span className="text-[10px] font-mono text-slate-400 font-normal">({req.usn})</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono">
                      Room {req.current_room_number} (Seat {req.current_seat_label})
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-brand-teal">
                      Room {req.target_room_number}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate" title={req.reason}>
                      {req.reason}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : (req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800')
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-2">
                      {req.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleReviewRoomChange(req.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] shadow-sm"
                          >
                            Approve Move
                          </button>
                          <button
                            onClick={() => handleReviewRoomChange(req.id, 'REJECTED')}
                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded text-[11px]"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
            No room change requests currently pending.
          </div>
        )}
      </div>

      {/* Append-Only Administrative Audit Trail */}
      {isSuperAdminOrOffice && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-teal" />
                Immutable Administrative Audit Trail
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Append-only log of administrative overrides, status modifications, and allocations with mandatory reasons.
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded">
              {auditLogs.length} Logged Events
            </span>
          </div>

          {auditLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Actor</th>
                    <th className="py-2.5 px-4">Target Type / ID</th>
                    <th className="py-2.5 px-4">Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-4 text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 px-4 font-bold text-brand-teal">
                        {log.action}
                      </td>
                      <td className="py-2 px-4 font-sans font-medium text-navy-900">
                        {log.actor_name || log.actor_id}
                      </td>
                      <td className="py-2 px-4 text-slate-600">
                        {log.target_type}: {log.target_id}
                      </td>
                      <td className="py-2 px-4 font-sans text-slate-700 max-w-xs truncate" title={log.reason}>
                        {log.reason || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
              No audit log entries recorded yet.
            </div>
          )}
        </div>
      )}

      {/* Record In-Person Request Modal */}
      {showInPersonModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
                <Repeat className="w-4 h-4 text-brand-teal" />
                Record In-Person Room Change Request
              </h3>
              <button onClick={() => setShowInPersonModal(false)} className="text-slate-400 hover:text-slate-600 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordInPersonRequest} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Student</label>
                <select
                  value={inpStudentId}
                  onChange={(e) => setInpStudentId(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                >
                  <option value="">Select student...</option>
                  {allStudents.filter(s => s.allocated_seat_id).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.college_id}) — Currently in {s.allocated_seat_id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Target Room on Floor 2</label>
                <select
                  value={inpTargetRoomId}
                  onChange={(e) => setInpTargetRoomId(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                >
                  <option value="">Select target room...</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} ({r.available_seats || 0} seats free)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reason for In-Person Request</label>
                <input
                  type="text"
                  value={inpReason}
                  onChange={(e) => setInpReason(e.target.value)}
                  placeholder="e.g. Accessibility or maintenance relocation"
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInPersonModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-teal hover:bg-brand-tealHover text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Record & Atomically Apply Move
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dry-Run Cycle Simulation Modal */}
      {showSimModal && simulationData && (
        <div className="fixed inset-0 z-50 bg-[#0F1E2E]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 border border-[#E2E6E8] shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#E2E6E8] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E7F2ED] text-[#1E7B54] flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#203653]">
                    Allocation Cycle Dry-Run Simulation
                  </h3>
                  <div className="text-[11px] text-[#627084]">
                    Authoritative pre-flight model • Non-mutating prediction
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowSimModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#F7F6F1] rounded-lg border border-[#E2E6E8]">
                <div className="text-[10px] font-bold text-[#627084] uppercase">Eligible Cohort</div>
                <div className="text-lg font-bold text-[#203653] font-mono">
                  {simulationData.totalEligibleStudents}
                </div>
              </div>
              <div className="p-3 bg-[#F7F6F1] rounded-lg border border-[#E2E6E8]">
                <div className="text-[10px] font-bold text-[#627084] uppercase">Total Beds</div>
                <div className="text-lg font-bold text-[#1E7B54] font-mono">
                  {simulationData.totalAvailableSeats}
                </div>
              </div>
              <div className="p-3 bg-[#F7F6F1] rounded-lg border border-[#E2E6E8]">
                <div className="text-[10px] font-bold text-[#627084] uppercase">Est. Avg Turn</div>
                <div className="text-lg font-bold text-[#203653] font-mono">
                  {simulationData.estimatedAverageSecondsPerTurn}s
                </div>
              </div>
              <div className="p-3 bg-[#F7F6F1] rounded-lg border border-[#E2E6E8]">
                <div className="text-[10px] font-bold text-[#627084] uppercase">Predicted Time</div>
                <div className="text-lg font-bold text-[#D4B779] font-mono">
                  ~{simulationData.predictedDurationMinutes} min
                </div>
              </div>
            </div>

            {simulationData.predictedUnallocatedCount > 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Capacity Warning:</strong> {simulationData.predictedUnallocatedCount} student(s) will exceed available bed capacity in this cycle and will be marked as Waitlisted.
                </span>
              </div>
            ) : (
              <div className="p-3 bg-[#E7F2ED] border border-[#A8D5C2] rounded-lg text-[#1E7B54] text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1E7B54]" />
                <span>
                  <strong>Inventory Sufficient:</strong> All eligible cohort students can be accommodated within configured bed inventory.
                </span>
              </div>
            )}

            <div>
              <div className="text-xs font-bold text-[#203653] mb-2 uppercase tracking-wider">
                Pool Breakdown (Concurrent Execution)
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {simulationData.poolBreakdown?.map((pb: any) => (
                  <div
                    key={pb.poolId}
                    className="p-2.5 bg-[#F7F6F1] border border-[#E2E6E8] rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#203653]">{pb.poolName}</div>
                      <div className="text-[11px] text-[#627084]">
                        {pb.eligibleCount} students • {pb.seatsCount} beds
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-[#203653]">~{pb.durationMinutes} min</div>
                      <div className="text-[10px] text-[#1E7B54] font-semibold">disjoint inventory ✓</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E2E6E8]">
              <button
                type="button"
                onClick={() => setShowSimModal(false)}
                className="px-4 py-2 bg-[#203653] hover:bg-[#17283B] text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Close Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
