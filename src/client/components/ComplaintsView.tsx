import React, { useState, useEffect } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext.js';
import { 
  AlertCircle, 
  ThumbsUp, 
  Plus, 
  CheckCircle2, 
  Lock, 
  Globe, 
  Loader2 
} from 'lucide-react';

export const ComplaintsView: React.FC = () => {
  const { session } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchComplaints = async () => {
    const res = await apiFetch('/api/complaints');
    if (res.ok) {
      setComplaints(await res.json());
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [session.userId]);

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
          building_id: 'bld_aryabhata',
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-navy-900 tracking-tight flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Hostel Complaint Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Community-driven public facility issues and confidential room complaints.
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

      {/* Complaints List */}
      <div className="space-y-3">
        {complaints.map((c) => (
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
                    {c.type}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Status: <span className="uppercase text-amber-600 font-bold">{c.status}</span>
                  </span>
                </div>
                <h3 className="text-sm font-bold text-navy-900">{c.title}</h3>
              </div>

              {c.type === 'PUBLIC' && session.role === 'STUDENT' && (
                <button
                  onClick={() => handleVote(c.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-brand-teal" />
                  <span>{c.vote_count ?? 0} Votes</span>
                </button>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">{c.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
