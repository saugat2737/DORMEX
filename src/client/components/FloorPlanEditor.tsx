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
  LayoutGrid
} from 'lucide-react';
import { bvbRooms } from '../../inventory/bvbRooms.js';

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

  // Canvas zoom & view controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [filterType, setFilterType] = useState<string>('ALL'); // ALL, room, seat, structural

  // Custom Room Modal / Creation State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoomNum, setNewRoomNum] = useState('');
  const [newRoomType, setNewRoomType] = useState<'1' | '2' | '3'>('3');
  const [newRoomX, setNewRoomX] = useState<number>(120);
  const [newRoomY, setNewRoomY] = useState<number>(140);
  const [newRoomWidth, setNewRoomWidth] = useState<number>(50);
  const [newRoomHeight, setNewRoomHeight] = useState<number>(30);

  // Selected Room Inspector / Editor State
  const [editLabel, setEditLabel] = useState('');
  const [editX, setEditX] = useState<number>(0);
  const [editY, setEditY] = useState<number>(0);
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
          setElements(map.elements || []);
          setSelectedElementIndex(null);
        } else {
          setElements([]);
        }
      });
    }
  }, [selectedFloor]);

  // Sync edit state when an element is clicked
  useEffect(() => {
    if (selectedElementIndex !== null && elements[selectedElementIndex]) {
      const el = elements[selectedElementIndex];
      setEditLabel(el.label || '');
      if (el.t === 'room' && el.poly && el.poly.length >= 3) {
        const rx = el.poly[0][0];
        const ry = el.poly[0][1];
        const rw = el.poly[1][0] - el.poly[0][0];
        const rh = el.poly[2][1] - el.poly[1][1];
        setEditX(rx);
        setEditY(ry);
        setEditW(rw);
        setEditH(rh);
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
    if (selectedElementIndex === null || !elements[selectedElementIndex]) return;
    const updated = [...elements];
    const el = { ...updated[selectedElementIndex] };
    el.label = editLabel;

    if (el.t === 'room') {
      el.poly = [
        [editX, editY],
        [editX + editW, editY],
        [editX + editW, editY + editH],
        [editX, editY + editH]
      ];
      // Automatically adjust child seats inside this room
      const roomId = el.id;
      const childSeats = updated.filter((s) => s.t === 'seat' && s.meta?.roomId === roomId);
      const cap = childSeats.length || 1;
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

    updated[selectedElementIndex] = el;
    setElements(updated);
    setStatusMessage({ type: 'success', text: `Updated ${el.t.toUpperCase()} #${el.label || el.id}.` });
  };

  // Delete selected element
  const handleDeleteElement = (index: number) => {
    const el = elements[index];
    if (!el) return;
    if (!confirm(`Are you sure you want to delete ${el.t} "${el.label || el.id}"?`)) return;

    let updated = elements.filter((_, i) => i !== index);
    // If it's a room, delete its child seats as well
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
    setNewRoomNum('');
    setStatusMessage({
      type: 'success',
      text: `Created Room ${newRoomNum} with ${capacity} seat(s) at coordinates [${newRoomX}, ${newRoomY}].`
    });
  };

  // Load standard BVB Floor 2 Template (docs/bvb-floor-2.svg reference)
  const handleLoadBvbTemplate = () => {
    if (elements.length > 0 && !confirm('Load the official BVB Floor 2 Architectural Template (900x650)? This will replace currently unsaved geometry.')) {
      return;
    }

    const templateElements: Element[] = [
      // Corridors and structural outline from docs/bvb-floor-2.svg
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

    // Ingest all 72 rooms from bvbRooms
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
    setSelectedElementIndex(null);
    setStatusMessage({
      type: 'success',
      text: `Loaded authentic BVB Floor 2 architecture: ${bvbRooms.length} rooms (201-272) & standard corridors.`
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

      setStatusMessage({ type: 'success', text: 'Floor plan published successfully for allocation!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const roomCount = elements.filter((el) => el.t === 'room').length;
  const seatCount = elements.filter((el) => el.t === 'seat').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Controls matching Stitch Institutional Deep Navy & Muted Teal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E7F2ED] text-[#2C8279] border border-[#2C8279]/30 uppercase tracking-wider">
              Hostel Office CAD Suite
            </span>
            <span className="text-xs text-[#627084]">ViewBox: 900 × 650 (Standard CAD Projection)</span>
          </div>
          <h1 className="text-xl font-bold text-[#203653] tracking-tight flex items-center gap-2 mt-1">
            <Layers className="w-5 h-5 text-[#2C8279]" />
            Hostel Office 2D Floor Plan Architect & Geometry Maker
          </h1>
          <p className="text-xs text-[#627084] mt-1">
            Fully controllable floor map creator styled after <code className="text-[#203653] font-bold font-mono">bvb-floor-2.svg</code>. Calibrate room markers, configure bed capacities, inspect geometry, and publish authoritative floor maps.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLoadBvbTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#FAF4E6] hover:bg-[#f3ead3] text-[#9C7A2E] border border-[#D4B779] text-xs font-bold rounded shadow-xs transition-colors"
            title="Load authentic 72-room BVB Floor 2 Layout"
          >
            <Sparkles className="w-4 h-4 text-[#9C7A2E]" />
            Load BVB SVG Template
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#E7F2ED] hover:bg-[#d8eadd] text-[#1E7B54] border border-[#A8D5C2] text-xs font-bold rounded shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#203653] hover:bg-[#17283B] text-white text-xs font-bold rounded shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            onClick={handlePublish}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2C8279] hover:bg-[#20635c] text-white text-xs font-bold rounded shadow-xs transition-colors"
          >
            <Send className="w-4 h-4" />
            Publish Map
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-[#E7F2ED] text-[#1E7B54] border border-[#A8D5C2]'
              : 'bg-[#FDE8E8] text-[#C93B3B] border border-[#F8B4B4]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#1E7B54] shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#C93B3B] shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Building & Floor Selector Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E6E8] shadow-xs flex items-center gap-3">
          <Building2 className="w-5 h-5 text-[#2C8279]" />
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold text-[#627084] block tracking-wider">
              Hostel Building / Block
            </label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full text-xs font-bold text-[#203653] mt-0.5 bg-transparent focus:outline-none"
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E6E8] shadow-xs flex items-center gap-3">
          <Layers className="w-5 h-5 text-[#2C8279]" />
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold text-[#627084] block tracking-wider">
              Hostel Floor
            </label>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="w-full text-xs font-bold text-[#203653] mt-0.5 bg-transparent focus:outline-none"
            >
              {floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label || `Floor ${f.floor_number}`}
                </option>
              ))}
              {floors.length === 0 && <option value="flr_bvb_2">Floor 2 (Default)</option>}
            </select>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E6E8] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-[#627084] tracking-wider">Geometry Statistics</div>
            <div className="text-sm font-extrabold text-[#203653] mt-0.5">
              {roomCount} Rooms • {seatCount} Configured Beds
            </div>
          </div>
          <div className="flex items-center gap-1.5 border border-[#E2E6E8] rounded p-1 bg-[#F7F6F1]">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, parseFloat((z - 0.2).toFixed(1))))}
              className="p-1 hover:bg-[#E5E9EB] rounded text-[#263345]"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold px-1 text-[#263345]">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.0, parseFloat((z + 0.2).toFixed(1))))}
              className="p-1 hover:bg-[#E5E9EB] rounded text-[#263345]"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 hover:bg-[#E5E9EB] rounded text-[#627084] border-l border-[#E2E6E8] ml-0.5"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas & Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Interactive SVG Canvas styled identically to bvb-floor-2.svg */}
        <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E6E8] pb-3 gap-2">
            <div>
              <span className="text-xs font-bold text-[#203653] uppercase tracking-wider flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-[#2C8279]" />
                SVG Floor Plan Canvas (900 × 650)
              </span>
              <span className="text-[11px] text-[#627084] block mt-0.5">
                Click any room to calibrate its position, size, and label in the inspector.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#627084] font-semibold">Filter:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2 py-1 text-[#263345] font-semibold"
              >
                <option value="ALL">All Elements ({elements.length})</option>
                <option value="room">Rooms Only ({roomCount})</option>
                <option value="seat">Seats Only ({seatCount})</option>
                <option value="structural">Corridors & Fixtures</option>
              </select>
            </div>
          </div>

          <div className="w-full bg-[#f0f0f0] rounded-xl p-4 overflow-auto min-h-[500px] flex items-center justify-center border border-[#bbb] shadow-inner">
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
                className="w-full max-h-[550px] bg-[#f0f0f0] select-none"
              >
                {/* Structural Corridors and Outer Perimeter matching bvb-floor-2.svg */}
                <rect x="0" y="0" width="900" height="650" fill="#f0f0f0" />
                <rect x="50" y="50" width="800" height="550" fill="none" stroke="#bbb" strokeWidth="1" rx="4" ry="4" />
                <rect x="110" y="50" width="680" height="70" fill="#e0e0e0" stroke="#bbb" strokeWidth="1" />
                <rect x="110" y="530" width="680" height="70" fill="#e0e0e0" stroke="#bbb" strokeWidth="1" />
                <rect x="50" y="120" width="60" height="410" fill="#e0e0e0" stroke="#bbb" strokeWidth="1" />
                <rect x="790" y="120" width="60" height="410" fill="#e0e0e0" stroke="#bbb" strokeWidth="1" />
                <rect x="430" y="140" width="40" height="360" fill="#e0e0e0" stroke="#bbb" strokeWidth="1" />
                <rect x="170" y="140" width="260" height="360" fill="#fafafa" stroke="#ccc" strokeWidth="1" />
                <rect x="470" y="140" width="260" height="360" fill="#fafafa" stroke="#ccc" strokeWidth="1" />
                <rect x="50" y="50" width="60" height="70" fill="#c0e0c0" stroke="#bbb" strokeWidth="1" />
                <rect x="790" y="50" width="60" height="70" fill="#c0e0c0" stroke="#bbb" strokeWidth="1" />

                {/* Additional custom corridors or fixtures drawn */}
                {elements.map((el, i) => {
                  if (filterType !== 'ALL' && filterType !== 'structural') return null;
                  if (el.t === 'wall' && el.pts) {
                    const [[x1, y1], [x2, y2]] = el.pts;
                    return (
                      <line
                        key={`wall_${i}`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#999"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    );
                  }
                  if (el.t === 'corridor' && el.pts) {
                    const pts = el.pts.map(([x, y]) => `${x},${y}`).join(' ');
                    return <polygon key={`corridor_${i}`} points={pts} fill="#e0e0e0" stroke="#bbb" strokeWidth="1" />;
                  }
                  return null;
                })}

                {/* Rooms styled strictly according to bvb-floor-2.svg (.room: fill:#ffffff, stroke:#333) */}
                {elements.map((el, i) => {
                  if (el.t !== 'room' || !el.poly || el.poly.length < 3) return null;
                  if (filterType !== 'ALL' && filterType !== 'room') return null;

                  const rx = el.poly[0][0];
                  const ry = el.poly[0][1];
                  const rw = el.poly[1][0] - el.poly[0][0];
                  const rh = el.poly[2][1] - el.poly[1][1];
                  const isSelected = selectedElementIndex === i;

                  return (
                    <g
                      key={`room_${i}`}
                      className="cursor-pointer"
                      onClick={() => setSelectedElementIndex(i)}
                    >
                      <rect
                        x={rx}
                        y={ry}
                        width={rw}
                        height={rh}
                        rx="3"
                        ry="3"
                        fill={isSelected ? '#203653' : '#ffffff'}
                        stroke={isSelected ? '#2C8279' : '#333333'}
                        strokeWidth={isSelected ? '2' : '1'}
                      />
                      {el.label && (
                        <text
                          x={rx + rw / 2}
                          y={ry + rh / 2}
                          fill={isSelected ? '#ffffff' : '#666666'}
                          fontSize={rw < 45 ? '10' : '12'}
                          fontFamily="Arial, Helvetica, sans-serif"
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

                {/* Seats (Beds) inside rooms styled with high visibility */}
                {elements.map((el, i) => {
                  if (el.t !== 'seat' || !el.pos || !el.size) return null;
                  if (filterType !== 'ALL' && filterType !== 'seat') return null;

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
                        fill={isSelected ? '#1D63B8' : '#2C8279'}
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

        {/* Selected Element Inspector & Calibration Panel */}
        <div className="bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm space-y-4">
          <div className="border-b border-[#E2E6E8] pb-3">
            <h2 className="text-xs font-bold text-[#203653] uppercase tracking-wider flex items-center gap-1.5">
              <Edit2 className="w-4 h-4 text-[#2C8279]" />
              Geometry Inspector
            </h2>
            <p className="text-[11px] text-[#627084] mt-0.5">
              Calibrate coordinates, dimensions, and seat labels.
            </p>
          </div>

          {selectedElementIndex !== null && elements[selectedElementIndex] ? (
            <div className="space-y-3">
              <div className="p-3 bg-[#F7F6F1] rounded-lg border border-[#E2E6E8] space-y-1">
                <div className="text-xs font-bold text-[#203653]">
                  Selected: {elements[selectedElementIndex].t.toUpperCase()}{' '}
                  {elements[selectedElementIndex].label && `(#${elements[selectedElementIndex].label})`}
                </div>
                <div className="text-[10px] font-mono text-[#627084] truncate">
                  ID: {elements[selectedElementIndex].id || `elem_${selectedElementIndex}`}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#263345] block mb-1">Display Label</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2.5 py-1.5 text-[#263345] font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#263345] block mb-1">X Position</label>
                  <input
                    type="number"
                    value={editX}
                    onChange={(e) => setEditX(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2 py-1 text-[#263345] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#263345] block mb-1">Y Position</label>
                  <input
                    type="number"
                    value={editY}
                    onChange={(e) => setEditY(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2 py-1 text-[#263345] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#263345] block mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={editW}
                    onChange={(e) => setEditW(parseFloat(e.target.value) || 10)}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2 py-1 text-[#263345] font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#263345] block mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={editH}
                    onChange={(e) => setEditH(parseFloat(e.target.value) || 10)}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2 py-1 text-[#263345] font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleApplyEdits}
                  className="w-full py-2 bg-[#2C8279] hover:bg-[#20635c] text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Apply Calibration
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteElement(selectedElementIndex)}
                  className="w-full py-1.5 bg-[#FDE8E8] hover:bg-[#fcd2d2] text-[#C93B3B] text-xs font-bold rounded transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Element
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[#627084] bg-[#F7F6F1] rounded-lg border border-[#E2E6E8] space-y-2">
              <Move className="w-6 h-6 text-[#627084] mx-auto opacity-60" />
              <p>Click any room or seat on the canvas to inspect its geometry, coordinates, or adjust its position.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-[#203653]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E2E6E8]">
            <div className="flex items-center justify-between border-b border-[#E2E6E8] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#203653]">Add New Room to Floor Geometry</h3>
                <p className="text-[11px] text-[#627084]">Configures room bounds and creates matching seat inventory.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[#627084] hover:text-[#203653] text-xs font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#263345] block mb-1">Room Number (e.g. 273)</label>
                <input
                  type="text"
                  required
                  value={newRoomNum}
                  onChange={(e) => setNewRoomNum(e.target.value)}
                  placeholder="e.g. 273"
                  className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-3 py-2 text-[#263345]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#263345] block mb-1">Capacity Configuration</label>
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value as any)}
                  className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-3 py-2 text-[#263345]"
                >
                  <option value="1">Type 1 — Single Bed (Seat A)</option>
                  <option value="2">Type 2 — Double Bed (Seats A, B)</option>
                  <option value="3">Type 3 — Triple Bed (Seats A, B, C)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#263345] block mb-1">X Coordinate</label>
                  <input
                    type="number"
                    value={newRoomX}
                    onChange={(e) => setNewRoomX(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#263345] block mb-1">Y Coordinate</label>
                  <input
                    type="number"
                    value={newRoomY}
                    onChange={(e) => setNewRoomY(parseInt(e.target.value, 10) || 0)}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-[#263345] block mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={newRoomWidth}
                    onChange={(e) => setNewRoomWidth(parseInt(e.target.value, 10) || 50)}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#263345] block mb-1">Height (px)</label>
                  <input
                    type="number"
                    value={newRoomHeight}
                    onChange={(e) => setNewRoomHeight(parseInt(e.target.value, 10) || 30)}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6E8]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-[#627084] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#2C8279] hover:bg-[#20635c] text-white text-xs font-bold rounded shadow-xs"
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
