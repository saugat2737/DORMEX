import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Megaphone, 
  AlertCircle, 
  CheckCircle2, 
  CheckCheck, 
  Volume2, 
  VolumeX, 
  X, 
  Clock, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { playNotificationChime } from '../utils/audioChime.js';

export interface NotificationItem {
  id: string;
  category: 'NOTICE' | 'COMPLAINT' | 'ALLOTMENT' | 'SYSTEM';
  priority: 'NORMAL' | 'URGENT' | 'HIGH';
  title: string;
  message: string;
  target_audience: string;
  building_id?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
  author_name?: string | null;
  created_at: string;
  is_read: boolean;
}

interface NotificationCenterProps {
  onNavigateTab?: (tab: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigateTab }) => {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NOTICE' | 'ALLOTMENT' | 'COMPLAINT'>('ALL');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('dormex_notif_sound') !== 'false';
  });
  const [loading, setLoading] = useState(false);

  const prevUnreadRef = useRef<number>(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Toggle sound preference
  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    localStorage.setItem('dormex_notif_sound', String(nextState));
    if (nextState) {
      playNotificationChime();
    }
  };

  // Fetch notifications from server
  const fetchNotifications = async (playSoundOnNew = true) => {
    if (!session) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: {
          'x-user-id': session.userId,
          'x-role': session.role,
        },
      });

      if (!res.ok) return;
      const data = await res.json();
      const items: NotificationItem[] = data.notifications || [];
      const newUnread: number = data.unreadCount || 0;

      // Play audio chime if new unread notification arrived
      if (playSoundOnNew && soundEnabled && newUnread > prevUnreadRef.current && prevUnreadRef.current !== 0) {
        playNotificationChime();
      }

      prevUnreadRef.current = newUnread;
      setNotifications(items);
      setUnreadCount(newUnread);
    } catch (err) {
      console.debug('Failed to fetch notifications:', err);
    }
  };

  // Initial fetch and 10s live polling
  useEffect(() => {
    if (!session) return;
    fetchNotifications(false);
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 10000);

    // Listen for custom broadcast events across the window
    const handleBroadcast = () => fetchNotifications(true);
    window.addEventListener('dormex-notification-broadcast', handleBroadcast);

    return () => {
      clearInterval(interval);
      window.removeEventListener('dormex-notification-broadcast', handleBroadcast);
    };
  }, [session?.userId, soundEnabled]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark single as read
  const markAsRead = async (id: string, refType?: string | null) => {
    if (!session) return;
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session.userId,
          'x-role': session.role,
        },
        body: JSON.stringify({ id }),
      });

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Quick navigation if applicable
      if (onNavigateTab && refType) {
        if (refType === 'COMPLAINT') {
          onNavigateTab(session.role === 'STUDENT' ? 'student_complaints' : 'admin_complaints');
          setIsOpen(false);
        } else if (refType === 'ALLOCATION' || refType === 'ALLOCATION_CYCLE') {
          onNavigateTab(session.role === 'STUDENT' ? 'student_allocation' : 'admin_overview');
          setIsOpen(false);
        }
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!session) return;
    try {
      setLoading(true);
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': session.userId,
          'x-role': session.role,
        },
        body: JSON.stringify({ all: true }),
      });

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      prevUnreadRef.current = 0;
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered list
  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'ALL') return true;
    return n.category === activeFilter;
  });

  // Relative time helper
  const getRelativeTime = (isoString: string) => {
    try {
      const now = Date.now();
      const past = new Date(isoString).getTime();
      const diffSec = Math.floor((now - past) / 1000);

      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Header Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications & Notices"
        className={`p-2 rounded-full transition-all relative ${
          isOpen
            ? 'bg-[#203653] text-white shadow-xs'
            : 'text-[#627084] hover:text-[#203653] hover:bg-[#F7F6F1]'
        }`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#C93B3B] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Notification Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-84 sm:w-96 bg-white rounded-xl shadow-xl border border-[#E2E6E8] z-50 overflow-hidden font-sans animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="bg-[#203653] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Megaphone className="w-4 h-4 text-[#D4B779]" />
              <span className="text-xs font-bold tracking-tight">Notification Center</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#C93B3B] text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleSound}
                title={soundEnabled ? 'Mute notification sound' : 'Enable notification sound'}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#17283B] transition-colors"
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-[#84d5ca]" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={loading}
                  title="Mark all as read"
                  className="flex items-center space-x-1 text-[11px] font-medium text-slate-300 hover:text-white px-2 py-0.5 rounded hover:bg-[#17283B] transition-colors"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Mark read</span>
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#17283B]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-3 py-2 bg-[#F7F6F1] border-b border-[#E2E6E8] flex items-center space-x-1.5 overflow-x-auto text-[11px]">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors shrink-0 ${
                activeFilter === 'ALL'
                  ? 'bg-[#203653] text-white'
                  : 'text-[#627084] hover:bg-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('NOTICE')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors shrink-0 ${
                activeFilter === 'NOTICE'
                  ? 'bg-[#2C8279] text-white'
                  : 'text-[#627084] hover:bg-white'
              }`}
            >
              Notices
            </button>
            <button
              onClick={() => setActiveFilter('ALLOTMENT')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors shrink-0 ${
                activeFilter === 'ALLOTMENT'
                  ? 'bg-[#1D63B8] text-white'
                  : 'text-[#627084] hover:bg-white'
              }`}
            >
              Allotments
            </button>
            <button
              onClick={() => setActiveFilter('COMPLAINT')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors shrink-0 ${
                activeFilter === 'COMPLAINT'
                  ? 'bg-[#E06A26] text-white'
                  : 'text-[#627084] hover:bg-white'
              }`}
            >
              Complaints
            </button>
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#E2E6E8]/70">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-[#627084]">
                <Bell className="w-8 h-8 mx-auto text-[#627084]/40 mb-2" />
                <div className="text-xs font-semibold">No notifications in this filter</div>
                <div className="text-[10px] mt-0.5 text-slate-400">
                  You're all caught up with hostel notices and updates.
                </div>
              </div>
            ) : (
              filteredNotifications.map(item => {
                const isUrgent = item.priority === 'URGENT' || item.priority === 'HIGH';
                return (
                  <div
                    key={item.id}
                    onClick={() => markAsRead(item.id, item.reference_type)}
                    className={`p-3.5 hover:bg-[#F7F6F1] transition-colors cursor-pointer relative ${
                      !item.is_read ? 'bg-[#FAF8F5]' : 'bg-white'
                    }`}
                  >
                    {!item.is_read && (
                      <span className="absolute top-4 left-2 w-1.5 h-1.5 rounded-full bg-[#2C8279]" />
                    )}

                    <div className="pl-2">
                      {/* Top Meta Line */}
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <div className="flex items-center space-x-1.5">
                          {item.category === 'NOTICE' && (
                            <span className="px-1.5 py-0.2 rounded bg-[#FAF4E6] text-[#977322] font-bold border border-[#D4B779]/40">
                              Official Notice
                            </span>
                          )}
                          {item.category === 'ALLOTMENT' && (
                            <span className="px-1.5 py-0.2 rounded bg-[#EBF5FB] text-[#1D63B8] font-bold border border-[#A4D4F4]">
                              Allotment
                            </span>
                          )}
                          {item.category === 'COMPLAINT' && (
                            <span className="px-1.5 py-0.2 rounded bg-[#FDF2E9] text-[#E06A26] font-bold border border-[#F5CBA7]">
                              Complaints Desk
                            </span>
                          )}

                          {isUrgent && (
                            <span className="px-1.5 py-0.2 rounded bg-red-100 text-[#C93B3B] font-bold uppercase tracking-wider animate-pulse">
                              Urgent
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 text-[#627084]">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{getRelativeTime(item.created_at)}</span>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`text-xs ${
                            !item.is_read ? 'font-bold text-[#203653]' : 'font-semibold text-slate-700'
                          }`}
                        >
                          {item.title}
                        </div>
                        {item.reference_type && (
                          <ExternalLink className="w-3 h-3 text-[#627084]/60 shrink-0 mt-0.5" />
                        )}
                      </div>

                      {/* Message Body */}
                      <p className="text-[11px] text-[#627084] mt-1 leading-relaxed">
                        {item.message}
                      </p>

                      {/* Author Tag */}
                      {item.author_name && (
                        <div className="mt-1.5 text-[9.5px] text-slate-400 font-medium">
                          Published by <span className="text-slate-600">{item.author_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-[#F7F6F1] border-t border-[#E2E6E8] flex items-center justify-between text-[10px] text-[#627084]">
            <div className="flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-[#2C8279]" />
              <span>Real-time DORMEX Dispatch</span>
            </div>
            <span>Auto-syncs every 10s</span>
          </div>
        </div>
      )}
    </div>
  );
};
