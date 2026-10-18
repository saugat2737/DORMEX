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
    <div className="bg-white rounded-xl border border-[#E2E6E8] shadow-sm p-6 space-y-6">
      {/* 5-Step Linear Stepper Progress Bar matching Stitch Accord Prototype */}
      <div className="w-full bg-[#F7F6F1] p-4 rounded-lg border border-[#E2E6E8] flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1">
          <span className="text-[11px] font-bold text-[#627084] uppercase tracking-wider">
            Hostel Application Onboarding Workflow
          </span>
          <span className="text-xs text-[#2C8279] font-semibold">
            {profile?.profile_submitted ? 'Step 4 of 5: Awaiting / Verified Accord' : 'Step 1 of 5: In Progress'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Step 1: Personal & Academic */}
          <div className={`flex flex-col gap-1 p-2.5 rounded-lg border text-xs transition-all ${
            profile ? 'bg-white border-[#2C8279]/30 text-[#203653]' : 'bg-[#E5E9EB] border-[#E2E6E8] text-[#627084]'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#627084]">01 / STEP</span>
              <span className="w-4 h-4 rounded-full bg-[#2C8279] text-white flex items-center justify-center text-[9px] font-bold">✓</span>
            </div>
            <div className="font-semibold text-xs truncate">Personal & Academic</div>
            <div className="text-[10px] text-[#627084] truncate">Auto-matched from USN</div>
          </div>

          {/* Step 2: Parent & Family Contact */}
          <div className={`flex flex-col gap-1 p-2.5 rounded-lg border text-xs transition-all ${
            parentPhone ? 'bg-white border-[#2C8279]/30 text-[#203653]' : 'bg-[#E5E9EB] border-[#E2E6E8] text-[#627084]'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#627084]">02 / STEP</span>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                parentPhone ? 'bg-[#2C8279] text-white' : 'bg-slate-300 text-slate-600'
              }`}>{parentPhone ? '✓' : '2'}</span>
            </div>
            <div className="font-semibold text-xs truncate">Parent & Family Contact</div>
            <div className="text-[10px] text-[#627084] truncate">{parentPhone ? 'Contact On File' : 'Required Details'}</div>
          </div>

          {/* Step 3: Local Guardian */}
          <div className={`flex flex-col gap-1 p-2.5 rounded-lg border text-xs transition-all ${
            guardianAddress ? 'bg-white border-[#2C8279]/30 text-[#203653]' : 'bg-[#E5E9EB] border-[#E2E6E8] text-[#627084]'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#627084]">03 / STEP</span>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                guardianAddress ? 'bg-[#2C8279] text-white' : 'bg-slate-300 text-slate-600'
              }`}>{guardianAddress ? '✓' : '3'}</span>
            </div>
            <div className="font-semibold text-xs truncate">Local Guardian</div>
            <div className="text-[10px] text-[#627084] truncate">{guardianAddress ? 'Address Logged' : 'Campus Proximity'}</div>
          </div>

          {/* Step 4: Proctor Verification */}
          <div className="flex flex-col gap-1 p-2.5 bg-white border border-[#2C8279]/30 rounded-lg text-xs text-[#203653]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#627084]">04 / STEP</span>
              <span className="w-4 h-4 rounded-full bg-[#2C8279] text-white flex items-center justify-center text-[9px] font-bold">✓</span>
            </div>
            <div className="font-semibold text-xs truncate">Faculty Proctor</div>
            <div className="text-[10px] text-[#2C8279] truncate" title={profile?.proctor_name || 'Dr. Mehta'}>
              {profile?.proctor_name || 'Dr. Mehta (Verified)'}
            </div>
          </div>

          {/* Step 5: Fee & Accord */}
          <div className={`flex flex-col gap-1 p-2.5 rounded-lg text-xs ${
            profile?.fee_status === 'VERIFIED'
              ? 'bg-[#203653] text-white shadow-sm'
              : 'bg-[#FAF4E6] border border-[#D4B779]/50 text-[#203653]'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono ${profile?.fee_status === 'VERIFIED' ? 'text-slate-300' : 'text-[#627084]'}`}>05 / STEP</span>
              <span className="w-4 h-4 rounded-full bg-[#2C8279] text-white flex items-center justify-center text-[9px] font-bold">
                {profile?.fee_status === 'VERIFIED' ? '✓' : '•'}
              </span>
            </div>
            <div className="font-semibold text-xs truncate">Fee & Accord</div>
            <div className={`text-[10px] truncate ${profile?.fee_status === 'VERIFIED' ? 'text-[#84d5ca]' : 'text-[#D4B779]'}`}>
              {profile?.fee_status === 'VERIFIED' ? `Rank #${profile.assigned_priority}` : 'Hostel Office Review'}
            </div>
          </div>
        </div>
      </div>

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E6E8]">
        <div>
          <h2 className="text-base font-bold text-[#203653] tracking-tight flex items-center gap-2">
            <User className="w-4 h-4 text-[#2C8279]" />
            Student Application & Mandatory Onboarding Profile
          </h2>
          <p className="text-xs text-[#627084] mt-0.5">
            Fill in required student, parent, local guardian, and fee challan details for Hostel Office admission approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {profile?.eligibility_status === 'ELIGIBLE' ? (
            <span className="px-3 py-1 bg-[#E7F2ED] text-[#1E7B54] border border-[#A8D5C2] rounded text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1E7B54]" />
              Eligible for Allocation
            </span>
          ) : (
            <span className="px-3 py-1 bg-[#FAF4E6] text-[#9C7A2E] border border-[#D4B779] rounded text-xs font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#D4B779]" />
              Status: {profile?.eligibility_status || 'PENDING'}
            </span>
          )}
        </div>
      </div>

      {msg && (
        <div className={`p-3.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
          msg.type === 'success' 
            ? 'bg-[#E7F2ED] border border-[#A8D5C2] text-[#1E7B54]' 
            : 'bg-[#FDE8E8] border border-[#F8B4B4] text-[#C93B3B]'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-[#1E7B54] shrink-0" /> : <AlertCircle className="w-4 h-4 text-[#C93B3B] shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* 5 Grouped Form Sections */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section A: Student Information */}
        <div className="p-4 bg-[#F7F6F1] rounded-lg border border-[#E2E6E8] space-y-3">
          <div className="text-xs font-bold text-[#203653] uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-[#2C8279]" />
            Section A — Student Academic Information
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#627084] block mb-1">Full Name</label>
              <input
                type="text"
                disabled
                value={profile?.full_name || ''}
                className="w-full text-xs bg-[#E5E9EB] border border-[#E2E6E8] rounded px-3 py-2 text-[#263345] cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#627084] block mb-1">USN / Registration Number</label>
              <input
                type="text"
                disabled
                value={profile?.college_id || ''}
                className="w-full text-xs bg-[#E5E9EB] border border-[#E2E6E8] rounded px-3 py-2 text-[#263345] cursor-not-allowed font-mono font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#627084] block mb-1">College Email</label>
              <input
                type="email"
                disabled
                value={profile?.email || ''}
                className="w-full text-xs bg-[#E5E9EB] border border-[#E2E6E8] rounded px-3 py-2 text-[#263345] cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#627084] block mb-1">Academic Year</label>
              <input
                type="text"
                disabled
                value={`Year ${profile?.academic_year || 2}`}
                className="w-full text-xs bg-[#E5E9EB] border border-[#E2E6E8] rounded px-3 py-2 text-[#263345] cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#627084] block mb-1">Department / Branch</label>
              <input
                type="text"
                disabled
                value={profile?.department || 'CSE'}
                className="w-full text-xs bg-[#E5E9EB] border border-[#E2E6E8] rounded px-3 py-2 text-[#263345] cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#263345] block mb-1">Student Mobile Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full text-xs bg-white border border-[#E2E6E8] rounded px-3 py-2 text-[#263345] focus:outline-none focus:ring-1 focus:ring-[#203653]"
              />
            </div>
          </div>
        </div>

        {/* Section B: Parent / Guardian Information */}
        <div className="p-4 bg-[#F7F6F1] rounded-lg border border-[#E2E6E8] space-y-3">
          <div className="text-xs font-bold text-[#203653] uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#2C8279]" />
            Section B — Parent / Family Contact Information
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#263345] block mb-1">Parent/Guardian Name</label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="Parent full legal name"
                className="w-full text-xs bg-white border border-[#E2E6E8] rounded px-3 py-2 text-[#263345] focus:outline-none focus:ring-1 focus:ring-[#203653]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#263345] block mb-1">Relationship</label>
              <select
                value={parentRel}
                onChange={(e) => setParentRel(e.target.value)}
                className="w-full text-xs bg-white border border-[#E2E6E8] rounded px-3 py-2 text-[#263345] focus:outline-none focus:ring-1 focus:ring-[#203653]"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Legal Guardian">Legal Guardian</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#263345] block mb-1">Parent Mobile Number</label>
              <input
                type="text"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                placeholder="+91 98765 00000"
                className="w-full text-xs bg-white border border-[#E2E6E8] rounded px-3 py-2 text-[#263345] focus:outline-none focus:ring-1 focus:ring-[#203653]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#263345] block mb-1">Parent Email</label>
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
                className="w-full text-xs bg-white border border-[#E2E6E8] rounded px-3 py-2 text-[#263345] focus:outline-none focus:ring-1 focus:ring-[#203653]"
              />
            </div>
          </div>
        </div>

        {/* Section C: Local Guardian Details */}
        <div className="p-4 bg-[#F7F6F1] rounded-lg border border-[#E2E6E8] space-y-3">
          <div className="text-xs font-bold text-[#203653] uppercase tracking-wider flex items-center gap-1.5">
            <Building className="w-4 h-4 text-[#2C8279]" />
            Section C — Local Guardian Information
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#263345] block mb-1">Local Guardian Name</label>
              <input
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="Guardian name"
                className="w-full text-xs bg-white border border-[#E2E6E8] rounded px-3 py-2 text-[#263345] focus:outline-none focus:ring-1 focus:ring-[#203653]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#263345] block mb-1">Contact Phone</label>
              <input
                type="text"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                placeholder="+91 91234 56789"
                className="w-full text-xs bg-white border border-[#E2E6E8] rounded px-3 py-2 text-[#263345] focus:outline-none focus:ring-1 focus:ring-[#203653]"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#263345] block mb-1">Residential Locality / Address</label>
              <input
                type="text"
                value={guardianAddress}
                onChange={(e) => setGuardianAddress(e.target.value)}
                placeholder="Locality / address"
                className="w-full text-xs bg-white border border-[#E2E6E8] rounded px-3 py-2 text-[#263345] focus:outline-none focus:ring-1 focus:ring-[#203653]"
              />
            </div>
          </div>
        </div>

        {/* Section D: Assigned Proctor Information */}
        <div className="p-4 bg-[#F7F6F1] rounded-lg border border-[#E2E6E8] space-y-3">
          <div className="text-xs font-bold text-[#203653] uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2C8279]" />
            Section D — Faculty Proctor Details (Institutional Record)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#627084] block mb-1">Assigned Proctor Name</label>
              <input
                type="text"
                disabled
                value={profile?.proctor_name || 'Prof. M. S. Nagabhushan'}
                className="w-full text-xs bg-[#E5E9EB] border border-[#E2E6E8] rounded px-3 py-2 text-[#263345] cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#627084] block mb-1">Proctor Department</label>
              <input
                type="text"
                disabled
                value={profile?.proctor_department || 'Computer Science & Engineering'}
                className="w-full text-xs bg-[#E5E9EB] border border-[#E2E6E8] rounded px-3 py-2 text-[#263345] cursor-not-allowed font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#627084] block mb-1">Verification Status</label>
              <div className="px-3 py-2 bg-[#E7F2ED] border border-[#A8D5C2] rounded text-xs font-semibold text-[#1E7B54] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1E7B54]" />
                Institutional Proctor Verified
              </div>
            </div>
          </div>
        </div>

        {/* Section E: Fee & Admission Status */}
        <div className="p-4 bg-[#F7F6F1] rounded-lg border border-[#E2E6E8] space-y-3">
          <div className="text-xs font-bold text-[#203653] uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-[#2C8279]" />
            Section E — Hostel Fee Evidence & Priority Assignment
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-[#263345] block mb-1">SBI Collect / Challan Reference</label>
              <input
                type="text"
                value={feeRef}
                onChange={(e) => setFeeRef(e.target.value)}
                placeholder="e.g. DUJ7890123"
                className="w-full text-xs bg-white border border-[#E2E6E8] rounded px-3 py-2 text-[#203653] focus:outline-none focus:ring-1 focus:ring-[#203653] font-mono font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#627084] block mb-1">Fee Verification Status</label>
              <div className={`px-3 py-2 rounded text-xs font-medium border flex items-center gap-1.5 ${
                profile?.fee_status === 'VERIFIED'
                  ? 'bg-[#E7F2ED] border-[#A8D5C2] text-[#1E7B54]'
                  : (profile?.fee_status === 'SUBMITTED' ? 'bg-[#FAF4E6] border-[#D4B779] text-[#9C7A2E]' : 'bg-[#E5E9EB] border-[#E2E6E8] text-[#627084]')
              }`}>
                {profile?.fee_status === 'VERIFIED' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1E7B54]" />
                    <span className="font-semibold">Fee Verified by Hostel Office</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-[#D4B779]" />
                    <span>{profile?.fee_status === 'SUBMITTED' ? 'Under Review by Office' : 'Payment Evidence Required'}</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-[#627084] block mb-1">Assigned Allocation Priority</label>
              <div className="px-3 py-2 bg-white border border-[#E2E6E8] rounded text-xs font-mono font-bold text-[#203653] flex items-center justify-between">
                <span>{profile?.assigned_priority ? `Priority Rank #${profile.assigned_priority}` : 'Pending Fee Verification'}</span>
                {profile?.assigned_priority && (
                  <span className="text-[10px] text-[#2C8279] font-sans font-semibold bg-[#E7F2ED] px-2 py-0.5 rounded">
                    Authoritative
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-[#E2E6E8]">
          <div className="text-xs text-[#627084]">
            {profile?.profile_submitted 
              ? '✓ Application has been submitted to the Hostel Office for administrative review.'
              : 'Save your profile details or submit application for Hostel Office review.'}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 border border-[#E2E6E8] bg-white hover:bg-[#F7F6F1] text-[#263345] text-xs font-semibold rounded shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Draft'}</span>
            </button>

            {!profile?.profile_submitted && (
              <button
                type="button"
                onClick={handleSubmitApplication}
                disabled={submitting}
                className="px-5 py-2 bg-[#203653] hover:bg-[#17283B] text-white text-xs font-bold rounded shadow-xs transition-colors flex items-center gap-1.5"
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
