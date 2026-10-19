import React, { useState, useEffect } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext.js';
import { 
  Clock, 
  MapPin, 
  CheckCircle, 
  CheckCircle2,
  AlertCircle, 
  Heart, 
  Share2, 
  ShieldAlert,
  Loader2,
  Check,
  Building,
  Bed,
  Info,
  Users,
  Send,
  HelpCircle,
  Repeat,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { StudentProfileForm } from './StudentProfileForm.js';
import { TermsAcknowledgementModal } from './TermsAcknowledgementModal.js';

export const StudentAllocationView: React.FC = () => {
  const { session } = useAuth();
  const [cycleId, setCycleId] = useState('cyc_bvb_pilot_2026');
  const [availableCycles, setAvailableCycles] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('bld_bvb');
  const [floorId, setFloorId] = useState('flr_bvb_2');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [waitingEntry, setWaitingEntry] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [floorMap, setFloorMap] = useState<any>(null);
  const [seatStates, setSeatStates] = useState<Record<string, string>>({});
  const [roommateIntentMap, setRoommateIntentMap] = useState<Record<string, any>>({});
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [myAllocation, setMyAllocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [termsStatus, setTermsStatus] = useState<any>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Roommate group input state
  const [roommatePriority1, setRoommatePriority1] = useState<string>('');
  const [roommatePriority2, setRoommatePriority2] = useState<string>('');
  const [roommateMsg, setRoommateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [myRoommateGroups, setMyRoommateGroups] = useState<any>({ incoming: [], outgoing: null });

  // Orange Seat Override Warning Modal state
  const [showOrangeWarningModal, setShowOrangeWarningModal] = useState(false);
  const [pendingOrangeSeatId, setPendingOrangeSeatId] = useState<string | null>(null);

  // 48-Hour Room Change Request state
  const [showRoomChangeModal, setShowRoomChangeModal] = useState(false);
  const [roomChangeTargetRoomId, setRoomChangeTargetRoomId] = useState('');
  const [roomChangeReason, setRoomChangeReason] = useState('');
  const [roomChangeStatus, setRoomChangeStatus] = useState<any>(null);
  const [allRooms, setAllRooms] = useState<any[]>([]);

  // Active view tab: 'workflow' | 'allocation_map' | 'room_change'
  const [activeSubTab, setActiveSubTab] = useState<'workflow' | 'allocation_map' | 'room_change'>('workflow');

  // Allocation Confirmed Success Modal
  const [showAllocationSuccessModal, setShowAllocationSuccessModal] = useState(false);
  const [allocationModalDetails, setAllocationModalDetails] = useState<{
    block: string;
    floor: string;
    room: string;
    seat: string;
  } | null>(null);

  // Load student profile & terms status
  const fetchMyData = async () => {
    if (!session?.profileId) return;
    try {
      const [pRes, tRes, gRes, aRes] = await Promise.all([
        apiFetch(`/api/students/${session.profileId}`),
        apiFetch(`/api/students/${session.profileId}/terms-status`),
        apiFetch(`/api/roommate-groups/student/${session.profileId}?cycleId=${cycleId}`),
        apiFetch(`/api/room-change-requests?cycleId=${cycleId}`),
      ]);

      if (pRes.ok) {
        const prof = await pRes.json();
        setMyProfile(prof);
        if (prof.allocated_seat_id) {
          setMyAllocation({
            allocationId: prof.allocation_id || `alloc_${prof.id}`,
            seatId: prof.allocated_seat_id,
            roomNumber: prof.allocated_room_number,
            seatLabel: prof.allocated_seat_label,
            buildingName: prof.allocated_building_name,
          });
        }
      }

      if (tRes.ok) {
        const t = await tRes.json();
        setTermsStatus(t);
        if (!t.accepted) {
          setShowTermsModal(true);
        }
      }

      if (gRes.ok) {
        setMyRoommateGroups(await gRes.json());
      }

      if (aRes.ok) {
        const requests = await aRes.json();
        if (requests.length > 0) setRoomChangeStatus(requests[0]);
      }
    } catch (e) {}
  };

  // Poll waiting room, session state & roommate intent
  const refreshStatus = async () => {
    try {
      if (waitingEntry?.poolId) {
        const advRes = await apiFetch(`/api/allocation-pools/${waitingEntry.poolId}/advance`, {
          method: 'POST',
        });
        if (advRes.ok) {
          const advData = await advRes.json();
          if (advData.session && advData.session.studentId === session?.profileId) {
            setActiveSession(advData.session);
          }
        }
      }

      // Refresh seat occupancy
      const stRes = await apiFetch(`/api/floors/${floorId}/state`);
      if (stRes.ok) {
        setSeatStates(await stRes.json());
      }

      // Refresh roommate intent map
      const rRes = await apiFetch(`/api/floors/${floorId}/roommate-intent?cycleId=${cycleId}`);
      if (rRes.ok) {
        setRoommateIntentMap(await rRes.json());
      }
    } catch (e) {}
  };

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!activeSession || !activeSession.expiresAt) {
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const now = Date.now();
      const exp = new Date(activeSession.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((exp - now) / 1000));
      setTimeLeft(diff);
      if (diff === 0) {
        setActiveSession(null);
        setErrorMsg('Your turn selection window has expired.');
      }
    };
    tick();
    const tInterval = setInterval(tick, 1000);
    return () => clearInterval(tInterval);
  }, [activeSession?.expiresAt]);

  // Load cycles and buildings on mount
  useEffect(() => {
    Promise.all([
      apiFetch('/api/allocation-cycles').then((r) => r.ok ? r.json() : []),
      apiFetch('/api/buildings').then((r) => r.ok ? r.json() : []),
    ]).then(([cycs, blds]) => {
      setAvailableCycles(cycs);
      if (cycs.length > 0 && !cycs.find((c: any) => c.id === cycleId)) {
        setCycleId(cycs[0].id);
      }
      setBuildings(blds);
      if (blds.length > 0 && !blds.find((b: any) => b.id === selectedBuildingId)) {
        setSelectedBuildingId(blds[0].id);
      }
    });
  }, []);

  // Fetch floors whenever selected building changes
  useEffect(() => {
    if (!selectedBuildingId) return;
    apiFetch(`/api/buildings/${selectedBuildingId}/floors`).then(async (r) => {
      if (r.ok) {
        const flrs = await r.json();
        setFloors(flrs);
        if (flrs.length > 0 && !flrs.find((f: any) => f.id === floorId)) {
          setFloorId(flrs[0].id);
        }
      }
    });
  }, [selectedBuildingId]);

  useEffect(() => {
    fetchMyData();
    apiFetch(`/api/floors/${floorId}/map`).then(async (r) => {
      if (r.ok) setFloorMap(await r.json());
    });
    apiFetch(`/api/floors/${floorId}/rooms`).then(async (r) => {
      if (r.ok) setAllRooms(await r.json());
    });

    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, [floorId, cycleId, waitingEntry?.poolId, session?.profileId]);

  // Join waiting room
  const handleJoinWaitingRoom = async () => {
    if (!termsStatus?.accepted) {
      setShowTermsModal(true);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/api/allocation-cycles/${cycleId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentProfileId: session?.profileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join');
      setWaitingEntry(data);

      const advRes = await apiFetch(`/api/allocation-pools/${data.poolId}/advance`, {
        method: 'POST',
      });
      if (advRes.ok) {
        const advData = await advRes.json();
        if (advData.session && advData.session.studentId === session?.profileId) {
          setActiveSession(advData.session);
        }
      }
      setActiveSubTab('allocation_map');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Seat Click handler with Orange Warning check
  const handleSeatClick = (seatId: string, roomId?: string) => {
    const isTaken = seatStates[seatId] === 'taken';
    if (isTaken) return;

    // Check if this seat has roommate-group intent (Orange Seat)
    const isOrangeIntent = !!roommateIntentMap[seatId];
    if (isOrangeIntent) {
      setPendingOrangeSeatId(seatId);
      setShowOrangeWarningModal(true);
      return;
    }

    setSelectedSeatId(seatId);
    if (roomId) {
      setSelectedRoomNumber(roomId.replace('rm_bvb_', ''));
    }
  };

  const handleContinueWithOrangeSeat = () => {
    if (pendingOrangeSeatId) {
      setSelectedSeatId(pendingOrangeSeatId);
      const el = floorMap?.elements?.find((e: any) => e.id === pendingOrangeSeatId);
      if (el?.meta?.roomId) {
        setSelectedRoomNumber(el.meta.roomId.replace('rm_bvb_', ''));
      }
    }
    setShowOrangeWarningModal(false);
    setPendingOrangeSeatId(null);
  };

  // Confirm seat selection
  const handleConfirmSeat = async () => {
    if (!selectedSeatId || !activeSession) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiFetch(`/api/booking-sessions/${activeSession.sessionId}/confirm-seat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatId: selectedSeatId,
          idempotencyKey: `idemp_${Date.now()}_${session?.profileId}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seat confirmation failed');

      setMyAllocation(data);
      setSuccessMsg(`Seat ${selectedSeatId} successfully allocated to you!`);
      setActiveSession(null);
      refreshStatus();
      fetchMyData();

      // Show dedicated Allocation Confirmation Modal
      const seatEl = floorMap?.elements?.find((e: any) => e.id === selectedSeatId);
      const roomNum = selectedRoomNumber || (seatEl?.meta?.roomId ? seatEl.meta.roomId.replace('rm_bvb_', '') : '202');
      const seatLbl = seatEl?.label || selectedSeatId.slice(-1);
      setAllocationModalDetails({
        block: 'BVB Block',
        floor: 'Floor 2',
        room: roomNum,
        seat: seatLbl,
      });
      setShowAllocationSuccessModal(true);
    } catch (err: any) {
      setErrorMsg(err.message);
      refreshStatus();
    } finally {
      setLoading(false);
    }
  };

  // Roommate Group Creation by Priority Numbers
  const handleCreateRoommateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomNumber || !session?.profileId) return;
    setRoommateMsg(null);

    const priorities: number[] = [];
    if (roommatePriority1) priorities.push(parseInt(roommatePriority1, 10));
    if (roommatePriority2) priorities.push(parseInt(roommatePriority2, 10));

    if (priorities.length === 0) {
      setRoommateMsg({ type: 'error', text: 'Please enter at least one valid priority number' });
      return;
    }

    try {
      const res = await apiFetch('/api/roommate-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId,
          leaderStudentId: session.profileId,
          roomId: `rm_bvb_${selectedRoomNumber}`,
          peerPriorityNumbers: priorities,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create roommate group');

      setRoommateMsg({ type: 'success', text: `Roommate group created for Room ${selectedRoomNumber}! Invitations sent.` });
      setRoommatePriority1('');
      setRoommatePriority2('');
      fetchMyData();
      refreshStatus();
    } catch (err: any) {
      setRoommateMsg({ type: 'error', text: err.message });
    }
  };

  // Respond to roommate invitation
  const handleRespondRoommateInvite = async (groupId: string, accept: boolean) => {
    if (!session?.profileId) return;
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/api/roommate-groups/${groupId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentProfileId: session.profileId,
          accept,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to respond to roommate invitation');
      }

      if (accept) {
        setSuccessMsg('Roommate invitation accepted');
      } else {
        setSuccessMsg('Roommate invitation declined');
      }

      // Immediately synchronize authoritative state: student profile, seat states, roommate intent
      await fetchMyData();
      await refreshStatus();

      // Check if student now holds an authoritative allocation (e.g. if allocated)
      const pRes = await apiFetch(`/api/students/${session.profileId}`);
      if (pRes.ok) {
        const updatedProf = await pRes.json();
        if (updatedProf.allocated_seat_id) {
          const seatEl = floorMap?.elements?.find((e: any) => e.id === updatedProf.allocated_seat_id);
          const roomNum = updatedProf.allocated_room_number || (seatEl?.meta?.roomId ? seatEl.meta.roomId.replace('rm_bvb_', '') : '202');
          const seatLbl = updatedProf.allocated_seat_label || seatEl?.label || updatedProf.allocated_seat_id.slice(-1);
          setAllocationModalDetails({
            block: 'BVB Block',
            floor: 'Floor 2',
            room: roomNum,
            seat: seatLbl,
          });
          setShowAllocationSuccessModal(true);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing invitation');
    }
  };

  // Submit 48-Hour Room Change Request
  const handleSubmitRoomChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.profileId || !roomChangeTargetRoomId || !roomChangeReason) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiFetch('/api/room-change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId,
          studentProfileId: session.profileId,
          targetRoomId: roomChangeTargetRoomId,
          reason: roomChangeReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit room change request');

      setSuccessMsg('Room change request submitted for administrative review.');
      setShowRoomChangeModal(false);
      fetchMyData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const roomSeats = floorMap?.elements?.filter(
    (el: any) => el.t === 'seat' && el.meta?.roomId === `rm_bvb_${selectedRoomNumber}`
  ) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Terms Acknowledgement Modal (Blocking) */}
      {showTermsModal && (
        <TermsAcknowledgementModal
          onAccepted={() => {
            setShowTermsModal(false);
            fetchMyData();
          }}
        />
      )}

      {/* Orange Seat Override Warning Modal */}
      {showOrangeWarningModal && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl animate-fadeIn">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy-900">Roommate preference notice</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                This seat is associated with another student's roommate-group request. It has not been finally allocated, and continuing may separate that group.
              </p>
              <p className="text-xs font-semibold text-navy-900 mt-2">
                Do you want to continue with this seat?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowOrangeWarningModal(false);
                  setPendingOrangeSeatId(null);
                }}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Choose Another Seat
              </button>
              <button
                type="button"
                onClick={handleContinueWithOrangeSeat}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Allocation Success Confirmation Modal */}
      {showAllocationSuccessModal && allocationModalDetails && (
        <div className="fixed inset-0 z-50 bg-[#203653]/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 border border-[#E2E6E8] shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#E7F2ED] text-[#1E7B54] border border-[#A8D5C2] flex items-center justify-center font-bold shrink-0">
                <CheckCircle2 className="w-7 h-7 text-[#1E7B54]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#203653] tracking-tight">Your Seat Is Allocated</h3>
                <p className="text-xs font-semibold text-[#2C8279]">
                  {allocationModalDetails.block} · {allocationModalDetails.floor}
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#F7F6F1] rounded-xl border border-[#E2E6E8] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#627084] font-medium">Room:</span>
                <span className="font-mono font-bold text-[#203653] text-sm">{allocationModalDetails.room}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#627084] font-medium">Seat:</span>
                <span className="font-mono font-bold text-[#1E7B54] text-sm">Seat {allocationModalDetails.seat}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-[#E2E6E8] pt-2 mt-1">
                <span className="text-[#627084] font-medium">Academic Block:</span>
                <span className="font-bold text-[#203653]">BVB Campus Block</span>
              </div>
            </div>

            <p className="text-xs text-[#627084] leading-relaxed">
              Your allocation has been successfully confirmed.
            </p>

            <div className="flex items-center justify-end pt-2 border-t border-[#E2E6E8]">
              <button
                type="button"
                onClick={() => setShowAllocationSuccessModal(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#2C8279] hover:bg-[#20635c] text-white text-xs font-bold rounded shadow-xs transition-colors"
              >
                Acknowledge Allocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Onboarding & Operational Sub-Navigation: Clean Segmented Stepper */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E2E6E8] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveSubTab('workflow')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'workflow'
                ? 'bg-[#203653] text-white shadow-xs'
                : 'text-[#627084] hover:bg-[#F7F6F1] hover:text-[#263345]'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeSubTab === 'workflow' ? 'bg-white/20 text-white' : 'bg-[#E5E9EB] text-[#627084]'
            }`}>1</span>
            <span>Registration & Terms</span>
          </button>

          <button
            onClick={() => setActiveSubTab('allocation_map')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'allocation_map'
                ? 'bg-[#203653] text-white shadow-xs'
                : 'text-[#627084] hover:bg-[#F7F6F1] hover:text-[#263345]'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeSubTab === 'allocation_map' ? 'bg-white/20 text-white' : 'bg-[#E5E9EB] text-[#627084]'
            }`}>2</span>
            <span>Live Floor Map & Selection</span>
          </button>

          {myAllocation && (
            <button
              onClick={() => setActiveSubTab('room_change')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeSubTab === 'room_change'
                  ? 'bg-[#203653] text-white shadow-xs'
                  : 'text-[#627084] hover:bg-[#F7F6F1] hover:text-[#263345]'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                activeSubTab === 'room_change' ? 'bg-white/20 text-white' : 'bg-[#E5E9EB] text-[#627084]'
              }`}>3</span>
              <span>48-Hour Room Change</span>
            </button>
          )}
        </div>

        {/* Clean right status pills */}
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            termsStatus?.accepted 
              ? 'bg-[#E7F2ED] text-[#1E7B54] border-[#A8D5C2]' 
              : 'bg-[#FAF4E6] text-[#9C7A2E] border-[#D4B779]'
          }`}>
            Terms: {termsStatus?.accepted ? 'Accepted Accord' : 'Pending Sign-off'}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            myProfile?.fee_status === 'VERIFIED'
              ? 'bg-[#E7F2ED] text-[#1E7B54] border-[#A8D5C2]'
              : 'bg-[#FAF4E6] text-[#9C7A2E] border-[#D4B779]'
          }`}>
            Fee: {myProfile?.fee_status === 'VERIFIED' ? 'Verified' : 'Pending Audit'}
          </span>
        </div>
      </div>

      {/* Tab 1: Registration, Profile & Terms Status */}
      {activeSubTab === 'workflow' && (
        <div className="space-y-6">
          <StudentProfileForm onProfileUpdated={fetchMyData} />
        </div>
      )}

      {/* Tab 2: Live Floor Map & Roommate Coordination */}
      {activeSubTab === 'allocation_map' && (
        <div className="space-y-6">
          {/* Focused Allocation Status Card with High Contrast */}
          <div className="bg-[#203653] text-white rounded-xl p-6 shadow-sm border border-[#17283B] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#84d5ca] animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#84d5ca]">
                  Allocation Cycle Active · BVB Block Floor 2
                </span>
              </div>
              <div className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
                <span>{session?.fullName}</span>
                <span className="text-xs font-mono font-medium bg-[#112947] text-slate-200 px-2.5 py-1 rounded border border-[#263345]">
                  {session?.collegeId}
                </span>
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <span>Assigned Priority Rank:</span>
                <span className="font-bold text-[#D4B779] font-mono text-sm">
                  #{myProfile?.assigned_priority || '1'}
                </span>
                <span className="text-slate-400">/ 30 Pilot Cohort</span>
              </div>
            </div>

            {/* Turn Action / Timer Box */}
            <div className="bg-[#07203C] p-4 rounded-xl border border-[#263345] min-w-[260px] flex flex-col items-start gap-3">
              <div className="text-[11px] font-medium text-slate-300 flex items-center justify-between w-full">
                <span>Turn Status:</span>
                {activeSession ? (
                  <span className="text-[#84d5ca] font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#84d5ca] animate-ping" /> Active Window
                  </span>
                ) : waitingEntry ? (
                  <span className="text-[#D4B779] font-semibold text-[10px] uppercase">In Queue</span>
                ) : myAllocation ? (
                  <span className="text-[#84d5ca] font-semibold text-[10px] uppercase">Allocated</span>
                ) : (
                  <span className="text-slate-400 text-[10px] uppercase">Ready</span>
                )}
              </div>

              {activeSession && !myAllocation && (
                <div className="w-full">
                  <div className="text-2xl font-bold font-mono text-white tracking-wide">
                    {timeLeft !== null ? `${Math.floor(timeLeft / 60)}m : ${String(timeLeft % 60).padStart(2, '0')}s` : '02m : 00s'}
                  </div>
                  <div className="text-[11px] text-[#84d5ca] font-medium mt-0.5">
                    Your allocation pick window is open
                  </div>
                </div>
              )}

              {waitingEntry && !activeSession && !myAllocation && (
                <div className="text-xs text-slate-200">
                  <span className="font-bold text-white">Turn scheduled.</span> Waiting for active student turn completion.
                </div>
              )}

              {myAllocation && (
                <div className="text-xs text-slate-200 flex items-center gap-1.5 font-medium">
                  <Check className="w-4 h-4 text-[#84d5ca]" />
                  <span>Confirmed Seat: <strong className="text-white font-mono">{myAllocation.seatId}</strong></span>
                </div>
              )}

              {!waitingEntry && !myAllocation && (
                <button
                  onClick={handleJoinWaitingRoom}
                  disabled={loading || (myProfile && myProfile.eligibility_status !== 'ELIGIBLE')}
                  className="w-full py-2.5 px-4 bg-[#2C8279] hover:bg-[#236B63] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enter Allocation Queue</span>
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-[#FDE8E8] border border-[#F8B4B4] text-[#C93B3B] text-xs font-medium rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#C93B3B] shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-[#E7F2ED] border border-[#A8D5C2] text-[#1E7B54] text-xs font-medium rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#1E7B54] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Clean Floor Map Header Bar: Row 1 Title, Row 2 Wing Filters, Search, Zoom */}
          <div className="bg-white rounded-xl p-5 border border-[#E2E6E8] shadow-xs space-y-4">
            {/* First Row: Title & Context */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6E8] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#203653] tracking-tight">
                    BVB Block — Floor 2 Allocation Map
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#E7F2ED] text-[#1E7B54] border border-[#A8D5C2] px-2 py-0.5 rounded-full">
                    Pilot Active
                  </span>
                </div>
                <p className="text-xs text-[#627084] mt-0.5">
                  Official 72-room residential layout (Rooms 201–272). Select any room to inspect bed matrix and configure roommate intent.
                </p>
              </div>

              {/* Building & Floor Selectors */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  className="text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded-lg px-3 py-1.5 text-[#263345] font-semibold focus:outline-none focus:ring-1 focus:ring-[#2C8279]"
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <select
                  value={floorId}
                  onChange={(e) => setFloorId(e.target.value)}
                  className="text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded-lg px-3 py-1.5 text-[#263345] font-semibold focus:outline-none focus:ring-1 focus:ring-[#2C8279]"
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

            {/* Second Row: Wing Filter Pills, Room Search, and Zoom Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Wing Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-[#627084] uppercase mr-1">Wings:</span>
                {[
                  { id: 'ALL', label: 'All 72 Rooms' },
                  { id: 'NORTH', label: 'North Wing (201–224)' },
                  { id: 'SOUTH', label: 'South Wing (225–248)' },
                  { id: 'EAST', label: 'East Wing (249–272)' },
                ].map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      if (w.id === 'ALL') {
                        setSelectedRoomNumber(null);
                      } else if (w.id === 'NORTH') {
                        setSelectedRoomNumber('202');
                      } else if (w.id === 'SOUTH') {
                        setSelectedRoomNumber('226');
                      } else if (w.id === 'EAST') {
                        setSelectedRoomNumber('250');
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                      (w.id === 'ALL' && !selectedRoomNumber) ||
                      (w.id === 'NORTH' && selectedRoomNumber && parseInt(selectedRoomNumber) <= 224) ||
                      (w.id === 'SOUTH' && selectedRoomNumber && parseInt(selectedRoomNumber) >= 225 && parseInt(selectedRoomNumber) <= 248) ||
                      (w.id === 'EAST' && selectedRoomNumber && parseInt(selectedRoomNumber) >= 249)
                        ? 'bg-[#203653] text-white border-[#203653]'
                        : 'bg-[#F7F6F1] text-[#627084] border-[#E2E6E8] hover:bg-slate-200/60 hover:text-[#263345]'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              {/* Room Search & Zoom Toolbar */}
              <div className="flex items-center gap-3">
                {/* Search Room */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search room (e.g. 202)..."
                    value={selectedRoomNumber || ''}
                    onChange={(e) => setSelectedRoomNumber(e.target.value.trim() || null)}
                    className="text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded-lg px-3 py-1.5 text-[#263345] font-mono focus:outline-none focus:ring-1 focus:ring-[#2C8279] w-44"
                  />
                </div>

                {/* SVG Zoom Controls */}
                <div className="flex items-center border border-[#E2E6E8] rounded-lg bg-[#F7F6F1] p-0.5">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.6, parseFloat((z - 0.2).toFixed(1))))}
                    title="Zoom Out"
                    className="p-1.5 text-[#627084] hover:text-[#203653] hover:bg-white rounded transition-colors"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-bold px-2 text-[#203653]">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(2.0, parseFloat((z + 0.2).toFixed(1))))}
                    title="Zoom In"
                    className="p-1.5 text-[#627084] hover:text-[#203653] hover:bg-white rounded transition-colors"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    title="Reset Zoom"
                    className="p-1.5 text-[#627084] hover:text-[#203653] hover:bg-white rounded border-l border-[#E2E6E8] ml-0.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dedicated Status Legend Section */}
          <div className="bg-white p-4 rounded-xl border border-[#E2E6E8] shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 flex-wrap">
              <span className="text-[11px] uppercase font-bold text-[#627084] tracking-wider">Status Legend:</span>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-[#1E7B54] border border-[#166041]" />
                <span className="text-xs font-semibold text-[#1E7B54]">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-[#E06A26] border border-[#b35118]" />
                <span className="text-xs font-semibold text-[#E06A26]">Roommate Intent</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-[#C93B3B] border border-[#a12828]" />
                <span className="text-xs font-semibold text-[#C93B3B]">Occupied / Blocked</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-[#1D63B8] border border-[#134887]" />
                <span className="text-xs font-semibold text-[#1D63B8]">Active Selection</span>
              </div>
            </div>

            <div className="text-[11px] text-[#627084]">
              Roommate intent is non-binding until confirmed during an active turn.
            </div>
          </div>

          {/* Three Compact Summary Metrics Directly Below Legend */}
          {(() => {
            const allSeats = floorMap?.elements?.filter((e: any) => e.t === 'seat') || [];
            const totalCount = allSeats.length || 216;
            const occupiedCount = allSeats.filter((s: any) => seatStates[s.id] === 'taken').length;
            const intentCount = allSeats.filter((s: any) => roommateIntentMap[s.id] && seatStates[s.id] !== 'taken').length;
            const vacantCount = Math.max(0, totalCount - occupiedCount - intentCount);

            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-[#E2E6E8] shadow-xs space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#1E7B54]">Vacant Beds</div>
                  <div className="text-2xl font-bold font-mono text-[#1E7B54]">{vacantCount}</div>
                  <div className="text-[11px] text-[#627084]">Open for selection by active candidate</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E2E6E8] shadow-xs space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#E06A26]">Intent Reservations</div>
                  <div className="text-2xl font-bold font-mono text-[#E06A26]">{intentCount}</div>
                  <div className="text-[11px] text-[#627084]">Provisional roommate group requests</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E2E6E8] shadow-xs space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#203653]">Confirmed Occupancy</div>
                  <div className="text-2xl font-bold font-mono text-[#203653]">{occupiedCount}</div>
                  <div className="text-[11px] text-[#627084]">Finalized authoritative seat assignments</div>
                </div>
              </div>
            );
          })()}

          {/* Incoming Roommate Invitations Alert (if any) */}
          {myRoommateGroups.incoming.length > 0 && (
            <div className="p-4 bg-[#E7F2ED] border border-[#A8D5C2] rounded-xl space-y-2">
              <div className="text-xs font-bold text-[#1E7B54] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#2C8279]" />
                Pending Roommate Group Invitations ({myRoommateGroups.incoming.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myRoommateGroups.incoming.map((inc: any) => (
                  <div key={inc.group_id} className="p-3 bg-white rounded-lg border border-[#A8D5C2] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#203653]">Room {inc.room_number}</div>
                      <div className="text-[11px] text-[#627084]">Invited by: {inc.leader_name}</div>
                    </div>
                    {inc.my_status === 'PENDING' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRespondRoommateInvite(inc.group_id, true)}
                          className="px-2.5 py-1 bg-[#2C8279] text-white rounded text-[11px] font-bold hover:bg-[#20635c]"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespondRoommateInvite(inc.group_id, false)}
                          className="px-2.5 py-1 bg-[#F7F6F1] text-[#263345] border border-[#E2E6E8] rounded text-[11px] font-semibold hover:bg-slate-200"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-[#1E7B54] bg-[#E7F2ED] px-2 py-0.5 rounded">
                        {inc.my_status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Master-Detail Layout: 70% Floor Map, 30% Room Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 70% Map Panel (8 cols on lg) */}
            <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs text-[#627084] pb-2 border-b border-[#E2E6E8]">
                <div className="flex items-center gap-1.5 font-medium">
                  <Building className="w-4 h-4 text-[#2C8279]" />
                  <span>Interactive 2D Architectural Projection (900 × 650)</span>
                </div>
                {selectedRoomNumber && (
                  <span className="font-bold text-[#203653] bg-[#F7F6F1] border border-[#E2E6E8] px-2.5 py-1 rounded">
                    Inspecting Room {selectedRoomNumber}
                  </span>
                )}
              </div>

              <div className="w-full bg-[#f8fafc] rounded-lg p-3 border border-[#E2E6E8] overflow-auto min-h-[460px] flex items-center justify-center">
                {floorMap && (
                  <div
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.15s ease-out',
                      width: '100%',
                    }}
                  >
                  <svg viewBox="0 0 900 650" className="w-full max-h-[520px] border border-slate-300 rounded shadow-inner bg-[#f0f0f0]">
                    {/* Corridors and structural lines */}
                    <rect x="50" y="50" width="800" height="550" fill="none" stroke="#bbb" strokeWidth="1" rx="4" ry="4"/>
                    <rect x="110" y="50" width="680" height="70" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"/>
                    <rect x="110" y="530" width="680" height="70" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"/>
                    <rect x="50" y="120" width="60" height="410" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"/>
                    <rect x="790" y="120" width="60" height="410" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"/>
                    <rect x="430" y="140" width="40" height="360" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"/>
                    <rect x="170" y="140" width="260" height="360" fill="#fafafa" stroke="#cbd5e1" strokeWidth="1"/>
                    <rect x="470" y="140" width="260" height="360" fill="#fafafa" stroke="#cbd5e1" strokeWidth="1"/>

                    {/* Rooms and Seats */}
                    {floorMap.elements?.map((el: any, i: number) => {
                      if (el.t === 'room' && el.poly) {
                        const [p1, p2, p3, p4] = el.poly;
                        const rx = p1[0];
                        const ry = p1[1];
                        const rw = p2[0] - p1[0];
                        const rh = p4[1] - p1[1];
                        const isSelectedRoom = selectedRoomNumber === el.label;

                        return (
                          <g
                            key={`room_${i}`}
                            className="cursor-pointer"
                            onClick={() => setSelectedRoomNumber(el.label)}
                          >
                            <rect
                              x={rx}
                              y={ry}
                              width={rw}
                              height={rh}
                              rx="3"
                              ry="3"
                              fill={isSelectedRoom ? '#e0f2fe' : '#ffffff'}
                              stroke={isSelectedRoom ? '#0284c7' : '#475569'}
                              strokeWidth={isSelectedRoom ? '2' : '1'}
                              className="hover:fill-sky-50 transition-colors"
                            />
                            <text
                              x={rx + rw / 2}
                              y={ry + rh / 2 + 3}
                              fill="#475569"
                              fontSize="10"
                              fontFamily="sans-serif"
                              fontWeight="bold"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              pointerEvents="none"
                            >
                              {el.label}
                            </text>
                          </g>
                        );
                      }

                      if (el.t === 'seat' && el.pos && el.size) {
                        const [x, y] = el.pos;
                        const [w, h] = el.size;
                        const isTaken = seatStates[el.id] === 'taken';
                        const isOrangeIntent = !!roommateIntentMap[el.id] && !isTaken;
                        const isSelected = selectedSeatId === el.id;
                        const isMine = myAllocation?.seatId === el.id;

                        // 4-COLOR STATUS PALETTE
                        let fillColor = '#1E7B54'; // GREEN - Available Bed (#1E7B54)
                        if (isOrangeIntent) fillColor = '#E06A26'; // ORANGE - Roommate Intent (#E06A26)
                        if (isTaken) fillColor = '#C93B3B'; // RED - Occupied / Unavailable (#C93B3B)
                        if (isSelected || isMine) fillColor = '#1D63B8'; // Blue - Active Selection (#1D63B8)

                        return (
                          <g
                            key={`seat_${i}`}
                            className="cursor-pointer"
                            onClick={() => handleSeatClick(el.id, el.meta?.roomId)}
                          >
                            <rect
                              x={x}
                              y={y}
                              width={w}
                              height={h}
                              rx="2"
                              fill={fillColor}
                              stroke={isSelected ? '#1D63B8' : '#263345'}
                              strokeWidth={isSelected ? '2' : '0.5'}
                              className="transition-all hover:opacity-80"
                            />
                            <text
                              x={x + w / 2}
                              y={y + h / 2 + 2}
                              fill="#ffffff"
                              fontSize="7"
                              fontWeight="bold"
                              textAnchor="middle"
                              dominantBaseline="middle"
                              pointerEvents="none"
                            >
                              {el.label}
                            </text>
                          </g>
                        );
                      }
                      return null;
                    })}
                  </svg>
                  </div>
                )}
              </div>
            </div>

            {/* 30% Purposeful Room Inspector (4 cols on lg) */}
            <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E2E6E8] pb-2.5">
                <span className="text-xs font-bold text-[#203653] uppercase tracking-wider">
                  Selected Room Inspector
                </span>
                {selectedRoomNumber && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E7F2ED] text-[#1E7B54]">
                    Room {selectedRoomNumber}
                  </span>
                )}
              </div>

              {selectedRoomNumber ? (
                <div className="space-y-4">
                  {/* Room Overview Summary */}
                  <div className="p-4 bg-[#F7F6F1] rounded-xl border border-[#E2E6E8] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-bold text-[#203653]">Room {selectedRoomNumber}</div>
                      <span className="text-[11px] font-semibold text-[#627084]">
                        {parseInt(selectedRoomNumber) <= 224 ? 'North Wing' : (parseInt(selectedRoomNumber) <= 248 ? 'South Wing' : 'East Wing')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#627084] pt-1 border-t border-[#E2E6E8]">
                      <span>Configured Capacity:</span>
                      <span className="font-bold text-[#203653]">{roomSeats.length} Beds (Triple)</span>
                    </div>

                    {/* Beds Grid */}
                    <div className="space-y-2 pt-2">
                      <div className="text-[11px] font-bold text-[#203653] uppercase tracking-wider">
                        Beds & Current Availability:
                      </div>
                      <div className="space-y-1.5">
                        {roomSeats.map((st: any) => {
                          const isTaken = seatStates[st.id] === 'taken';
                          const isOrangeIntent = !!roommateIntentMap[st.id] && !isTaken;
                          const isSelected = selectedSeatId === st.id;
                          const isMine = myAllocation?.seatId === st.id;

                          return (
                            <div
                              key={st.id}
                              onClick={() => handleSeatClick(st.id, st.meta?.roomId)}
                              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                                isSelected || isMine
                                  ? 'bg-[#EBF3FC] border-[#1D63B8] text-[#1D63B8] ring-1 ring-[#1D63B8]'
                                  : isTaken
                                  ? 'bg-[#FDE8E8] border-[#F8B4B4] text-[#C93B3B] cursor-not-allowed'
                                  : isOrangeIntent
                                  ? 'bg-[#FFF0E6] border-[#FFD1B3] text-[#E06A26]'
                                  : 'bg-[#E7F2ED] border-[#A8D5C2] text-[#1E7B54]'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Bed className="w-4 h-4 text-[#627084]" />
                                <span className="font-mono font-bold">Seat {st.label}</span>
                                <span className="text-[10px] font-mono text-[#627084]">({st.id.replace('st_', '')})</span>
                              </div>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                isMine 
                                  ? 'bg-[#1D63B8] text-white' 
                                  : isTaken 
                                  ? 'bg-[#C93B3B] text-white' 
                                  : isOrangeIntent
                                  ? 'bg-[#E06A26] text-white'
                                  : 'bg-[#1E7B54] text-white'
                              }`}>
                                {isMine ? 'Allocated to You' : (isTaken ? 'Occupied' : isOrangeIntent ? 'Intent Reserve' : 'Available')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Roommate Priority Coordination Form */}
                  <div className="p-4 bg-white rounded-xl border border-[#E2E6E8] space-y-3">
                    <div className="text-xs font-bold text-[#203653] flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#2C8279]" />
                      <span>Coordinate Roommates (Priority Ranks)</span>
                    </div>
                    <p className="text-[11px] text-[#627084]">
                      Enter peer priority ranks to propose sharing Room {selectedRoomNumber}. Intent generates an orange badge.
                    </p>

                    {roommateMsg && (
                      <div className={`p-2.5 rounded text-xs font-medium ${
                        roommateMsg.type === 'success' ? 'bg-[#E7F2ED] text-[#1E7B54] border border-[#A8D5C2]' : 'bg-[#FDE8E8] text-[#C93B3B] border border-[#F8B4B4]'
                      }`}>
                        {roommateMsg.text}
                      </div>
                    )}

                    <form onSubmit={handleCreateRoommateGroup} className="space-y-2.5">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-[#627084] block mb-1">Roommate 1 Rank #</label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={roommatePriority1}
                            onChange={(e) => setRoommatePriority1(e.target.value)}
                            placeholder="e.g. 2"
                            className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2.5 py-1.5 text-[#263345] font-mono focus:outline-none focus:ring-1 focus:ring-[#2C8279]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-[#627084] block mb-1">Roommate 2 Rank #</label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={roommatePriority2}
                            onChange={(e) => setRoommatePriority2(e.target.value)}
                            placeholder="e.g. 3"
                            className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2.5 py-1.5 text-[#263345] font-mono focus:outline-none focus:ring-1 focus:ring-[#2C8279]"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 px-3 bg-[#203653] hover:bg-[#17283B] text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send Roommate Proposal
                      </button>
                    </form>
                  </div>

                  {/* Seat Confirmation Box */}
                  {selectedSeatId && (
                    <div className="p-4 bg-[#EBF3FC] rounded-xl border border-[#1D63B8]/30 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#627084]">Target Seat:</span>
                        <span className="font-bold font-mono text-[#1D63B8]">{selectedSeatId}</span>
                      </div>

                      {activeSession && !myAllocation ? (
                        <button
                          onClick={handleConfirmSeat}
                          disabled={loading}
                          className="w-full py-2.5 bg-[#1E7B54] hover:bg-[#166041] text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Confirm Seat Allocation
                        </button>
                      ) : (
                        <div className="text-xs text-[#203653] font-medium text-center py-1">
                          {myAllocation ? 'Seat confirmed.' : 'Seat selected. Confirm when your active turn starts.'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 bg-[#F7F6F1] rounded-xl border border-[#E2E6E8] text-center space-y-2">
                  <Info className="w-6 h-6 mx-auto text-[#627084]" />
                  <div className="text-xs font-semibold text-[#203653]">No Room Selected</div>
                  <p className="text-[11px] text-[#627084] leading-relaxed">
                    Select a room on the floor map to view its beds, live availability, and roommate coordination controls.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Tab 3: 48-Hour Room Change Workflow */}
      {activeSubTab === 'room_change' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-navy-900 tracking-tight flex items-center gap-2">
                <Repeat className="w-5 h-5 text-brand-teal" />
                48-Hour Official Room-Change Window
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Formal room-change request window open for 48 hours following official cycle publication.
              </p>
            </div>

            <div className="px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Standard Window: 48h Post-Publication</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-navy-900 uppercase tracking-wider">Current Confirmed Allocation</div>
              <div className="text-xl font-extrabold text-navy-900 font-mono">
                {myAllocation?.seatId || 'No confirmed allocation'}
              </div>
              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-teal" />
                <span>BVB Block, Floor 2</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-navy-900 uppercase tracking-wider">Existing Request Status</div>
              {roomChangeStatus ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      roomChangeStatus.status === 'APPROVED' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : (roomChangeStatus.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800')
                    }`}>
                      {roomChangeStatus.status}
                    </span>
                    <span className="text-xs text-slate-500">Requested Room: {roomChangeStatus.target_room_number}</span>
                  </div>
                  <p className="text-xs text-slate-600 italic">"{roomChangeStatus.reason}"</p>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  No active room change request submitted. You may submit one request below during the 48-hour window.
                </div>
              )}
            </div>
          </div>

          {!roomChangeStatus && (
            <form onSubmit={handleSubmitRoomChange} className="p-5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider">Submit Room Change Request</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Target Room on Floor 2</label>
                  <select
                    value={roomChangeTargetRoomId}
                    onChange={(e) => setRoomChangeTargetRoomId(e.target.value)}
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-teal"
                  >
                    <option value="">Select target room...</option>
                    {allRooms.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        Room {r.room_number} ({r.available_seats || 0} seats available)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Reason for Room Change</label>
                  <input
                    type="text"
                    value={roomChangeReason}
                    onChange={(e) => setRoomChangeReason(e.target.value)}
                    placeholder="e.g. Academic project collaboration / medical accessibility"
                    required
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-teal"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-brand-teal hover:bg-brand-tealHover text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Room Change Request
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
