import React, { useState } from 'react';
import { 
  Megaphone, 
  X, 
  Send, 
  AlertTriangle, 
  Users, 
  Building2, 
  CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { playNotificationChime } from '../utils/audioChime.js';

interface AdminBroadcastNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoticePublished?: () => void;
}

export const AdminBroadcastNoticeModal: React.FC<AdminBroadcastNoticeModalProps> = ({
  isOpen,
  onClose,
  onNoticePublished,
}) => {
  const { session } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'NOTICE' | 'ALLOTMENT' | 'SYSTEM'>('NOTICE');
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT' | 'HIGH'>('NORMAL');
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'STUDENTS' | 'ADMIN' | 'BVB_BLOCK'>('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Please provide both a title and message content for the notice.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/admin/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session.userId,
          'x-role': session.role,
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          category,
          priority,
          target_audience: targetAudience,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to publish notice');
      }

      setSuccess(true);
      playNotificationChime();

      // Trigger global event so bell updates immediately
      window.dispatchEvent(new Event('dormex-notification-broadcast'));

      if (onNoticePublished) {
        onNoticePublished();
      }

      setTimeout(() => {
        setSuccess(false);
        setTitle('');
        setMessage('');
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E6E8] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#203653] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2C8279] flex items-center justify-center text-white shadow-xs">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Broadcast Official Notice</h3>
              <p className="text-[11px] text-[#84d5ca] font-medium">
                Instant student dispatch with audio chime
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#17283B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">Notice published successfully! Broadcasting audio chime to active sessions.</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-[#203653] uppercase tracking-wider mb-1">
              Notice Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. BVB Floor 2 Allocation Commencing Tomorrow"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E6E8] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#2C8279] focus:border-transparent text-[#263345]"
              required
            />
          </div>

          {/* Category & Urgency Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#203653] uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E6E8] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#2C8279] text-[#263345] bg-white"
              >
                <option value="NOTICE">Official Circular</option>
                <option value="ALLOTMENT">Allocation Alert</option>
                <option value="SYSTEM">Hostel Operations Memo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#203653] uppercase tracking-wider mb-1">
                Urgency Level
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-[#E2E6E8] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#2C8279] text-[#263345] bg-white"
              >
                <option value="NORMAL">Normal Priority</option>
                <option value="URGENT">Urgent (Red Badge)</option>
                <option value="HIGH">High Alert</option>
              </select>
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-bold text-[#203653] uppercase tracking-wider mb-1">
              Target Audience
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTargetAudience('ALL')}
                className={`px-3 py-2 rounded-lg border font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
                  targetAudience === 'ALL'
                    ? 'bg-[#203653] text-white border-[#203653]'
                    : 'bg-[#F7F6F1] text-[#627084] border-[#E2E6E8] hover:bg-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Users</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetAudience('STUDENTS')}
                className={`px-3 py-2 rounded-lg border font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
                  targetAudience === 'STUDENTS'
                    ? 'bg-[#2C8279] text-white border-[#2C8279]'
                    : 'bg-[#F7F6F1] text-[#627084] border-[#E2E6E8] hover:bg-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Students Only</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetAudience('BVB_BLOCK')}
                className={`px-3 py-2 rounded-lg border font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
                  targetAudience === 'BVB_BLOCK'
                    ? 'bg-[#1D63B8] text-white border-[#1D63B8]'
                    : 'bg-[#F7F6F1] text-[#627084] border-[#E2E6E8] hover:bg-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>BVB Block</span>
              </button>
            </div>
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-xs font-bold text-[#203653] uppercase tracking-wider mb-1">
              Detailed Announcement *
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              placeholder="Enter official notice details, deadlines, maintenance instructions, or room allocation alerts..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E6E8] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#2C8279] text-[#263345] resize-none"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#E2E6E8] flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-[#E2E6E8] text-xs font-semibold text-[#627084] hover:bg-[#F7F6F1] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-[#203653] text-white text-xs font-bold hover:bg-[#17283B] transition-colors flex items-center space-x-2 shadow-xs disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5 text-[#D4B779]" />
              <span>{loading ? 'Publishing...' : 'Broadcast Notice Now'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
