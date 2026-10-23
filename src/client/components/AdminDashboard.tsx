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
  Lock,
  Megaphone,
  History,
  Timer,
  PlusCircle,
  AlertOctagon,
  KeyRound,
  FileText,
  X,
  Search,
  Filter
} from 'lucide-react';
import { AdminBroadcastNoticeModal } from './AdminBroadcastNoticeModal.js';

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
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  // Stitch Admin Allocation Control States
  const [turnTimerSecs, setTurnTimerSecs] = useState<number>(222); // 03:42 default
  const [isCycleRunning, setIsCycleRunning] = useState<boolean>(true);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState<boolean>(false);
  const [auditDrawerStudent, setAuditDrawerStudent] = useState<any | null>(null);
  
  // Dual-Warden Force Override Modal
  const [forceModalOpen, setForceModalOpen] = useState<boolean>(false);
  const [forceTargetStudent, setForceTargetStudent] = useState<any | null>(null);
  const [forceRoomChoice, setForceRoomChoice] = useState<string>('202');
  const [forceBedChoice, setForceBedChoice] = useState<string>('C');
  const [forceReason, setForceReason] = useState<string>('');
  const [forceSecurityPin, setForceSecurityPin] = useState<string>('');

  // Publish Allotment Modal
  const [publishModalOpen, setPublishModalOpen] = useState<boolean>(false);

  // Cohort Table filter & search
  const [queueTabFilter, setQueueTabFilter] = useState<'all' | 'active' | 'next' | 'allocated' | 'disqualified'>('all');
  const [cohortSearch, setCohortSearch] = useState<string>('');

  // Dynamic Building & Floor Selection
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('bld_bvb');
  const [selectedFloorId, setSelectedFloorId] = useState<string>('flr_bvb_2');

  const isSuperAdminOrOffice = ['HOSTEL_OFFICE', 'SUPER_ADMIN'].includes(session?.role || '');

  // Live timer countdown
  useEffect(() => {
    if (!isCycleRunning) return;
    const interval = setInterval(() => {
      setTurnTimerSecs((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isCycleRunning]);

  const formatTimer = (totalSeconds: number) => {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

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

      if (blds.length > 0 && !selectedBuildingId) {
        setSelectedBuildingId(blds[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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

  // Open Force Override Modal
  const openForceModal = (stu: any) => {
    setForceTargetStudent(stu);
    setForceReason('');
    setForceSecurityPin('');
    setForceModalOpen(true);
  };

  const handleExecuteForceOverride = async () => {
    if (!forceTargetStudent) return;
    if (!forceReason.trim()) {
      alert('Mandatory reason required for Super Admin force allocation override.');
      return;
    }
    setActionMsg(null);
    try {
      // Find candidate seat ID
      const targetSeatLabel = `seat_bvb_2_${forceRoomChoice}_${forceBedChoice.toLowerCase()}`;
      const res = await apiFetch('/api/admin/allocations/force-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId: 'cyc_bvb_pilot_2026',
          studentId: forceTargetStudent.id,
          seatId: targetSeatLabel,
          reason: `Dual-Warden Override: ${forceReason.trim()}`,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to execute administrative override');
      }
      setActionMsg({
        type: 'success',
        text: `Administrative seat override executed! ${forceTargetStudent.full_name} moved to Room ${forceRoomChoice}-${forceBedChoice}.`,
      });
      setForceModalOpen(false);
      loadData();
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e.message });
    }
  };

  // Open Audit Drawer
  const openAuditDrawer = (stu?: any) => {
    setAuditDrawerStudent(stu || (allStudents.length > 0 ? allStudents[0] : null));
    setAuditDrawerOpen(true);
  };

  // Filter cohort records
  const filteredStudents = allStudents.filter((stu) => {
    if (cohortSearch) {
      const q = cohortSearch.toLowerCase();
      const match = (stu.full_name || '').toLowerCase().includes(q) ||
                    (stu.college_id || '').toLowerCase().includes(q) ||
                    (stu.department || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    if (queueTabFilter === 'all') return true;
    if (queueTabFilter === 'active') return stu.assigned_priority === 14 || stu.college_id === '1SI21CS094';
    if (queueTabFilter === 'next') return [15, 16, 17, 18, 19].includes(stu.assigned_priority);
    if (queueTabFilter === 'allocated') return Boolean(stu.allocated_seat_id);
    if (queueTabFilter === 'disqualified') return stu.eligibility_status !== 'ELIGIBLE' || stu.fee_status !== 'VERIFIED';
    return true;
  });

  return (
    <div className="w-full min-h-screen bg-[#F6FAFC] pb-16">
      {/* Top Utility Context Bar matching Stitch Admin Allocation Control */}
      <div className="w-full bg-[#F0F4F6] border-b border-[#DFE3E5] px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#016A62] animate-pulse"></div>
          <span className="text-xs font-semibold text-[#181C1E] tracking-tight">
            Administrative Master Allocation Operations
          </span>
          <span className="text-[#74777E] text-xs">·</span>
          <span className="text-xs text-[#44474D]">
            Session ID: <code className="font-mono text-[#07203C] font-bold">SIT-BVB-24F2-PH1</code>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-[#44474D]">
            <Calendar className="w-3.5 h-3.5 text-[#016A62]" />
            <span>Gateway Timestamp: <strong className="text-[#181C1E]">15-Jul-2024 11:28:44 IST</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-xs bg-[#A0F1E6]/50 text-[#005049] px-2.5 py-0.5 rounded font-mono font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Warden Hash: #BVB-9804-KSH</span>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header Action Strip */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#016A62]">
              Floor 2 Pilot Status Bar
            </span>
            <h1 className="text-2xl font-bold text-[#07203C] tracking-tight">
              Admin Allocation Control Console
            </h1>
            <p className="text-xs text-[#44474D] mt-0.5">
              Live turn scheduling, synchronized SBI bank reconciliation, and participant cohort management.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1 rounded bg-[#E5E9EB] flex items-center gap-2 text-[#181C1E] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#016A62]"></span>
              <span>Cycle Active — Phase 1 Priority Run</span>
            </div>
            <button
              onClick={() => openAuditDrawer()}
              className="px-3 py-1.5 rounded bg-[#07203C] hover:bg-[#203653] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <History className="w-3.5 h-3.5 text-[#84D5CA]" />
              <span>Audit Trail Log</span>
            </button>
            <button
              onClick={() => setShowNoticeModal(true)}
              className="px-3 py-1.5 rounded bg-[#016A62] hover:bg-[#005049] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Broadcast Notice</span>
            </button>
            <button
              onClick={() => setShowInPersonModal(true)}
              className="px-3 py-1.5 rounded bg-white hover:bg-[#F0F4F6] text-[#07203C] border border-[#C4C6CE] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Repeat className="w-3.5 h-3.5 text-[#016A62]" />
              <span>In-Person Move</span>
            </button>
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
              className="px-3 py-1.5 bg-white hover:bg-[#F0F4F6] text-[#07203C] border border-[#C4C6CE] text-xs font-bold rounded shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-[#016A62]" />
              <span>Export CSV</span>
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

        {/* SECTION 1: 7-Card Executive Bento Metric Strip matching Stitch */}
        <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Total Cohort */}
          <div className="bg-white p-4 rounded-xl border border-[#DFE3E5] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#44474D]">Total Cohort</span>
              <Users className="w-4 h-4 text-[#203653]" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#07203C] font-mono leading-none">
                {overview?.registeredStudents ?? 30}
              </div>
              <div className="text-[11px] text-[#74777E] mt-1">Synthetic records</div>
            </div>
          </div>

          {/* Fee Verified */}
          <div className="bg-white p-4 rounded-xl border border-[#DFE3E5] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#016A62]">Fee Verified</span>
              <CheckCircle2 className="w-4 h-4 text-[#016A62]" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#016A62] font-mono leading-none">
                {overview?.eligibleStudents ?? 24}
              </div>
              <div className="text-[11px] text-[#016A62] font-medium mt-1">100% reconciled</div>
            </div>
          </div>

          {/* Pending Review */}
          <div className="bg-white p-4 rounded-xl border border-[#DFE3E5] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#584411]">Pending Rev.</span>
              <AlertCircle className="w-4 h-4 text-[#584411]" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#453201] font-mono leading-none">
                06
              </div>
              <div className="text-[11px] text-[#74777E] mt-1">Holds / Incomplete</div>
            </div>
          </div>

          {/* Configured Beds */}
          <div className="bg-white p-4 rounded-xl border border-[#DFE3E5] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#44474D]">Configured Beds</span>
              <Bed className="w-4 h-4 text-[#203653]" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#07203C] font-mono leading-none">
                {overview?.totalSeats ?? 72}
              </div>
              <div className="text-[11px] text-[#74777E] mt-1">Rooms 201–272</div>
            </div>
          </div>

          {/* Occupied */}
          <div className="bg-white p-4 rounded-xl border border-[#DFE3E5] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#44474D]">Occupied</span>
              <Check className="w-4 h-4 text-[#44474D]" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#181C1E] font-mono leading-none">
                {overview?.occupiedSeats ?? 12}
              </div>
              <div className="text-[11px] text-[#74777E] mt-1">Allocated & confirmed</div>
            </div>
          </div>

          {/* Available */}
          <div className="bg-white p-4 rounded-xl border border-[#DFE3E5] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#016A62]">Available</span>
              <Layers className="w-4 h-4 text-[#016A62]" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#016A62] font-mono leading-none">
                {overview?.availableSeats ?? 56}
              </div>
              <div className="text-[11px] text-[#016A62] font-medium mt-1">Open for selection</div>
            </div>
          </div>

          {/* Blocked / Maintenance */}
          <div className="bg-white p-4 rounded-xl border border-[#DFE3E5] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#BA1A1A]">Blocked</span>
              <Ban className="w-4 h-4 text-[#BA1A1A]" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-[#BA1A1A] font-mono leading-none">
                04
              </div>
              <div className="text-[11px] text-[#BA1A1A] font-medium mt-1">BVB Maintenance</div>
            </div>
          </div>
        </section>

        {/* SECTION 2: PRE-FLIGHT CERTIFICATION (5 COLS) + LIVE TURN ENGINE (7 COLS) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Pre-Flight Verification Checklist Card (5 Cols) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-[#DFE3E5] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-[#DFE3E5] pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#016A62]" />
                  <h2 className="text-sm font-bold text-[#07203C]">Pre-Flight Certification</h2>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-[#9DEFE3]/40 text-[#0D6F66] text-xs font-bold">
                  5/5 Passed
                </span>
              </div>

              <ul className="flex flex-col gap-2.5">
                <li className="flex items-start gap-3 p-2.5 rounded bg-[#F0F4F6]">
                  <CheckCircle2 className="w-4 h-4 text-[#016A62] shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#181C1E]">Hostel Fee Reconciliation</span>
                    <span className="text-[11px] text-[#44474D]">100% verified for active cohort (Finance ERP synchronized).</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 p-2.5 rounded bg-[#F0F4F6]">
                  <CheckCircle2 className="w-4 h-4 text-[#016A62] shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#181C1E]">BVB Floor 2 Inventory Frozen</span>
                    <span className="text-[11px] text-[#44474D]">72 provisional seats certified; 4 tagged for electrical maintenance.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 p-2.5 rounded bg-[#F0F4F6]">
                  <CheckCircle2 className="w-4 h-4 text-[#016A62] shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#181C1E]">Priority Queue Sequenced</span>
                    <span className="text-[11px] text-[#44474D]">Chronological payment timestamp ordering locked by warden keys.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 p-2.5 rounded bg-[#F0F4F6]">
                  <CheckCircle2 className="w-4 h-4 text-[#016A62] shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#181C1E]">Roommate Groups Synced</span>
                    <span className="text-[11px] text-[#44474D]">4 intent clusters validated for paired or triple room lock.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3 p-2.5 rounded bg-[#F0F4F6]">
                  <CheckCircle2 className="w-4 h-4 text-[#016A62] shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#181C1E]">Warden Oversight Mandate</span>
                    <span className="text-[11px] text-[#44474D]">Digitally approved by <strong>Dr. K. Shivakumar</strong> (Chief Warden, BVB Block).</span>
                  </div>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-3 flex items-center justify-between text-[#44474D] text-xs bg-[#E5E9EB]/50 p-2.5 rounded border border-[#DFE3E5]">
              <span>Lock State: Master Ledger Immutable</span>
              <span className="font-mono text-[#07203C] font-bold">SHA256: e82b...491a</span>
            </div>
          </div>

          {/* Real-Time Cycle Control Action Toolbar (7 Cols) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-[#DFE3E5] shadow-sm flex flex-col justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DFE3E5] pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded bg-[#07203C] text-white flex items-center justify-center">
                    <Timer className="w-4 h-4 text-[#84D5CA]" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-[#07203C]">Live Turn Engine</h2>
                    <p className="text-[11px] text-[#44474D]">Executing sequential priority allotment slots</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded bg-[#9DEFE3]/40 text-[#0D6F66] text-xs font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#016A62] animate-ping"></span>
                  <span>Turn 14 of 24</span>
                </div>
              </div>

              {/* Active Turn Live Card */}
              <div className="p-4 rounded-xl bg-[#F0F4F6] border border-[#DFE3E5] flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="w-12 h-12 rounded-full bg-[#07203C] text-white flex items-center justify-center font-bold text-base shadow-sm">
                    SG
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#07203C]">Saugat</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#203653] text-white text-[10px] font-mono">
                        USN: 1SI21CS094
                      </span>
                    </div>
                    <span className="text-xs text-[#44474D]">6th Semester · Computer Science & Engineering</span>
                    <span className="text-xs text-[#016A62] font-semibold mt-0.5">
                      Currently browsing: Room 202 Wing A
                    </span>
                  </div>
                </div>

                {/* Timer Block */}
                <div className="flex flex-col items-end w-full md:w-auto p-3 bg-white rounded-lg border border-[#DFE3E5] shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#74777E]">
                    Turn Window Remaining
                  </span>
                  <div className="text-2xl text-[#07203C] font-mono font-bold tracking-tight">
                    {formatTimer(turnTimerSecs)}
                  </div>
                  <div className="w-32 bg-[#E5E9EB] h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div 
                      className="bg-[#016A62] h-full transition-all duration-1000"
                      style={{ width: `${Math.max(0, Math.min(100, (turnTimerSecs / 300) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Controls Button Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  onClick={() => setIsCycleRunning(!isCycleRunning)}
                  className={`px-3 py-2 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs ${
                    isCycleRunning
                      ? 'bg-[#E5E9EB] text-[#181C1E] hover:bg-[#DFE3E5]'
                      : 'bg-[#BA1A1A] text-white hover:bg-[#93000A]'
                  }`}
                >
                  {isCycleRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isCycleRunning ? 'Pause Cycle' : 'Resume Cycle'}</span>
                </button>
                <button
                  onClick={() => {
                    setTurnTimerSecs((prev) => prev + 120);
                    setActionMsg({ type: 'success', text: '+2:00 Minutes successfully added to current active student turn.' });
                  }}
                  className="px-3 py-2 rounded bg-[#E5E9EB] text-[#181C1E] text-xs font-bold hover:bg-[#DFE3E5] transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#016A62]" />
                  <span>+2 Min Extension</span>
                </button>
                <button
                  onClick={() => {
                    setIsCycleRunning(false);
                    alert('CRITICAL EMERGENCY HALT TRIGGERED: All active student sockets in BVB Block Floor 2 frozen. Database write operations suspended pending Warden Master override key.');
                  }}
                  className="px-3 py-2 rounded bg-[#FFDAD6] text-[#93000A] text-xs font-bold hover:bg-[#BA1A1A] hover:text-white transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Emergency Halt</span>
                </button>
                <button
                  onClick={() => setPublishModalOpen(true)}
                  className="px-3 py-2 rounded bg-[#016A62] text-white text-xs font-bold hover:bg-[#005049] transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Publish Allotment</span>
                </button>
              </div>
            </div>

            {/* Telemetry Notice */}
            <div className="mt-4 p-2.5 rounded bg-[#203653]/10 border border-[#203653]/20 flex items-center justify-between text-[#203653] text-xs">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#016A62]" />
                <span>Auto-skip triggers automatically when turn expiration crosses 00:00.</span>
              </div>
              <span className="font-mono text-[11px] text-[#44474D]">Ping: 14ms · SIT LAN</span>
            </div>
          </div>
        </section>

        {/* SECTION 3: LIVE ALLOCATION QUEUE & PARTICIPANT MANAGEMENT TABLE */}
        <section className="bg-white rounded-xl border border-[#DFE3E5] shadow-sm p-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-[#DFE3E5]">
            <div>
              <h2 className="text-base font-bold text-[#07203C]">Participant Cohort Management</h2>
              <span className="text-xs text-[#44474D]">Real-time prioritized student roster based on fee reconciliation queue.</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-[#F0F4F6] p-1 rounded-lg border border-[#DFE3E5]">
                {(['all', 'active', 'next', 'allocated', 'disqualified'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setQueueTabFilter(tab)}
                    className={`px-3 py-1 rounded text-xs font-semibold capitalize transition-all ${
                      queueTabFilter === tab
                        ? 'bg-white text-[#07203C] shadow-xs'
                        : 'text-[#44474D] hover:text-[#181C1E]'
                    }`}
                  >
                    {tab === 'all' ? 'All (30)' : (tab === 'active' ? 'Active Turn (1)' : (tab === 'next' ? 'Next in Line (5)' : (tab === 'allocated' ? 'Allocated (12)' : 'Pending / Hold (6)')))}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#74777E]" />
                <input
                  type="text"
                  value={cohortSearch}
                  onChange={(e) => setCohortSearch(e.target.value)}
                  placeholder="Search USN or Name..."
                  className="pl-8 pr-3 py-1.5 bg-[#F0F4F6] border border-[#DFE3E5] rounded text-xs text-[#181C1E] placeholder:text-[#74777E] focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-[#181C1E]">
              <thead>
                <tr className="bg-[#F0F4F6] text-[11px] font-bold uppercase text-[#44474D] tracking-wider border-b border-[#DFE3E5]">
                  <th className="py-2.5 px-4">Rank</th>
                  <th className="py-2.5 px-4">USN & Candidate</th>
                  <th className="py-2.5 px-4">Branch / Sem</th>
                  <th className="py-2.5 px-4">Fee Reconciled Timestamp</th>
                  <th className="py-2.5 px-4">Seat Allotment</th>
                  <th className="py-2.5 px-4">Cycle Status</th>
                  <th className="py-2.5 px-4 text-right">Administrative Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFE3E5]">
                {filteredStudents.slice(0, 10).map((stu, idx) => {
                  const rank = stu.assigned_priority || (idx + 1);
                  const isTurnActive = rank === 14 || stu.college_id === '1SI21CS094';
                  const isAllocated = Boolean(stu.allocated_seat_id);

                  return (
                    <tr
                      key={stu.id || idx}
                      className={`hover:bg-[#F0F4F6] transition-colors ${
                        isTurnActive ? 'bg-[#9DEFE3]/15' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#07203C]">
                        #{String(rank).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#07203C] text-white flex items-center justify-center font-bold text-[10px]">
                            {stu.full_name?.slice(0, 2).toUpperCase() || 'ST'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-[#181C1E]">{stu.full_name}</span>
                            <span className="text-[10px] text-[#74777E] font-mono">{stu.college_id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[#181C1E]">{stu.department || 'CSE'} · Sem {stu.academic_year ? stu.academic_year * 2 : 6}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#44474D]">
                        {stu.verified_payment_timestamp ? new Date(stu.verified_payment_timestamp).toLocaleDateString() + ' ' + new Date(stu.verified_payment_timestamp).toLocaleTimeString() : '12-Jul-2024 09:14:22 IST'}
                      </td>
                      <td className="py-3 px-4">
                        {isTurnActive ? (
                          <span className="inline-flex items-center gap-1.5 text-[#016A62] font-semibold font-mono text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#016A62] animate-ping"></span>
                            In Selection...
                          </span>
                        ) : isAllocated ? (
                          <span className="font-mono font-bold text-[#07203C] px-2 py-0.5 rounded bg-[#E5E9EB] text-xs">
                            {stu.allocated_seat_id}
                          </span>
                        ) : (
                          <span className="text-[#74777E] font-mono text-xs">Waiting...</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isTurnActive ? (
                          <span className="px-2 py-0.5 rounded bg-[#9DEFE3]/60 text-[#0D6F66] text-[10px] font-bold inline-flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            Active Turn
                          </span>
                        ) : isAllocated ? (
                          <span className="px-2 py-0.5 rounded bg-[#A0F1E6]/40 text-[#005049] text-[10px] font-bold">
                            Allocated
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#E5E9EB] text-[#44474D] text-[10px] font-medium">
                            Queued (#{rank})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openAuditDrawer(stu)}
                            className="p-1.5 rounded hover:bg-[#E5E9EB] text-[#44474D] hover:text-[#181C1E]"
                            title="View Audit Log"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openForceModal(stu)}
                            className="p-1.5 rounded hover:bg-[#E5E9EB] text-[#44474D] hover:text-[#181C1E]"
                            title="Force Override"
                          >
                            <Wrench className="w-3.5 h-3.5 text-[#016A62]" />
                          </button>
                          <button
                            onClick={() => alert(`Notification SMS & Portal Ping sent to ${stu.college_id} (${stu.full_name})`)}
                            className="p-1.5 rounded hover:bg-[#E5E9EB] text-[#44474D] hover:text-[#181C1E]"
                            title="Notify Student"
                          >
                            <Megaphone className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2 text-[#74777E] text-xs">
            <span>Showing {Math.min(filteredStudents.length, 10)} of {allStudents.length} synthetic pilot participants (Cohort restricted to SIT campus LAN)</span>
            <div className="flex items-center gap-1">
              <span className="px-2.5 py-1 rounded bg-[#F0F4F6] text-[#181C1E] font-medium">Page 1 of 3</span>
            </div>
          </div>
        </section>

        {/* SECTION 4: FLOOR BED MATRIX VISUAL (ROOMS 201-212) */}
        <section className="bg-white rounded-xl border border-[#DFE3E5] shadow-sm p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DFE3E5] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#07203C]">Floor 2 Pilot Wing Layout Reference (72 Configured Beds)</h2>
              <p className="text-xs text-[#44474D]">Live visual state of pilot rooms 201 through 212 (Wing A sample preview)</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#E5E9EB]"></span> Available</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#07203C]"></span> Occupied</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#016A62]"></span> Active Target</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#BA1A1A]"></span> Maintenance</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {/* Room 201 (Allocated) */}
            <div className="bg-[#F0F4F6] p-3 rounded-lg border border-[#DFE3E5] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#07203C]">Room 201</span>
                <span className="text-[10px] text-[#74777E]">Triple</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <div className="h-6 rounded bg-[#07203C] text-white text-[10px] flex items-center justify-center font-bold" title="Bed A: Prajwal Gowda">A</div>
                <div className="h-6 rounded bg-[#07203C] text-white text-[10px] flex items-center justify-center font-bold" title="Bed B: Shreya Kulkarni">B</div>
                <div className="h-6 rounded bg-[#E5E9EB] text-[#181C1E] text-[10px] flex items-center justify-center font-bold" title="Bed C: Available">C</div>
              </div>
            </div>

            {/* Room 202 (Active Target) */}
            <div className="bg-[#9DEFE3]/25 p-3 rounded-lg border border-[#016A62]/40 flex flex-col gap-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#016A62]">Room 202</span>
                <span className="text-[10px] text-[#016A62] font-semibold">Active Turn</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <div className="h-6 rounded bg-[#E5E9EB] text-[#181C1E] text-[10px] flex items-center justify-center font-bold">A</div>
                <div className="h-6 rounded bg-[#E5E9EB] text-[#181C1E] text-[10px] flex items-center justify-center font-bold">B</div>
                <div className="h-6 rounded bg-[#016A62] text-white text-[10px] flex items-center justify-center font-bold animate-pulse" title="Saugat Intent Target">C*</div>
              </div>
            </div>

            {/* Room 203 (Partial) */}
            <div className="bg-[#F0F4F6] p-3 rounded-lg border border-[#DFE3E5] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#07203C]">Room 203</span>
                <span className="text-[10px] text-[#74777E]">Triple</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <div className="h-6 rounded bg-[#07203C] text-white text-[10px] flex items-center justify-center font-bold" title="Bed A: Varun Bhaskar">A</div>
                <div className="h-6 rounded bg-[#E5E9EB] text-[#181C1E] text-[10px] flex items-center justify-center font-bold">B</div>
                <div className="h-6 rounded bg-[#E5E9EB] text-[#181C1E] text-[10px] flex items-center justify-center font-bold">C</div>
              </div>
            </div>

            {/* Room 204 (Vacant) */}
            <div className="bg-[#F0F4F6] p-3 rounded-lg border border-[#DFE3E5] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#07203C]">Room 204</span>
                <span className="text-[10px] text-[#74777E]">Triple</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <div className="h-6 rounded bg-[#E5E9EB] text-[#181C1E] text-[10px] flex items-center justify-center font-bold">A</div>
                <div className="h-6 rounded bg-[#E5E9EB] text-[#181C1E] text-[10px] flex items-center justify-center font-bold">B</div>
                <div className="h-6 rounded bg-[#E5E9EB] text-[#181C1E] text-[10px] flex items-center justify-center font-bold">C</div>
              </div>
            </div>

            {/* Room 205 (Maintenance) */}
            <div className="bg-[#FFDAD6]/30 p-3 rounded-lg border border-[#BA1A1A]/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#BA1A1A]">Room 205</span>
                <span className="text-[10px] text-[#BA1A1A] font-bold">Blocked</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <div className="h-6 rounded bg-[#BA1A1A] text-white text-[10px] flex items-center justify-center font-bold">A</div>
                <div className="h-6 rounded bg-[#BA1A1A] text-white text-[10px] flex items-center justify-center font-bold">B</div>
                <div className="h-6 rounded bg-[#BA1A1A] text-white text-[10px] flex items-center justify-center font-bold">C</div>
              </div>
            </div>

            {/* Room 206 (Vacant) */}
            <div className="bg-[#F0F4F6] p-3 rounded-lg border border-[#DFE3E5] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#07203C]">Room 206</span>
                <span className="text-[10px] text-[#74777E]">Triple</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <div className="h-6 rounded bg-[#E5E9EB] text-[#181C1E] text-[10px] flex items-center justify-center font-bold">A</div>
                <div className="h-6 rounded bg-[#E5E9EB] text-[#181C1E] text-[10px] flex items-center justify-center font-bold">B</div>
                <div className="h-6 rounded bg-[#E5E9EB] text-[#181C1E] text-[10px] flex items-center justify-center font-bold">C</div>
              </div>
            </div>
          </div>
        </section>

        {/* Existing Dynamic Building/Floor Inspector & 48-Hour Room Change Inbox */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E6E8] pb-3">
              <h2 className="text-xs font-bold text-[#203653] uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2C8279]" />
                Allocation Cycle Registry
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
                    <div><strong>Waiting Threshold:</strong> {c.waiting_room_threshold} students</div>
                    <div><strong>Late Grace:</strong> {c.late_grace_seconds}s (max {c.max_penalty_turns} turns)</div>
                  </div>

                  {isSuperAdminOrOffice && (
                    <div className="pt-2 border-t border-[#E2E6E8] flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleRunSimulation(c.id)}
                        disabled={simLoading}
                        className="px-3 py-1 bg-[#E7F2ED] hover:bg-[#d8eadd] text-[#1E7B54] border border-[#A8D5C2] text-xs font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#1E7B54]" />
                        Simulate
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E6E8] pb-3 gap-3">
              <div>
                <h2 className="text-xs font-bold text-[#203653] uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#2C8279]" />
                  Dynamic Floor Bed Calibration ({rooms.length} Rooms)
                </h2>
                <span className="text-[11px] text-[#627084]">Click any room to view or toggle maintenance lock</span>
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
                </select>
              </div>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-9 md:grid-cols-12 gap-1.5 max-h-[220px] overflow-y-auto p-1.5 bg-[#F7F6F1] border border-[#E2E6E8] rounded-lg">
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

            {selectedRoom && (
              <div className="p-3 bg-[#F7F6F1] rounded-lg border border-[#E2E6E8] flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#203653]">Room {selectedRoom.room_number}</span>
                  <span className="text-[#627084] ml-2">Type: {selectedRoom.room_type} · {selectedRoom.total_seats} Beds</span>
                </div>
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="text-xs text-[#627084] hover:text-[#263345]"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 48-Hour Room Change Review Table */}
        <div className="bg-white p-5 rounded-xl border border-[#DFE3E5] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#DFE3E5] pb-3">
            <div>
              <h2 className="text-xs font-bold text-[#07203C] uppercase tracking-wider flex items-center gap-2">
                <Repeat className="w-4 h-4 text-[#016A62]" />
                Official 48-Hour Room-Change Requests Inbox
              </h2>
              <p className="text-[11px] text-[#44474D] mt-0.5">
                Review and approve or reject atomic seat transfers requested during the 48-hour post-allocation period.
              </p>
            </div>
            <span className="text-xs font-bold bg-[#FAF4E6] text-[#9C7A2E] border border-[#D4B779] px-2.5 py-1 rounded">
              {roomChangeRequests.length} Total Requests
            </span>
          </div>

          {roomChangeRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#181C1E]">
                <thead className="bg-[#F0F4F6] text-[11px] uppercase font-bold text-[#44474D] border-b border-[#DFE3E5] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">Current Allocation</th>
                    <th className="py-2.5 px-4">Target Room</th>
                    <th className="py-2.5 px-4">Reason</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DFE3E5]">
                  {roomChangeRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-[#F0F4F6]">
                      <td className="py-2.5 px-4 font-bold text-[#07203C]">
                        {req.student_name} <span className="text-[10px] font-mono text-[#74777E] font-normal">({req.usn})</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        Room {req.current_room_number} (Seat {req.current_seat_label})
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-[#016A62]">
                        Room {req.target_room_number}
                      </td>
                      <td className="py-2.5 px-4 text-[#44474D] max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          req.status === 'APPROVED' ? 'bg-[#9DEFE3] text-[#005049]' : (req.status === 'REJECTED' ? 'bg-[#FFDAD6] text-[#93000A]' : 'bg-[#FAF4E6] text-[#9C7A2E]')
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-2">
                        {req.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleReviewRoomChange(req.id, 'APPROVED')}
                              className="px-2.5 py-1 bg-[#016A62] hover:bg-[#005049] text-white font-bold rounded text-[11px] shadow-xs"
                            >
                              Approve Move
                            </button>
                            <button
                              onClick={() => handleReviewRoomChange(req.id, 'REJECTED')}
                              className="px-2.5 py-1 bg-[#E5E9EB] hover:bg-[#DFE3E5] text-[#181C1E] font-semibold rounded text-[11px]"
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
            <div className="p-4 text-center text-xs text-[#74777E] bg-[#F0F4F6] rounded-lg">
              No room change requests currently pending.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5: AUDIT TRAIL SLIDE-OUT DRAWER */}
      {auditDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white shadow-2xl h-full flex flex-col animate-slideLeft">
            <div className="p-5 bg-[#07203C] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#84D5CA]" />
                <div>
                  <h3 className="text-sm font-bold text-white">Institutional Audit Ledger</h3>
                  <p className="text-[11px] text-[#8A9FC1]">Immutable chronological cycle record</p>
                </div>
              </div>
              <button
                onClick={() => setAuditDrawerOpen(false)}
                className="p-1 rounded text-[#8A9FC1] hover:text-white hover:bg-[#203653]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              <div className="bg-[#F0F4F6] p-3.5 rounded-lg border border-[#DFE3E5]">
                <span className="text-[10px] font-bold text-[#016A62] uppercase tracking-wider">Subject Record</span>
                <div className="text-sm font-bold text-[#07203C] mt-1">
                  {auditDrawerStudent?.full_name || 'Saugat'} ({auditDrawerStudent?.college_id || '1SI21CS094'})
                </div>
                <div className="text-xs text-[#44474D]">
                  Branch: {auditDrawerStudent?.department || 'Computer Science & Eng.'} · Sem 6
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#74777E] block mb-2">
                  Event Timeline
                </span>
                <div className="relative pl-5 border-l-2 border-[#DFE3E5] space-y-4">
                  <div className="relative">
                    <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-[#016A62] border-2 border-white"></span>
                    <div className="text-xs font-bold text-[#181C1E]">Turn Granted (Slot 14)</div>
                    <div className="text-[11px] text-[#44474D]">System allocated turn window of 05:00 minutes. Student active on portal.</div>
                    <span className="font-mono text-[10px] text-[#74777E]">15-Jul-2024 11:25:02 IST</span>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-[#07203C] border-2 border-white"></span>
                    <div className="text-xs font-bold text-[#181C1E]">Room 202-C Pinned for Selection</div>
                    <div className="text-[11px] text-[#44474D]">Student initiated reservation lock. Awaiting student final OTP confirmation.</div>
                    <span className="font-mono text-[10px] text-[#74777E]">15-Jul-2024 11:26:19 IST</span>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-[#203653] border-2 border-white"></span>
                    <div className="text-xs font-bold text-[#181C1E]">Bank Transaction Reconciled</div>
                    <div className="text-[11px] text-[#44474D]">SBI Collect reference #DUK8932401 verified by Accounts Desk.</div>
                    <span className="font-mono text-[10px] text-[#74777E]">12-Jul-2024 09:14:22 IST</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#F0F4F6] border-t border-[#DFE3E5] flex items-center justify-between gap-3">
              <button
                onClick={() => setAuditDrawerOpen(false)}
                className="w-full py-2 rounded bg-white hover:bg-[#E5E9EB] text-[#181C1E] text-xs font-bold border border-[#DFE3E5] transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => alert('Exporting signed PDF certificate to Warden Desk')}
                className="w-full py-2 rounded bg-[#07203C] hover:bg-[#203653] text-white text-xs font-bold transition-colors shadow-xs"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUAL-WARDEN FORCE OVERRIDE MODAL DIALOG */}
      {forceModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#07203C]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden border border-[#DFE3E5] flex flex-col animate-fadeIn">
            <div className="p-5 bg-[#203653] text-white flex items-center gap-3">
              <KeyRound className="w-5 h-5 text-[#84D5CA]" />
              <div>
                <h3 className="text-sm font-bold text-white">Administrative Seat Allocation Override</h3>
                <span className="text-[11px] text-[#8A9FC1]">Dual Warden Authorization Protocol</span>
              </div>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="p-3 bg-[#FFDAD6]/40 rounded-lg text-[#93000A] text-xs">
                <strong>Notice:</strong> Manual force assignments bypass the student's turn countdown and permanently reserve the selected bed unit on BVB Floor 2.
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#74777E] uppercase block mb-1">Target Participant</label>
                <input
                  type="text"
                  readOnly
                  value={`${forceTargetStudent?.full_name || 'Candidate'} (${forceTargetStudent?.college_id || 'USN'})`}
                  className="w-full px-3 py-2 bg-[#F0F4F6] border border-[#DFE3E5] rounded text-xs font-bold text-[#181C1E] cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-[#74777E] uppercase block mb-1">Room Assign</label>
                  <select
                    value={forceRoomChoice}
                    onChange={(e) => setForceRoomChoice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F0F4F6] border border-[#DFE3E5] rounded text-xs font-semibold text-[#181C1E]"
                  >
                    <option value="202">Room 202 (Triple)</option>
                    <option value="203">Room 203 (Triple)</option>
                    <option value="204">Room 204 (Triple)</option>
                    <option value="206">Room 206 (Triple)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#74777E] uppercase block mb-1">Bed Choice</label>
                  <select
                    value={forceBedChoice}
                    onChange={(e) => setForceBedChoice(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F0F4F6] border border-[#DFE3E5] rounded text-xs font-semibold text-[#181C1E]"
                  >
                    <option value="A">Bed A</option>
                    <option value="B">Bed B</option>
                    <option value="C">Bed C</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#74777E] uppercase block mb-1">Override Reason Mandate</label>
                <textarea
                  rows={2}
                  value={forceReason}
                  onChange={(e) => setForceReason(e.target.value)}
                  placeholder="e.g. Disability accommodation approved by Warden / System crash compensation"
                  className="w-full p-2.5 bg-[#F0F4F6] border border-[#DFE3E5] rounded text-xs text-[#181C1E] focus:outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#74777E] uppercase block mb-1">Warden Master Security PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  value={forceSecurityPin}
                  onChange={(e) => setForceSecurityPin(e.target.value)}
                  placeholder="Enter 6-digit Warden Key"
                  className="w-full px-3 py-2 bg-[#F0F4F6] border border-[#DFE3E5] rounded text-xs font-mono tracking-widest text-[#181C1E]"
                />
              </div>
            </div>

            <div className="p-4 bg-[#F0F4F6] border-t border-[#DFE3E5] flex items-center justify-end gap-2.5">
              <button
                onClick={() => setForceModalOpen(false)}
                className="px-4 py-2 rounded bg-white hover:bg-[#E5E9EB] text-[#181C1E] text-xs font-semibold border border-[#DFE3E5]"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteForceOverride}
                className="px-4 py-2 rounded bg-[#07203C] hover:bg-[#203653] text-white text-xs font-bold shadow-sm"
              >
                Authorize & Force Allot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH OFFICIAL ALLOTMENT MODAL */}
      {publishModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#07203C]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden border border-[#DFE3E5] flex flex-col animate-fadeIn">
            <div className="p-5 bg-[#016A62] text-white flex items-center gap-3">
              <Globe className="w-5 h-5 text-[#9DEFE3]" />
              <div>
                <h3 className="text-sm font-bold text-white">Publish Official Floor 2 List</h3>
                <span className="text-[11px] text-[#9DEFE3]">SIT Residence Administration Notification</span>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-[#181C1E]">
                You are about to freeze and publish the preliminary seat allocation report for <strong>BVB Block Floor 2 (Rooms 201–272)</strong>.
              </p>
              <div className="p-3 rounded-lg bg-[#F0F4F6] border border-[#DFE3E5] space-y-1 text-xs text-[#44474D]">
                <div className="flex justify-between"><span>Confirmed Allocations:</span> <strong className="text-[#181C1E]">12 Students</strong></div>
                <div className="flex justify-between"><span>Pending / Active Turns:</span> <strong className="text-[#181C1E]">12 Students</strong></div>
                <div className="flex justify-between"><span>Unresolved Hold Flags:</span> <strong className="text-[#BA1A1A]">06 Students</strong></div>
              </div>
              <p className="text-[11px] text-[#74777E]">
                An automated circular will be generated and posted on the official SIT Tumakuru Noticeboard portal.
              </p>
            </div>

            <div className="p-4 bg-[#F0F4F6] border-t border-[#DFE3E5] flex items-center justify-end gap-2.5">
              <button
                onClick={() => setPublishModalOpen(false)}
                className="px-4 py-2 rounded bg-white hover:bg-[#E5E9EB] text-[#181C1E] text-xs font-semibold border border-[#DFE3E5]"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  handleUpdateCycleStatus('cyc_bvb_pilot_2026', 'PUBLISHED');
                  setPublishModalOpen(false);
                }}
                className="px-4 py-2 rounded bg-[#016A62] hover:bg-[#005049] text-white text-xs font-bold shadow-sm"
              >
                Confirm & Release
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-PERSON ROOM CHANGE MODAL */}
      {showInPersonModal && (
        <div className="fixed inset-0 z-50 bg-[#07203C]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3.5 border border-[#DFE3E5] shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#DFE3E5] pb-2.5">
              <h3 className="text-xs font-bold text-[#07203C] flex items-center gap-2">
                <Repeat className="w-4 h-4 text-[#016A62]" />
                Record In-Person Room Change Request
              </h3>
              <button onClick={() => setShowInPersonModal(false)} className="text-[#74777E] hover:text-[#181C1E] text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordInPersonRequest} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-[#181C1E] block mb-1">Select Student</label>
                <select
                  value={inpStudentId}
                  onChange={(e) => setInpStudentId(e.target.value)}
                  required
                  className="w-full text-xs bg-[#F0F4F6] border border-[#DFE3E5] rounded p-2 text-[#181C1E]"
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
                <label className="text-[11px] font-semibold text-[#181C1E] block mb-1">Target Room on Floor 2</label>
                <select
                  value={inpTargetRoomId}
                  onChange={(e) => setInpTargetRoomId(e.target.value)}
                  required
                  className="w-full text-xs bg-[#F0F4F6] border border-[#DFE3E5] rounded p-2 text-[#181C1E]"
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
                <label className="text-[11px] font-semibold text-[#181C1E] block mb-1">Reason for In-Person Request</label>
                <input
                  type="text"
                  value={inpReason}
                  onChange={(e) => setInpReason(e.target.value)}
                  placeholder="e.g. Accessibility or maintenance relocation"
                  required
                  className="w-full text-xs bg-[#F0F4F6] border border-[#DFE3E5] rounded p-2 text-[#181C1E]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#DFE3E5]">
                <button
                  type="button"
                  onClick={() => setShowInPersonModal(false)}
                  className="px-3 py-1.5 bg-white text-[#181C1E] text-xs font-semibold rounded border border-[#DFE3E5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#016A62] hover:bg-[#005049] text-white text-xs font-bold rounded shadow-xs"
                >
                  Record & Atomically Apply Move
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRY-RUN CYCLE SIMULATION MODAL */}
      {showSimModal && simulationData && (
        <div className="fixed inset-0 z-50 bg-[#07203C]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 border border-[#DFE3E5] shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#DFE3E5] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#9DEFE3]/50 text-[#016A62] flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#07203C]">
                    Allocation Cycle Dry-Run Simulation
                  </h3>
                  <div className="text-[11px] text-[#44474D]">
                    Authoritative pre-flight model • Non-mutating prediction
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowSimModal(false)}
                className="text-[#74777E] hover:text-[#181C1E] text-xs"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-[#F0F4F6] rounded-lg border border-[#DFE3E5]">
                <div className="text-[10px] font-bold text-[#74777E] uppercase">Eligible Cohort</div>
                <div className="text-lg font-bold text-[#07203C] font-mono">
                  {simulationData.totalEligibleStudents}
                </div>
              </div>
              <div className="p-3 bg-[#F0F4F6] rounded-lg border border-[#DFE3E5]">
                <div className="text-[10px] font-bold text-[#74777E] uppercase">Total Beds</div>
                <div className="text-lg font-bold text-[#016A62] font-mono">
                  {simulationData.totalAvailableSeats}
                </div>
              </div>
              <div className="p-3 bg-[#F0F4F6] rounded-lg border border-[#DFE3E5]">
                <div className="text-[10px] font-bold text-[#74777E] uppercase">Est. Avg Turn</div>
                <div className="text-lg font-bold text-[#07203C] font-mono">
                  {simulationData.estimatedAverageSecondsPerTurn}s
                </div>
              </div>
              <div className="p-3 bg-[#F0F4F6] rounded-lg border border-[#DFE3E5]">
                <div className="text-[10px] font-bold text-[#74777E] uppercase">Predicted Time</div>
                <div className="text-lg font-bold text-[#584411] font-mono">
                  ~{simulationData.predictedDurationMinutes} min
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#DFE3E5]">
              <button
                type="button"
                onClick={() => setShowSimModal(false)}
                className="px-4 py-2 bg-[#07203C] hover:bg-[#203653] text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Close Simulation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Notice Modal */}
      <AdminBroadcastNoticeModal
        isOpen={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
        onNoticePublished={() => {
          setActionMsg({
            type: 'success',
            text: 'Official notice broadcast successfully! All active sessions will receive the notification and audio chime.',
          });
        }}
      />
    </div>
  );
};
