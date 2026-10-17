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
  UserCheck,
  Check,
  Filter,
  Search,
  MessageSquare
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Central Complaint Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Unified management for public facility community issues and confidential room complaints.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 bg-brand-teal hover:bg-brand-tealHover text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Raise Complaint
        </button>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search complaints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-teal"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Type:</span>
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
          >
            <option value="ALL">All Types</option>
            <option value="PUBLIC">Public Facilities</option>
            <option value="PRIVATE">Private Confidential</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold ml-2">
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700"
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
        <div className="fixed inset-0 bg-navy-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-navy-900">Submit New Hostel Complaint</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Complaint Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType('PUBLIC')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-2 ${
                      type === 'PUBLIC'
                        ? 'bg-brand-teal text-white border-brand-teal'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    Public Facility
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('PRIVATE')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-2 ${
                      type === 'PRIVATE'
                        ? 'bg-brand-teal text-white border-brand-teal'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Lock className="w-4 h-4" />
                    Private Room
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Issue Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Water dispenser filter replacement"
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-teal"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Detailed Description</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide precise location and problem details..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-teal"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-brand-teal hover:bg-brand-tealHover text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
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
        <div className="fixed inset-0 bg-navy-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-navy-900">Manage Complaint: {selectedComplaint.title}</h3>
              <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Assign Staff Member</label>
                <input
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="e.g. usr_warden_bvb"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Resolution Notes</label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Official resolution actions and notes..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-brand-teal hover:bg-brand-tealHover text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Update Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complaints List */}
      <div className="space-y-3">
        {filtered.map((c) => (
          <div key={c.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      c.type === 'PUBLIC'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-purple-50 text-purple-800 border border-purple-200'
                    }`}
                  >
                    {c.type === 'PUBLIC' ? 'Public Facility' : 'Private Confidential'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Status: <span className="uppercase text-amber-600 font-bold">{c.status}</span>
                  </span>
                  {c.assigned_to && (
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                      Assigned: {c.assigned_to}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-navy-900">{c.title}</h3>
              </div>

              <div className="flex items-center gap-2">
                {c.type === 'PUBLIC' && session?.role === 'STUDENT' && (
                  <button
                    onClick={() => handleVote(c.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-brand-teal" />
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
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition-colors"
                  >
                    Manage
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{c.description}</p>

            {c.resolution_notes && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 mt-2">
                <strong>Resolution Note:</strong> {c.resolution_notes}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
            No complaints found matching the criteria.
          </div>
        )}
      </div>
    </div>
  );
};
