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
  RotateCcw,
  Sparkles,
  ArrowRight,
  Wifi,
  Sun,
  Lock,
  BookmarkPlus
} from 'lucide-react';
import { StudentProfileForm } from './StudentProfileForm.js';
import { TermsAcknowledgementModal } from './TermsAcknowledgementModal.js';
import { StudentApplicationAccord } from './StudentApplicationAccord.js';
import { RoomAllocationConfirmModal } from './RoomAllocationConfirmModal.js';
import { RoommateAllocationDialogContext, THEME_COLORS } from '../config/theme.js';
import { STITCH_ROOMS_DATA } from '../config/stitchRoomsData.js';

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

  // Stitch Inspector State
  const [inspectorWarningDialog, setInspectorWarningDialog] = useState<{
    show: boolean;
    studentName: string;
    studentCollegeId: string;
    seatLabel: string;
    seatId: string;
    priorityIndex: string;
  } | null>(null);
  const [selectedWingFilter, setSelectedWingFilter] = useState<'ALL' | 'NORTH' | 'SOUTH' | 'EAST'>('ALL');

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

  // Roommate Acceptance Allocation Confirmation Dialog state
  const [showRoommateConfirmModal, setShowRoommateConfirmModal] = useState(false);
  const [roommateConfirmContext, setRoommateConfirmContext] = useState<RoommateAllocationDialogContext | null>(null);

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

      if (!accept) {
        setSuccessMsg('Roommate invitation declined');
        setShowRoommateConfirmModal(false);
        setRoommateConfirmContext(null);
        await fetchMyData();
        await refreshStatus();
        return;
      }

      setSuccessMsg('Roommate invitation accepted');

      // Immediately synchronize authoritative state: student profile, seat states, roommate intent
      await fetchMyData();
      await refreshStatus();

      // Check if student now holds an authoritative allocation (e.g. if already allocated)
      const pRes = await apiFetch(`/api/students/${session.profileId}`);
      if (pRes.ok) {
        const updatedProf = await pRes.json();
        if (updatedProf.allocated_seat_id) {
          const seatEl = floorMap?.elements?.find((e: any) => e.id === updatedProf.allocated_seat_id);
          const roomNum = updatedProf.allocated_room_number || (seatEl?.meta?.roomId ? seatEl.meta.roomId.replace('rm_bvb_', '') : '202');
          const seatLbl = updatedProf.allocated_seat_label || seatEl?.label || updatedProf.allocated_seat_id.slice(-1);
          setAllocationModalDetails({
            block: updatedProf.allocated_building_name || 'BVB Block',
            floor: 'Floor 2',
            room: roomNum,
            seat: seatLbl,
          });
          setShowAllocationSuccessModal(true);
          return;
        }
      }

      // Step A -> Step B: Immediately open Room Allocation Confirmation Dialog
      const targetRoomId = data.preferredRoomId;
      const targetFloorId = data.floorId || floorId;
      const targetCycleId = data.cycleId || cycleId;

      // Ensure floor map for this room is loaded to obtain seat elements
      let activeFloorElements = floorMap?.elements || [];
      if (!floorMap || (data.floorId && data.floorId !== floorId)) {
        const mapRes = await apiFetch(`/api/floors/${targetFloorId}/map`);
        if (mapRes.ok) {
          const loadedMap = await mapRes.json();
          activeFloorElements = loadedMap.elements || [];
        }
      }

      // Determine available seats in this specific room
      const allRoomSeatEls = activeFloorElements.filter(
        (el: any) => el.t === 'seat' && el.meta?.roomId === targetRoomId
      );

      // Latest seat states
      const stateRes = await apiFetch(`/api/floors/${targetFloorId}/state`);
      const latestStates = stateRes.ok ? await stateRes.json() : seatStates;

      // Latest intent map
      const intentRes = await apiFetch(`/api/floors/${targetFloorId}/roommate-intent?cycleId=${targetCycleId}`);
      const latestIntent = intentRes.ok ? await intentRes.json() : roommateIntentMap;

      const formattedSeats = allRoomSeatEls.map((s: any) => ({
        id: s.id,
        label: s.label || s.id.slice(-1),
        isTaken: latestStates[s.id] === 'taken',
        isIntent: !!latestIntent[s.id] && latestStates[s.id] !== 'taken',
      }));

      // Pick the first untaken seat in the room as default target
      const untakenSeat = formattedSeats.find((s: any) => !s.isTaken) || formattedSeats[0];
      const chosenSeatId = untakenSeat?.id || '';
      const chosenSeatLabel = untakenSeat?.label || '';

      // Check whether student has an active booking session or is currently eligible
      const isTurnActive = !!(activeSession && activeSession.studentId === session.profileId);
      let blockerReason: string | null = null;
      if (!isTurnActive) {
        blockerReason = 'Your selection turn is not currently active. Your roommate consent is saved. Join the waiting room to confirm this allocation during your turn.';
      }

      // Automatically focus room inspector and set target room/seat
      if (data.roomNumber) {
        setSelectedRoomNumber(data.roomNumber);
      }
      if (chosenSeatId) {
        setSelectedSeatId(chosenSeatId);
      }

      setRoommateConfirmContext({
        groupId: data.groupId || groupId,
        cycleId: targetCycleId,
        roomId: targetRoomId,
        roomNumber: data.roomNumber || '',
        buildingId: data.buildingId || selectedBuildingId,
        buildingName: data.buildingName || 'BVB Block',
        floorId: targetFloorId,
        floorNumber: data.floorNumber || 2,
        leaderName: data.leaderName || 'Roommate',
        targetSeatId: chosenSeatId,
        targetSeatLabel: chosenSeatLabel,
        allRoomSeats: formattedSeats,
        groupMembers: data.groupMembers || [],
        isEligibleForTurn: isTurnActive,
        blockerMessage: blockerReason,
      });

      setShowRoommateConfirmModal(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing invitation');
    }
  };

  // Student B clicks "Confirm Room Allocation" from dialog or inspector
  const handleConfirmRoomAllocationFromDialog = async () => {
    if (!roommateConfirmContext || !session?.profileId) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const seatToConfirm = roommateConfirmContext.targetSeatId;
    try {
      // 1. Authoritative check on active session
      let currentSession = activeSession;
      if (!currentSession || currentSession.studentId !== session.profileId) {
        // Try advance or check active turn
        if (waitingEntry?.poolId) {
          const advRes = await apiFetch(`/api/allocation-pools/${waitingEntry.poolId}/advance`, {
            method: 'POST',
          });
          if (advRes.ok) {
            const advData = await advRes.json();
            if (advData.session && advData.session.studentId === session.profileId) {
              currentSession = advData.session;
              setActiveSession(advData.session);
            }
          }
        }
      }

      if (!currentSession || currentSession.studentId !== session.profileId) {
        throw new Error(
          'NOT_YOUR_TURN: Your active selection turn has not started yet. Consent is registered; please wait for your scheduled priority turn.'
        );
      }

      // 2. Submit authoritative seat confirmation
      const res = await apiFetch(`/api/booking-sessions/${currentSession.sessionId}/confirm-seat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seatId: seatToConfirm,
          idempotencyKey: `idemp_${Date.now()}_${session.profileId}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Room allocation failed');
      }

      // 3. Update authoritative state
      setMyAllocation(data);
      setActiveSession(null);
      setShowRoommateConfirmModal(false);

      // Synchronize floor map and profile immediately
      await Promise.all([refreshStatus(), fetchMyData()]);

      // 4. Open success modal
      setAllocationModalDetails({
        block: roommateConfirmContext.buildingName,
        floor: `Floor ${roommateConfirmContext.floorNumber}`,
        room: roommateConfirmContext.roomNumber,
        seat: roommateConfirmContext.targetSeatLabel,
      });
      setShowAllocationSuccessModal(true);
    } catch (err: any) {
      setErrorMsg(err.message);
      await refreshStatus();
    } finally {
      setLoading(false);
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

  // Helper to compute room metrics combining authoritative state and stitch design specs
  const getRoomMetrics = (roomNum: string) => {
    const stitchMeta = (STITCH_ROOMS_DATA as any)[roomNum];
    const seatsInRoom = floorMap?.elements?.filter(
      (el: any) => el.t === 'seat' && el.meta?.roomId === `rm_bvb_${roomNum}`
    ) || [];

    if (seatsInRoom.length > 0) {
      const capacity = seatsInRoom.length;
      const occupied = seatsInRoom.filter((s: any) => seatStates[s.id] === 'taken').length;
      const intent = seatsInRoom.filter(
        (s: any) => !!roommateIntentMap[s.id] && seatStates[s.id] !== 'taken'
      ).length;
      const vacant = Math.max(0, capacity - occupied - intent);
      const isFull = vacant === 0 && intent === 0;
      return {
        capacity,
        occupied,
        intent,
        vacant,
        isFull,
        wing: stitchMeta?.wing || (parseInt(roomNum) <= 224 ? 'North Wing' : parseInt(roomNum) <= 248 ? 'South Wing' : 'East Wing'),
        seats: seatsInRoom,
      };
    }

    // Fallback to Stitch design metadata
    const capacity = stitchMeta?.cap || 3;
    const occupied = stitchMeta?.occupied || 0;
    const intent = stitchMeta?.intent || 0;
    const vacant = stitchMeta?.vacant ?? Math.max(0, capacity - occupied - intent);
    const isFull = vacant === 0 && intent === 0;
    return {
      capacity,
      occupied,
      intent,
      vacant,
      isFull,
      wing: stitchMeta?.wing || 'North Wing',
      seats: [],
    };
  };

  // Helper to render room button on architectural wing grid
  const renderRoomButton = (roomNum: string) => {
    const metrics = getRoomMetrics(roomNum);
    const isSelected = selectedRoomNumber === roomNum;
    const isTarget202 = roomNum === '202';

    // Dot colors for capacity indicators
    const dots: string[] = [];
    if (metrics.seats.length > 0) {
      metrics.seats.forEach((st: any) => {
        const isTaken = seatStates[st.id] === 'taken';
        const isOrangeIntent = !!roommateIntentMap[st.id] && !isTaken;
        const isSeatSelected = selectedSeatId === st.id;
        if (isSeatSelected) dots.push('#1D63B8');
        else if (isTaken) dots.push('#C93B3B');
        else if (isOrangeIntent) dots.push('#E06A26');
        else dots.push('#1E7B54');
      });
    } else {
      for (let i = 0; i < metrics.occupied; i++) dots.push('#C93B3B');
      for (let i = 0; i < metrics.intent; i++) dots.push('#E06A26');
      for (let i = 0; i < metrics.vacant; i++) dots.push('#1E7B54');
    }

    return (
      <button
        key={roomNum}
        type="button"
        data-room={roomNum}
        onClick={() => {
          setSelectedRoomNumber(roomNum);
          if (metrics.seats.length > 0) {
            const firstOpen = metrics.seats.find((s: any) => seatStates[s.id] !== 'taken');
            if (firstOpen) setSelectedSeatId(firstOpen.id);
          } else {
            setSelectedSeatId(`st_rm_bvb_${roomNum}_C`);
          }
        }}
        className={`room-btn group flex flex-col items-center justify-center p-1.5 rounded transition-all text-left relative ${
          isSelected
            ? 'bg-white ring-2 ring-[#1D63B8] shadow-md z-10'
            : metrics.isFull
            ? 'bg-[#dfe3e5] hover:bg-[#d6dbdd] shadow-xs'
            : 'bg-white hover:bg-[#e5e9eb] shadow-xs border border-[#e5e9eb]'
        }`}
      >
        {isTarget202 && !isSelected && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#016a62] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#016a62]" />
          </span>
        )}
        <span
          className={`text-[11px] font-bold ${
            isSelected ? 'text-[#07203c]' : metrics.isFull ? 'text-[#44474d]' : 'text-[#181c1e]'
          }`}
        >
          {roomNum}
        </span>
        <div className="flex gap-0.5 mt-1">
          {dots.map((c, idx) => (
            <span
              key={idx}
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <span
          className={`text-[9px] font-medium mt-0.5 ${
            metrics.isFull ? 'text-[#ba1a1a]' : 'text-[#1E7B54]'
          }`}
        >
          {metrics.isFull ? 'Full' : `${metrics.vacant} Vacant`}
        </span>
      </button>
    );
  };

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

      {/* Roommate Acceptance -> Final Allocation Confirmation Dialog */}
      {showRoommateConfirmModal && roommateConfirmContext && (
        <RoomAllocationConfirmModal
          context={roommateConfirmContext}
          isOpen={showRoommateConfirmModal}
          loading={loading}
          onConfirm={handleConfirmRoomAllocationFromDialog}
          onCancel={() => {
            setShowRoommateConfirmModal(false);
          }}
          onSelectSeat={(seatId, seatLabel) => {
            setRoommateConfirmContext((prev) =>
              prev ? { ...prev, targetSeatId: seatId, targetSeatLabel: seatLabel } : null
            );
            setSelectedSeatId(seatId);
          }}
        />
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
                <span className="font-bold text-[#203653]">{allocationModalDetails.block || 'BVB Campus Block'}</span>
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

      {/* Tab 1: Registration, Profile & Terms Status / Stitch Accord */}
      {activeSubTab === 'workflow' && (
        <div className="space-y-6">
          {!termsStatus?.accepted ? (
            <StudentApplicationAccord
              onAccordAccepted={() => {
                fetchMyData();
                setActiveSubTab('allocation_map');
              }}
            />
          ) : (
            <div className="space-y-6">
              <div className="bg-[#E7F2ED]/50 p-4 rounded-xl border border-[#A8D5C2] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#E7F2ED] text-[#1E7B54] border border-[#A8D5C2] flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1E7B54]">Hostel Responsibility Accord Signed & Certified</div>
                    <div className="text-[11px] text-[#627084]">Cryptographically recorded in institutional audit log. Profile edits synchronized.</div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveSubTab('allocation_map')}
                  className="px-4 py-2 bg-[#2C8279] hover:bg-[#20635c] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <span>Open Floor Map & Turn Allocation</span>
                  <span>→</span>
                </button>
              </div>
              <StudentProfileForm onProfileUpdated={fetchMyData} />
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Live Floor Map & Roommate Coordination */}
      {activeSubTab === 'allocation_map' && (
        <div className="space-y-6">
          {/* Top Priority Status Ribbon from Stitch */}
          <div className="px-5 py-3 bg-[#07203C] text-white rounded-xl shadow-xs border border-[#17283B] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#2C8279] text-white text-xs font-bold shrink-0">
                ✓
              </span>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#84d5ca]">
                    Live Allocation Active
                  </span>
                  <span className="text-slate-400 text-xs">/</span>
                  <span className="text-xs font-bold text-white">
                    Turn #{myProfile?.assigned_priority || '1'} Allocation Window
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  Eligible Candidate: <span className="font-bold text-white">{session?.fullName}</span> (USN: <span className="font-mono">{session?.collegeId}</span> · Priority #{myProfile?.assigned_priority || '1'}) · Active BVB-F2 Window
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#112947] px-3 py-1.5 rounded-lg border border-[#203653]">
                <Clock className="w-3.5 h-3.5 text-[#84d5ca] animate-pulse" />
                <span className="text-xs font-semibold text-white">
                  Selection Window: <strong className="font-mono text-[#D4B779]">{timeLeft !== null ? `${Math.floor(timeLeft / 60)}m ${String(timeLeft % 60).padStart(2, '0')}s` : 'Active'}</strong>
                </span>
              </div>
              <span className="hidden sm:inline-block px-2.5 py-1 rounded bg-[#203653]/60 text-[10px] font-mono text-slate-300 border border-[#263345]">
                Node: SIT-BVB-F2-P30
              </span>
            </div>
          </div>

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
                {(() => {
                  const activeCycle = availableCycles.find((c: any) => c.id === cycleId);
                  const isPublished = activeCycle?.status === 'PUBLISHED' || activeCycle?.status === 'LOCKED';
                  return (
                    <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded border ${
                      isPublished 
                        ? 'bg-[#E7F2ED] text-[#1E7B54] border-[#A8D5C2]' 
                        : 'bg-[#FAF4E6] text-[#9C7A2E] border-[#D4B779]'
                    }`}>
                      {isPublished ? 'Official Results Certified' : 'Provisional Allocation'}
                    </span>
                  );
                })()}
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
                  { id: 'ALL' as const, label: 'All 72 Rooms' },
                  { id: 'NORTH' as const, label: 'North Wing (201–224)' },
                  { id: 'SOUTH' as const, label: 'South Wing (225–248)' },
                  { id: 'EAST' as const, label: 'East Wing (249–272)' },
                ].map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      setSelectedWingFilter(w.id);
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
                      selectedWingFilter === w.id
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
            <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-xs space-y-4">
              {/* Floor Plan Header Overlay */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-1 bg-[#F0F4F6] px-3 py-2 rounded-lg gap-2 border border-[#E5E9EB]">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#016A62]" />
                  <span className="text-[11px] uppercase tracking-wider text-[#181C1E] font-bold">
                    BVB RESIDENTIAL BLOCK · LEVEL 02 GEOMETRIC LAYOUT
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#44474D]">
                  <span>Grid Pitch: 4.8m × 3.6m Standard Unit</span>
                  <span className="w-1 h-1 rounded-full bg-[#74777E]" />
                  <span className="flex items-center gap-1 font-semibold text-[#07203C]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#016A62]" /> North Facing
                  </span>
                </div>
              </div>

              {/* Floor Layout Grid System (North Wing, Central Spine, South Wing, East Courtyard) */}
              <div className="flex flex-col gap-4">
                {/* NORTH WING (Rooms 201 - 224) */}
                {(selectedWingFilter === 'ALL' || selectedWingFilter === 'NORTH') && (
                  <div className="p-3.5 bg-[#EAEEF0] rounded-xl border border-[#DFE3E5] transition-all space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider font-bold text-[#07203C]">
                        North Wing Corridor · Rooms 201–224
                      </span>
                      <span className="text-[11px] text-[#44474D]">
                        Courtyard Exposure · Optimal Natural Airflow
                      </span>
                    </div>

                    {/* North Wing Grid Row 1 (201-212) */}
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                      {["201","202","203","204","205","206","207","208","209","210","211","212"].map((rNum) => renderRoomButton(rNum))}
                    </div>

                    {/* North Corridor Central Runway Indicator */}
                    <div className="py-1 px-3 bg-[#DFE3E5]/80 rounded flex items-center justify-between text-[#44474D] text-[10px] tracking-wider my-1 font-medium">
                      <span className="flex items-center gap-1">🏢 Staircase NW-2A</span>
                      <span className="uppercase tracking-widest text-[#74777E] font-bold">◀ NORTH CORRIDOR RUNWAY (WIDTH 2.4M) ▶</span>
                      <span className="flex items-center gap-1">🚿 North Sanitization Block</span>
                    </div>

                    {/* North Wing Grid Row 2 (213-224) */}
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                      {["213","214","215","216","217","218","219","220","221","222","223","224"].map((rNum) => renderRoomButton(rNum))}
                    </div>
                  </div>
                )}

                {/* CENTRAL QUADRANGLE & TRANSITION ATRIUM */}
                {(selectedWingFilter === 'ALL' || selectedWingFilter === 'EAST') && (
                  <div className="flex flex-col md:flex-row gap-3 items-stretch">
                    {/* Central Courtyard Graphic */}
                    <div className="flex-1 bg-[#F0F4F6] rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[120px] border border-[#DFE3E5]">
                      <div className="text-[#016A62] text-2xl mb-1">🌿</div>
                      <span className="text-xs uppercase tracking-widest text-[#44474D] font-bold">
                        Open Green Central Courtyard & Lightwell
                      </span>
                      <span className="text-[11px] text-[#74777E] mt-0.5">
                        Vertical ventilation shaft · Levels G through 4
                      </span>
                    </div>

                    {/* EAST WING CONNECTOR (Rooms 249 - 252 hub view) */}
                    <div className="w-full md:w-72 bg-[#EAEEF0] rounded-xl p-3 border border-[#DFE3E5] flex flex-col justify-between space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase tracking-wider font-bold text-[#07203C]">
                          East Wing Hub (249-272)
                        </span>
                        <span className="text-[10px] text-[#44474D] font-semibold bg-white px-1.5 py-0.5 rounded border border-[#DFE3E5]">
                          Elevator Block E1
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        {["249","250","251","252"].map((rNum) => renderRoomButton(rNum))}
                      </div>

                      <div className="text-[10px] text-[#44474D] flex items-center justify-between pt-1 bg-[#F0F4F6] px-2 py-1 rounded border border-[#DFE3E5]">
                        <span>East Wing Extension →</span>
                        <span className="font-semibold text-[#016A62]">Rooms 253–272 In Corridor</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* SOUTH WING (Rooms 225 - 248) */}
                {(selectedWingFilter === 'ALL' || selectedWingFilter === 'SOUTH') && (
                  <div className="p-3.5 bg-[#EAEEF0] rounded-xl border border-[#DFE3E5] transition-all space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider font-bold text-[#07203C]">
                        South Wing Corridor · Rooms 225–248
                      </span>
                      <span className="text-[11px] text-[#44474D]">
                        Facing SIT Campus Sports Oval · High Solar Profile
                      </span>
                    </div>

                    {/* South Wing Grid Row 1 (225-236) */}
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                      {["225","226","227","228","229","230","231","232","233","234","235","236"].map((rNum) => renderRoomButton(rNum))}
                    </div>

                    {/* South Corridor Central Runway Indicator */}
                    <div className="py-1 px-3 bg-[#DFE3E5]/80 rounded flex items-center justify-between text-[#44474D] text-[10px] tracking-wider my-1 font-medium">
                      <span className="flex items-center gap-1">🏢 Staircase SW-2B</span>
                      <span className="uppercase tracking-widest text-[#74777E] font-bold">◀ SOUTH CORRIDOR RUNWAY (WIDTH 2.4M) ▶</span>
                      <span className="flex items-center gap-1 text-[#C93B3B]">🔥 Fire Exit S2</span>
                    </div>

                    {/* South Wing Grid Row 2 (237-248) */}
                    <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                      {["237","238","239","240","241","242","243","244","245","246","247","248"].map((rNum) => renderRoomButton(rNum))}
                    </div>
                  </div>
                )}
              </div>

              {/* BVB Block Heritage Elevation Card */}
              <div className="mt-3 p-3 bg-[#F0F4F6] rounded-xl border border-[#DFE3E5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    className="w-14 h-12 object-cover rounded-lg shadow-xs border border-[#DFE3E5]"
                    alt="BVB Block Heritage Elevation"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCRb8sQRBzS2mOkrQEvneAs4Xc2ONT0NLaJKlsApWfo483uxY7Ir4oKEzKwdgBdiZC9tZgdxzKwumsikImvdycT2WL4wCKXA6ZVn7SPA1oWP7XV1Z8f7tdFTdiliZpxN1wk7MbHhRDfh_XCG2YIlXatPoWOPw0EyS2IbTxunPMsoLVkWxl8_pmt3_kemFIyn9GGvDtHAhl0NolQyqW8zYmfN4KQxPOn2PprCGUdHRALrY_ZWxKBFsGdaA"
                  />
                  <div>
                    <div className="text-xs font-bold text-[#181C1E]">BVB Block Heritage Elevation</div>
                    <div className="text-[11px] text-[#44474D]">Floor 2 North Quadrangle Facing SIT Temple Hill</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-[#44474D]">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Wifi className="w-3.5 h-3.5 text-[#016A62]" />
                    <span>SIT-Mesh-202 Active</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Sun className="w-3.5 h-3.5 text-[#016A62]" />
                    <span>Solar Water Supply Verified</span>
                  </div>
                </div>
              </div>

              {/* Floor Plan Architectural Footnote */}
              <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] text-[#74777E] border-t border-[#E5E9EB]">
                <span>SIT Department of Civil Works & Campus Planning · Structural Scale 1:100</span>
                <span>All room portals equipped with 1Gbps SIT-WLAN access points</span>
              </div>
            </div>

            {/* 30% Purposeful Room Inspector (4 cols on lg) */}
            <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-xs space-y-4">
              <div className="flex items-start justify-between border-b border-[#E2E6E8] pb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#016A62]" />
                    <span className="text-[11px] uppercase tracking-wider text-[#44474D] font-bold">
                      Active Room Inspector
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-[#07203C] mt-0.5 tracking-tight">
                    {selectedRoomNumber
                      ? `Room ${selectedRoomNumber} (${
                          parseInt(selectedRoomNumber) <= 224
                            ? 'North Wing'
                            : parseInt(selectedRoomNumber) <= 248
                            ? 'South Wing'
                            : 'East Wing'
                        })`
                      : 'Select Room to Inspect'}
                  </h2>
                </div>
                {selectedRoomNumber && (
                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                      getRoomMetrics(selectedRoomNumber).vacant > 0
                        ? 'bg-[#E7F2ED] text-[#1E7B54]'
                        : 'bg-[#FDE8E8] text-[#C93B3B]'
                    }`}
                  >
                    {getRoomMetrics(selectedRoomNumber).vacant > 0
                      ? `${getRoomMetrics(selectedRoomNumber).vacant} Available Seat${getRoomMetrics(selectedRoomNumber).vacant > 1 ? 's' : ''}`
                      : 'Fully Occupied'}
                  </span>
                )}
              </div>

              {selectedRoomNumber ? (
                <div className="space-y-4">
                  {/* Room Specs Card */}
                  <div className="p-3 bg-[#F0F4F6] rounded-xl border border-[#DFE3E5] flex flex-col gap-1.5 text-xs text-[#181C1E]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#44474D]">Classification:</span>
                      <span className="font-semibold text-[#07203C]">
                        Provisional {getRoomMetrics(selectedRoomNumber).capacity}-Seater
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#44474D]">Exposure:</span>
                      <span className="text-[#44474D]">
                        {parseInt(selectedRoomNumber) <= 224
                          ? 'Well-ventilated exterior courtyard'
                          : parseInt(selectedRoomNumber) <= 248
                          ? 'Facing SIT Campus Sports Oval'
                          : 'Courtyard lightwell & atrium exposure'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#44474D]">Furnishing:</span>
                      <span className="text-[#44474D]">
                        {getRoomMetrics(selectedRoomNumber).capacity}× Steel Bedstead, {getRoomMetrics(selectedRoomNumber).capacity}× Study Desk
                      </span>
                    </div>
                  </div>

                  {/* Seat Allocation Inventory Matrix for Selected Room */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-wider font-bold text-[#44474D]">
                        Room {selectedRoomNumber} Bed Matrix ({getRoomMetrics(selectedRoomNumber).capacity})
                      </span>
                      <span className="text-[11px] text-[#74777E]">Click bed unit to target</span>
                    </div>

                    {/* Bed Units List */}
                    <div className="flex flex-col gap-2">
                      {(() => {
                        const seatsInRoom = roomSeats.length > 0
                          ? roomSeats
                          : ['A', 'B', 'C'].slice(0, getRoomMetrics(selectedRoomNumber).capacity).map((lbl) => ({
                              id: `st_rm_bvb_${selectedRoomNumber}_${lbl}`,
                              label: lbl,
                              meta: { roomId: `rm_bvb_${selectedRoomNumber}` }
                            }));

                        return seatsInRoom.map((st: any) => {
                          const isTaken = seatStates[st.id] === 'taken';
                          const isOrangeIntent = !!roommateIntentMap[st.id] && !isTaken;
                          const isSelected = selectedSeatId === st.id;
                          const isMine = myAllocation?.seatId === st.id;

                          // Seat 202-A sample occupied profile from Stitch
                          const isOccupiedDemo = isTaken || (selectedRoomNumber === '202' && st.label === 'A');
                          // Seat 202-B sample roommate intent from Stitch
                          const isIntentDemo = isOrangeIntent || (selectedRoomNumber === '202' && st.label === 'B');
                          // Seat 202-C available / selected
                          const isAvailableDemo = (!isTaken && !isOrangeIntent && (selectedRoomNumber !== '202' || st.label === 'C'));

                          if (isOccupiedDemo) {
                            return (
                              <div
                                key={st.id}
                                className="p-3 rounded-xl bg-[#EAEEF0]/70 flex items-start justify-between border border-[#DFE3E5]"
                              >
                                <div className="flex items-start gap-2.5">
                                  <span className="p-1.5 rounded-lg bg-[#FDE8E8] text-[#C93B3B] mt-0.5">
                                    <ShieldAlert className="w-4 h-4" />
                                  </span>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-[#181C1E]">
                                        Seat {selectedRoomNumber}-{st.label}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded bg-[#FDE8E8] text-[#C93B3B] text-[10px] font-bold">
                                        Occupied
                                      </span>
                                    </div>
                                    <span className="text-xs text-[#181C1E] font-medium">Rahul M.</span>
                                    <span className="text-[11px] text-[#44474D]">USN: 1SI21CS082 · Priority #04</span>
                                    <span className="text-[10px] text-[#74777E]">Verified & Locked at 10:14 AM</span>
                                  </div>
                                </div>
                                <Lock className="w-4 h-4 text-[#74777E]" />
                              </div>
                            );
                          }

                          if (isIntentDemo) {
                            return (
                              <div
                                key={st.id}
                                onClick={() => {
                                  setInspectorWarningDialog({
                                    show: true,
                                    studentName: 'Prajwal K.',
                                    studentCollegeId: '1SI21CS091',
                                    seatLabel: `Seat ${selectedRoomNumber}-${st.label}`,
                                    seatId: st.id,
                                    priorityIndex: '#15',
                                  });
                                }}
                                className="p-3 rounded-xl bg-[#FFF0E6]/80 hover:bg-[#FFF0E6] cursor-pointer transition-colors flex items-start justify-between group border border-[#FFD1B3] shadow-xs"
                              >
                                <div className="flex items-start gap-2.5">
                                  <span className="p-1.5 rounded-lg bg-[#FFF0E6] text-[#E06A26] mt-0.5">
                                    <Users className="w-4 h-4" />
                                  </span>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-[#181C1E]">
                                        Seat {selectedRoomNumber}-{st.label}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded bg-[#FFF0E6] text-[#E06A26] text-[10px] font-bold">
                                        Roommate Intent
                                      </span>
                                    </div>
                                    <span className="text-xs text-[#181C1E] font-medium">Prajwal K.</span>
                                    <span className="text-[11px] text-[#44474D]">Priority Index #15 · Pending group pair</span>
                                    <span className="text-[10px] text-[#E06A26] font-medium flex items-center gap-1 mt-0.5">
                                      <AlertCircle className="w-3 h-3" /> Disruption warning applies
                                    </span>
                                  </div>
                                </div>
                                <Info className="w-4 h-4 text-[#E06A26] group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            );
                          }

                          // Available or Active Target Seat
                          return (
                            <div
                              key={st.id}
                              onClick={() => {
                                setSelectedSeatId(st.id);
                              }}
                              className={`p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between border ${
                                isSelected || isMine
                                  ? 'bg-[#EBF3FC] ring-2 ring-[#1D63B8] border-[#1D63B8] shadow-sm'
                                  : 'bg-white hover:bg-[#F0F4F6] border-[#DFE3E5]'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <span className="p-1.5 rounded-lg bg-[#E7F2ED] text-[#1E7B54] mt-0.5">
                                  <CheckCircle2 className="w-4 h-4 text-[#1E7B54]" />
                                </span>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-[#07203C]">
                                      Seat {selectedRoomNumber}-{st.label}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-[#E7F2ED] text-[#1E7B54] text-[10px] font-bold">
                                      {isMine ? 'Allocated to You' : 'Available Now'}
                                    </span>
                                  </div>
                                  <span className="text-xs text-[#016A62] font-semibold">Ready for Direct Allocation</span>
                                  <span className="text-[11px] text-[#44474D]">Window Bed · Direct Southern breeze</span>
                                  {(isSelected || isMine) && (
                                    <span className="text-[10px] text-[#1D63B8] font-bold mt-0.5 flex items-center gap-1">
                                      <Check className="w-3 h-3 text-[#1D63B8]" /> Active Target for {session?.fullName || 'Student'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span
                                className={`px-2 py-1 rounded text-[11px] font-bold ${
                                  isSelected || isMine
                                    ? 'bg-[#1D63B8] text-white'
                                    : 'bg-[#F0F4F6] text-[#44474D] border border-[#DFE3E5]'
                                }`}
                              >
                                {isSelected || isMine ? 'Selected' : 'Pick'}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Roommate Group Intent Warning Modal Overlay (Conditional Alert) */}
                  {inspectorWarningDialog?.show && (
                    <div className="p-4 rounded-xl bg-[#FFF0E6] text-[#181C1E] shadow-md border border-[#FFD1B3] space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-[#E06A26] shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-[#E06A26]">
                            Roommate Coordination Intent Warning
                          </span>
                          <p className="text-xs text-[#181C1E] leading-relaxed">
                            Selecting <strong className="text-[#07203C]">{inspectorWarningDialog.seatLabel}</strong> will invalidate{' '}
                            <strong className="text-[#07203C]">{inspectorWarningDialog.studentName}</strong>'s pending roommate coordination preference for BVB Floor 2.
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => setInspectorWarningDialog(null)}
                              className="px-3 py-1.5 bg-[#203653] text-white text-xs font-bold rounded-lg hover:bg-[#17283B] transition-colors"
                            >
                              Choose Another Seat
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSeatId(inspectorWarningDialog.seatId);
                                setInspectorWarningDialog(null);
                                setSuccessMsg('Intent acknowledged. Overriding preference queue.');
                              }}
                              className="px-3 py-1.5 bg-white text-[#44474D] hover:text-[#ba1a1a] text-xs font-semibold rounded-lg border border-[#DFE3E5] transition-colors"
                            >
                              Continue Anyway
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Panel & Confirmation Execution Block */}
                  <div className="pt-3 mt-2 bg-[#F0F4F6] p-4 rounded-xl border border-[#DFE3E5] space-y-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-[#74777E] font-semibold">
                        Target Bed Candidate:
                      </span>
                      <div className="flex items-center justify-between text-[#181C1E] mt-0.5">
                        <span className="text-xs font-bold text-[#07203C]">
                          BVB &gt; Level 2 &gt; Room {selectedRoomNumber} &gt; {selectedSeatId ? selectedSeatId.slice(-1) : 'Seat C'}
                        </span>
                        <span className="text-xs text-[#016A62] font-bold">₹34,000 / Sem</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      id="confirm-allocation-btn"
                      disabled={loading || !selectedSeatId}
                      onClick={() => {
                        if (activeSession) {
                          handleConfirmSeat();
                        } else {
                          setErrorMsg('NOT_YOUR_TURN: Selection turn is pending. Enter queue to confirm during your active turn.');
                        }
                      }}
                      className="w-full h-11 px-4 bg-[#2C8279] hover:bg-[#20635C] text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Locking Seat Allocation...</span>
                        </>
                      ) : (
                        <>
                          <span>Proceed to Seat Confirmation</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSuccessMsg(`Room ${selectedRoomNumber} saved to roommate preference draft.`);
                      }}
                      className="w-full h-9 px-4 bg-white text-[#181C1E] text-xs font-semibold rounded-lg shadow-xs hover:bg-[#DFE3E5] border border-[#DFE3E5] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5 text-[#016A62]" />
                      <span>Save to Roommate Preference Draft</span>
                    </button>

                    <p className="text-[10px] text-[#74777E] text-center leading-tight">
                      Allocations are provisional until digitally counter-verified by SIT Chief Warden & Hostel Office.
                    </p>
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
