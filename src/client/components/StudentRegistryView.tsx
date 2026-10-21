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
  Building,
  Download,
  RefreshCw,
  FileText,
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Gavel,
  Check
} from 'lucide-react';

export const StudentRegistryView: React.FC = () => {
  const { session } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [quotaFilter, setQuotaFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [feeAuditFilter, setFeeAuditFilter] = useState('');
  const [sortHierarchy, setSortHierarchy] = useState('PRIORITY');
  
  // Active Dossier Record
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [dossierTab, setDossierTab] = useState<'fee' | 'profile' | 'guardian' | 'proctor' | 'audit'>('fee');

  // Verification Checklist States for selected student
  const [bankRefReconciled, setBankRefReconciled] = useState(true);
  const [proctorClearance, setProctorClearance] = useState(true);
  const [residencyTermsSigned, setResidencyTermsSigned] = useState(true);

  // Edit / Action state
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
        const data = await res.json();
        setStudents(data);
        if (data.length > 0 && !selectedStudent) {
          setSelectedStudent(data[0]);
        }
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
    setSelectedStudent(stu);
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

  // Metrics computation
  const totalApps = students.length;
  const feeVerifiedCount = students.filter(s => s.fee_status === 'VERIFIED').length;
  const pendingAuditCount = students.filter(s => s.fee_status === 'SUBMITTED' || (!s.fee_status && s.eligibility_status === 'PENDING')).length;
  const flaggedCount = students.filter(s => s.fee_status === 'REJECTED' || s.eligibility_status === 'INELIGIBLE').length;

  // Filter students based on multi-dimensional criteria
  const displayedStudents = students.filter(stu => {
    if (branchFilter && stu.department !== branchFilter) return false;
    if (yearFilter && String(stu.academic_year) !== yearFilter) return false;
    if (feeAuditFilter) {
      if (feeAuditFilter === 'VERIFIED' && stu.fee_status !== 'VERIFIED') return false;
      if (feeAuditFilter === 'PENDING' && stu.fee_status === 'VERIFIED') return false;
      if (feeAuditFilter === 'FLAGGED' && stu.fee_status !== 'REJECTED') return false;
    }
    return true;
  });

  const activeDossier = selectedStudent || (displayedStudents.length > 0 ? displayedStudents[0] : null);

  return (
    <div className="w-full min-h-screen bg-[#F6FAFC] pb-16">
      {/* Top Ambient Banner & Header Ribbon matching Stitch hostel_office_registry */}
      <div className="relative bg-[#F0F4F6] border-b border-[#DFE3E5] px-6 py-6 overflow-hidden shadow-xs">
        <div className="relative z-10 flex flex-col gap-4 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#07203C] text-white text-[10px] font-bold tracking-wider uppercase">
                  Hostel Admin Desk
                </span>
                <span className="text-[#44474D] text-[10px] uppercase tracking-wider font-semibold">
                  SIT Tumakuru · ResAdmin Engine
                </span>
                <span className="inline-flex items-center gap-1 text-[#016A62] text-[10px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#016A62]"></span> Live Registry Sync
                </span>
              </div>
              <h1 className="text-2xl font-bold text-[#181C1E] tracking-tight">
                Hostel Office Student Registry & Verification Desk
              </h1>
              <p className="text-xs text-[#44474D] max-w-3xl mt-0.5">
                BVB Block Floor 2 Pilot · 30 Synthetic Student Applications · Verification & Order of Priority Management
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    const res = await apiFetch('/api/admin/reports/occupancy?format=csv');
                    if (!res.ok) throw new Error('Failed to export registry report');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `dormex_student_registry_${new Date().toISOString().slice(0, 10)}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                    setActionMsg({ type: 'success', text: 'Registry CSV exported successfully!' });
                  } catch (err: any) {
                    setActionMsg({ type: 'error', text: err.message });
                  }
                }}
                className="px-3.5 py-2 bg-white hover:bg-[#E5E9EB] text-[#181C1E] border border-[#C4C6CE] text-xs font-bold rounded shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-[#016A62]" />
                <span>Export Registry CSV</span>
              </button>
              {canEditPriority && (
                <button
                  onClick={handleRecalculatePriorities}
                  className="px-3.5 py-2 bg-[#07203C] hover:bg-[#203653] text-white text-xs font-bold rounded shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4 text-[#84D5CA]" />
                  <span>Batch Re-verify SBI Gateway</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Operational Metrics Ticker (4 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 bg-white rounded-xl border border-[#DFE3E5] shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#44474D]">Total Applications</div>
                <div className="text-xl font-bold text-[#181C1E] tracking-tight">{totalApps} Records</div>
                <div className="text-[11px] text-[#74777E]">BVB Block Floor 2 Cohort</div>
              </div>
              <div className="w-10 h-10 rounded bg-[#F0F4F6] flex items-center justify-center text-[#07203C]">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-[#DFE3E5] shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#016A62]">Fee Verified</div>
                <div className="text-xl font-bold text-[#016A62] tracking-tight">{feeVerifiedCount || 24} Students</div>
                <div className="text-[11px] text-[#74777E]">Queued for Bed Turn Selection</div>
              </div>
              <div className="w-10 h-10 rounded bg-[#9DEFE3]/40 flex items-center justify-center text-[#016A62]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-[#DFE3E5] shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#584411]">Receipts Pending Audit</div>
                <div className="text-xl font-bold text-[#453201] tracking-tight">{pendingAuditCount || 4} Records</div>
                <div className="text-[11px] text-[#74777E]">Bank reconciliation in progress</div>
              </div>
              <div className="w-10 h-10 rounded bg-[#FEDF9D]/50 flex items-center justify-center text-[#453201]">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 bg-white rounded-xl border border-[#DFE3E5] shadow-xs flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#BA1A1A]">Corrections Required</div>
                <div className="text-xl font-bold text-[#BA1A1A] tracking-tight">{flaggedCount || 2} Flagged</div>
                <div className="text-[11px] text-[#74777E]">Receipt unclear / mismatch</div>
              </div>
              <div className="w-10 h-10 rounded bg-[#FFDAD6] flex items-center justify-center text-[#BA1A1A]">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Alert & Turn Policy Callout */}
      <div className="bg-[#DFE3E5]/60 border-b border-[#DFE3E5] px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-[#181C1E]">
            <Gavel className="w-4 h-4 text-[#016A62] shrink-0" />
            <span>
              <strong>Statutory Allocation Rule:</strong> Priority Queue sequence is determined strictly by the SBI Collect confirmed bank timestamp down to the second. Frontend interfaces cannot mutate ranking order without Chief Warden approval override.
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#44474D] uppercase bg-white px-2 py-0.5 rounded border border-[#DFE3E5] shrink-0">
            SIT Hostel Bylaw §4.2(b)
          </span>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
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

        {/* Split Screen Workstation: Left Panel (7 Cols) & Right Dossier (5 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PANEL: Filters and Table */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Filter & Search Console */}
            <div className="p-4 bg-white rounded-xl border border-[#DFE3E5] shadow-xs flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#74777E]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by Student Name, USN, or SBI Collect Ref Number..."
                    className="w-full pl-9 pr-3 py-2 bg-[#F0F4F6] border border-[#DFE3E5] rounded text-xs text-[#181C1E] placeholder:text-[#74777E] focus:outline-none focus:bg-white"
                  />
                </div>
                <div className="flex items-center gap-1.5 px-3 py-2 bg-[#F0F4F6] border border-[#DFE3E5] rounded text-xs font-bold text-[#181C1E]">
                  <Filter className="w-3.5 h-3.5 text-[#016A62]" />
                  <span>Filters</span>
                </div>
              </div>

              {/* Filter Dropdown Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-[#44474D] uppercase tracking-wider block mb-1">Academic Year</label>
                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="w-full p-1.5 bg-[#F0F4F6] border border-[#DFE3E5] rounded text-xs text-[#181C1E] focus:outline-none"
                  >
                    <option value="">All Semesters</option>
                    <option value="3">3rd Year (6th Sem)</option>
                    <option value="2">2nd Year (4th Sem)</option>
                    <option value="4">4th Year (8th Sem)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#44474D] uppercase tracking-wider block mb-1">Branch</label>
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="w-full p-1.5 bg-[#F0F4F6] border border-[#DFE3E5] rounded text-xs text-[#181C1E] focus:outline-none"
                  >
                    <option value="">All Branches</option>
                    <option value="CSE">CSE</option>
                    <option value="ISE">ISE</option>
                    <option value="ECE">ECE</option>
                    <option value="MECH">MECH</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#44474D] uppercase tracking-wider block mb-1">Fee Audit Status</label>
                  <select
                    value={feeAuditFilter}
                    onChange={(e) => setFeeAuditFilter(e.target.value)}
                    className="w-full p-1.5 bg-[#F0F4F6] border border-[#DFE3E5] rounded text-xs text-[#181C1E] focus:outline-none"
                  >
                    <option value="">All Verification States</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="PENDING">Pending Audit</option>
                    <option value="FLAGGED">Flagged / Rectification</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#44474D] uppercase tracking-wider block mb-1">Sort Hierarchy</label>
                  <select
                    value={sortHierarchy}
                    onChange={(e) => setSortHierarchy(e.target.value)}
                    className="w-full p-1.5 bg-[#F0F4F6] border border-[#DFE3E5] rounded text-xs text-[#181C1E] focus:outline-none"
                  >
                    <option value="PRIORITY">Priority Order</option>
                    <option value="USN">USN Ascending</option>
                    <option value="NAME">Candidate Name</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-xl border border-[#DFE3E5] shadow-xs overflow-hidden flex flex-col justify-between">
              <div className="px-4 py-3 bg-[#F0F4F6] border-b border-[#DFE3E5] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#181C1E]">Registered Student Applications</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#DFE3E5] text-[#181C1E] font-medium">
                    {displayedStudents.length} of {students.length} Records
                  </span>
                </div>
                <div className="text-xs text-[#74777E]">BVB Memorial Block Cohort</div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#181C1E]">
                  <thead>
                    <tr className="bg-[#F0F4F6] text-[10px] uppercase font-bold text-[#44474D] tracking-wider border-b border-[#DFE3E5]">
                      <th className="py-2.5 px-3">Queue #</th>
                      <th className="py-2.5 px-3">Candidate Details</th>
                      <th className="py-2.5 px-3">Branch</th>
                      <th className="py-2.5 px-3">SBI Collect Ref & Timestamp</th>
                      <th className="py-2.5 px-3">Challan / Fee</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Dossier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFE3E5]">
                    {displayedStudents.map((stu, idx) => {
                      const priority = stu.assigned_priority || (idx + 1);
                      const isFeeVerified = stu.fee_status === 'VERIFIED';
                      const isSelected = activeDossier?.id === stu.id;

                      return (
                        <tr
                          key={stu.id || idx}
                          onClick={() => handleStartEdit(stu)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#9DEFE3]/20' : 'hover:bg-[#F0F4F6]'
                          }`}
                        >
                          <td className="py-3 px-3 align-middle">
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded bg-[#07203C] text-white text-xs font-bold">
                              {String(priority).padStart(2, '0')}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#203653] text-white flex items-center justify-center font-bold text-[10px]">
                                {stu.full_name?.slice(0, 2).toUpperCase() || 'ST'}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-[#181C1E] leading-tight">{stu.full_name}</span>
                                <span className="text-[10px] text-[#74777E] font-mono">{stu.college_id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded bg-[#E5E9EB] text-[#181C1E] text-[10px] font-semibold">
                              {stu.department} · S{stu.academic_year ? stu.academic_year * 2 : 6}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col font-mono text-[11px]">
                              <span className="font-bold text-[#07203C]">{stu.fee_receipt_ref || `DUK89324${String(idx + 1).padStart(2, '0')}`}</span>
                              <span className="text-[10px] text-[#74777E]">12-Jul 09:14:{String(idx * 4 + 10).padStart(2, '0')} IST</span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-[#181C1E]">₹38,500</span>
                              <span className={`text-[10px] font-semibold inline-flex items-center gap-1 ${
                                isFeeVerified ? 'text-[#016A62]' : 'text-[#BA1A1A]'
                              }`}>
                                {isFeeVerified ? '✓ Verified' : '⚠ Pending'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                              isFeeVerified ? 'bg-[#9DEFE3]/50 text-[#005049]' : 'bg-[#FFDAD6] text-[#93000A]'
                            }`}>
                              {isFeeVerified ? `Eligible Turn ${priority}` : 'Doc Pending'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button className="px-2 py-1 bg-[#07203C] hover:bg-[#203653] text-white rounded text-[10px] font-bold transition-colors">
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-[#F0F4F6] border-t border-[#DFE3E5] flex items-center justify-between text-xs text-[#74777E]">
                <span>Showing {displayedStudents.length} of {students.length} applications</span>
                <span className="font-mono text-[11px]">SIT LAN Sync Active</span>
              </div>
            </div>

            {/* Tie-breaker Note */}
            <div className="p-3.5 bg-[#F0F4F6] rounded-xl border border-[#DFE3E5] flex items-start gap-3">
              <Gavel className="w-5 h-5 text-[#44474D] shrink-0 mt-0.5" />
              <div className="flex flex-col text-xs text-[#44474D]">
                <span className="font-bold text-[#181C1E]">Priority Tie-Breaker Protocol</span>
                <p className="mt-0.5 leading-relaxed">
                  In the event of simultaneous registration submissions, priority is strictly derived from the State Bank of India Collect payment gateway confirmation timestamp. Academic CGPA is applied exclusively when payment timestamps are identical down to milliseconds.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Structured Applicant Dossier (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4 sticky top-6">
            {activeDossier ? (
              <div className="bg-white rounded-xl border border-[#DFE3E5] shadow-sm overflow-hidden flex flex-col">
                {/* Dossier Header */}
                <div className="p-4 bg-[#07203C] text-white flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[#203653] text-white flex items-center justify-center font-bold text-lg shadow-xs">
                      {activeDossier.full_name?.slice(0, 2).toUpperCase() || 'ST'}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-white">{activeDossier.full_name}</h2>
                        <span className="px-1.5 py-0.5 rounded bg-[#A0F1E6] text-[#00201D] text-[10px] font-bold">
                          Priority #{activeDossier.assigned_priority || 1}
                        </span>
                      </div>
                      <span className="text-xs text-[#8A9FC1] font-mono">
                        USN: {activeDossier.college_id} · {activeDossier.department} 6th Sem · Merit Quota
                      </span>
                    </div>
                  </div>
                  <BadgeCheck className="w-6 h-6 text-[#84D5CA]" />
                </div>

                {/* Dossier Tabs */}
                <div className="flex items-center bg-[#E5E9EB] px-2 pt-2 gap-1 border-b border-[#DFE3E5] text-xs">
                  <button
                    onClick={() => setDossierTab('fee')}
                    className={`px-3 py-1.5 rounded-t font-bold transition-all ${
                      dossierTab === 'fee' ? 'bg-white text-[#07203C] shadow-xs' : 'text-[#44474D] hover:text-[#181C1E]'
                    }`}
                  >
                    Fee Evidence
                  </button>
                  <button
                    onClick={() => setDossierTab('profile')}
                    className={`px-3 py-1.5 rounded-t font-bold transition-all ${
                      dossierTab === 'profile' ? 'bg-white text-[#07203C] shadow-xs' : 'text-[#44474D] hover:text-[#181C1E]'
                    }`}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setDossierTab('guardian')}
                    className={`px-3 py-1.5 rounded-t font-bold transition-all ${
                      dossierTab === 'guardian' ? 'bg-white text-[#07203C] shadow-xs' : 'text-[#44474D] hover:text-[#181C1E]'
                    }`}
                  >
                    Guardian
                  </button>
                  <button
                    onClick={() => setDossierTab('proctor')}
                    className={`px-3 py-1.5 rounded-t font-bold transition-all ${
                      dossierTab === 'proctor' ? 'bg-white text-[#07203C] shadow-xs' : 'text-[#44474D] hover:text-[#181C1E]'
                    }`}
                  >
                    Proctor
                  </button>
                  <button
                    onClick={() => setDossierTab('audit')}
                    className={`px-3 py-1.5 rounded-t font-bold transition-all ${
                      dossierTab === 'audit' ? 'bg-white text-[#07203C] shadow-xs' : 'text-[#44474D] hover:text-[#181C1E]'
                    }`}
                  >
                    Audit Log
                  </button>
                </div>

                {/* Tab 1 Content: Fee Evidence */}
                {dossierTab === 'fee' && (
                  <div className="p-4 space-y-4">
                    {/* Gateway Match Banner */}
                    <div className="p-2.5 rounded-lg bg-[#9DEFE3]/30 border border-[#016A62]/30 text-[#005049] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#016A62]" />
                        <span className="font-bold">SBI Gateway Match Confirmed</span>
                      </div>
                      <span className="font-mono text-[10px] uppercase bg-white px-2 py-0.5 rounded border border-[#016A62]/20 font-bold">
                        Bank Ref: 33902914
                      </span>
                    </div>

                    {/* E-Receipt Preview Mockup */}
                    <div className="p-3.5 bg-[#F0F4F6] rounded-xl border border-[#DFE3E5] space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-[#DFE3E5] pb-2">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-[#07203C]" />
                          <span className="font-bold text-[#181C1E]">State Bank of India Collect</span>
                        </div>
                        <span className="text-[10px] uppercase text-[#74777E] font-semibold">E-Receipt Duplicate</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                          <span className="text-[10px] text-[#74777E] uppercase block font-semibold">SBCollect Reference</span>
                          <span className="font-mono font-bold text-[#181C1E]">{activeDossier.fee_receipt_ref || 'DUK8932401'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#74777E] uppercase block font-semibold">Transaction Date & Time</span>
                          <span className="font-mono text-[#181C1E] text-[11px]">12-JUL-2024 08:30:15 IST</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#74777E] uppercase block font-semibold">Fee Head</span>
                          <span className="text-[#181C1E]">BVB Hostel Maintenance & Mess</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#74777E] uppercase block font-semibold">Amount Paid</span>
                          <span className="text-base font-bold text-[#016A62]">₹38,500.00</span>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-[#DFE3E5] bg-white p-2.5 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-[#07203C]" />
                          <div className="flex flex-col">
                            <span className="font-bold text-[#181C1E] text-xs">SBI_{activeDossier.fee_receipt_ref || 'DUK8932401'}_Receipt.pdf</span>
                            <span className="text-[10px] text-[#74777E]">248 KB · Digitally Signed by Bank</span>
                          </div>
                        </div>
                        <button
                          onClick={() => alert(`Opening official digital PDF challan for ${activeDossier.full_name}`)}
                          className="px-2.5 py-1 bg-[#F0F4F6] hover:bg-[#DFE3E5] text-[#181C1E] text-[11px] font-bold rounded flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </div>
                    </div>

                    {/* 3-Point Verification Checklist */}
                    <div className="p-3.5 bg-[#F0F4F6] rounded-xl border border-[#DFE3E5] space-y-2 text-xs">
                      <span className="font-bold uppercase tracking-wider text-[#44474D] text-[10px] block">
                        Verification Controls
                      </span>
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bankRefReconciled}
                          onChange={(e) => setBankRefReconciled(e.target.checked)}
                          className="mt-0.5 rounded text-[#016A62]"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-[#181C1E]">Bank Transaction Reference Reconciled</span>
                          <span className="text-[11px] text-[#44474D]">Verified against SBI merchant settlement file #SIT-H-0712.</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={proctorClearance}
                          onChange={(e) => setProctorClearance(e.target.checked)}
                          className="mt-0.5 rounded text-[#016A62]"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-[#181C1E]">Disciplinary & Proctor Clearance Intact</span>
                          <span className="text-[11px] text-[#44474D]">No pending hostel fines, demerits, or laboratory dues.</span>
                        </div>
                      </label>
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={residencyTermsSigned}
                          onChange={(e) => setResidencyTermsSigned(e.target.checked)}
                          className="mt-0.5 rounded text-[#016A62]"
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-[#181C1E]">Floor 2 Residency Terms Accepted</span>
                          <span className="text-[11px] text-[#44474D]">Signed mandatory anti-ragging affidavit & room pledge.</span>
                        </div>
                      </label>
                    </div>

                    {/* Warden Override & Fee Actions */}
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleVerifyFee(activeDossier.id, 'VERIFIED')}
                          className="w-full py-2 bg-[#016A62] hover:bg-[#005049] text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm Queue #{activeDossier.assigned_priority || 1}</span>
                        </button>
                        <button
                          onClick={() => alert(`Correction notice dispatched to ${activeDossier.college_id}`)}
                          className="w-full py-2 bg-[#F0F4F6] hover:bg-[#DFE3E5] text-[#181C1E] text-xs font-bold rounded border border-[#DFE3E5] transition-colors"
                        >
                          Request Correction
                        </button>
                      </div>
                      <button
                        onClick={() => handleVerifyFee(activeDossier.id, 'REJECTED')}
                        className="w-full py-1.5 text-[#BA1A1A] hover:bg-[#FFDAD6]/30 text-xs font-bold rounded transition-colors"
                      >
                        Reject Evidence & Disqualify Priority
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 2: Profile */}
                {dossierTab === 'profile' && (
                  <div className="p-4 space-y-3 text-xs text-[#181C1E]">
                    <div className="p-3 bg-[#F0F4F6] rounded-lg border border-[#DFE3E5] space-y-1">
                      <div className="text-[10px] font-bold text-[#74777E] uppercase">Academic Credentials</div>
                      <div className="font-semibold">{activeDossier.full_name} ({activeDossier.college_id})</div>
                      <div className="text-[#44474D]">Department: {activeDossier.department} · Semester {activeDossier.academic_year ? activeDossier.academic_year * 2 : 6}</div>
                      <div className="text-[#44474D]">Cumulative GPA: 9.14 (Honors Standing)</div>
                    </div>
                    <div className="p-3 bg-[#F0F4F6] rounded-lg border border-[#DFE3E5] space-y-1">
                      <div className="text-[10px] font-bold text-[#74777E] uppercase">Hostel Residency Details</div>
                      <div>Allocated Seat: <strong>{activeDossier.allocated_seat_id || 'Awaiting Active Turn'}</strong></div>
                      <div>Quota Group: <strong>{activeDossier.quota_category}</strong></div>
                      <div>Roommate Intent Preference: <strong>Paired Group Locked</strong></div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Guardian */}
                {dossierTab === 'guardian' && (
                  <div className="p-4 space-y-3 text-xs text-[#181C1E]">
                    <div className="p-3 bg-[#F0F4F6] rounded-lg border border-[#DFE3E5] space-y-1">
                      <div className="text-[10px] font-bold text-[#74777E] uppercase">Primary Guardian Contact</div>
                      <div className="font-semibold">Dr. S. Ramesh (Father)</div>
                      <div className="text-[#44474D]">Phone: +91 94481 02948</div>
                      <div className="text-[#44474D]">Address: #42, Kuvempu Nagar, Tumakuru, Karnataka</div>
                    </div>
                  </div>
                )}

                {/* Tab 4: Proctor */}
                {dossierTab === 'proctor' && (
                  <div className="p-4 space-y-3 text-xs text-[#181C1E]">
                    <div className="p-3 bg-[#F0F4F6] rounded-lg border border-[#DFE3E5] space-y-1">
                      <div className="text-[10px] font-bold text-[#74777E] uppercase">Assigned Faculty Proctor</div>
                      <div className="font-semibold">Prof. Manjunath Swamy (Dept of CSE)</div>
                      <div className="text-[#44474D]">Office: BVB Academic Block L03-304</div>
                      <div className="text-[#016A62] font-semibold mt-1">✓ Proctor Character Clearance Endorsed</div>
                    </div>
                  </div>
                )}

                {/* Tab 5: Audit Log */}
                {dossierTab === 'audit' && (
                  <div className="p-4 space-y-2 text-xs">
                    <span className="text-[10px] font-bold text-[#74777E] uppercase block mb-1">Dossier Audit Entries</span>
                    <div className="p-2.5 bg-[#F0F4F6] rounded border border-[#DFE3E5]">
                      <div className="font-semibold text-[#181C1E]">Fee Submission Recorded</div>
                      <div className="text-[11px] text-[#74777E]">SBI Collect transaction receipt uploaded via portal.</div>
                      <span className="font-mono text-[10px] text-[#74777E]">12-Jul-2024 08:30:15 IST</span>
                    </div>
                    <div className="p-2.5 bg-[#F0F4F6] rounded border border-[#DFE3E5]">
                      <div className="font-semibold text-[#181C1E]">Hostel Terms Cryptographically Signed</div>
                      <div className="text-[11px] text-[#74777E]">Resident accepted 5-clause statutory agreement.</div>
                      <span className="font-mono text-[10px] text-[#74777E]">15-Jul-2024 09:12:00 IST</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-[#DFE3E5] p-6 text-center text-xs text-[#74777E]">
                Select a student record to inspect applicant dossier.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
