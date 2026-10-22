import React, { useState, useEffect } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext.js';
import { 
  UserPlus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Building, 
  ChevronRight, 
  RefreshCw,
  Edit2,
  Save,
  X,
  ShieldCheck,
  Phone,
  Mail,
  Home,
  FileCheck
} from 'lucide-react';

interface AdmissionRecord {
  id: string;
  academic_year_code: string;
  college_id: string;
  full_name: string;
  department: string;
  semester: number;
  official_priority: number;
  admission_status: string;
  email: string;
  phone: string;
  parent_name?: string;
  parent_relationship?: string;
  parent_phone?: string;
  parent_email?: string;
  parent_address?: string;
  proctor_user_id?: string;
  proctor_name?: string;
  proctor_department?: string;
  hostel_building_id?: string;
  hostel_name?: string;
  notes?: string;
  created_at: string;
}

interface ProctorChoice {
  id: string;
  college_id: string;
  full_name: string;
  email: string;
  phone?: string;
}

export const StudentAdmissionManagementView: React.FC = () => {
  const { session } = useAuth();
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([]);
  const [proctors, setProctors] = useState<ProctorChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'register' | 'registry'>('register');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('2026-2027');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // New Admission Form State
  const [form, setForm] = useState({
    academic_year_code: '2026-2027',
    college_id: '',
    full_name: '',
    department: 'Computer Science & Engineering',
    semester: 1,
    official_priority: '',
    email: '',
    phone: '',
    parent_name: '',
    parent_relationship: 'Father',
    parent_phone: '',
    parent_email: '',
    parent_address: '',
    proctor_user_id: '',
    hostel_building_id: 'bld_bvb',
    notes: '',
  });

  // Action status message
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Selected admission for inspection / edit
  const [selectedAdmission, setSelectedAdmission] = useState<AdmissionRecord | null>(null);
  const [editingAdmission, setEditingAdmission] = useState<AdmissionRecord | null>(null);

  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.append('search', search);
      if (yearFilter) q.append('academic_year_code', yearFilter);
      if (deptFilter) q.append('department', deptFilter);
      if (statusFilter) q.append('admission_status', statusFilter);

      const res = await apiFetch(`/api/admissions?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAdmissions(data);
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to load admission records' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProctors = async () => {
    try {
      const res = await apiFetch('/api/admissions/proctors');
      if (res.ok) {
        const data = await res.json();
        setProctors(data);
      }
    } catch (err) {
      console.debug('Failed to fetch proctors:', err);
    }
  };

  useEffect(() => {
    fetchAdmissions();
    fetchProctors();
  }, [search, yearFilter, deptFilter, statusFilter]);

  const handleSubmitAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);

    try {
      const pNum = parseInt(form.official_priority, 10);
      if (!pNum || isNaN(pNum) || pNum < 1) {
        throw new Error('Official priority number must be a positive integer');
      }

      const res = await apiFetch('/api/admissions', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          official_priority: pNum,
          semester: Number(form.semester),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register candidate admission');
      }

      setMsg({
        type: 'success',
        text: `Candidate ${data.full_name} (${data.college_id}) admitted with Official Priority #${data.official_priority}. Profile created in PENDING verification state.`,
      });

      // Reset form
      setForm({
        academic_year_code: '2026-2027',
        college_id: '',
        full_name: '',
        department: 'Computer Science & Engineering',
        semester: 1,
        official_priority: '',
        email: '',
        phone: '',
        parent_name: '',
        parent_relationship: 'Father',
        parent_phone: '',
        parent_email: '',
        parent_address: '',
        proctor_user_id: '',
        hostel_building_id: 'bld_bvb',
        notes: '',
      });

      fetchAdmissions();
      setActiveTab('registry');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmission) return;
    setMsg(null);

    try {
      const res = await apiFetch(`/api/admissions/${editingAdmission.id}`, {
        method: 'PUT',
        body: JSON.stringify(editingAdmission),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      setMsg({ type: 'success', text: `Admission record for ${data.full_name} updated successfully.` });
      setEditingAdmission(null);
      fetchAdmissions();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F7F6F1] min-h-screen">
      {/* Top Banner & Header */}
      <div className="bg-white border-b border-[#E2E6E8] px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#627084] font-medium mb-1">
              <span>Hostel Office Workspace</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-60" />
              <span className="text-[#2C8279] font-bold">Admissions & Enrolment Desk</span>
            </div>
            <h1 className="text-2xl font-black text-[#203653] tracking-tight">Student Admission Management</h1>
            <p className="text-xs text-[#627084] mt-1">
              Register newly admitted hostel candidates, enforce authoritative batch-wise priority numbers, assign faculty proctors, and initialize baseline student profiles.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('register')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'register'
                  ? 'bg-[#2C8279] text-white shadow-sm'
                  : 'bg-white text-[#203653] border border-[#D5DCDF] hover:bg-[#F7F6F1]'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>New Admission Form</span>
            </button>
            <button
              onClick={() => setActiveTab('registry')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'registry'
                  ? 'bg-[#2C8279] text-white shadow-sm'
                  : 'bg-white text-[#203653] border border-[#D5DCDF] hover:bg-[#F7F6F1]'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Admission Registry ({admissions.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full p-8 space-y-6">
        {/* Banner Alert Message */}
        {msg && (
          <div className={`p-4 rounded-xl border text-xs flex items-center justify-between shadow-xs transition-all ${
            msg.type === 'success' 
              ? 'bg-[#84d5ca]/15 border-[#2C8279]/30 text-[#07203C]' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2.5">
              {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#2C8279]" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span className="font-semibold">{msg.text}</span>
            </div>
            <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab 1: New Admission Multi-Section Form */}
        {activeTab === 'register' && (
          <form onSubmit={handleSubmitAdmission} className="bg-white rounded-2xl border border-[#E2E6E8] p-8 shadow-xs space-y-8">
            {/* Section A: Academic & Priority Details */}
            <div>
              <div className="flex items-center gap-2.5 border-b border-[#E2E6E8] pb-3 mb-5">
                <div className="w-7 h-7 rounded-lg bg-[#2C8279]/15 text-[#2C8279] flex items-center justify-center font-bold text-xs">
                  A
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#203653]">Academic & Institutional Priority</h3>
                  <p className="text-[11px] text-[#627084]">Official admission cohort, department, USN, and batch-wise unique priority rank.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#203653] mb-1.5">Academic Enrolment Year *</label>
                  <select
                    value={form.academic_year_code}
                    onChange={(e) => setForm({ ...form, academic_year_code: e.target.value })}
                    required
                    className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg px-3.5 py-2.5 text-[#203653] font-medium focus:outline-none focus:border-[#2C8279]"
                  >
                    <option value="2026-2027">2026-2027 (Upcoming Fall Cohort)</option>
                    <option value="2027-2028">2027-2028 (Future Academic Year)</option>
                    <option value="2025-2026">2025-2026 (Current Academic Year)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#203653] mb-1.5">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prajwal Gowda"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg px-3.5 py-2.5 text-[#203653] font-medium focus:outline-none focus:border-[#2C8279]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#203653] mb-1.5">USN (University Seat Number) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1SI26CS101"
                    value={form.college_id}
                    onChange={(e) => setForm({ ...form, college_id: e.target.value })}
                    className="w-full text-xs font-mono uppercase bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg px-3.5 py-2.5 text-[#203653] font-semibold focus:outline-none focus:border-[#2C8279]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#203653] mb-1.5">Branch / Department *</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg px-3.5 py-2.5 text-[#203653] font-medium focus:outline-none focus:border-[#2C8279]"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering (CSE)</option>
                    <option value="Information Science & Engineering">Information Science & Engineering (ISE)</option>
                    <option value="Electronics & Communication">Electronics & Communication (ECE)</option>
                    <option value="Mechanical Engineering">Mechanical Engineering (ME)</option>
                    <option value="Civil Engineering">Civil Engineering (CV)</option>
                    <option value="Artificial Intelligence & Data Science">AI & Data Science (AIDS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#203653] mb-1.5">Admitting Semester</label>
                  <select
                    value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: parseInt(e.target.value, 10) })}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg px-3.5 py-2.5 text-[#203653] font-medium focus:outline-none focus:border-[#2C8279]"
                  >
                    <option value={1}>Semester 1 (Year 1 Intake)</option>
                    <option value={3}>Semester 3 (Year 2 Intake / Lateral)</option>
                    <option value={5}>Semester 5 (Year 3)</option>
                    <option value={7}>Semester 7 (Year 4)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#203653]">Official Priority Number *</label>
                    <span className="text-[10px] text-[#2C8279] font-bold">Unique Within Batch</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 101"
                    value={form.official_priority}
                    onChange={(e) => setForm({ ...form, official_priority: e.target.value })}
                    className="w-full text-xs font-bold bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg px-3.5 py-2.5 text-[#203653] focus:outline-none focus:border-[#2C8279]"
                  />
                  <p className="text-[10px] text-[#627084] mt-1">Authoritative unique priority within admission batch ({form.academic_year_code}).</p>
                </div>
              </div>
            </div>

            {/* Section B: Contact & Proctor Details */}
            <div>
              <div className="flex items-center gap-2.5 border-b border-[#E2E6E8] pb-3 mb-5">
                <div className="w-7 h-7 rounded-lg bg-[#2C8279]/15 text-[#2C8279] flex items-center justify-center font-bold text-xs">
                  B
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#203653]">Candidate Contact & Proctor Assignment</h3>
                  <p className="text-[11px] text-[#627084]">Student communication channels and institutional faculty proctor linkage.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#203653] mb-1.5">Student Email Address *</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-[#627084]" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. student@sit.ac.in"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg pl-9 pr-3.5 py-2.5 text-[#203653] font-medium focus:outline-none focus:border-[#2C8279]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#203653] mb-1.5">Mobile Number *</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-[#627084]" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 94481 23456"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg pl-9 pr-3.5 py-2.5 text-[#203653] font-medium focus:outline-none focus:border-[#2C8279]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#203653] mb-1.5">Assigned Faculty Proctor</label>
                  <select
                    value={form.proctor_user_id}
                    onChange={(e) => setForm({ ...form, proctor_user_id: e.target.value })}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg px-3.5 py-2.5 text-[#203653] font-medium focus:outline-none focus:border-[#2C8279]"
                  >
                    <option value="">-- Select Active Proctor --</option>
                    {proctors.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.college_id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section C: Parent & Guardian Details */}
            <div>
              <div className="flex items-center gap-2.5 border-b border-[#E2E6E8] pb-3 mb-5">
                <div className="w-7 h-7 rounded-lg bg-[#2C8279]/15 text-[#2C8279] flex items-center justify-center font-bold text-xs">
                  C
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#203653]">Parent / Guardian Information</h3>
                  <p className="text-[11px] text-[#627084]">Emergency contact details for institutional hostel records.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#203653] mb-1.5">Parent / Guardian Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Shankar Gowda"
                    value={form.parent_name}
                    onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg px-3.5 py-2.5 text-[#203653] font-medium focus:outline-none focus:border-[#2C8279]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#203653] mb-1.5">Relationship</label>
                  <select
                    value={form.parent_relationship}
                    onChange={(e) => setForm({ ...form, parent_relationship: e.target.value })}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg px-3.5 py-2.5 text-[#203653] font-medium focus:outline-none focus:border-[#2C8279]"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#203653] mb-1.5">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 94481 23450"
                    value={form.parent_phone}
                    onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg px-3.5 py-2.5 text-[#203653] font-medium focus:outline-none focus:border-[#2C8279]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#203653] mb-1.5">Contact Email</label>
                  <input
                    type="email"
                    placeholder="e.g. parent@example.com"
                    value={form.parent_email}
                    onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg px-3.5 py-2.5 text-[#203653] font-medium focus:outline-none focus:border-[#2C8279]"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-bold text-[#203653] mb-1.5">Permanent Residence Address</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. #42, 5th Cross, Ashoka Road, Tumakuru - 572103"
                    value={form.parent_address}
                    onChange={(e) => setForm({ ...form, parent_address: e.target.value })}
                    className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg px-3.5 py-2 text-[#203653] font-medium focus:outline-none focus:border-[#2C8279]"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-[#E2E6E8] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#627084]">
                <ShieldCheck className="w-4 h-4 text-[#2C8279]" />
                <span>Admission creates profile in <strong>PENDING</strong> verification state; fee & terms must follow institutional process.</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({
                    academic_year_code: '2026-2027',
                    college_id: '',
                    full_name: '',
                    department: 'Computer Science & Engineering',
                    semester: 1,
                    official_priority: '',
                    email: '',
                    phone: '',
                    parent_name: '',
                    parent_relationship: 'Father',
                    parent_phone: '',
                    parent_email: '',
                    parent_address: '',
                    proctor_user_id: '',
                    hostel_building_id: 'bld_bvb',
                    notes: '',
                  })}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold text-[#627084] hover:bg-[#F7F6F1] border border-[#D5DCDF]"
                >
                  Clear Form
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg text-xs font-bold bg-[#2C8279] text-white hover:bg-[#203653] transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Submit Official Admission</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Admission Registry & Search Table */}
        {activeTab === 'registry' && (
          <div className="bg-white rounded-2xl border border-[#E2E6E8] shadow-xs overflow-hidden">
            {/* Filter Toolbar */}
            <div className="p-5 border-b border-[#E2E6E8] bg-[#F7F6F1]/50 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1 w-full md:w-auto relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[#627084]" />
                <input
                  type="text"
                  placeholder="Search by student name, USN, priority number, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs bg-white border border-[#D5DCDF] rounded-lg pl-9 pr-3.5 py-2 text-[#203653] font-medium focus:outline-none focus:border-[#2C8279]"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="text-xs bg-white border border-[#D5DCDF] rounded-lg px-3 py-2 text-[#203653] font-semibold"
                >
                  <option value="">All Academic Years</option>
                  <option value="2026-2027">2026-2027</option>
                  <option value="2027-2028">2027-2028</option>
                  <option value="2025-2026">2025-2026</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-white border border-[#D5DCDF] rounded-lg px-3 py-2 text-[#203653] font-semibold"
                >
                  <option value="">All Statuses</option>
                  <option value="REGISTERED">Registered</option>
                  <option value="PROCTOR_ASSIGNED">Proctor Assigned</option>
                  <option value="DOCS_PENDING">Docs Pending</option>
                  <option value="COMPLETED">Completed</option>
                </select>

                <button
                  onClick={fetchAdmissions}
                  className="p-2 bg-white border border-[#D5DCDF] rounded-lg text-[#627084] hover:text-[#203653]"
                  title="Refresh table"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F6F1] border-b border-[#E2E6E8] text-[11px] font-bold text-[#627084] uppercase tracking-wider">
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">USN & Candidate</th>
                    <th className="py-3 px-4">Academic Year</th>
                    <th className="py-3 px-4">Branch / Sem</th>
                    <th className="py-3 px-4">Assigned Proctor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E6E8] text-xs">
                  {admissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#627084]">
                        {loading ? 'Loading admissions...' : 'No admission records found matching active filters.'}
                      </td>
                    </tr>
                  ) : (
                    admissions.map((adm) => (
                      <tr key={adm.id} className="hover:bg-[#F7F6F1]/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#203653] px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            #{adm.official_priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#203653]">{adm.full_name}</div>
                          <div className="text-[11px] font-mono text-[#627084]">{adm.college_id} · {adm.email}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#203653]">
                          {adm.academic_year_code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#203653] truncate max-w-[180px]">{adm.department}</div>
                          <div className="text-[10px] text-[#627084]">Semester {adm.semester}</div>
                        </td>
                        <td className="py-3 px-4">
                          {adm.proctor_name ? (
                            <div className="text-xs text-[#203653] font-medium">{adm.proctor_name}</div>
                          ) : (
                            <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            adm.admission_status === 'PROCTOR_ASSIGNED'
                              ? 'bg-[#2C8279]/15 text-[#2C8279]'
                              : adm.admission_status === 'COMPLETED'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {adm.admission_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setEditingAdmission({ ...adm })}
                            className="p-1.5 rounded hover:bg-[#E2E6E8] text-[#203653] font-medium inline-flex items-center gap-1 text-xs"
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Admission Modal */}
        {editingAdmission && (
          <div className="fixed inset-0 z-50 bg-[#07203C]/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full border border-[#E2E6E8] shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E6E8] flex items-center justify-between bg-[#F7F6F1]">
                <div>
                  <h3 className="text-sm font-bold text-[#203653]">Edit Admission Record</h3>
                  <p className="text-[11px] font-mono text-[#627084]">{editingAdmission.college_id} · {editingAdmission.full_name}</p>
                </div>
                <button onClick={() => setEditingAdmission(null)} className="p-1 hover:bg-[#E2E6E8] rounded">
                  <X className="w-4 h-4 text-[#627084]" />
                </button>
              </div>

              <form onSubmit={handleUpdateAdmission} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#203653] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingAdmission.full_name}
                    onChange={(e) => setEditingAdmission({ ...editingAdmission, full_name: e.target.value })}
                    className="w-full bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg p-2 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#203653] mb-1">Official Priority Number</label>
                    <input
                      type="number"
                      value={editingAdmission.official_priority}
                      onChange={(e) => setEditingAdmission({ ...editingAdmission, official_priority: parseInt(e.target.value, 10) })}
                      className="w-full bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg p-2 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#203653] mb-1">Admission Status</label>
                    <select
                      value={editingAdmission.admission_status}
                      onChange={(e) => setEditingAdmission({ ...editingAdmission, admission_status: e.target.value })}
                      className="w-full bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg p-2"
                    >
                      <option value="REGISTERED">REGISTERED</option>
                      <option value="PROCTOR_ASSIGNED">PROCTOR_ASSIGNED</option>
                      <option value="DOCS_PENDING">DOCS_PENDING</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#203653] mb-1">Proctor</label>
                  <select
                    value={editingAdmission.proctor_user_id || ''}
                    onChange={(e) => setEditingAdmission({ ...editingAdmission, proctor_user_id: e.target.value })}
                    className="w-full bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg p-2"
                  >
                    <option value="">-- No Proctor --</option>
                    {proctors.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.college_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#203653] mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={editingAdmission.notes || ''}
                    onChange={(e) => setEditingAdmission({ ...editingAdmission, notes: e.target.value })}
                    className="w-full bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg p-2 font-medium"
                  />
                </div>

                <div className="pt-3 border-t border-[#E2E6E8] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAdmission(null)}
                    className="px-4 py-2 border rounded-lg text-[#627084] font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#2C8279] text-white font-bold rounded-lg shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
