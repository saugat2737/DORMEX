import React, { useState, useEffect } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext.js';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Filter, 
  Edit2, 
  Save, 
  X,
  Bed,
  Building
} from 'lucide-react';

export const StudentRegistryView: React.FC = () => {
  const { session } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [quotaFilter, setQuotaFilter] = useState('');
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editPriority, setEditPriority] = useState<number>(1);
  const [editEligibility, setEditEligibility] = useState<string>('ELIGIBLE');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isStaff = session?.role ? ['WARDEN', 'CHIEF_WARDEN', 'HOSTEL_OFFICE', 'SUPER_ADMIN'].includes(session.role) : false;
  const canEditPriority = session?.role ? ['HOSTEL_OFFICE', 'SUPER_ADMIN'].includes(session.role) : false;

  const fetchStudents = async () => {
    try {
      const q = new URLSearchParams();
      if (search) q.append('search', search);
      if (quotaFilter) q.append('quota', quotaFilter);

      const res = await apiFetch(`/api/students?${q.toString()}`);
      if (res.ok) {
        setStudents(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, quotaFilter]);

  const handleStartEdit = (stu: any) => {
    setEditingStudent(stu);
    setEditPriority(stu.assigned_priority ?? stu.live_priority ?? 1);
    setEditEligibility(stu.eligibility_status);
    setActionMsg(null);
  };

  const handleVerifyFee = async (stuId: string, status: 'VERIFIED' | 'REJECTED') => {
    setActionMsg(null);
    try {
      const res = await apiFetch(`/api/students/${stuId}/verify-fee`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          verifiedPaymentTimestamp: new Date().toISOString(),
          eligibilityStatus: status === 'VERIFIED' ? 'ELIGIBLE' : 'FEE_PENDING',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Fee verification failed');
      }
      setActionMsg({ type: 'success', text: `Fee status successfully updated to ${status}!` });
      fetchStudents();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  const handleRecalculatePriorities = async () => {
    setActionMsg(null);
    try {
      const res = await apiFetch('/api/students/recalculate-priorities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYear: 2, quotaCategory: 'GENERAL' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Priority recalculation failed');
      }
      const data = await res.json();
      setActionMsg({ type: 'success', text: `Chronological fee priority ordering applied to ${data.updatedCount} records!` });
      fetchStudents();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    setActionMsg(null);
    try {
      // 1. Update eligibility if changed
      if (editingStudent.eligibility_status !== editEligibility) {
        const elRes = await apiFetch(`/api/students/${editingStudent.id}/eligibility`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: editEligibility }),
        });
        if (!elRes.ok) {
          const err = await elRes.json();
          throw new Error(err.error || 'Failed to update eligibility');
        }
      }

      // 2. Update priority if changed and authorized
      if (canEditPriority && editingStudent.assigned_priority !== editPriority) {
        const prRes = await apiFetch(`/api/students/${editingStudent.id}/priority`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: editPriority }),
        });
        if (!prRes.ok) {
          const err = await prRes.json();
          throw new Error(err.error || 'Failed to update priority');
        }
      }

      setActionMsg({ type: 'success', text: `Updated record for ${editingStudent.full_name} successfully!` });
      setEditingStudent(null);
      fetchStudents();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-teal" />
            <h1 className="text-xl font-bold text-navy-900 tracking-tight">
              BVB Pilot Student Registry
            </h1>
            <span className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full">
              30 Demo Records Seeded
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official demonstration registry for BVB Block pilot. Staff-authorized eligibility and priority management.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEditPriority && (
            <button
              onClick={handleRecalculatePriorities}
              className="px-3 py-1.5 bg-brand-teal hover:bg-brand-tealHover text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              Recalculate Priorities by Fee Timestamp
            </button>
          )}
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200 font-mono">
            Active Dataset: DEMO-001 - DEMO-030
          </span>
        </div>
      </div>

      {actionMsg && (
        <div className={`p-3.5 border rounded-lg text-xs font-medium flex items-center gap-2 ${
          actionMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {actionMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name or DEMO ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-teal"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={quotaFilter}
            onChange={(e) => setQuotaFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-teal"
          >
            <option value="">All Quotas</option>
            <option value="GENERAL">General</option>
            <option value="MERIT">Merit</option>
            <option value="SPORTS">Sports</option>
            <option value="PWD">PwD</option>
          </select>
        </div>
      </div>

      {/* Student Registry Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200 tracking-wider">
              <tr>
                <th className="py-3 px-4">Priority Rank</th>
                <th className="py-3 px-4">College ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Fee Status</th>
                <th className="py-3 px-4">Dept / Year</th>
                <th className="py-3 px-4">Quota</th>
                <th className="py-3 px-4">Eligibility</th>
                <th className="py-3 px-4">Allocation Status</th>
                <th className="py-3 px-4 text-right">Staff Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((stu) => {
                const priority = stu.assigned_priority ?? stu.live_priority ?? '—';
                const isEligible = stu.eligibility_status === 'ELIGIBLE';
                const isAllocated = stu.allocated_seat_id;
                const isFeeVerified = stu.fee_status === 'VERIFIED';

                return (
                  <tr key={stu.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px]">
                        #{priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {stu.college_id}
                    </td>
                    <td className="py-3 px-4 font-bold text-navy-900">
                      {stu.full_name}
                      <div className="text-[10px] text-slate-400 font-normal font-mono">{stu.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isFeeVerified 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : (stu.fee_status === 'SUBMITTED' 
                              ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                              : 'bg-rose-50 text-rose-800 border border-rose-200')
                      }`}>
                        {stu.fee_status || 'UNPAID'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {stu.department} • Year {stu.academic_year}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {stu.quota_category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isEligible 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : (stu.eligibility_status === 'PENDING' 
                              ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                              : 'bg-rose-50 text-rose-800 border border-rose-200')
                      }`}>
                        {stu.eligibility_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isAllocated ? (
                        <div className="flex items-center gap-1.5 text-blue-700 font-semibold font-mono text-[11px]">
                          <Bed className="w-3.5 h-3.5" />
                          <span>{stu.allocated_seat_id}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not Allocated</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      {isStaff && stu.fee_status !== 'VERIFIED' && (
                        <button
                          onClick={() => handleVerifyFee(stu.id, 'VERIFIED')}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded transition-colors"
                        >
                          Verify Fee
                        </button>
                      )}
                      {isStaff && (
                        <button
                          onClick={() => handleStartEdit(stu)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition-colors inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-navy-900">
                  Staff Verification & Priority Assignment
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {editingStudent.full_name} ({editingStudent.college_id})
                </p>
              </div>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Eligibility Status
                </label>
                <select
                  value={editEligibility}
                  onChange={(e) => setEditEligibility(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-brand-teal"
                >
                  <option value="ELIGIBLE">ELIGIBLE (Staff Verified)</option>
                  <option value="PENDING">PENDING (Documents Awaiting)</option>
                  <option value="FEE_PENDING">FEE_PENDING (Hostel Dues Awaiting)</option>
                  <option value="INELIGIBLE">INELIGIBLE</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Authoritative Priority Rank (1 = Highest)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  disabled={!canEditPriority}
                  value={editPriority}
                  onChange={(e) => setEditPriority(parseInt(e.target.value, 10) || 1)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-brand-teal disabled:opacity-60"
                />
                {!canEditPriority && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    * Priority modification requires Hostel Office or Super Admin authorization.
                  </p>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1">
                <div><strong>Quota:</strong> {editingStudent.quota_category}</div>
                <div><strong>Department:</strong> {editingStudent.department} (Academic Year {editingStudent.academic_year})</div>
                <div><strong>Allocation:</strong> {editingStudent.allocated_seat_id || 'None'}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingStudent(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 bg-brand-teal hover:bg-brand-tealHover text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
