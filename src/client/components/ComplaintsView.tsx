import React, { useState, useEffect } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext.js';
import { 
  AlertCircle, 
  ThumbsUp, 
  Plus, 
  CheckCircle2, 
  Lock, 
  Globe, 
  Loader2,
  Filter,
  Search,
  MessageSquare,
  Building2,
  Clock,
  CheckCircle,
  UserCheck,
  Tag,
  ShieldAlert
} from 'lucide-react';

export const ComplaintsView: React.FC = () => {
  const { session } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Staff Assignment / Resolution State
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [assignee, setAssignee] = useState('');
  const [newStatus, setNewStatus] = useState('ASSIGNED');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const isStaff = session?.role && ['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_OFFICE', 'SUPER_ADMIN'].includes(session.role);

  const fetchComplaints = async () => {
    try {
      const res = await apiFetch('/api/complaints');
      if (res.ok) {
        setComplaints(await res.json());
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchComplaints();
  }, [session?.userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await apiFetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          building_id: 'bld_bvb',
          title,
          description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit complaint');

      setMsg({ type: 'success', text: 'Complaint submitted successfully!' });
      setTitle('');
      setDescription('');
      setShowNewModal(false);
      fetchComplaints();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (complaintId: string) => {
    try {
      const res = await apiFetch(`/api/complaints/${complaintId}/vote`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchComplaints();
      }
    } catch (e) {}
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setLoading(true);
    setMsg(null);

    try {
      const res = await apiFetch(`/api/complaints/${selectedComplaint.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          assignedTo: assignee || undefined,
          resolutionNotes: resolutionNotes || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update complaint');
      }

      setMsg({ type: 'success', text: 'Complaint status updated successfully!' });
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Filter complaints
  const filtered = complaints.filter((c) => {
    if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalOpen = complaints.filter(c => c.status === 'OPEN').length;
  const totalAssigned = complaints.filter(c => c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS').length;
  const totalResolved = complaints.filter(c => c.status === 'RESOLVED' || c.status === 'CLOSED').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner matching Stitch Administrative Standard */}
      <div className="bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#2C8279]" />
            <h1 className="text-xl font-bold text-[#203653] tracking-tight">
              {isStaff ? 'Hostel Office Central Complaint Desk' : 'Hostel Resident Complaints & Maintenance'}
            </h1>
            <span className="text-[11px] font-bold bg-[#E7F2ED] text-[#1E7B54] border border-[#A8D5C2] px-2.5 py-0.5 rounded-full">
              BVB Block • Real-Time Desk
            </span>
          </div>
          <p className="text-xs text-[#627084] mt-1">
            {isStaff 
              ? 'Triage public community infrastructure issues and private confidential resident tickets with institutional accountability.' 
              : 'Submit public maintenance issues or confidential private room complaints directly to hostel administration.'}
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 bg-[#2C8279] hover:bg-[#20635c] text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Raise Complaint
        </button>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded text-xs font-medium flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-[#E7F2ED] text-[#1E7B54] border border-[#A8D5C2]'
              : 'bg-[#FDE8E8] text-[#C93B3B] border border-[#F8B4B4]'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#1E7B54] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#C93B3B] shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E6E8] shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#627084]">Open Tickets</div>
          <div className="text-2xl font-bold text-[#E06A26] font-mono">{totalOpen}</div>
          <div className="text-[11px] text-[#627084]">Awaiting initial staff triage or assignment</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E6E8] shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#627084]">In Progress / Assigned</div>
          <div className="text-2xl font-bold text-[#203653] font-mono">{totalAssigned}</div>
          <div className="text-[11px] text-[#2C8279]">Allocated to maintenance technicians / wardens</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E6E8] shadow-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#627084]">Resolved & Closed</div>
          <div className="text-2xl font-bold text-[#1E7B54] font-mono">{totalResolved}</div>
          <div className="text-[11px] text-[#627084]">Verified with documented resolution notes</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E6E8] shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#627084] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tickets by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded pl-8 pr-3 py-1.5 text-[#263345] focus:outline-none focus:ring-1 focus:ring-[#2C8279]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-[#627084] font-semibold">
            <Filter className="w-3.5 h-3.5 text-[#627084]" />
            <span>Type:</span>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2.5 py-1.5 text-[#263345]"
          >
            <option value="ALL">All Types</option>
            <option value="PUBLIC">Public Facilities</option>
            <option value="PRIVATE">Private Confidential</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-[#627084] font-semibold ml-2">
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-2.5 py-1.5 text-[#263345]"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* New Complaint Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-[#203653]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-[#E2E6E8]">
            <div className="flex items-center justify-between border-b border-[#E2E6E8] pb-3">
              <h3 className="text-sm font-bold text-[#203653] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#2C8279]" />
                Submit New Hostel Complaint
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-[#627084] hover:text-[#203653] text-xs">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#263345] block mb-1">Complaint Classification</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType('PUBLIC')}
                    className={`py-2 px-3 text-xs font-semibold rounded border flex items-center justify-center gap-2 transition-colors ${
                      type === 'PUBLIC'
                        ? 'bg-[#2C8279] text-white border-[#2C8279]'
                        : 'bg-[#F7F6F1] text-[#263345] border-[#E2E6E8]'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    Public Facility
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('PRIVATE')}
                    className={`py-2 px-3 text-xs font-semibold rounded border flex items-center justify-center gap-2 transition-colors ${
                      type === 'PRIVATE'
                        ? 'bg-[#2C8279] text-white border-[#2C8279]'
                        : 'bg-[#F7F6F1] text-[#263345] border-[#E2E6E8]'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    Private Room
                  </button>
                </div>
                <p className="text-[10px] text-[#627084] mt-1.5">
                  {type === 'PUBLIC'
                    ? 'Public issues appear on the community board for peer verification and voting.'
                    : 'Private complaints are strictly confidential between you and hostel administration.'}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#263345] block mb-1">Issue Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Water dispenser filter replacement on Floor 2"
                  className="w-full text-xs border border-[#E2E6E8] rounded p-2.5 bg-[#F7F6F1] text-[#263345] focus:outline-none focus:ring-1 focus:ring-[#2C8279]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#263345] block mb-1">Detailed Description & Location</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide precise location, room/floor details, and problem description..."
                  className="w-full text-xs border border-[#E2E6E8] rounded p-2.5 bg-[#F7F6F1] text-[#263345] focus:outline-none focus:ring-1 focus:ring-[#2C8279]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E6E8]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#627084] hover:bg-[#F7F6F1] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#2C8279] hover:bg-[#20635c] text-white text-xs font-bold rounded shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Update & Assign Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-[#203653]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#E2E6E8]">
            <div className="flex items-center justify-between border-b border-[#E2E6E8] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#203653]">Manage Complaint #{selectedComplaint.id.slice(-6)}</h3>
                <p className="text-[11px] text-[#627084] truncate max-w-xs">{selectedComplaint.title}</p>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="text-[#627084] hover:text-[#203653] text-xs">✕</button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#263345] block mb-1">Status Workflow Stage</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-3 py-2 text-[#263345]"
                >
                  <option value="OPEN">OPEN — Awaiting Action</option>
                  <option value="ASSIGNED">ASSIGNED — Assigned to Personnel</option>
                  <option value="IN_PROGRESS">IN_PROGRESS — Remediation Underway</option>
                  <option value="RESOLVED">RESOLVED — Resolved by Staff</option>
                  <option value="CLOSED">CLOSED — Verified & Closed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#263345] block mb-1">Assign Staff / Contractor</label>
                <input
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="e.g. Electrical Maintenance Team / usr_warden_bvb"
                  className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-3 py-2 text-[#263345]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#263345] block mb-1">Official Resolution Notes</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Detail official findings, parts replaced, or corrective maintenance completed..."
                  className="w-full text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-3 py-2 text-[#263345]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E6E8]">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-3 py-1.5 text-xs text-[#627084] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-[#2C8279] hover:bg-[#20635c] text-white text-xs font-bold rounded shadow-xs"
                >
                  Save & Update Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complaints List */}
      <div className="space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      c.type === 'PUBLIC'
                        ? 'bg-[#EBF3FC] text-[#1D63B8] border border-[#B8D5F8]'
                        : 'bg-[#FAF4E6] text-[#9C7A2E] border border-[#D4B779]'
                    }`}
                  >
                    {c.type === 'PUBLIC' ? 'Public Facility' : 'Private Confidential'}
                  </span>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    c.status === 'RESOLVED' || c.status === 'CLOSED'
                      ? 'bg-[#E7F2ED] text-[#1E7B54] border border-[#A8D5C2]'
                      : c.status === 'OPEN'
                      ? 'bg-[#FDE8E8] text-[#C93B3B] border border-[#F8B4B4]'
                      : 'bg-[#FAF4E6] text-[#9C7A2E] border border-[#D4B779]'
                  }`}>
                    {c.status}
                  </span>

                  {/* Staff Author & Room Details */}
                  {isStaff && c.author_name && (
                    <span className="text-[11px] text-[#203653] font-medium bg-[#F7F6F1] px-2 py-0.5 rounded border border-[#E2E6E8]">
                      Author: <span className="font-bold">{c.author_name}</span> ({c.author_college_id || c.author_id})
                    </span>
                  )}

                  {c.room_number && (
                    <span className="text-[11px] text-[#2C8279] font-mono font-bold bg-[#E7F2ED] px-2 py-0.5 rounded border border-[#A8D5C2]">
                      Room {c.room_number}
                    </span>
                  )}

                  {c.assigned_to && (
                    <span className="text-[10px] text-[#627084] bg-[#F7F6F1] border border-[#E2E6E8] px-2 py-0.5 rounded font-mono">
                      Assigned: {c.assigned_to}
                    </span>
                  )}

                  <span className="text-[10px] text-[#627084] font-mono">
                    {new Date(c.created_at).toLocaleString()}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#203653]">{c.title}</h3>
              </div>

              <div className="flex items-center gap-2">
                {c.type === 'PUBLIC' && session?.role === 'STUDENT' && (
                  <button
                    onClick={() => handleVote(c.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F6F1] hover:bg-[#E2E6E8] border border-[#E2E6E8] text-[#263345] text-xs font-semibold rounded transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-[#2C8279]" />
                    <span>{c.vote_count ?? 0} Votes</span>
                  </button>
                )}

                {isStaff && (
                  <button
                    onClick={() => {
                      setSelectedComplaint(c);
                      setNewStatus(c.status);
                      setAssignee(c.assigned_to || '');
                      setResolutionNotes(c.resolution_notes || '');
                    }}
                    className="px-3 py-1 bg-[#203653] hover:bg-[#17283B] text-white text-xs font-semibold rounded transition-colors"
                  >
                    Manage Ticket
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-[#627084] leading-relaxed pt-1">{c.description}</p>

            {c.resolution_notes && (
              <div className="p-2.5 bg-[#E7F2ED] border border-[#A8D5C2] rounded text-[11px] text-[#1E7B54] mt-2 space-y-0.5">
                <span className="font-bold">Staff Resolution Note:</span>
                <p className="italic">{c.resolution_notes}</p>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-xs text-[#627084] bg-white rounded-xl border border-[#E2E6E8]">
            No complaints found matching current filters.
          </div>
        )}
      </div>
    </div>
  );
};

