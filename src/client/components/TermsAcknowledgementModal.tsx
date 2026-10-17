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
    <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-brand-teal flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded-full inline-block mb-1">
                Mandatory Onboarding Step
              </div>
              <h2 className="text-lg font-bold text-navy-900 leading-tight">
                Hostel Room Responsibility & Allocation Agreement
              </h2>
            </div>
          </div>

          <button
            onClick={logout}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white"
            title="Decline and Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Scrollable Terms Document Body */}
        <div 
          onScroll={handleScroll}
          className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed font-sans divide-y divide-slate-100"
        >
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Required Acknowledgment:</span>
              <p className="mt-0.5">
                Before participating in room allocation or reserving seats, institutional policy requires all admitted students to review and accept the official room responsibility terms.
              </p>
            </div>
          </div>

          <div className="pt-3 prose prose-sm max-w-none">
            <div className="font-semibold text-sm text-navy-900 mb-2">
              {terms?.title || 'Hostel Room Responsibility & Allocation Agreement'}
            </div>
            <div className="whitespace-pre-line text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-[11px]">
              {terms?.content || 'Loading official agreement content...'}
            </div>
          </div>

          <div className="pt-3 text-[11px] text-slate-500">
            Version: {terms?.version || 1} • Published by Authorized Administration • Institutional Policy Hash: {terms?.content_hash || 'hash_v1'}
          </div>
        </div>

        {/* Footer Acknowledgement Controls */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
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
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-teal focus:ring-brand-teal cursor-pointer"
            />
            <label htmlFor="confirm-terms" className="text-xs text-slate-700 font-medium cursor-pointer">
              I confirm that I have read and understood the Hostel Room Responsibility & Allocation Agreement and agree to follow all applicable hostel rules and code of conduct.
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={logout}
              type="button"
              className="text-xs text-slate-600 hover:text-slate-900 font-medium px-3 py-2 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              Decline & Exit
            </button>

            <button
              onClick={handleAccept}
              disabled={!confirmedChecked || submitting}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                confirmedChecked && !submitting
                  ? 'bg-brand-teal hover:bg-brand-tealHover text-white shadow-md'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>{submitting ? 'Recording Acceptance...' : 'Agree & Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
