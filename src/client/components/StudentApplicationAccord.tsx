import React, { useState, useEffect } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext.js';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Lock, 
  ShieldCheck, 
  ArrowRight,
  LogOut,
  Receipt,
  Clock,
  Building2,
  Phone,
  Shield,
  Check,
  UserCheck,
  HeartPulse,
  Award,
  Loader2
} from 'lucide-react';

interface StudentApplicationAccordProps {
  onAccordAccepted: () => void;
  onNavigateToStep?: (step: number) => void;
}

export const StudentApplicationAccord: React.FC<StudentApplicationAccordProps> = ({ 
  onAccordAccepted,
  onNavigateToStep 
}) => {
  const { session, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [terms, setTerms] = useState<any>(null);
  const [termsStatus, setTermsStatus] = useState<any>(null);
  const [isAgreed, setIsAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.profileId) return;

    // Load student profile, latest terms, and terms acceptance status in parallel
    Promise.all([
      apiFetch(`/api/students/${session.profileId}`).then((r) => r.ok ? r.json() : null),
      apiFetch('/api/terms/latest').then((r) => r.ok ? r.json() : null),
      apiFetch(`/api/students/${session.profileId}/terms-status`).then((r) => r.ok ? r.json() : null)
    ]).then(([prof, t, tStat]) => {
      if (prof) setProfile(prof);
      if (t) setTerms(t);
      if (tStat) {
        setTermsStatus(tStat);
        if (tStat.accepted) {
          setIsAgreed(true);
        }
      }
    });
  }, [session?.profileId]);

  const handleAgreeAndProceed = async () => {
    if (!isAgreed || !session?.profileId || !terms) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await apiFetch(`/api/students/${session.profileId}/accept-terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termsVersion: terms.version }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record accord acceptance');

      setSuccessMsg('Hostel Responsibility Accord cryptographically recorded.');
      setTimeout(() => {
        onAccordAccepted();
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const candidateInitials = session?.fullName
    ? session.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'ST';

  return (
    <div className="space-y-6">
      {/* Top Editorial / University Accord Banner */}
      <div className="bg-[#f0f4f6] rounded-2xl p-6 md:p-8 border border-[#E2E6E8] shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#2C8279] bg-[#E7F2ED] px-2.5 py-0.5 rounded-full border border-[#A8D5C2]">
                Official University Accord
              </span>
              <span className="text-xs text-[#627084]">·</span>
              <span className="text-xs text-[#627084] font-medium">
                Siddaganga Institute of Technology (SIT), Tumakuru
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#203653] tracking-tight">
              Hostel Allocation Application & Responsibility Accord
            </h1>
            <p className="text-xs md:text-sm text-[#627084] flex items-center gap-1.5 pt-0.5">
              <ShieldCheck className="w-4 h-4 text-[#2C8279] shrink-0" />
              <span>Academic Year 2024–2025 · BVB Block Allocation Pilot (Floor 2 ResAdmin)</span>
            </p>
          </div>

          {/* Student Banner Snippet Card */}
          <div className="bg-white p-4 rounded-xl border border-[#E2E6E8] shadow-sm flex items-center gap-4 w-full lg:w-auto min-w-[280px]">
            <div className="w-12 h-12 rounded-full bg-[#203653] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              {candidateInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase text-[#2C8279]">Active Applicant</span>
                <span className="px-1.5 py-0.2 rounded bg-[#203653]/10 text-[10px] text-[#203653] font-bold">
                  BVB-F2 Turn #{profile?.assigned_priority || '14'}
                </span>
              </div>
              <div className="text-sm font-bold text-[#203653] truncate">{session?.fullName}</div>
              <div className="text-[11px] text-[#627084] font-mono truncate">
                USN: {session?.collegeId} · {profile?.department || 'Dept. of CSE'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5-Step Linear Stepper Progress Bar */}
      <div className="bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-1 text-xs">
          <span className="text-[11px] font-bold text-[#627084] uppercase tracking-wider">
            Application Onboarding Workflow
          </span>
          <span className="font-semibold text-[#2C8279]">
            {termsStatus?.accepted ? 'Accord Certified · Window Open' : 'Step 5 of 5: Final Legal Sign-off'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Step 1 */}
          <div className="flex flex-col gap-1 p-3 bg-[#f0f4f6] rounded-lg border border-[#E2E6E8]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#627084] uppercase">01 / STEP</span>
              <span className="w-5 h-5 rounded-full bg-[#2C8279] text-white flex items-center justify-center text-[10px]">
                <Check className="w-3 h-3" />
              </span>
            </div>
            <div className="text-xs font-bold text-[#203653] truncate">Personal & Academic</div>
            <div className="text-[10px] text-[#627084] truncate">Completed & Verified</div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col gap-1 p-3 bg-[#f0f4f6] rounded-lg border border-[#E2E6E8]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#627084] uppercase">02 / STEP</span>
              <span className="w-5 h-5 rounded-full bg-[#2C8279] text-white flex items-center justify-center text-[10px]">
                <Check className="w-3 h-3" />
              </span>
            </div>
            <div className="text-xs font-bold text-[#203653] truncate">Parent & Family Contact</div>
            <div className="text-[10px] text-[#627084] truncate">On Record</div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col gap-1 p-3 bg-[#f0f4f6] rounded-lg border border-[#E2E6E8]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#627084] uppercase">03 / STEP</span>
              <span className="w-5 h-5 rounded-full bg-[#2C8279] text-white flex items-center justify-center text-[10px]">
                <Check className="w-3 h-3" />
              </span>
            </div>
            <div className="text-xs font-bold text-[#203653] truncate">Local Guardian Record</div>
            <div className="text-[10px] text-[#627084] truncate">Address On File</div>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col gap-1 p-3 bg-[#f0f4f6] rounded-lg border border-[#E2E6E8]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#627084] uppercase">04 / STEP</span>
              <span className="w-5 h-5 rounded-full bg-[#2C8279] text-white flex items-center justify-center text-[10px]">
                <Check className="w-3 h-3" />
              </span>
            </div>
            <div className="text-xs font-bold text-[#203653] truncate">Proctor Verification</div>
            <div className="text-[10px] text-[#627084] truncate">{profile?.proctor_name || 'Prof. M. S. Nagabhushan'}</div>
          </div>

          {/* Step 5 (Active) */}
          <div className={`flex flex-col gap-1 p-3 rounded-lg border transition-all ${
            termsStatus?.accepted
              ? 'bg-[#E7F2ED] border-[#A8D5C2]'
              : 'bg-[#203653] text-white border-[#203653] shadow-md'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase ${
                termsStatus?.accepted ? 'text-[#1E7B54]' : 'text-[#8a9fc1]'
              }`}>05 / STEP</span>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                termsStatus?.accepted ? 'bg-[#2C8279] text-white' : 'bg-[#D4B779] text-[#203653]'
              }`}>
                {termsStatus?.accepted ? <Check className="w-3 h-3" /> : '★'}
              </span>
            </div>
            <div className={`text-xs font-bold truncate ${
              termsStatus?.accepted ? 'text-[#1E7B54]' : 'text-white'
            }`}>Fee & Accord</div>
            <div className={`text-[10px] truncate ${
              termsStatus?.accepted ? 'text-[#2C8279]' : 'text-[#8a9fc1]'
            }`}>
              {termsStatus?.accepted ? 'Certified Sign-off' : 'Mandatory Sign-off'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Split-Screen Workspace (8 cols Left / 4 cols Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Main Accord & Verification Workspace (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Sub-section A: Fee Payment & Admission Verification */}
          <div className="bg-white p-6 rounded-xl border border-[#E2E6E8] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6E8] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#f0f4f6] text-[#203653] flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#627084]">Sub-section A</div>
                  <h2 className="text-base font-bold text-[#203653]">Fee Payment & Admission Verification</h2>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E7F2ED] text-[#1E7B54] border border-[#A8D5C2] text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#2C8279]" />
                <span>Fee Verified by Hostel Office</span>
              </div>
            </div>

            {/* Transaction Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#f0f4f6] p-4 rounded-lg border border-[#E2E6E8]">
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#627084]">SBI Collect Reference</div>
                <div className="font-mono font-bold text-sm text-[#203653]">
                  {profile?.fee_receipt_ref || 'DUK9281745'}
                </div>
                <div className="text-[11px] text-[#2C8279] flex items-center gap-1 font-medium">
                  <CheckCircle className="w-3 h-3" /> Bank Gateway Cleared
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#627084]">Transaction Timestamp</div>
                <div className="text-xs font-bold text-[#203653]">
                  {profile?.verified_payment_timestamp ? new Date(profile.verified_payment_timestamp).toLocaleDateString() : '12-Jul-2024'}
                </div>
                <div className="text-[11px] text-[#627084]">
                  {profile?.verified_payment_timestamp ? new Date(profile.verified_payment_timestamp).toLocaleTimeString() : '09:45:10 IST'} (Reconciled)
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#627084]">Provisional Priority</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-[#203653]">#{profile?.assigned_priority || '12'}</span>
                  <span className="text-[11px] text-[#627084]">/ 30 Cohort</span>
                </div>
                <div className="text-[11px] text-[#2C8279] font-medium">Eligible for Selection Window</div>
              </div>
            </div>

            <div className="p-3 bg-[#FAF4E6] border border-[#D4B779]/40 rounded-lg text-xs text-[#263345] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#D4B779] shrink-0" />
              <span>Hostel Maintenance & Mess Advance verified against Finance Division Ledger Roll (Receipt Serial: SIT/HO/24/7740).</span>
            </div>
          </div>

          {/* Sub-section B: Mandatory Legal Document Accord */}
          <div className="bg-white p-6 rounded-xl border border-[#E2E6E8] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E2E6E8] gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#ba1a1a]">Mandatory Accord</span>
                  <span className="text-xs text-[#627084]">·</span>
                  <span className="text-xs text-[#627084] font-medium">Sub-section B</span>
                </div>
                <h2 className="text-base font-bold text-[#203653] mt-0.5">
                  Hostel Room Responsibility & Allocation Agreement
                </h2>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded bg-[#f0f4f6] text-[#203653] border border-[#E2E6E8]">
                Document Version: SIT-HO-2024-V2.1
              </span>
            </div>

            {/* Legal Document Clauses Pane */}
            <div className="bg-[#f0f4f6] p-4 rounded-xl border border-[#E2E6E8] max-h-[460px] overflow-y-auto space-y-4">
              <div className="text-center pb-2 border-b border-[#E2E6E8]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#203653]">
                  Office of the Chief Warden · SIT Tumakuru Hostels
                </div>
                <div className="text-[11px] text-[#627084]">
                  General Residential Bylaws, Statutory Undertakings & Asset Custody Agreement
                </div>
              </div>

              {/* Clause 1 */}
              <div className="bg-white p-4 rounded-lg border border-[#E2E6E8] shadow-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-[#203653] text-white px-2 py-0.5 rounded">
                    Clause 1
                  </span>
                  <h3 className="text-xs font-bold text-[#203653]">Care of Room & Institutional Fixtures</h3>
                </div>
                <p className="text-xs text-[#627084] leading-relaxed">
                  The resident shall take utmost care of institutional property including cot frames, heavy-duty foam mattresses, modular study desks, ergonomics-rated task chairs, wardrobes, and all modular electrical switches. Any willful defacement, graffiti, drilling, electrical rewiring, or damage will attract automatic debit against the caution deposit alongside institutional disciplinary citation.
                </p>
              </div>

              {/* Clause 2 */}
              <div className="bg-white p-4 rounded-lg border border-[#E2E6E8] shadow-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-[#ba1a1a] text-white px-2 py-0.5 rounded">
                    Clause 2
                  </span>
                  <h3 className="text-xs font-bold text-[#203653]">Prohibited Substances, Ragging & Disciplinary Code</h3>
                </div>
                <p className="text-xs text-[#627084] leading-relaxed">
                  Siddaganga Institute of Technology maintains strict zero tolerance towards ragging in all forms as per Supreme Court of India directives. Possession, consumption, or facilitation of narcotics, alcoholic beverages, e-cigarettes, or incendiary items inside BVB Block premises warrants instant suspension, hostel de-registration, and police handover without notice.
                </p>
              </div>

              {/* Clause 3 */}
              <div className="bg-white p-4 rounded-lg border border-[#E2E6E8] shadow-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-[#203653] text-white px-2 py-0.5 rounded">
                    Clause 3
                  </span>
                  <h3 className="text-xs font-bold text-[#203653]">Non-binding Nature of Roommate Coordination Intent</h3>
                </div>
                <p className="text-xs text-[#627084] leading-relaxed">
                  While the DORMEX portal provides mutual roommate pairing tools, all preferred pairings remain provisional. Bed allotments operate strictly by published academic merit ranks and active turn-window timestamps. The Hostel Warden reserves ultimate executive prerogative to relocate residents for equitable community administration.
                </p>
              </div>

              {/* Clause 4 */}
              <div className="bg-white p-4 rounded-lg border border-[#E2E6E8] shadow-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-[#203653] text-white px-2 py-0.5 rounded">
                    Clause 4
                  </span>
                  <h3 className="text-xs font-bold text-[#203653]">Post-Allocation 48-Hour Room Change Regulations</h3>
                </div>
                <p className="text-xs text-[#627084] leading-relaxed">
                  Mutual room swaps or individual transfers are permissible only during the designated 48-hour Post-Allocation Window. Requests must be lodged digitally via the DORMEX Room Change Portal and bear bilateral consent along with concurrence from both corresponding Faculty Proctors.
                </p>
              </div>

              {/* Clause 5 */}
              <div className="bg-white p-4 rounded-lg border border-[#E2E6E8] shadow-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-[#203653] text-white px-2 py-0.5 rounded">
                    Clause 5
                  </span>
                  <h3 className="text-xs font-bold text-[#203653]">Vacating, Key Handover & Deposit Clearance Policies</h3>
                </div>
                <p className="text-xs text-[#627084] leading-relaxed">
                  Upon end of semester or voluntary de-boarding, residents must surrender physical keys, obtain inspection sign-off from the Block Caretaker, and complete digital 'No Objection Clearance'. Unreturned keys entail a flat rekeying charge of ₹1,500.
                </p>
              </div>
            </div>

            {/* Interactive Acknowledgment Box */}
            <div className="p-4 bg-[#f0f4f6] rounded-xl border border-[#E2E6E8] space-y-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAgreed}
                  disabled={termsStatus?.accepted}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#E2E6E8] text-[#2C8279] focus:ring-[#2C8279] cursor-pointer"
                />
                <span className="text-xs font-medium text-[#203653] leading-snug">
                  I confirm that I have read, understood, and unconditionally agree to abide by the Hostel Room Responsibility & Allocation Agreement and the official disciplinary code of Siddaganga Institute of Technology.
                </span>
              </label>
              <div className="flex items-center gap-1.5 text-[11px] text-[#627084] pl-7">
                <Lock className="w-3.5 h-3.5 text-[#2C8279]" />
                <span>Submission creates a cryptographically timestamped audit entry. Allocation eligibility remains subject to active cycle turn order.</span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-[#FDE8E8] border border-[#F8B4B4] text-[#C93B3B] text-xs font-medium rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-[#E7F2ED] border border-[#A8D5C2] text-[#1E7B54] text-xs font-medium rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Action Buttons Deck */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={logout}
                className="w-full sm:w-auto px-4 py-2 text-[#627084] hover:text-[#ba1a1a] hover:bg-[#FDE8E8]/40 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Decline & Sign Out</span>
              </button>

              <button
                type="button"
                onClick={handleAgreeAndProceed}
                disabled={!isAgreed || submitting}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                  isAgreed && !submitting
                    ? 'bg-[#2C8279] hover:bg-[#236B63] text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Recording Cryptographic Accord...</span>
                  </>
                ) : (
                  <>
                    <span>Agree & Proceed to Floor Map Allocation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Institutional Verification Badges & Side Cards (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Turn Status Live Card */}
          <div className="bg-[#203653] text-white p-5 rounded-xl border border-[#17283B] shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a9fc1]">Live Window Clock</span>
              <span className="px-2 py-0.5 rounded bg-[#9defe3] text-[#0d6f66] text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#016a62] animate-pulse" />
                Live Queue
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-2xl font-bold font-mono text-white">18m : 42s</div>
              <div className="text-[11px] text-[#8a9fc1]">Estimated time remaining until your selection slot</div>
            </div>

            <div className="w-full bg-[#07203C] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#84d5ca] h-full w-[65%]" />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#8a9fc1] pt-1">
              <span>Slot: 10:00 - 10:30 AM</span>
              <span className="font-mono">Batch BVB-F2-A</span>
            </div>
          </div>

          {/* Institutional Endorsements Digest */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E6E8] shadow-xs space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#627084] block border-b border-[#E2E6E8] pb-2">
              Institutional Endorsements
            </span>

            {/* Endorsement 1 */}
            <div className="flex items-start gap-3 p-3 bg-[#f0f4f6] rounded-lg border border-[#E2E6E8]">
              <Award className="w-5 h-5 text-[#2C8279] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#203653] truncate">Academic Standing Clearance</div>
                <div className="text-[11px] text-[#627084]">CGPA 8.84 · Zero Active Backlogs</div>
                <div className="text-[10px] font-semibold text-[#2C8279] mt-0.5">Cleared by Dean (Academic)</div>
              </div>
            </div>

            {/* Endorsement 2 */}
            <div className="flex items-start gap-3 p-3 bg-[#f0f4f6] rounded-lg border border-[#E2E6E8]">
              <ShieldCheck className="w-5 h-5 text-[#2C8279] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#203653] truncate">Hostel Discipline Clearance</div>
                <div className="text-[11px] text-[#627084]">Past Record Clean · BVB 1st Floor 2023-24</div>
                <div className="text-[10px] font-semibold text-[#2C8279] mt-0.5">Cleared by Chief Warden</div>
              </div>
            </div>

            {/* Endorsement 3 */}
            <div className="flex items-start gap-3 p-3 bg-[#f0f4f6] rounded-lg border border-[#E2E6E8]">
              <HeartPulse className="w-5 h-5 text-[#2C8279] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#203653] truncate">Medical Fitness Record</div>
                <div className="text-[11px] text-[#627084]">Blood Group: B+ · Emergency Contacts Verified</div>
                <div className="text-[10px] font-semibold text-[#2C8279] mt-0.5">Cleared by Campus Health Centre</div>
              </div>
            </div>
          </div>

          {/* Destination Building Card */}
          <div className="bg-white p-4 rounded-xl border border-[#E2E6E8] shadow-xs space-y-3">
            <div className="relative w-full h-36 rounded-lg bg-[#203653] flex flex-col justify-end p-3 overflow-hidden text-white">
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/40 text-[10px] font-mono">
                CAD: BVB-F2
              </div>
              <div className="relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#84d5ca]">Destination Building</span>
                <div className="text-sm font-bold">BVB Memorial Block</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#627084] pt-1">
              <span>Floor 2 Occupancy: 76% Booked</span>
              <span className="font-bold text-[#2C8279]">22 Beds Free</span>
            </div>
          </div>

          {/* Warden Administrative Office Helpdesk */}
          <div className="p-4 rounded-xl bg-[#f0f4f6] border border-[#E2E6E8] space-y-1.5">
            <div className="flex items-center gap-2 text-[#203653]">
              <Phone className="w-4 h-4 text-[#2C8279]" />
              <span className="text-xs font-bold">Allocation Helpdesk & Queries</span>
            </div>
            <p className="text-[11px] text-[#627084] leading-relaxed">
              For discrepancy with fee recognition or USN mapping, visit ResAdmin Counter #2, Main Warden Office, Ground Floor, BVB Block.
            </p>
            <div className="text-[11px] font-mono text-[#203653] font-semibold pt-1">
              Phone: 0816-2282696 · Ext 441
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
