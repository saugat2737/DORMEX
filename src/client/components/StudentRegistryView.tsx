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

  const selectedDossierStudent = editingStudent || (students.length > 0 ? students[0] : null);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header with Stitch Breadcrumb and Pill */}
      <div className="bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2C8279]" />
            <h1 className="text-xl font-bold text-[#203653] tracking-tight">
              Hostel Office Registry & Priority Verification
            </h1>
            <span className="text-[11px] font-bold bg-[#FAF4E6] text-[#9C7A2E] border border-[#D4B779] px-2.5 py-0.5 rounded-full">
              BVB Floor 2 Pilot • 30 Synthetic Records
            </span>
          </div>
          <p className="text-xs text-[#627084] mt-1">
            Authoritative State Bank fee confirmation chronology down to the second. Server-enforced merit & quota assignment.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canEditPriority && (
            <button
              onClick={handleRecalculatePriorities}
              className="px-3.5 py-2 bg-[#203653] hover:bg-[#17283B] text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-[#84d5ca]" />
              Chronological Priority Recalculation
            </button>
          )}
          <span className="text-xs font-semibold px-3 py-1.5 bg-[#F7F6F1] text-[#263345] rounded border border-[#E2E6E8] font-mono">
            Dataset: DEMO-001 – DEMO-030
          </span>
        </div>
      </div>

      {actionMsg && (
        <div className={`p-3.5 border rounded text-xs font-medium flex items-center gap-2 ${
          actionMsg.type === 'success' 
            ? 'bg-[#E7F2ED] border-[#A8D5C2] text-[#1E7B54]' 
            : 'bg-[#FDE8E8] border-[#F8B4B4] text-[#C93B3B]'
        }`}>
          {actionMsg.type === 'success' ? <CheckCircle className="w-4 h-4 text-[#1E7B54] shrink-0" /> : <AlertCircle className="w-4 h-4 text-[#C93B3B] shrink-0" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Statutory Rule Banner from Stitch Registry */}
      <div className="p-3.5 bg-[#FAF4E6] border border-[#D4B779]/60 rounded-lg text-xs text-[#263345] flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-[#D4B779] shrink-0" />
        <div>
          <strong className="text-[#203653]">Statutory Allocation Rule:</strong> Priority Queue sequence is determined strictly by the SBI Collect confirmed bank timestamp down to the second. Frontend interfaces cannot mutate ranking order without Chief Warden approval override.
        </div>
      </div>

      {/* Search and Filter Ribbon */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E6E8] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#627084]" />
          <input
            type="text"
            placeholder="Search by student name, USN, or challan ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-[#F7F6F1] border border-[#E2E6E8] rounded text-[#263345] focus:outline-none focus:ring-1 focus:ring-[#203653]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#627084]" />
          <select
            value={quotaFilter}
            onChange={(e) => setQuotaFilter(e.target.value)}
            className="text-xs bg-[#F7F6F1] border border-[#E2E6E8] rounded px-3 py-1.5 text-[#263345] focus:outline-none focus:ring-1 focus:ring-[#203653]"
          >
            <option value="">All Quotas (General, Merit, Sports, PwD)</option>
            <option value="GENERAL">General Quota</option>
            <option value="MERIT">Merit Quota</option>
            <option value="SPORTS">Sports Quota</option>
            <option value="PWD">PwD Quota</option>
          </select>
        </div>
      </div>

      {/* 2-Column Master-Detail Layout (Registry Table + Dossier Card) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Student Registry Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E6E8] shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#263345]">
              <thead className="bg-[#F7F6F1] text-[11px] uppercase font-bold text-[#627084] border-b border-[#E2E6E8] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Priority</th>
                  <th className="py-3 px-3.5">Student & USN</th>
                  <th className="py-3 px-3.5">Fee Status</th>
                  <th className="py-3 px-3.5">Quota</th>
                  <th className="py-3 px-3.5">Eligibility</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6E8]">
                {students.map((stu) => {
                  const priority = stu.assigned_priority ?? stu.live_priority ?? '—';
                  const isEligible = stu.eligibility_status === 'ELIGIBLE';
                  const isFeeVerified = stu.fee_status === 'VERIFIED';
                  const isSelected = selectedDossierStudent?.id === stu.id;

                  return (
                    <tr 
                      key={stu.id} 
                      onClick={() => handleStartEdit(stu)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#E7F2ED]/60' : 'hover:bg-[#F7F6F1]'
                      }`}
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-[#203653]">
                        <span className="bg-[#E5E9EB] text-[#203653] px-2 py-0.5 rounded text-[11px] font-bold">
                          #{priority}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-[#203653]">{stu.full_name}</div>
                        <div className="text-[10px] text-[#627084] font-mono">{stu.college_id} • {stu.department}</div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          isFeeVerified 
                            ? 'bg-[#E7F2ED] text-[#1E7B54] border-[#A8D5C2]' 
                            : (stu.fee_status === 'SUBMITTED' 
                                ? 'bg-[#FAF4E6] text-[#9C7A2E] border-[#D4B779]' 
                                : 'bg-[#FDE8E8] text-[#C93B3B] border-[#F8B4B4]')
                        }`}>
                          {stu.fee_status || 'UNPAID'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F7F6F1] text-[#627084] border border-[#E2E6E8]">
                          {stu.quota_category}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          isEligible 
                            ? 'bg-[#E7F2ED] text-[#1E7B54] border-[#A8D5C2]' 
                            : 'bg-[#FAF4E6] text-[#9C7A2E] border-[#D4B779]'
                        }`}>
                          {stu.eligibility_status}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        {isStaff && stu.fee_status !== 'VERIFIED' && (
                          <button
                            onClick={() => handleVerifyFee(stu.id, 'VERIFIED')}
                            className="px-2 py-1 bg-[#E7F2ED] hover:bg-[#A8D5C2]/40 text-[#1E7B54] border border-[#A8D5C2] text-[10px] font-bold rounded transition-colors"
                          >
                            Verify Fee
                          </button>
                        )}
                        {isStaff && (
                          <button
                            onClick={() => handleStartEdit(stu)}
                            className="px-2.5 py-1 bg-white hover:bg-[#F7F6F1] text-[#263345] border border-[#E2E6E8] text-xs font-semibold rounded transition-colors inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3 text-[#627084]" />
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-[#F7F6F1] border-t border-[#E2E6E8] text-xs text-[#627084] flex items-center justify-between">
            <span>Showing {students.length} of 30 synthetic pilot records</span>
            <span className="font-mono text-[11px]">BVB Block AY 2024–25</span>
          </div>
        </div>

        {/* Right Column: Active Dossier & Staff Action Card */}
        <div className="space-y-4">
          {selectedDossierStudent ? (
            <div className="bg-white rounded-xl border border-[#E2E6E8] shadow-sm p-5 space-y-4">
              {/* Dossier Header */}
              <div className="border-b border-[#E2E6E8] pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#2C8279] tracking-wider bg-[#E7F2ED] px-2 py-0.5 rounded">
                    Applicant Dossier
                  </span>
                  <span className="text-xs font-mono font-bold text-[#203653] bg-[#E5E9EB] px-2 py-0.5 rounded">
                    Priority #{selectedDossierStudent.assigned_priority ?? selectedDossierStudent.live_priority ?? 1}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#203653] mt-2">
                  {selectedDossierStudent.full_name}
                </h3>
                <div className="text-xs text-[#627084] font-mono mt-0.5">
                  USN: {selectedDossierStudent.college_id} • {selectedDossierStudent.department}
                </div>
              </div>

              {/* Dossier Details */}
              <div className="space-y-2.5 text-xs text-[#263345]">
                <div className="p-2.5 bg-[#F7F6F1] rounded border border-[#E2E6E8] space-y-1">
                  <div className="text-[10px] font-bold uppercase text-[#627084]">SBI Collect Payment Record</div>
                  <div className="font-mono text-[11px] font-semibold text-[#203653]">
                    {selectedDossierStudent.fee_receipt_ref || 'CHALLAN-PENDING-REF'}
                  </div>
                  <div className="text-[10px] text-[#627084]">
                    Bank Settlement: Verified against merchant settlement statement.
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#627084] uppercase tracking-wider block">
                    Staff-Verified Eligibility
                  </label>
                  <select
                    value={editEligibility}
                    onChange={(e) => setEditEligibility(e.target.value)}
                    className="w-full p-2 bg-[#F7F6F1] border border-[#E2E6E8] rounded text-xs text-[#263345] font-medium focus:outline-none focus:ring-1 focus:ring-[#203653]"
                  >
                    <option value="ELIGIBLE">ELIGIBLE (Staff Verified)</option>
                    <option value="PENDING">PENDING (Documents Awaiting)</option>
                    <option value="FEE_PENDING">FEE_PENDING (Hostel Dues Awaiting)</option>
                    <option value="INELIGIBLE">INELIGIBLE</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#627084] uppercase tracking-wider block">
                    Authoritative Priority Rank (1 = Highest)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    disabled={!canEditPriority}
                    value={editPriority}
                    onChange={(e) => setEditPriority(parseInt(e.target.value, 10) || 1)}
                    className="w-full p-2 bg-[#F7F6F1] border border-[#E2E6E8] rounded text-xs text-[#203653] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#203653] disabled:opacity-60"
                  />
                  {!canEditPriority && (
                    <p className="text-[10px] text-[#D4B779] mt-0.5">
                      * Priority modification requires Hostel Office or Super Admin authorization.
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#E2E6E8] space-y-1 text-[11px] text-[#627084]">
                  <div><strong>Allocated Bed:</strong> {selectedDossierStudent.allocated_seat_id || 'None (In Queue)'}</div>
                  <div><strong>Quota Group:</strong> {selectedDossierStudent.quota_category}</div>
                  <div><strong>Academic Year:</strong> Year {selectedDossierStudent.academic_year}</div>
                </div>
              </div>

              {/* Dossier Actions */}
              <div className="pt-2 border-t border-[#E2E6E8] flex flex-col gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="w-full py-2 bg-[#203653] hover:bg-[#17283B] text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Record Changes
                </button>

                {selectedDossierStudent.fee_status !== 'VERIFIED' ? (
                  <button
                    onClick={() => handleVerifyFee(selectedDossierStudent.id, 'VERIFIED')}
                    className="w-full py-2 bg-[#2C8279] hover:bg-[#236B63] text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Verify Fee Payment
                  </button>
                ) : (
                  <button
                    onClick={() => handleVerifyFee(selectedDossierStudent.id, 'REJECTED')}
                    className="w-full py-2 bg-white hover:bg-rose-50 text-[#C93B3B] border border-[#C93B3B] text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject Evidence & Disqualify
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E2E6E8] p-6 text-center text-xs text-[#627084]">
              Select a student record from the table to view their dossier.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
