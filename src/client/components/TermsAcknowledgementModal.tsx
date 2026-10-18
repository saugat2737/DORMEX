import React, { useState, useEffect } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext.js';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Lock, 
  ShieldAlert, 
  ArrowRight,
  LogOut,
  ChevronDown,
  Info
} from 'lucide-react';

interface TermsModalProps {
  onAccepted: () => void;
}

export const TermsAcknowledgementModal: React.FC<TermsModalProps> = ({ onAccepted }) => {
  const { session, logout } = useAuth();
  const [terms, setTerms] = useState<any>(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [confirmedChecked, setConfirmedChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/terms/latest').then(async (res) => {
      if (res.ok) {
        setTerms(await res.json());
      }
    });
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 30) {
      setHasScrolledToEnd(true);
    }
  };

  const handleAccept = async () => {
    if (!confirmedChecked || !terms || !session?.profileId) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await apiFetch(`/api/students/${session.profileId}/accept-terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termsVersion: terms.version }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record acceptance');

      onAccepted();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#203653]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full border border-[#E2E6E8] shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="p-6 bg-[#F7F6F1] border-b border-[#E2E6E8] flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#E7F2ED] border border-[#2C8279]/30 text-[#2C8279] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#2C8279] bg-[#E7F2ED] px-2 py-0.5 rounded inline-block mb-1">
                Official University Accord • Step 5 of 5
              </div>
              <h2 className="text-lg font-bold text-[#203653] leading-tight">
                Hostel Allocation Application & Responsibility Accord
              </h2>
              <div className="text-[11px] text-[#627084] mt-0.5">
                B.V.B. Campus Hostel Allocation Pilot • Mandatory Sign-off
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="text-xs text-[#627084] hover:text-[#263345] flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[#E2E6E8] bg-white transition-colors"
            title="Decline and Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Scrollable Terms Document Body */}
        <div 
          onScroll={handleScroll}
          className="p-6 overflow-y-auto space-y-4 text-xs text-[#263345] leading-relaxed font-sans divide-y divide-[#E2E6E8]"
        >
          <div className="p-3.5 bg-[#FAF4E6] border border-[#D4B779]/50 rounded-lg text-[#263345] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#D4B779] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#203653]">Statutory Acknowledgment:</span>
              <p className="mt-0.5 text-xs text-[#627084]">
                Before participating in room allocation or reserving seats, institutional policy requires all admitted students to review and accept the official room responsibility terms.
              </p>
            </div>
          </div>

          <div className="pt-3 prose prose-sm max-w-none">
            <div className="font-semibold text-sm text-[#203653] mb-2">
              {terms?.title || 'Hostel Room Responsibility & Allocation Agreement'}
            </div>
            <div className="whitespace-pre-line text-[#263345] bg-[#F7F6F1] p-4 rounded-lg border border-[#E2E6E8] font-mono text-[11px] leading-relaxed">
              {terms?.content || 'Loading official agreement content...'}
            </div>
          </div>

          <div className="pt-3 text-[11px] text-[#627084]">
            Version: {terms?.version || 1} • Published by Authorized Administration • Institutional Policy Hash: <code className="font-mono text-[#203653]">{terms?.content_hash || 'hash_v1'}</code>
          </div>
        </div>

        {/* Footer Acknowledgement Controls */}
        <div className="p-6 bg-[#F7F6F1] border-t border-[#E2E6E8] space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-start gap-3">
            <input
              id="confirm-terms"
              type="checkbox"
              checked={confirmedChecked}
              onChange={(e) => setConfirmedChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#E2E6E8] text-[#2C8279] focus:ring-[#2C8279] cursor-pointer"
            />
            <label htmlFor="confirm-terms" className="text-xs text-[#263345] font-medium cursor-pointer">
              I confirm that I have read and understood the Hostel Room Responsibility & Allocation Agreement and agree to follow all applicable hostel rules and code of conduct.
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={logout}
              type="button"
              className="text-xs text-[#627084] hover:text-[#263345] font-medium px-3 py-2 rounded hover:bg-slate-200/60 transition-colors"
            >
              Decline & Exit
            </button>

            <button
              onClick={handleAccept}
              disabled={!confirmedChecked || submitting}
              className={`px-5 py-2.5 rounded text-xs font-bold transition-all flex items-center gap-2 ${
                confirmedChecked && !submitting
                  ? 'bg-[#2C8279] hover:bg-[#236B63] text-white shadow-sm'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>{submitting ? 'Securing Cryptographic Accord...' : 'Agree & Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
