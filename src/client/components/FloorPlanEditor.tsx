import React, { useState, useEffect } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext.js';
import { 
  Building2, 
  Layers, 
  Plus, 
  Save, 
  Send, 
  RotateCcw, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bed,
  Sparkles,
  Move,
  Edit2,
  FileCode,
  LayoutGrid,
  Search,
  Filter,
  Eye,
  Info,
  Compass,
  ArrowRight,
  ShieldCheck,
  Check,
  Building,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { bvbRooms } from '../../inventory/bvbRooms.js';
import { STITCH_ROOMS_DATA } from '../config/stitchRoomsData.js';

interface Element {
  t: 'wall' | 'room' | 'seat' | 'corridor' | 'fixture';
  id?: string;
  label?: string;
  pts?: number[][];
  poly?: number[][];
  pos?: number[];
  size?: number[];
  kind?: string;
  meta?: Record<string, any>;
}

export const FloorPlanEditor: React.FC = () => {
  const { session } = useAuth();
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('bld_bvb');
  const [floors, setFloors] = useState<any[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('flr_bvb_2');
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedElementIndex, setSelectedElementIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // View Mode: 'blueprint' (Stitch Architectural Grid) or 'cad' (Precision Vector SVG Canvas)
  const [viewMode, setViewMode] = useState<'blueprint' | 'cad'>('blueprint');

  // Search and wing filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [wingFilter, setWingFilter] = useState<'all' | 'north' | 'south' | 'east'>('all');

  // Canvas zoom & view controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [cadFilterType, setCadFilterType] = useState<string>('ALL'); // ALL, room, seat, structural

  // Custom Room Modal / Creation State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoomNum, setNewRoomNum] = useState('');
  const [newRoomType, setNewRoomType] = useState<'1' | '2' | '3'>('3');
  const [newRoomWing, setNewRoomWing] = useState<'North Wing' | 'South Wing' | 'East Wing'>('North Wing');
  const [newRoomX, setNewRoomX] = useState<number>(120);
  const [newRoomY, setNewRoomY] = useState<number>(140);
  const [newRoomWidth, setNewRoomWidth] = useState<number>(50);
  const [newRoomHeight, setNewRoomHeight] = useState<number>(30);

  // Selected Room Inspector / Calibration State
  const [activeRoomNum, setActiveRoomNum] = useState<string>('202');
  const [editLabel, setEditLabel] = useState('202');
  const [editCapacity, setEditCapacity] = useState<number>(3);
  const [editX, setEditX] = useState<number>(170);
  const [editY, setEditY] = useState<number>(60);
  const [editW, setEditW] = useState<number>(50);
  const [editH, setEditH] = useState<number>(30);

  // Load buildings
  useEffect(() => {
    apiFetch('/api/buildings').then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        setBuildings(data);
        if (data.length > 0 && !selectedBuilding) {
          setSelectedBuilding(data[0].id);
        }
      }
    });
  }, []);

  // Load floors for building
  useEffect(() => {
    if (selectedBuilding) {
      apiFetch(`/api/buildings/${selectedBuilding}/floors`).then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          setFloors(data);
          if (data.length > 0 && !data.find((f: any) => f.id === selectedFloor)) {
            setSelectedFloor(data[0].id);
          }
        }
      });
    }
  }, [selectedBuilding]);

  // Load floor geometry
  useEffect(() => {
    if (selectedFloor) {
      setLoading(true);
      apiFetch(`/api/floors/${selectedFloor}/map`).then(async (r) => {
        setLoading(false);
        if (r.ok) {
          const map = await r.json();
          if (map.elements && map.elements.length > 0) {
            setElements(map.elements);
          } else {
            // Default load authentic BVB template
            loadDefaultBvbElements();
          }
        } else {
          loadDefaultBvbElements();
        }
      });
    }
  }, [selectedFloor]);

  const loadDefaultBvbElements = () => {
    const templateElements: Element[] = [
      { t: 'wall', pts: [[50, 50], [850, 50]] },
      { t: 'wall', pts: [[850, 50], [850, 600]] },
      { t: 'wall', pts: [[850, 600], [50, 600]] },
      { t: 'wall', pts: [[50, 600], [50, 50]] },
      { t: 'corridor', pts: [[110, 50], [790, 50], [790, 120], [110, 120]] },
      { t: 'corridor', pts: [[110, 530], [790, 530], [790, 600], [110, 600]] },
      { t: 'corridor', pts: [[50, 120], [110, 120], [110, 530], [50, 530]] },
      { t: 'corridor', pts: [[790, 120], [850, 120], [850, 530], [790, 530]] },
      { t: 'corridor', pts: [[430, 140], [470, 140], [470, 500], [430, 500]] },
      { t: 'fixture', kind: 'stairs', poly: [[50, 50], [110, 50], [110, 120], [50, 120]] },
      { t: 'fixture', kind: 'washroom', poly: [[790, 50], [850, 50], [850, 120], [790, 120]] },
    ];

    for (const r of bvbRooms) {
      const roomId = `rm_bvb_${r.roomNumber}`;
      const capacity = parseInt(r.typeCode, 10) || 2;
      const roomType = capacity === 1 ? 'SINGLE' : (capacity === 2 ? 'DOUBLE' : 'TRIPLE');

      templateElements.push({
        t: 'room',
        id: roomId,
        label: r.roomNumber,
        poly: [
          [r.x, r.y],
          [r.x + r.width, r.y],
          [r.x + r.width, r.y + r.height],
          [r.x, r.y + r.height]
        ],
        meta: {
          capacity,
          typeCode: r.typeCode,
          roomType,
          template: true
        }
      });

      const labels = ['A', 'B', 'C'].slice(0, capacity);
      const seatW = Math.max(8, r.width / (capacity + 0.5));
      const seatH = Math.max(8, r.height * 0.7);

      for (let sIdx = 0; sIdx < labels.length; sIdx++) {
        const sLabel = labels[sIdx];
        templateElements.push({
          t: 'seat',
          id: `st_${roomId}_${sLabel}`,
          label: sLabel,
          pos: [r.x + 2 + sIdx * (seatW + 2), r.y + 2],
          size: [seatW, seatH],
          meta: { roomId, template: true }
        });
      }
    }
    setElements(templateElements);
  };

  // Select a room from either blueprint or inspector
  const handleSelectRoomByNum = (rNum: string) => {
    setActiveRoomNum(rNum);
    setEditLabel(rNum);
    const roomElIdx = elements.findIndex((el) => el.t === 'room' && (el.label === rNum || el.id?.endsWith(`_${rNum}`)));
    if (roomElIdx !== -1) {
      setSelectedElementIndex(roomElIdx);
      const el = elements[roomElIdx];
      if (el.poly && el.poly.length >= 3) {
        setEditX(el.poly[0][0]);
        setEditY(el.poly[0][1]);
        setEditW(el.poly[1][0] - el.poly[0][0]);
        setEditH(el.poly[2][1] - el.poly[1][1]);
      }
      setEditCapacity(el.meta?.capacity || 3);
    } else {
      setSelectedElementIndex(null);
      // Fallback from bvbRooms
      const def = bvbRooms.find((r) => r.roomNumber === rNum);
      if (def) {
        setEditX(def.x);
        setEditY(def.y);
        setEditW(def.width);
        setEditH(def.height);
        setEditCapacity(parseInt(def.typeCode, 10) || 3);
      }
    }
  };

  // Sync edit state when an element is clicked on CAD canvas
  useEffect(() => {
    if (selectedElementIndex !== null && elements[selectedElementIndex]) {
      const el = elements[selectedElementIndex];
      setEditLabel(el.label || '');
      if (el.label) {
        setActiveRoomNum(el.label);
      }
      if (el.t === 'room' && el.poly && el.poly.length >= 3) {
        const rx = el.poly[0][0];
        const ry = el.poly[0][1];
        const rw = el.poly[1][0] - el.poly[0][0];
        const rh = el.poly[2][1] - el.poly[1][1];
        setEditX(rx);
        setEditY(ry);
        setEditW(rw);
        setEditH(rh);
        setEditCapacity(el.meta?.capacity || 3);
      } else if (el.t === 'seat' && el.pos && el.size) {
        setEditX(el.pos[0]);
        setEditY(el.pos[1]);
        setEditW(el.size[0]);
        setEditH(el.size[1]);
      }
    }
  }, [selectedElementIndex, elements]);

  // Apply edits to selected element
  const handleApplyEdits = () => {
    if (selectedElementIndex === null || !elements[selectedElementIndex]) {
      // If no CAD element index is selected, find the room by activeRoomNum
      const idx = elements.findIndex((el) => el.t === 'room' && (el.label === activeRoomNum || el.id?.endsWith(`_${activeRoomNum}`)));
      if (idx !== -1) {
        setSelectedElementIndex(idx);
      } else {
        setStatusMessage({ type: 'error', text: `Room ${activeRoomNum} not found in editable element list.` });
        return;
      }
    }

    const targetIdx = selectedElementIndex !== null ? selectedElementIndex : elements.findIndex((el) => el.t === 'room' && el.label === activeRoomNum);
    if (targetIdx === -1) return;

    const updated = [...elements];
    const el = { ...updated[targetIdx] };
    el.label = editLabel;

    if (el.t === 'room') {
      el.poly = [
        [editX, editY],
        [editX + editW, editY],
        [editX + editW, editY + editH],
        [editX, editY + editH]
      ];
      el.meta = {
        ...(el.meta || {}),
        capacity: editCapacity,
        roomType: editCapacity === 1 ? 'SINGLE' : (editCapacity === 2 ? 'DOUBLE' : 'TRIPLE')
      };

      // Automatically adjust child seats inside this room
      const roomId = el.id || `rm_bvb_${el.label}`;
      const childSeats = updated.filter((s) => s.t === 'seat' && s.meta?.roomId === roomId);
      const cap = editCapacity || childSeats.length || 1;
      const seatW = Math.max(8, editW / (cap + 0.5));
      const seatH = Math.max(8, editH * 0.7);
      
      let seatIdx = 0;
      for (let i = 0; i < updated.length; i++) {
        if (updated[i].t === 'seat' && updated[i].meta?.roomId === roomId) {
          updated[i] = {
            ...updated[i],
            pos: [editX + 2 + seatIdx * (seatW + 2), editY + 2],
            size: [seatW, seatH]
          };
          seatIdx++;
        }
      }
    } else if (el.t === 'seat') {
      el.pos = [editX, editY];
      el.size = [editW, editH];
    }

    updated[targetIdx] = el;
    setElements(updated);
    setStatusMessage({ type: 'success', text: `Successfully updated room & CAD bounds for #${el.label || el.id}.` });
  };

  // Delete selected element
  const handleDeleteElement = (index: number) => {
    const el = elements[index];
    if (!el) return;
    if (!confirm(`Are you sure you want to delete ${el.t} "${el.label || el.id}" from floor plan?`)) return;

    let updated = elements.filter((_, i) => i !== index);
    if (el.t === 'room' && el.id) {
      updated = updated.filter((item) => !(item.t === 'seat' && item.meta?.roomId === el.id));
    }
    setElements(updated);
    setSelectedElementIndex(null);
    setStatusMessage({ type: 'success', text: `Deleted ${el.t} "${el.label || el.id}".` });
  };

  // Add custom room with seats
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNum.trim()) return;

    const roomId = `rm_${selectedBuilding.replace('bld_', '')}_${newRoomNum.trim()}`;
    const capacity = parseInt(newRoomType, 10) || 1;
    const roomType = capacity === 1 ? 'SINGLE' : (capacity === 2 ? 'DOUBLE' : 'TRIPLE');

    const newRoom: Element = {
      t: 'room',
      id: roomId,
      label: newRoomNum.trim(),
      poly: [
        [newRoomX, newRoomY],
        [newRoomX + newRoomWidth, newRoomY],
        [newRoomX + newRoomWidth, newRoomY + newRoomHeight],
        [newRoomX, newRoomY + newRoomHeight]
      ],
      meta: {
        capacity,
        typeCode: newRoomType,
        roomType,
        wing: newRoomWing,
        custom: true
      }
    };

    const newSeats: Element[] = [];
    const labels = ['A', 'B', 'C'].slice(0, capacity);
    const seatW = Math.max(8, newRoomWidth / (capacity + 0.5));
    const seatH = Math.max(8, newRoomHeight * 0.7);

    for (let sIdx = 0; sIdx < labels.length; sIdx++) {
      const sLabel = labels[sIdx];
      newSeats.push({
        t: 'seat',
        id: `st_${roomId}_${sLabel}`,
        label: sLabel,
        pos: [newRoomX + 2 + sIdx * (seatW + 2), newRoomY + 2],
        size: [seatW, seatH],
        meta: { roomId, custom: true }
      });
    }

    setElements([...elements, newRoom, ...newSeats]);
    setShowAddModal(false);
    setActiveRoomNum(newRoomNum.trim());
    setNewRoomNum('');
    setStatusMessage({
      type: 'success',
      text: `Created Room ${newRoomNum} (${roomType}) with ${capacity} seat(s) on ${newRoomWing}.`
    });
  };

  // Reset to authentic BVB Template
  const handleLoadBvbTemplate = () => {
    if (elements.length > 0 && !confirm('Reload official BVB Floor 2 CAD Template (Rooms 201–272)? Unsaved changes will be replaced.')) {
      return;
    }
    loadDefaultBvbElements();
    setSelectedElementIndex(null);
    setStatusMessage({
      type: 'success',
      text: `Loaded authentic BVB Floor 2 architecture: 72 rooms (201-272) & standard structural corridors.`
    });
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const geometry = {
        version: 1,
        unit: 'px',
        bounds: [0, 0, 900, 650],
        elements,
      };

      const res = await apiFetch(`/api/floors/${selectedFloor}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geometry }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save draft');

      setStatusMessage({ type: 'success', text: `Draft saved successfully (Version ${data.version}).` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('Publishing this floor plan will make it immutable and authoritative for student allocation. Proceed?')) {
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await apiFetch(`/api/floors/${selectedFloor}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: 1 }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish map');

      setStatusMessage({ type: 'success', text: 'Floor plan geometry successfully published for allocation cycles!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const roomCount = elements.filter((el) => el.t === 'room').length || 72;
  const seatCount = elements.filter((el) => el.t === 'seat').length || 180;
  const activeRoomData = (STITCH_ROOMS_DATA as any)[activeRoomNum] || {
    rNum: activeRoomNum,
    wing: parseInt(activeRoomNum, 10) <= 224 ? 'North Wing' : (parseInt(activeRoomNum, 10) <= 248 ? 'South Wing' : 'East Wing'),
    cap: editCapacity,
    status: 'partial',
    vacant: 1,
    intent: 1,
    occupied: editCapacity > 1 ? editCapacity - 1 : 0
  };

  // Wing helper for blueprint rendering
  const renderRoomCell = (rNum: string, wing: string) => {
    const rData = (STITCH_ROOMS_DATA as any)[rNum] || {
      rNum,
      wing,
      cap: 3,
      status: 'available',
      vacant: 3,
      intent: 0,
      occupied: 0
    };

    const isTarget = activeRoomNum === rNum;
    const isMatchesSearch = searchQuery ? rNum.includes(searchQuery) : true;

    return (
      <button
        key={rNum}
        type="button"
        onClick={() => handleSelectRoomByNum(rNum)}
        className={`group flex flex-col items-center justify-center p-1.5 rounded transition-all text-left relative overflow-hidden ${
          isTarget
            ? 'bg-white ring-2 ring-[#1D63B8] shadow-md -translate-y-0.5'
            : isMatchesSearch
            ? 'bg-white hover:bg-[#eaeef0] shadow-xs border border-[#E2E6E8]'
            : 'bg-white/50 opacity-40 border border-transparent'
        }`}
      >
        {isTarget && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#016A62] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#016A62]"></span>
          </span>
        )}
        <span className={`text-[11px] font-bold ${isTarget ? 'text-[#07203C]' : 'text-[#203653]'}`}>
          {rNum}
        </span>
        <div className="flex gap-0.5 mt-1">
          {Array.from({ length: rData.cap || 3 }).map((_, idx) => {
            let color = '#1E7B54'; // Available
            if (idx < (rData.occupied || 0)) {
              color = '#C93B3B'; // Occupied
            } else if (idx < (rData.occupied || 0) + (rData.intent || 0)) {
              color = '#E06A26'; // Intent
            }
            return (
              <span
                key={idx}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>
        <span className="text-[9px] text-[#627084] font-medium mt-0.5">
          {rData.vacant ?? 1} Vacant
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#F6FAFC] font-sans text-[#181C1E] flex flex-col">
      {/* Top Utility Context Bar */}
      <div className="w-full bg-[#E5E9EB] px-6 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#DFE3E5] text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#016A62] animate-pulse" />
          <span className="font-bold text-[#07203C]">Hostel Office CAD & Spatial Geometry Suite</span>
          <span className="text-[#74777E]">·</span>
          <span className="text-[#44474D]">Active Building: <code className="font-mono text-[#07203C] font-bold">BVB Block (bld_bvb)</code></span>
        </div>
        <div className="flex items-center gap-4 text-[#44474D]">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#016A62]" />
            <span>Grid Pitch: <strong className="text-[#07203C]">4.8m × 3.6m Standard Unit</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#A0F1E6]/50 text-[#005049] px-2 py-0.5 rounded font-semibold text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Authoritative Geometry Lock</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Bar & Executive Action Controls */}
      <div className="px-6 py-4 bg-[#F0F4F6] border-b border-[#E5E9EB] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E7F2ED] text-[#016A62] uppercase tracking-wider">
              Level 02 Geometric Architecture
            </span>
            <span className="text-xs text-[#74777E]">ViewBox: 900 × 650 Canvas</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#07203C] tracking-tight mt-1 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#016A62]" />
            BVB Block — Floor 2 Map Builder & CAD Editor
          </h1>
          <p className="text-xs text-[#44474D] mt-0.5">
            Design, calibrate, and verify physical bed markers and corridor geometry. Synchronized with the student floor map interface.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Switch View Mode: Blueprint vs CAD Precision Canvas */}
          <div className="flex items-center bg-white p-1 rounded-lg border border-[#E2E6E8] shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('blueprint')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'blueprint'
                  ? 'bg-[#07203C] text-white shadow-xs'
                  : 'text-[#44474D] hover:text-[#07203C]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Architectural Blueprint</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cad')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'cad'
                  ? 'bg-[#07203C] text-white shadow-xs'
                  : 'text-[#44474D] hover:text-[#07203C]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Precision CAD Canvas</span>
            </button>
          </div>

          <button
            onClick={handleLoadBvbTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF4E6] hover:bg-[#f3ead3] text-[#9C7A2E] border border-[#D4B779] text-xs font-bold rounded shadow-xs transition-colors"
            title="Load authentic 72-room BVB Floor 2 Layout"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#9C7A2E]" />
            <span>Reset BVB CAD</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E7F2ED] hover:bg-[#d8eadd] text-[#016A62] border border-[#A8D5C2] text-xs font-bold rounded shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Room</span>
          </button>

          <button
            onClick={handleSaveDraft}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#203653] hover:bg-[#17283B] text-white text-xs font-bold rounded shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#016A62] hover:bg-[#0d6f66] text-white text-xs font-bold rounded shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publish Map</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`mx-6 mt-4 p-3.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-[#E7F2ED] text-[#016A62] border border-[#A8D5C2]'
              : 'bg-[#FFDAD6] text-[#93000A] border border-[#FFB4AB]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#016A62] shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#93000A] shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Sub-Header HUD: Bento Statistics & Filters */}
      <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search & Wing Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Room Search */}
          <div className="relative flex items-center min-w-[200px] sm:w-60">
            <Search className="w-4 h-4 text-[#74777E] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter room (e.g. 202)..."
              className="w-full h-9 pl-9 pr-3 bg-white text-[#181C1E] text-xs rounded-lg border border-[#E2E6E8] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#07203C]"
            />
          </div>

          {/* Wing Filters */}
          <div className="flex items-center bg-white p-1 rounded-lg border border-[#E2E6E8] shadow-xs">
            <button
              onClick={() => setWingFilter('all')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                wingFilter === 'all'
                  ? 'bg-[#07203C] text-white'
                  : 'text-[#44474D] hover:text-[#07203C]'
              }`}
            >
              All Wings ({roomCount})
            </button>
            <button
              onClick={() => setWingFilter('north')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                wingFilter === 'north'
                  ? 'bg-[#07203C] text-white'
                  : 'text-[#44474D] hover:text-[#07203C]'
              }`}
            >
              North (201–224)
            </button>
            <button
              onClick={() => setWingFilter('south')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                wingFilter === 'south'
                  ? 'bg-[#07203C] text-white'
                  : 'text-[#44474D] hover:text-[#07203C]'
              }`}
            >
              South (225–248)
            </button>
            <button
              onClick={() => setWingFilter('east')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                wingFilter === 'east'
                  ? 'bg-[#07203C] text-white'
                  : 'text-[#44474D] hover:text-[#07203C]'
              }`}
            >
              East (249–272)
            </button>
          </div>
        </div>

        {/* Bento Statistics Cards */}
        <div className="flex items-center gap-3">
          <div className="bg-white px-3.5 py-1.5 rounded-lg border border-[#E2E6E8] shadow-xs flex items-center gap-2.5">
            <Building className="w-4 h-4 text-[#016A62]" />
            <div>
              <div className="text-[10px] uppercase font-bold text-[#74777E] tracking-wider">Total Rooms</div>
              <div className="text-xs font-extrabold text-[#07203C]">{roomCount} Units</div>
            </div>
          </div>
          <div className="bg-white px-3.5 py-1.5 rounded-lg border border-[#E2E6E8] shadow-xs flex items-center gap-2.5">
            <Bed className="w-4 h-4 text-[#07203C]" />
            <div>
              <div className="text-[10px] uppercase font-bold text-[#74777E] tracking-wider">Configured Beds</div>
              <div className="text-xs font-extrabold text-[#07203C]">{seatCount} Beds</div>
            </div>
          </div>
          {/* Zoom controls */}
          <div className="flex items-center gap-1 border border-[#E2E6E8] rounded-lg p-1 bg-white shadow-xs">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, parseFloat((z - 0.2).toFixed(1))))}
              className="p-1 hover:bg-[#E5E9EB] rounded text-[#44474D]"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold px-1 text-[#07203C]">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.0, parseFloat((z + 0.2).toFixed(1))))}
              className="p-1 hover:bg-[#E5E9EB] rounded text-[#44474D]"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 hover:bg-[#E5E9EB] rounded text-[#74777E] border-l border-[#E2E6E8] ml-0.5"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Builder & Inspector Split View */}
      <div className="flex-1 px-6 pb-12 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3-Columns: Interactive Blueprint / CAD Geometry View */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {viewMode === 'blueprint' ? (
            /* Stitch Multi-Wing Architectural Floor Plan Layout */
            <div className="bg-white rounded-2xl border border-[#E2E6E8] shadow-sm p-6 space-y-6">
              {/* Floor Plan Header Overlay */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E6E8]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E5E9EB] text-[#07203C] uppercase tracking-wider">
                    Interactive Wing Matrix
                  </span>
                  <span className="text-xs font-semibold text-[#44474D]">Click any room unit to inspect and calibrate</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#74777E]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1E7B54]" /> Available
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E06A26]" /> Intent
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C93B3B]" /> Occupied
                  </span>
                </div>
              </div>

              {/* NORTH WING (Rooms 201–224) */}
              {(wingFilter === 'all' || wingFilter === 'north') && (
                <div className="p-4 bg-[#F0F4F6] rounded-xl border border-[#DFE3E5] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#07203C]">
                      North Wing Corridor · Rooms 201–224
                    </span>
                    <span className="text-[11px] text-[#74777E]">Courtyard Exposure · Optimal Natural Airflow</span>
                  </div>
                  {/* Row 1: 201-212 */}
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                    {['201', '202', '203', '204', '205', '206', '207', '208', '209', '210', '211', '212'].map((num) =>
                      renderRoomCell(num, 'North Wing')
                    )}
                  </div>
                  {/* Central Hallway Pathway */}
                  <div className="py-1 px-3 bg-[#DFE3E5] rounded flex items-center justify-between text-[#44474D] text-[10px] font-medium tracking-wider">
                    <span>Staircase NW-2A</span>
                    <span className="uppercase tracking-widest text-[#74777E]">◀ NORTH CORRIDOR RUNWAY (WIDTH 2.4M) ▶</span>
                    <span>North Sanitization Block</span>
                  </div>
                  {/* Row 2: 213-224 */}
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                    {['213', '214', '215', '216', '217', '218', '219', '220', '221', '222', '223', '224'].map((num) =>
                      renderRoomCell(num, 'North Wing')
                    )}
                  </div>
                </div>
              )}

              {/* CENTRAL QUADRANGLE & TRANSITION ATRIUM */}
              {wingFilter === 'all' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-2">
                  <div className="md:col-span-2 p-5 bg-[#E7F2ED] rounded-xl border border-[#A8D5C2] flex items-center justify-center text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="w-8 h-8 rounded-full bg-[#016A62] text-white flex items-center justify-center font-bold text-xs">
                        CQ
                      </span>
                      <span className="text-xs font-bold text-[#07203C] uppercase tracking-wider">
                        Open Green Central Courtyard & Lightwell
                      </span>
                      <span className="text-[11px] text-[#016A62]">
                        Ventilation & Daylight Shaft (Levels G–4) · Non-allocable Architectural Core
                      </span>
                    </div>
                  </div>

                  {/* EAST WING CONNECTOR HUB (Rooms 249-272) */}
                  <div className="p-4 bg-[#F0F4F6] rounded-xl border border-[#DFE3E5] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#07203C]">
                          East Wing Hub
                        </span>
                        <span className="text-[10px] text-[#016A62] font-semibold">Elevator Block E1</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {['249', '250', '251', '252'].map((num) => renderRoomCell(num, 'East Wing'))}
                      </div>
                    </div>
                    <div className="text-[10px] text-[#44474D] flex items-center justify-between mt-3 pt-2 bg-white px-2 py-1 rounded border border-[#E2E6E8]">
                      <span>East Wing Corridor →</span>
                      <span className="font-bold text-[#016A62]">Rooms 253–272</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SOUTH WING (Rooms 225–248) */}
              {(wingFilter === 'all' || wingFilter === 'south') && (
                <div className="p-4 bg-[#F0F4F6] rounded-xl border border-[#DFE3E5] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#07203C]">
                      South Wing Corridor · Rooms 225–248
                    </span>
                    <span className="text-[11px] text-[#74777E]">Facing SIT Campus Sports Oval · High Solar Profile</span>
                  </div>
                  {/* Row 1: 225-236 */}
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                    {['225', '226', '227', '228', '229', '230', '231', '232', '233', '234', '235', '236'].map((num) =>
                      renderRoomCell(num, 'South Wing')
                    )}
                  </div>
                  {/* Central Hallway Pathway */}
                  <div className="py-1 px-3 bg-[#DFE3E5] rounded flex items-center justify-between text-[#44474D] text-[10px] font-medium tracking-wider">
                    <span>Staircase SW-2B</span>
                    <span className="uppercase tracking-widest text-[#74777E]">◀ SOUTH CORRIDOR RUNWAY (WIDTH 2.4M) ▶</span>
                    <span>Fire Exit S2</span>
                  </div>
                  {/* Row 2: 237-248 */}
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                    {['237', '238', '239', '240', '241', '242', '243', '244', '245', '246', '247', '248'].map((num) =>
                      renderRoomCell(num, 'South Wing')
                    )}
                  </div>
                </div>
              )}

              {/* EAST WING FULL DETAIL (if selected in filter) */}
              {wingFilter === 'east' && (
                <div className="p-4 bg-[#F0F4F6] rounded-xl border border-[#DFE3E5] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#07203C]">
                      East Wing Extension · Rooms 249–272
                    </span>
                    <span className="text-[11px] text-[#74777E]">Facing Main Administrative Quadrangle</span>
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                    {Array.from({ length: 24 }, (_, i) => `${249 + i}`).map((num) =>
                      renderRoomCell(num, 'East Wing')
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Precision CAD Vector SVG Canvas Mode (900 × 650) */
            <div className="bg-white rounded-2xl border border-[#E2E6E8] shadow-sm p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E6E8] pb-3 gap-2">
                <div>
                  <span className="text-xs font-bold text-[#07203C] uppercase tracking-wider flex items-center gap-1.5">
                    <LayoutGrid className="w-4 h-4 text-[#016A62]" />
                    SVG CAD Canvas (900 × 650 Projection)
                  </span>
                  <span className="text-[11px] text-[#74777E] block mt-0.5">
                    Click vector polygons or seats to calibrate pixel coordinates and dimensions.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#74777E] font-semibold">Canvas Filter:</span>
                  <select
                    value={cadFilterType}
                    onChange={(e) => setCadFilterType(e.target.value)}
                    className="text-xs bg-[#F0F4F6] border border-[#E2E6E8] rounded px-2 py-1 text-[#07203C] font-semibold"
                  >
                    <option value="ALL">All Elements ({elements.length})</option>
                    <option value="room">Rooms Only ({roomCount})</option>
                    <option value="seat">Seats Only ({seatCount})</option>
                    <option value="structural">Corridors & Fixtures</option>
                  </select>
                </div>
              </div>

              <div className="w-full bg-[#f0f4f6] rounded-xl p-4 overflow-auto min-h-[520px] flex items-center justify-center border border-[#DFE3E5] shadow-inner">
                <div
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.15s ease-out',
                    width: '100%',
                  }}
                >
                  <svg
                    viewBox="0 0 900 650"
                    id="hostel-map-svg"
                    className="w-full max-h-[550px] bg-white rounded-lg shadow-sm select-none"
                  >
                    {/* Outer Perimeter & Structural Outline */}
                    <rect x="0" y="0" width="900" height="650" fill="#f8fafc" />
                    <rect x="50" y="50" width="800" height="550" fill="none" stroke="#c4c6ce" strokeWidth="1.5" rx="6" ry="6" />
                    <rect x="110" y="50" width="680" height="70" fill="#eaeef0" stroke="#c4c6ce" strokeWidth="1" />
                    <rect x="110" y="530" width="680" height="70" fill="#eaeef0" stroke="#c4c6ce" strokeWidth="1" />
                    <rect x="50" y="120" width="60" height="410" fill="#eaeef0" stroke="#c4c6ce" strokeWidth="1" />
                    <rect x="790" y="120" width="60" height="410" fill="#eaeef0" stroke="#c4c6ce" strokeWidth="1" />
                    <rect x="430" y="140" width="40" height="360" fill="#eaeef0" stroke="#c4c6ce" strokeWidth="1" />
                    <rect x="170" y="140" width="260" height="360" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
                    <rect x="470" y="140" width="260" height="360" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
                    <rect x="50" y="50" width="60" height="70" fill="#d1fae5" stroke="#a7f3d0" strokeWidth="1" />
                    <rect x="790" y="50" width="60" height="70" fill="#d1fae5" stroke="#a7f3d0" strokeWidth="1" />

                    {/* Corridors and walls */}
                    {elements.map((el, i) => {
                      if (cadFilterType !== 'ALL' && cadFilterType !== 'structural') return null;
                      if (el.t === 'wall' && el.pts) {
                        const [[x1, y1], [x2, y2]] = el.pts;
                        return (
                          <line
                            key={`wall_${i}`}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#74777e"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        );
                      }
                      if (el.t === 'corridor' && el.pts) {
                        const pts = el.pts.map(([x, y]) => `${x},${y}`).join(' ');
                        return <polygon key={`corridor_${i}`} points={pts} fill="#eaeef0" stroke="#c4c6ce" strokeWidth="1" />;
                      }
                      return null;
                    })}

                    {/* Room Polygons */}
                    {elements.map((el, i) => {
                      if (el.t !== 'room' || !el.poly || el.poly.length < 3) return null;
                      if (cadFilterType !== 'ALL' && cadFilterType !== 'room') return null;

                      const rx = el.poly[0][0];
                      const ry = el.poly[0][1];
                      const rw = el.poly[1][0] - el.poly[0][0];
                      const rh = el.poly[2][1] - el.poly[1][1];
                      const isSelected = selectedElementIndex === i || activeRoomNum === el.label;

                      return (
                        <g
                          key={`room_${i}`}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedElementIndex(i);
                            if (el.label) setActiveRoomNum(el.label);
                          }}
                        >
                          <rect
                            x={rx}
                            y={ry}
                            width={rw}
                            height={rh}
                            rx="3"
                            ry="3"
                            fill={isSelected ? '#07203C' : '#ffffff'}
                            stroke={isSelected ? '#016A62' : '#74777E'}
                            strokeWidth={isSelected ? '2.5' : '1'}
                          />
                          {el.label && (
                            <text
                              x={rx + rw / 2}
                              y={ry + rh / 2}
                              fill={isSelected ? '#ffffff' : '#203653'}
                              fontSize={rw < 45 ? '10' : '12'}
                              fontFamily="Inter, sans-serif"
                              fontWeight={isSelected ? 'bold' : 'normal'}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              pointerEvents="none"
                            >
                              {el.label}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Bed / Seat markers */}
                    {elements.map((el, i) => {
                      if (el.t !== 'seat' || !el.pos || !el.size) return null;
                      if (cadFilterType !== 'ALL' && cadFilterType !== 'seat') return null;

                      const [x, y] = el.pos;
                      const [w, h] = el.size;
                      const isSelected = selectedElementIndex === i;

                      return (
                        <g
                          key={`seat_${i}`}
                          className="cursor-pointer"
                          onClick={() => setSelectedElementIndex(i)}
                        >
                          <rect
                            x={x}
                            y={y}
                            width={w}
                            height={h}
                            rx="2"
                            ry="2"
                            fill={isSelected ? '#1D63B8' : '#016A62'}
                            stroke="#ffffff"
                            strokeWidth="0.8"
                          />
                          <text
                            x={x + w / 2}
                            y={y + h / 2}
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
                    })}
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1-Column: Stitch Active Room Inspector & Geometry Calibrator */}
        <aside className="bg-white rounded-2xl border border-[#E2E6E8] shadow-sm p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Inspector Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#E2E6E8]">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#016A62]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#74777E]">
                    Room CAD Calibrator
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-[#07203C] mt-0.5 tracking-tight">
                  Room {activeRoomNum}
                </h2>
                <span className="text-xs text-[#74777E]">
                  {activeRoomData.wing} · Level 02
                </span>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#E7F2ED] text-[#016A62] text-xs font-bold border border-[#A8D5C2]">
                {activeRoomData.vacant ?? 1} Vacant
              </span>
            </div>

            {/* Room Specifications Card */}
            <div className="p-3.5 bg-[#F0F4F6] rounded-xl border border-[#DFE3E5] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#74777E]">Classification:</span>
                <span className="font-bold text-[#07203C]">
                  {editCapacity === 1 ? 'Single Seater' : editCapacity === 2 ? 'Double Seater' : 'Provisional 3-Seater'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#74777E]">Orientation:</span>
                <span className="font-semibold text-[#07203C]">Well-ventilated courtyard</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#74777E]">CAD Reference:</span>
                <span className="font-mono text-[#016A62] font-semibold">rm_bvb_{activeRoomNum}</span>
              </div>
            </div>

            {/* Bed Matrix Configuration */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#74777E]">
                  Bed Matrix Capacity
                </span>
                <span className="text-xs font-bold text-[#016A62]">{editCapacity} Configured</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => setEditCapacity(cap)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                      editCapacity === cap
                        ? 'bg-[#07203C] text-white border-[#07203C] shadow-xs'
                        : 'bg-[#F0F4F6] text-[#44474D] border-[#E2E6E8] hover:bg-[#E5E9EB]'
                    }`}
                  >
                    {cap === 1 ? '1 Bed (A)' : cap === 2 ? '2 Beds (A-B)' : '3 Beds (A-C)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Dimension & Coordinate Calibration Inputs */}
            <div className="space-y-3 pt-2 border-t border-[#E2E6E8]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#74777E] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#016A62]" />
                  Spatial Bounds (px)
                </span>
                <span className="text-[10px] text-[#74777E] font-mono">CAD Standard</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#181C1E] block mb-1">Display Label</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full text-xs font-bold bg-[#F0F4F6] border border-[#E2E6E8] rounded-lg px-3 py-2 text-[#07203C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-[#44474D] block mb-1">X Position</label>
                  <input
                    type="number"
                    value={editX}
                    onChange={(e) => setEditX(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono bg-[#F0F4F6] border border-[#E2E6E8] rounded-lg px-2.5 py-1.5 text-[#07203C]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#44474D] block mb-1">Y Position</label>
                  <input
                    type="number"
                    value={editY}
                    onChange={(e) => setEditY(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono bg-[#F0F4F6] border border-[#E2E6E8] rounded-lg px-2.5 py-1.5 text-[#07203C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-[#44474D] block mb-1">Width (W)</label>
                  <input
                    type="number"
                    value={editW}
                    onChange={(e) => setEditW(parseFloat(e.target.value) || 10)}
                    className="w-full text-xs font-mono bg-[#F0F4F6] border border-[#E2E6E8] rounded-lg px-2.5 py-1.5 text-[#07203C]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#44474D] block mb-1">Height (H)</label>
                  <input
                    type="number"
                    value={editH}
                    onChange={(e) => setEditH(parseFloat(e.target.value) || 10)}
                    className="w-full text-xs font-mono bg-[#F0F4F6] border border-[#E2E6E8] rounded-lg px-2.5 py-1.5 text-[#07203C]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Triggers */}
          <div className="pt-4 border-t border-[#E2E6E8] space-y-2">
            <button
              type="button"
              onClick={handleApplyEdits}
              className="w-full py-2.5 bg-[#016A62] hover:bg-[#0d6f66] text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Apply Spatial Calibration</span>
            </button>

            {selectedElementIndex !== null && (
              <button
                type="button"
                onClick={() => handleDeleteElement(selectedElementIndex)}
                className="w-full py-2 bg-[#FFDAD6] hover:bg-[#ffcdc7] text-[#93000A] text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Element from Canvas</span>
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Add Custom Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#07203C]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E2E6E8]">
            <div className="flex items-center justify-between border-b border-[#E2E6E8] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#07203C]">Add New Room to Architectural Layout</h3>
                <p className="text-[11px] text-[#74777E]">Configures room bounds and creates matching seat inventory.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#74777E] hover:text-[#07203C] text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#181C1E] block mb-1">Room Number (e.g. 273)</label>
                <input
                  type="text"
                  required
                  value={newRoomNum}
                  onChange={(e) => setNewRoomNum(e.target.value)}
                  placeholder="e.g. 273"
                  className="w-full text-xs bg-[#F0F4F6] border border-[#E2E6E8] rounded-lg px-3 py-2 text-[#07203C]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#181C1E] block mb-1">Corridor Wing</label>
                <select
                  value={newRoomWing}
                  onChange={(e) => setNewRoomWing(e.target.value as any)}
                  className="w-full text-xs bg-[#F0F4F6] border border-[#E2E6E8] rounded-lg px-3 py-2 text-[#07203C]"
                >
                  <option value="North Wing">North Wing Corridor</option>
                  <option value="South Wing">South Wing Corridor</option>
                  <option value="East Wing">East Wing Extension</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#181C1E] block mb-1">Capacity Configuration</label>
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value as any)}
                  className="w-full text-xs bg-[#F0F4F6] border border-[#E2E6E8] rounded-lg px-3 py-2 text-[#07203C]"
                >
                  <option value="1">Type 1 — Single Bed (Seat A)</option>
                  <option value="2">Type 2 — Double Bed (Seats A, B)</option>
                  <option value="3">Type 3 — Triple Bed (Seats A, B, C)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#181C1E] block mb-1">X Coordinate</label>
                  <input
                    type="number"
                    value={newRoomX}
                    onChange={(e) => setNewRoomX(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs bg-[#F0F4F6] border border-[#E2E6E8] rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#181C1E] block mb-1">Y Coordinate</label>
                  <input
                    type="number"
                    value={newRoomY}
                    onChange={(e) => setNewRoomY(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs bg-[#F0F4F6] border border-[#E2E6E8] rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#181C1E] block mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={newRoomWidth}
                    onChange={(e) => setNewRoomWidth(parseInt(e.target.value, 10) || 50)}
                    className="w-full text-xs bg-[#F0F4F6] border border-[#E2E6E8] rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#181C1E] block mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={newRoomHeight}
                    onChange={(e) => setNewRoomHeight(parseInt(e.target.value, 10) || 30)}
                    className="w-full text-xs bg-[#F0F4F6] border border-[#E2E6E8] rounded-lg px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E6E8]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs text-[#74777E] rounded-lg hover:text-[#07203C]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#016A62] hover:bg-[#0d6f66] text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Create & Place Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
