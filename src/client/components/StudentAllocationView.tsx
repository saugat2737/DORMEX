import React, { useState, useEffect } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext.js';
import { 
  Clock, 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  Heart, 
  Share2, 
  ShieldAlert,
  Loader2,
  Check,
  Building,
  Bed,
  Info
} from 'lucide-react';

export const StudentAllocationView: React.FC = () => {
  const { session } = useAuth();
  const [cycleId] = useState('cyc_bvb_pilot_2026');
  const [waitingEntry, setWaitingEntry] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [floorId, setFloorId] = useState('flr_bvb_2');
  const [floorMap, setFloorMap] = useState<any>(null);
  const [seatStates, setSeatStates] = useState<Record<string, string>>({});
  const [selectedRoomNumber, setSelectedRoomNumber] = useState<string | null>(null);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [myAllocation, setMyAllocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<any>(null);

  // Load student's own authoritative profile
  const fetchMyProfile = async () => {
    if (session.profileId) {
      try {
        const res = await apiFetch(`/api/students/${session.profileId}`);
        if (res.ok) {
          const prof = await res.json();
          setMyProfile(prof);
        }
      } catch (e) {}
    }
  };

  // Poll waiting room & session state
  const refreshStatus = async () => {
    try {
      if (waitingEntry?.poolId) {
        const advRes = await apiFetch(`/api/allocation-pools/${waitingEntry.poolId}/advance`, {
          method: 'POST',
        });
        if (advRes.ok) {
          const advData = await advRes.json();
          if (advData.session && advData.session.studentId === session.profileId) {
            setActiveSession(advData.session);
          }
        }
      }

      // Refresh seat occupancy
      const stRes = await apiFetch(`/api/floors/${floorId}/state`);
      if (stRes.ok) {
        const st = await stRes.json();
        setSeatStates(st);
      }
    } catch (e) {}
  };

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Active turn countdown ticker
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

  useEffect(() => {
    fetchMyProfile();
    // Load published BVB Floor 2 map
    apiFetch(`/api/floors/${floorId}/map`).then(async (r) => {
      if (r.ok) {
        setFloorMap(await r.json());
      }
    });

    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, [floorId, waitingEntry?.poolId, session.profileId]);

  // Join waiting room
  const handleJoinWaitingRoom = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/api/allocation-cycles/${cycleId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentProfileId: session.profileId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join');
      setWaitingEntry(data);

      // Attempt to advance turn
      const advRes = await apiFetch(`/api/allocation-pools/${data.poolId}/advance`, {
        method: 'POST',
      });
      if (advRes.ok) {
        const advData = await advRes.json();
        if (advData.session && advData.session.studentId === session.profileId) {
          setActiveSession(advData.session);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
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
          idempotencyKey: `idemp_${Date.now()}_${session.profileId}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Seat confirmation failed');

      setMyAllocation(data);
      setSuccessMsg(`Seat ${selectedSeatId} successfully allocated to you!`);
      setActiveSession(null);
      refreshStatus();
    } catch (err: any) {
      setErrorMsg(err.message);
      refreshStatus();
    } finally {
      setLoading(false);
    }
  };

  // Wishlist remaining seat in room
  const handleWishlist = async () => {
    if (!selectedSeatId) return;
    try {
      const res = await apiFetch(`/api/seats/${selectedSeatId}/wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId,
          studentProfileId: session.profileId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Wishlist failed');
      setSuccessMsg('Seat added to your room wishlist preference.');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Invite roommate
  const handleInvite = async () => {
    if (!selectedSeatId) return;
    try {
      const res = await apiFetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleId,
          seatId: selectedSeatId,
          fromStudentId: session.profileId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invite failed');
      setInviteCode(data.inviteCode);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Get seats belonging to currently selected room
  const roomSeats = floorMap?.elements?.filter(
    (el: any) => el.t === 'seat' && el.meta?.roomId === `rm_bvb_${selectedRoomNumber}`
  ) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Student Profile & Pilot Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span>Pilot Scope: BVB Block • Floor 2 (30 Students)</span>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.2 rounded text-[10px]">
              Active Cycle: READY
            </span>
          </div>
          <div className="text-lg font-bold text-navy-900 mt-1 flex flex-wrap items-center gap-2">
            <span>{session.fullName}</span>
            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {session.collegeId}
            </span>
            {myProfile && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                Priority Rank #{myProfile.assigned_priority ?? '—'}
              </span>
            )}
            {myProfile && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                myProfile.eligibility_status === 'ELIGIBLE' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {myProfile.eligibility_status}
              </span>
            )}
          </div>
        </div>

        <div>
          {!waitingEntry && !myAllocation && (
            <button
              onClick={handleJoinWaitingRoom}
              disabled={loading || (myProfile && myProfile.eligibility_status !== 'ELIGIBLE')}
              className="px-4 py-2 bg-brand-teal hover:bg-brand-tealHover text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Enter Pilot Waiting Room
            </button>
          )}

          {waitingEntry && !activeSession && !myAllocation && (
            <div className="flex items-center gap-2 bg-amber-50 text-amber-900 border border-amber-200 px-3.5 py-2 rounded-lg text-xs font-semibold">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>In Queue — Priority Rank #{waitingEntry.priorityNumber}</span>
            </div>
          )}

          {activeSession && !myAllocation && (
            <div className="flex items-center gap-3 bg-emerald-50 text-emerald-900 border border-emerald-200 px-4 py-2 rounded-lg text-xs font-bold shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span>YOUR TURN IS ACTIVE! Selection Window: <span className="font-mono text-emerald-700 text-sm">{timeLeft !== null ? `${timeLeft}s` : '120s'}</span></span>
            </div>
          )}

          {myAllocation && (
            <div className="flex items-center gap-2 bg-blue-50 text-blue-900 border border-blue-200 px-4 py-2 rounded-lg text-xs font-bold">
              <Check className="w-4 h-4 text-blue-600" />
              <span>Allocated: {myAllocation.seatId}</span>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Map Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white px-5 py-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Map Legend:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-white border border-slate-400" />
            <span>Room Marker (SVG Geometry)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-emerald-500" />
            <span>Available Seat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-slate-400" />
            <span>Taken Seat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-blue-600" />
            <span>Selected / Mine</span>
          </div>
        </div>

        <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          * Capacities are provisional demonstration data until hostel confirmation
        </div>
      </div>

      {/* Interactive Map Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Interactive Canvas */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                BVB Block — Floor 2 (Original Floor Plan Geometry: 201..272)
              </div>
              <div className="text-[11px] text-slate-400">
                Click any numbered room marker to view its configured bed inventory. Click a seat to select.
              </div>
            </div>
            {selectedRoomNumber && (
              <span className="text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded">
                Inspecting Room {selectedRoomNumber}
              </span>
            )}
          </div>

          <div className="w-full bg-[#f8fafc] rounded-lg p-3 border border-slate-200 overflow-x-auto min-h-[440px] flex items-center justify-center">
            {floorMap && (
              <svg viewBox="0 0 900 650" className="w-full max-h-[500px] border border-slate-300 rounded shadow-inner bg-[#f0f0f0]">
                {/* Structural Background Walls & Corridors */}
                <rect x="50" y="50" width="800" height="550" fill="none" stroke="#bbb" strokeWidth="1" rx="4" ry="4"/>
                <rect x="110" y="50" width="680" height="70" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"/>
                <rect x="110" y="530" width="680" height="70" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"/>
                <rect x="50" y="120" width="60" height="410" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"/>
                <rect x="790" y="120" width="60" height="410" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"/>
                <rect x="430" y="140" width="40" height="360" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1"/>
                <rect x="170" y="140" width="260" height="360" fill="#fafafa" stroke="#cbd5e1" strokeWidth="1"/>
                <rect x="470" y="140" width="260" height="360" fill="#fafafa" stroke="#cbd5e1" strokeWidth="1"/>
                <rect x="50" y="50" width="60" height="70" fill="#c0e0c0" stroke="#cbd5e1" strokeWidth="1"/>
                <rect x="790" y="50" width="60" height="70" fill="#c0e0c0" stroke="#cbd5e1" strokeWidth="1"/>

                {/* Rooms and Seats from Authoritative JSON */}
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
                    const isSelected = selectedSeatId === el.id;
                    const isMine = myAllocation?.seatId === el.id;

                    let fillColor = '#10b981'; // available
                    if (isTaken) fillColor = '#94a3b8'; // taken
                    if (isSelected || isMine) fillColor = '#2563eb'; // selected/mine

                    return (
                      <g
                        key={`seat_${i}`}
                        className="cursor-pointer"
                        onClick={() => {
                          if (!isTaken) {
                            setSelectedSeatId(el.id);
                            if (el.meta?.roomId) {
                              setSelectedRoomNumber(el.meta.roomId.replace('rm_bvb_', ''));
                            }
                          }
                        }}
                      >
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          rx="2"
                          fill={fillColor}
                          stroke={isSelected ? '#1d4ed8' : '#334155'}
                          strokeWidth={isSelected ? '1.5' : '0.5'}
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
            )}
          </div>
        </div>

        {/* Room & Seat Action Panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="text-xs font-bold text-navy-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            Configured Bed Inventory & Selection
          </div>

          {/* Inspected Room Details */}
          {selectedRoomNumber ? (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Physical Room</span>
                  <div className="text-lg font-bold text-navy-900">Room {selectedRoomNumber}</div>
                </div>
                <span className="text-[10px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                  BVB Block • Floor 2
                </span>
              </div>

              {/* Beds list inside room */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-600">Configured Seats inside Room:</div>
                <div className="grid grid-cols-1 gap-2">
                  {roomSeats.map((st: any) => {
                    const isTaken = seatStates[st.id] === 'taken';
                    const isSelected = selectedSeatId === st.id;
                    const isMine = myAllocation?.seatId === st.id;

                    return (
                      <div
                        key={st.id}
                        onClick={() => !isTaken && setSelectedSeatId(st.id)}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected || isMine
                            ? 'bg-blue-50 border-blue-400 text-blue-900'
                            : isTaken
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-white border-slate-200 hover:border-brand-teal text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Bed className="w-4 h-4 text-slate-500" />
                          <span className="font-mono font-bold">Seat {st.label}</span>
                          <span className="text-[10px] font-mono text-slate-400">({st.id})</span>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isMine 
                            ? 'bg-blue-600 text-white' 
                            : isTaken 
                            ? 'bg-slate-200 text-slate-500' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isMine ? 'Allocated to You' : (isTaken ? 'Occupied' : 'Available')}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs text-slate-500 space-y-1">
              <Info className="w-5 h-5 mx-auto text-slate-400" />
              <div>Click any room marker on the floor plan above to inspect its seats.</div>
            </div>
          )}

          {/* Selected Seat Confirmation Panel */}
          {selectedSeatId ? (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-1">
                <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Target Selected Seat</div>
                <div className="text-base font-bold text-emerald-950 font-mono">{selectedSeatId}</div>
                <div className="text-xs text-emerald-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>BVB Block, Floor 2, Room {selectedRoomNumber}</span>
                </div>
              </div>

              {/* Confirm Button */}
              {activeSession && !myAllocation && (
                <button
                  onClick={handleConfirmSeat}
                  disabled={loading}
                  className="w-full py-2.5 bg-brand-teal hover:bg-brand-tealHover text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Seat Allocation
                </button>
              )}

              {!activeSession && !myAllocation && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                  Seat selected. You can confirm this allocation when your priority turn becomes active.
                </div>
              )}

              {/* Wishlist & Invite options */}
              {myAllocation && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={handleWishlist}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    Wishlist for Roommate
                  </button>
                  <button
                    onClick={handleInvite}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-500" />
                    Generate Invite Code
                  </button>

                  {inviteCode && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-900 space-y-1">
                      <div className="font-bold">One-Hop Roommate Invite Code:</div>
                      <div className="font-mono text-sm font-bold text-blue-700 bg-white px-2 py-1 rounded text-center select-all">
                        {inviteCode}
                      </div>
                      <div className="text-[10px] text-blue-600">
                        Share this code with your roommate. Priority ranks remain completely confidential.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
