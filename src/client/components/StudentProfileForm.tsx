import React, { useState, useEffect } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext.js';
import { 
  User, 
  Users, 
  ShieldCheck, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Save, 
  Send, 
  FileText,
  Lock,
  Building,
  GraduationCap
} from 'lucide-react';

interface StudentProfileFormProps {
  onProfileUpdated?: () => void;
}

export const StudentProfileForm: React.FC<StudentProfileFormProps> = ({ onProfileUpdated }) => {
  const { session } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form local state
  const [phone, setPhone] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentRel, setParentRel] = useState('Father');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianRel, setGuardianRel] = useState('Local Relative');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianAddress, setGuardianAddress] = useState('');
  const [feeRef, setFeeRef] = useState('');

  const loadProfile = async () => {
    if (!session?.profileId) return;
    try {
      const res = await apiFetch(`/api/students/${session.profileId}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setPhone(data.phone || '');
        setParentName(data.parent_name || '');
        setParentRel(data.parent_relationship || 'Father');
        setParentPhone(data.parent_phone || '');
        setParentEmail(data.parent_email || '');
        setGuardianName(data.local_guardian_name || '');
        setGuardianRel(data.local_guardian_relationship || 'Local Relative');
        setGuardianPhone(data.local_guardian_phone || '');
        setGuardianEmail(data.local_guardian_email || '');
        setGuardianAddress(data.local_guardian_address || '');
        setFeeRef(data.fee_receipt_ref || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [session?.profileId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.profileId) return;
    setSaving(true);
    setMsg(null);

    try {
      const res = await apiFetch(`/api/students/${session.profileId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          parent_name: parentName,
          parent_relationship: parentRel,
          parent_phone: parentPhone,
          parent_email: parentEmail,
          local_guardian_name: guardianName,
          local_guardian_relationship: guardianRel,
          local_guardian_phone: guardianPhone,
          local_guardian_email: guardianEmail,
          local_guardian_address: guardianAddress,
          fee_receipt_ref: feeRef,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update profile');
      }

      setMsg({ type: 'success', text: 'Profile details saved successfully!' });
      loadProfile();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!session?.profileId) return;
    setSubmitting(true);
    setMsg(null);

    try {
      const res = await apiFetch(`/api/students/${session.profileId}/submit-profile`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Submission failed');
      }

      setMsg({ type: 'success', text: 'Application submitted to Hostel Office for verification!' });
      loadProfile();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading student application profile...</div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Title & Onboarding Tracker */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h2 className="text-lg font-bold text-navy-900 tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-brand-teal" />
            Hostel Application & Profile Completion
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Fill in required student, parent, guardian, and proctor details for Hostel Office admission approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {profile?.eligibility_status === 'ELIGIBLE' ? (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Eligible for Allocation
            </span>
          ) : (
            <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Status: {profile?.eligibility_status || 'PENDING'}
            </span>
          )}
        </div>
      </div>

      {msg && (
        <div className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
          msg.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* 5 Grouped Form Sections */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section A: Student Information */}
        <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
          <div className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-brand-teal" />
            Section A — Student Academic Information
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Full Name</label>
              <input
                type="text"
                disabled
                value={profile?.full_name || ''}
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">USN / Registration Number</label>
              <input
                type="text"
                disabled
                value={profile?.college_id || ''}
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 cursor-not-allowed font-mono font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">College Email</label>
              <input
                type="email"
                disabled
                value={profile?.email || ''}
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Academic Year</label>
              <input
                type="text"
                disabled
                value={`Year ${profile?.academic_year || 2}`}
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Department / Branch</label>
              <input
                type="text"
                disabled
                value={profile?.department || 'CSE'}
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">Student Mobile Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-teal"
              />
            </div>
          </div>
        </div>

        {/* Section B: Parent / Guardian Information */}
        <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
          <div className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-brand-teal" />
            Section B — Parent / Guardian Information
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">Parent/Guardian Name</label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Parent full legal name"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-teal"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">Relationship</label>
              <select
                value={parentRel}
                onChange={(e) => setParentRel(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-teal"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Legal Guardian">Legal Guardian</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">Parent Mobile Number</label>
              <input
                type="text"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="+91 98765 00000"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-teal"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">Parent Email</label>
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-teal"
              />
            </div>
          </div>
        </div>

        {/* Section C: Local Guardian Details */}
        <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
          <div className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
            <Building className="w-4 h-4 text-brand-teal" />
            Section C — Local Guardian Information
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">Local Guardian Name</label>
              <input
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Guardian name"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-teal"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">Contact Phone</label>
              <input
                type="text"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="+91 91234 56789"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-teal"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">Residential Locality / Address</label>
              <input
                type="text"
                value={guardianAddress}
                onChange={(e) => setGuardianAddress(e.target.value)}
                placeholder="Locality / city"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-teal"
              />
            </div>
          </div>
        </div>

        {/* Section D: Assigned Proctor Information */}
        <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
          <div className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-teal" />
            Section D — Faculty Proctor Details (Staff-Verified)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Assigned Proctor Name</label>
              <input
                type="text"
                disabled
                value={profile?.proctor_name || 'Dr. Mehta (Proctor)'}
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Proctor Department</label>
              <input
                type="text"
                disabled
                value={profile?.proctor_department || 'Computer Science & Engineering'}
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Verification Status</label>
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Verified by Institutional Registry
              </div>
            </div>
          </div>
        </div>

        {/* Section E: Fee & Admission Status */}
        <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
          <div className="text-xs font-bold text-navy-900 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-brand-teal" />
            Section E — Hostel Fee Evidence & Priority Assignment
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">Fee Payment Reference / Challan ID</label>
              <input
                type="text"
                value={feeRef}
                onChange={(e) => setFeeRef(e.target.value)}
                placeholder="e.g. FEE-2026-BVB-001"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-teal font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Fee Verification Status</label>
              <div className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
                profile?.fee_status === 'VERIFIED'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : (profile?.fee_status === 'SUBMITTED' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-100 border-slate-200 text-slate-600')
              }`}>
                {profile?.fee_status === 'VERIFIED' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified by Hostel Office</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{profile?.fee_status === 'SUBMITTED' ? 'Under Review by Office' : 'Payment Evidence Required'}</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Assigned Allocation Priority</label>
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-navy-900 flex items-center justify-between">
                <span>{profile?.assigned_priority ? `Priority Rank #${profile.assigned_priority}` : 'Pending Fee Verification'}</span>
                {profile?.assigned_priority && (
                  <span className="text-[10px] text-teal-700 font-sans font-semibold bg-teal-50 px-1.5 py-0.5 rounded">
                    Authoritative
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            {profile?.profile_submitted 
              ? '✓ Application has been submitted to the Hostel Office for administrative review.'
              : 'Save your profile details or submit application for Hostel Office review.'}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Draft'}</span>
            </button>

            {!profile?.profile_submitted && (
              <button
                type="button"
                onClick={handleSubmitApplication}
                disabled={submitting}
                className="px-5 py-2 bg-brand-teal hover:bg-brand-tealHover text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Submit Application'}</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};
