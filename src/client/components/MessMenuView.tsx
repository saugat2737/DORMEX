import React, { useState, useEffect } from 'react';
import { apiFetch, useAuth } from '../context/AuthContext.js';
import { 
  Utensils, 
  Calendar, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Eye, 
  ZoomIn, 
  History,
  FileImage,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react';

interface MessMenuRecord {
  id: string;
  week_start_date: string;
  week_end_date: string;
  mess_scope: string;
  image_url: string;
  original_filename: string;
  content_type: string;
  file_size_bytes: number;
  description?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  published_at?: string | null;
  created_at: string;
}

export const MessMenuView: React.FC = () => {
  const { session } = useAuth();
  const isStaff = session?.role && ['HOSTEL_OFFICE', 'WARDEN', 'CHIEF_WARDEN', 'SUPER_ADMIN'].includes(session.role);

  const [activeMenu, setActiveMenu] = useState<MessMenuRecord | null>(null);
  const [menuHistory, setMenuHistory] = useState<MessMenuRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'manage'>(isStaff ? 'manage' : 'current');

  // Staff Upload State
  const [form, setForm] = useState({
    week_start_date: new Date().toISOString().split('T')[0],
    week_end_date: new Date(Date.now() + 6 * 86400000).toISOString().split('T')[0],
    mess_scope: 'CAMPUS_CENTRAL',
    description: '',
    publish_immediately: true,
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ filename: string; mime: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchActiveMenu = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/mess/menu/active');
      if (res.ok) {
        const data = await res.json();
        setActiveMenu(data);
      }
    } catch (err) {
      console.debug('Failed to load active menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuHistory = async () => {
    try {
      const res = await apiFetch('/api/mess/menus');
      if (res.ok) {
        const data = await res.json();
        setMenuHistory(data);
      }
    } catch (err) {
      console.debug('Failed to load menu history:', err);
    }
  };

  useEffect(() => {
    fetchActiveMenu();
    fetchMenuHistory();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMsg({ type: 'error', text: 'Please upload a valid image file (JPEG, PNG, or WebP).' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'File size exceeds 10MB limit.' });
      return;
    }

    setFileMeta({
      filename: file.name,
      mime: file.type,
      size: file.size,
    });

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewImage || !fileMeta) {
      setMsg({ type: 'error', text: 'Please select an image file to upload.' });
      return;
    }

    setUploading(true);
    setMsg(null);

    try {
      const res = await apiFetch('/api/mess/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start_date: form.week_start_date,
          week_end_date: form.week_end_date,
          mess_scope: form.mess_scope,
          image_base64: previewImage,
          original_filename: fileMeta.filename,
          content_type: fileMeta.mime,
          description: form.description,
          publish_immediately: form.publish_immediately,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload mess menu');

      setMsg({
        type: 'success',
        text: `Weekly mess menu for ${form.week_start_date} to ${form.week_end_date} published successfully.`,
      });

      setPreviewImage(null);
      setFileMeta(null);
      fetchActiveMenu();
      fetchMenuHistory();
      setActiveTab('current');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStatus = async (menuId: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') => {
    try {
      const res = await apiFetch(`/api/mess/menus/${menuId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchActiveMenu();
        fetchMenuHistory();
        setMsg({ type: 'success', text: `Menu status changed to ${status}.` });
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F7F6F1] min-h-screen">
      {/* Top Banner */}
      <div className="bg-white border-b border-[#E2E6E8] px-8 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#627084] font-medium mb-1">
              <span>Campus Services</span>
              <span className="opacity-60">/</span>
              <span className="text-[#2C8279] font-bold">Hostel Dining</span>
            </div>
            <h1 className="text-2xl font-black text-[#203653] tracking-tight flex items-center gap-2">
              <Utensils className="w-6 h-6 text-[#2C8279]" />
              <span>Weekly Mess Menu</span>
            </h1>
            <p className="text-xs text-[#627084] mt-1">
              Authoritative digital mess menu notice board for SIT Tumakuru campus residents.
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'current'
                  ? 'bg-[#2C8279] text-white shadow-sm'
                  : 'bg-white text-[#203653] border border-[#D5DCDF] hover:bg-[#F7F6F1]'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Current Week Menu</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'bg-[#2C8279] text-white shadow-sm'
                  : 'bg-white text-[#203653] border border-[#D5DCDF] hover:bg-[#F7F6F1]'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Menu Archive</span>
            </button>

            {isStaff && (
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'manage'
                    ? 'bg-[#07203C] text-white shadow-sm'
                    : 'bg-white text-[#07203C] border border-[#D5DCDF] hover:bg-[#F7F6F1]'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload & Publish (Office)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto w-full p-8 space-y-6">
        {/* Banner Alert Message */}
        {msg && (
          <div className={`p-4 rounded-xl border text-xs flex items-center justify-between shadow-xs ${
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

        {/* Tab 1: Current Week Published Menu */}
        {activeTab === 'current' && (
          <div className="bg-white rounded-2xl border border-[#E2E6E8] p-8 shadow-xs">
            {loading ? (
              <div className="py-20 text-center text-[#627084] space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2C8279]" />
                <p className="text-xs font-medium">Fetching weekly mess notice board...</p>
              </div>
            ) : activeMenu ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6E8] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2C8279]/15 text-[#2C8279]">
                        <Sparkles className="w-3 h-3" />
                        <span>Active Published Menu</span>
                      </span>
                      <span className="text-[11px] font-semibold text-[#627084]">
                        Scope: {activeMenu.mess_scope.replace('_', ' ')}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-[#203653] mt-1.5">
                      Week of {activeMenu.week_start_date} to {activeMenu.week_end_date}
                    </h2>
                    {activeMenu.description && (
                      <p className="text-xs text-[#627084] mt-0.5">{activeMenu.description}</p>
                    )}
                  </div>

                  <button
                    onClick={() => setFullscreenImage(activeMenu.image_url)}
                    className="px-4 py-2 rounded-lg bg-[#2C8279] text-white text-xs font-bold hover:bg-[#203653] transition-colors flex items-center gap-2 shadow-xs shrink-0 self-start sm:self-auto"
                  >
                    <ZoomIn className="w-4 h-4" />
                    <span>View Full Menu</span>
                  </button>
                </div>

                {/* Readable Menu Image Container */}
                <div 
                  onClick={() => setFullscreenImage(activeMenu.image_url)}
                  className="group relative rounded-xl border border-[#E2E6E8] bg-[#F7F6F1] overflow-hidden cursor-pointer max-h-[600px] flex items-center justify-center"
                >
                  <img
                    src={activeMenu.image_url}
                    alt="Weekly Mess Menu Board"
                    className="max-h-[580px] w-auto object-contain transition-transform duration-200 group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-[#07203C]/0 group-hover:bg-[#07203C]/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-white/90 text-[#203653] text-xs font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
                      <ZoomIn className="w-4 h-4" /> Click to enlarge
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-[#627084] flex items-center justify-between border-t border-[#E2E6E8] pt-3">
                  <span>File: {activeMenu.original_filename} ({Math.round(activeMenu.file_size_bytes / 1024)} KB)</span>
                  <span>Published: {activeMenu.published_at ? new Date(activeMenu.published_at).toLocaleString() : 'N/A'}</span>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-[#627084] space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-[#627084]">
                  <Utensils className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#203653]">No mess menu published for this week yet</h3>
                <p className="text-xs text-[#627084] max-w-sm mx-auto">
                  The Hostel Office has not published a notice board photo for the current period. Please check back shortly.
                </p>
                {isStaff && (
                  <button
                    onClick={() => setActiveTab('manage')}
                    className="mt-3 px-4 py-2 bg-[#2C8279] text-white text-xs font-bold rounded-lg shadow-xs"
                  >
                    Upload Menu Now
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Menu Archive / Historical Weeks */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-[#E2E6E8] p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-[#203653]">Weekly Mess Menu Archive</h2>
              <p className="text-xs text-[#627084]">Consult historical or upcoming mess menus published for campus hostels.</p>
            </div>

            {menuHistory.length === 0 ? (
              <div className="py-12 text-center text-[#627084] text-xs">No historical menus recorded.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {menuHistory.map((m) => (
                  <div key={m.id} className="rounded-xl border border-[#E2E6E8] overflow-hidden bg-[#F7F6F1] flex flex-col">
                    <div 
                      onClick={() => setFullscreenImage(m.image_url)}
                      className="h-44 bg-slate-200 cursor-pointer overflow-hidden relative group"
                    >
                      <img src={m.image_url} alt={m.original_filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-[#07203C]/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                        <Eye className="w-4 h-4 mr-1" /> View Full
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between bg-white">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-[#2C8279] tracking-wider">{m.status}</span>
                          <span className="text-[10px] text-[#627084]">{m.week_start_date}</span>
                        </div>
                        <h4 className="text-xs font-bold text-[#203653] mt-1">{m.week_start_date} to {m.week_end_date}</h4>
                        {m.description && <p className="text-[11px] text-[#627084] mt-1 line-clamp-2">{m.description}</p>}
                      </div>
                      <div className="mt-3 pt-3 border-t border-[#E2E6E8] flex items-center justify-between text-[10px] text-[#627084]">
                        <span>{Math.round(m.file_size_bytes / 1024)} KB</span>
                        {isStaff && m.status !== 'PUBLISHED' && (
                          <button
                            onClick={() => handleUpdateStatus(m.id, 'PUBLISHED')}
                            className="font-bold text-[#2C8279] hover:underline"
                          >
                            Publish Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Staff Upload & Management */}
        {activeTab === 'manage' && isStaff && (
          <form onSubmit={handleUploadMenu} className="bg-white rounded-2xl border border-[#E2E6E8] p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-[#203653]">Publish Weekly Mess Menu (Hostel Office)</h2>
              <p className="text-xs text-[#627084]">Upload high-resolution photography of the mess notice board for student digital access.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#203653] mb-1.5">Week Start Date *</label>
                <input
                  type="date"
                  required
                  value={form.week_start_date}
                  onChange={(e) => setForm({ ...form, week_start_date: e.target.value })}
                  className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#203653] mb-1.5">Week End Date *</label>
                <input
                  type="date"
                  required
                  value={form.week_end_date}
                  onChange={(e) => setForm({ ...form, week_end_date: e.target.value })}
                  className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#203653] mb-1.5">Mess Scope</label>
                <select
                  value={form.mess_scope}
                  onChange={(e) => setForm({ ...form, mess_scope: e.target.value })}
                  className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg p-2.5 font-medium"
                >
                  <option value="CAMPUS_CENTRAL">Campus Central Dining Hall</option>
                  <option value="BVB_MESS">BVB Block Dining Hall</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-[#203653] mb-1.5">Notice Board Description / Announcement</label>
                <input
                  type="text"
                  placeholder="e.g. Special South Indian festive menu for Ayudha Pooja week"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full text-xs bg-[#F7F6F1] border border-[#D5DCDF] rounded-lg p-2.5 font-medium"
                />
              </div>
            </div>

            {/* File Upload Dropzone */}
            <div>
              <label className="block text-xs font-bold text-[#203653] mb-1.5">Menu Image File *</label>
              <div className="border-2 border-dashed border-[#D5DCDF] rounded-xl p-6 bg-[#F7F6F1]/50 flex flex-col items-center justify-center text-center">
                {previewImage ? (
                  <div className="space-y-4 max-w-md w-full">
                    <img src={previewImage} alt="Preview" className="max-h-64 mx-auto rounded-lg shadow-sm border border-[#E2E6E8]" />
                    <div className="text-xs font-medium text-[#203653]">
                      {fileMeta?.filename} ({Math.round((fileMeta?.size || 0) / 1024)} KB)
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPreviewImage(null); setFileMeta(null); }}
                      className="text-xs text-rose-600 font-bold hover:underline"
                    >
                      Remove and choose another image
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <FileImage className="w-10 h-10 text-[#627084] mx-auto opacity-60" />
                    <div className="text-xs font-bold text-[#203653]">Click or drag mess notice board photo here</div>
                    <div className="text-[11px] text-[#627084]">Supports JPEG, PNG, WebP up to 10MB</div>
                    <label className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#2C8279] text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-[#203653] shadow-xs">
                      <Upload className="w-4 h-4" />
                      <span>Select Photo from Device</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pub_imm"
                checked={form.publish_immediately}
                onChange={(e) => setForm({ ...form, publish_immediately: e.target.checked })}
                className="rounded border-[#D5DCDF] text-[#2C8279]"
              />
              <label htmlFor="pub_imm" className="text-xs font-medium text-[#203653]">
                Publish immediately and notify all campus hostel students
              </label>
            </div>

            <div className="pt-4 border-t border-[#E2E6E8] flex justify-end gap-3">
              <button
                type="submit"
                disabled={uploading || !previewImage}
                className="px-6 py-2.5 rounded-lg text-xs font-bold bg-[#2C8279] text-white hover:bg-[#203653] transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>Publish Weekly Mess Menu</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Accessible Fullscreen Image Lightbox Modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-50 bg-[#07203C]/90 backdrop-blur-xs flex flex-col p-4 sm:p-8 animate-fade-in">
          <div className="flex items-center justify-between pb-4 text-white">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Utensils className="w-4 h-4 text-[#84d5ca]" />
              <span>Notice Board Image Inspection</span>
            </div>
            <button
              onClick={() => setFullscreenImage(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto p-2">
            <img
              src={fullscreenImage}
              alt="Fullscreen Menu"
              className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
};
