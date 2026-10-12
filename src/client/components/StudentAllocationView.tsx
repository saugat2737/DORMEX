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
  Building
} from 'lucide-react';

export const StudentAllocationView: React.FC = () => {
  const { session } = useAuth();
  const [cycleId] = useState('cyc_fall_2026');
  const [waitingEntry, setWaitingEntry] = useState<any>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [floorId, setFloorId] = useState('flr_aryabhata_1');
  const [floorMap, setFloorMap] = useState<any>(null);
  const [seatStates, setSeatStates] = useState<Record<string, string>>({});
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [myAllocation, setMyAllocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

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

  useEffect(() => {
    // Initial map load
    apiFetch(`/api/floors/${floorId}/map`).then(async (r) => {
      if (r.ok) {
        setFloorMap(await r.json());
      }
    });

    const interval = setInterval(refreshStatus, 3000);
    return () => clearInterval(interval);
  }, [floorId, waitingEntry?.poolId]);

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
          idempotencyKey: `idemp_${Date.now()}`,
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Turn & Waiting Room Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Cycle: Fall 2026 Academic Allocation
          </div>
          <div className="text-lg font-bold text-navy-900 mt-0.5 flex items-center gap-2">
            <span>Student: {session.fullName}</span>
            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              {session.collegeId}
            </span>
          </div>
        </div>

        <div>
          {!waitingEntry && !myAllocation && (
            <button
              onClick={handleJoinWaitingRoom}
              disabled={loading}
              className="px-4 py-2 bg-brand-teal hover:bg-brand-tealHover text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Enter Waiting Room
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
              <span>YOUR TURN IS ACTIVE! Selection Window: 120s</span>
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
      <div className="flex flex-wrap items-center gap-4 bg-white px-5 py-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-emerald-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-slate-400" />
          <span>Taken</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-rose-500" />
          <span>Blocked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-blue-600" />
          <span>Selected / Mine</span>
        </div>
      </div>

      {/* Interactive Map Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Interactive Canvas */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="text-xs font-bold text-navy-900 uppercase tracking-wider">
              Aryabhata Boys Hall — Floor 1 (Live Map)
            </div>
            <div className="text-[11px] text-slate-400">Click an available seat to inspect & select</div>
          </div>

          <div className="w-full bg-slate-900 rounded-lg p-4 overflow-x-auto min-h-[420px] flex items-center justify-center">
            {floorMap && (
              <svg viewBox="0 0 3000 1500" className="w-full max-h-[460px] border border-slate-800 rounded bg-slate-950">
                {floorMap.elements?.map((el: any, i: number) => {
                  if (el.t === 'wall' && el.pts) {
                    const [[x1, y1], [x2, y2]] = el.pts;
                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth="10" strokeLinecap="round" />;
                  }
                  if (el.t === 'corridor' && el.pts) {
                    const pts = el.pts.map(([x, y]: any) => `${x},${y}`).join(' ');
                    return <polygon key={i} points={pts} fill="#1e293b" stroke="#334155" strokeWidth="2" />;
                  }
                  if (el.t === 'room' && el.poly) {
                    const pts = el.poly.map(([x, y]: any) => `${x},${y}`).join(' ');
                    return (
                      <g key={i}>
                        <polygon points={pts} fill="#0f172a" stroke="#0d9488" strokeWidth="3" />
                        {el.label && el.poly[0] && (
                          <text x={el.poly[0][0] + 30} y={el.poly[0][1] + 35} fill="#f8fafc" fontSize="22" fontWeight="bold">
                            {el.label}
                          </text>
                        )}
                      </g>
                    );
                  }
                  if (el.t === 'seat' && el.pos && el.size) {
                    const [x, y] = el.pos;
                    const [w, h] = el.size;
                    const isTaken = seatStates[el.id] === 'taken';
                    const isSelected = selectedSeatId === el.id;
                    const isMine = myAllocation?.seatId === el.id;

                    let fillColor = '#10b981';
                    if (isTaken) fillColor = '#64748b';
                    if (isSelected || isMine) fillColor = '#2563eb';

                    return (
                      <g key={i} className="cursor-pointer" onClick={() => !isTaken && setSelectedSeatId(el.id)}>
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          rx="8"
                          fill={fillColor}
                          stroke={isSelected ? '#93c5fd' : '#1e293b'}
                          strokeWidth={isSelected ? '5' : '2'}
                          className="transition-all hover:opacity-90"
                        />
                        <text x={x + w / 2} y={y + h / 2 + 7} fill="#ffffff" fontSize="18" fontWeight="bold" textAnchor="middle">
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

        {/* Seat Action Panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="text-xs font-bold text-navy-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            Seat Selection Panel
          </div>

          {selectedSeatId ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Target Bed</div>
                <div className="text-base font-bold text-navy-900 font-mono">{selectedSeatId}</div>
                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-teal" />
                  <span>Aryabhata Hall, Floor 1</span>
                </div>
                <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md inline-block">
                  Status: Available
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
                      <div className="font-bold">One-Hop Invite Code:</div>
                      <div className="font-mono text-sm font-bold text-blue-700 bg-white px-2 py-1 rounded text-center select-all">
                        {inviteCode}
                      </div>
                      <div className="text-[10px] text-blue-600">
                        Share this one-time code with your intended roommate. Priority numbers remain strictly hidden.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs space-y-2 border-2 border-dashed border-slate-200 rounded-lg">
              <Building className="w-8 h-8 mx-auto text-slate-300" />
              <div>No seat selected.</div>
              <div className="text-[11px] text-slate-400">Click any available green bed on the interactive floor map.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
