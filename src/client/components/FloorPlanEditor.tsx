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
  Maximize2
} from 'lucide-react';

interface Element {
  t: 'wall' | 'room' | 'seat' | 'corridor' | 'fixture';
  id?: string;
  label?: string;
  pts?: number[][];
  poly?: number[][];
  pos?: number[];
  size?: number[];
  kind?: string;
}

export const FloorPlanEditor: React.FC = () => {
  const { session } = useAuth();
  const [buildings, setBuildings] = useState<any[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('bld_aryabhata');
  const [floors, setFloors] = useState<any[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('flr_aryabhata_1');
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedElementIndex, setSelectedElementIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load buildings
  useEffect(() => {
    apiFetch('/api/buildings').then(async (r) => {
      if (r.ok) {
        const data = await r.json();
        setBuildings(data);
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
          if (data.length > 0) {
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
        } else {
          setElements([]);
        }
      });
    }
  }, [selectedFloor]);

  // Add room helper
  const addRoom = () => {
    const roomNum = prompt('Enter Room Number (e.g. 105):', '105');
    if (!roomNum) return;

    const roomId = `rm_aryabhata_${roomNum}`;
    const newRoom: Element = {
      t: 'room',
      id: roomId,
      label: roomNum,
      poly: [[100, 100], [500, 100], [500, 450], [100, 450]],
    };

    const newSeatA: Element = {
      t: 'seat',
      id: `st_${roomId}_A`,
      label: 'A',
      pos: [140, 160],
      size: [90, 180],
    };

    const newSeatB: Element = {
      t: 'seat',
      id: `st_${roomId}_B`,
      label: 'B',
      pos: [350, 160],
      size: [90, 180],
    };

    setElements([...elements, newRoom, newSeatA, newSeatB]);
    setStatusMessage({ type: 'success', text: `Room ${roomNum} with Seats A & B added to draft.` });
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const geometry = {
        version: 1,
        unit: 'cm',
        bounds: [0, 0, 3000, 1500],
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-teal" />
            2D Floor Plan Maker
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Draw, calibrate, and publish building and floor inventory with authoritative room and seat geometry.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={addRoom}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-navy-800 hover:bg-navy-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            onClick={handlePublish}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-teal hover:bg-brand-tealHover text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Send className="w-4 h-4" />
            Publish Version
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Building & Floor Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <Building2 className="w-5 h-5 text-slate-400" />
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Target Building
            </label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 mt-0.5 bg-transparent focus:outline-none"
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <Layers className="w-5 h-5 text-slate-400" />
          <div className="flex-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Target Floor
            </label>
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 mt-0.5 bg-transparent focus:outline-none"
            >
              {floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label} (Floor {f.floor_number})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Canvas View */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Interactive Structured 2D Geometry
          </span>
          <span className="text-xs text-slate-400 font-mono">Elements: {elements.length}</span>
        </div>

        <div className="w-full bg-slate-900 rounded-lg p-4 overflow-x-auto min-h-[450px] flex items-center justify-center">
          <svg
            viewBox="0 0 3000 1500"
            className="w-full max-h-[500px] border border-slate-700 rounded bg-slate-950 shadow-inner"
          >
            {elements.map((el, i) => {
              if (el.t === 'wall' && el.pts) {
                const [[x1, y1], [x2, y2]] = el.pts;
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#475569"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                );
              }
              if (el.t === 'corridor' && el.pts) {
                const pts = el.pts.map(([x, y]) => `${x},${y}`).join(' ');
                return <polygon key={i} points={pts} fill="#1e293b" stroke="#334155" strokeWidth="2" />;
              }
              if (el.t === 'room' && el.poly) {
                const pts = el.poly.map(([x, y]) => `${x},${y}`).join(' ');
                return (
                  <g key={i}>
                    <polygon
                      points={pts}
                      fill="#0f172a"
                      stroke="#0d9488"
                      strokeWidth="3"
                      className="cursor-pointer hover:fill-slate-800 transition-colors"
                      onClick={() => setSelectedElementIndex(i)}
                    />
                    {el.label && el.poly[0] && (
                      <text
                        x={el.poly[0][0] + 30}
                        y={el.poly[0][1] + 35}
                        fill="#f8fafc"
                        fontSize="22"
                        fontWeight="bold"
                        fontFamily="sans-serif"
                      >
                        {el.label}
                      </text>
                    )}
                  </g>
                );
              }
              if (el.t === 'seat' && el.pos && el.size) {
                const [x, y] = el.pos;
                const [w, h] = el.size;
                return (
                  <g key={i}>
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx="8"
                      fill="#10b981"
                      stroke="#059669"
                      strokeWidth="2"
                    />
                    <text
                      x={x + w / 2}
                      y={y + h / 2 + 7}
                      fill="#ffffff"
                      fontSize="18"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="sans-serif"
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
      </div>
    </div>
  );
};
