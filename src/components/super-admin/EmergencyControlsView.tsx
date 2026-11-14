import React, { useEffect, useState } from 'react';
import { TrashItem } from './types';
import { saFetch } from './api';
import { AlertOctagon, Save, RotateCcw, Trash2, ShieldOff } from 'lucide-react';

interface EmergencyControlsViewProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const EmergencyControlsView: React.FC<EmergencyControlsViewProps> = ({ onToast }) => {
  const [emergency, setEmergency] = useState<any>(null);
  const [registration, setRegistration] = useState<any>(null);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await saFetch<{ emergency: any; registration: any; trash: TrashItem[] }>('/emergency');
      setEmergency(res.emergency);
      setRegistration(res.registration);
      setTrash(res.trash);
    } catch (err: any) {
      onToast(err.message || 'Failed to load emergency controls.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (override?: any) => {
    setSaving(true);
    try {
      const payload = override || {
        ...emergency,
        allowJobSeekerRegistration: registration.allowJobSeekerRegistration,
        allowEmployerRegistration: registration.allowEmployerRegistration
      };
      const res = await saFetch<{ emergency: any; registration: any }>('/emergency', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setEmergency(res.emergency);
      setRegistration(res.registration);
      onToast('Emergency platform controls updated immediately.', 'success');
    } catch (err: any) {
      onToast(err.message || 'Update failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleRestrictedFeature = (feat: string) => {
    const list: string[] = emergency.restrictedFeatures || [];
    const next = list.includes(feat) ? list.filter(x => x !== feat) : [...list, feat];
    setEmergency({ ...emergency, restrictedFeatures: next });
  };

  const handleRestoreTrash = async (item: TrashItem) => {
    try {
      await saFetch(`/trash/${item.trashId}/restore`, { method: 'POST' });
      onToast(`Restored "${item.label}" back to live database.`, 'success');
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Restore failed.', 'error');
    }
  };

  const handlePurgeTrash = async (item: TrashItem) => {
    if (!window.confirm(`Permanently erase "${item.label}"? This cannot be undone.`)) return;
    try {
      await saFetch(`/trash/${item.trashId}`, { method: 'DELETE' });
      onToast(`Permanently deleted "${item.label}".`, 'success');
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Delete failed.', 'error');
    }
  };

  if (loading || !emergency || !registration) {
    return <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-400">Loading emergency controls...</div>;
  }

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Emergency Kill Switches & Trash Recovery</h2>
          <p className="text-xs text-slate-500">
            Instantly activate Maintenance Mode, Emergency Shutdown, pause registrations/job publishing, or recover soft-deleted records.
          </p>
        </div>
        <button
          onClick={() => handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg font-bold self-start sm:self-auto"
        >
          <Save className="w-4 h-4" /> {saving ? 'Applying...' : 'Save Emergency State'}
        </button>
      </div>

      {/* Master Switches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4 text-rose-600" />
            <span>Sitewide Availability Switches</span>
          </h3>

          <label className="flex items-start justify-between gap-4 p-3 rounded-lg border border-amber-200 bg-amber-50/50 cursor-pointer">
            <div>
              <span className="font-bold text-slate-900 block">Maintenance Mode</span>
              <span className="text-[11px] text-slate-600">
                Displays a maintenance notice to public visitors while Super Admin remains 100% accessible.
              </span>
            </div>
            <input
              type="checkbox"
              checked={emergency.maintenanceMode}
              onChange={e => setEmergency({ ...emergency, maintenanceMode: e.target.checked })}
              className="w-4 h-4 mt-1 accent-amber-600"
            />
          </label>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Maintenance Message</label>
            <input
              type="text"
              value={emergency.maintenanceMessage}
              onChange={e => setEmergency({ ...emergency, maintenanceMessage: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <label className="flex items-start justify-between gap-4 p-3 rounded-lg border border-rose-200 bg-rose-50/60 cursor-pointer">
            <div>
              <span className="font-bold text-rose-900 block">Emergency Platform Shutdown</span>
              <span className="text-[11px] text-rose-800">
                Immediately halts all public site routes, signups, and job submissions during critical incidents.
              </span>
            </div>
            <input
              type="checkbox"
              checked={emergency.emergencyShutdown}
              onChange={e => setEmergency({ ...emergency, emergencyShutdown: e.target.checked })}
              className="w-4 h-4 mt-1 accent-rose-600"
            />
          </label>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Emergency Shutdown Notice</label>
            <input
              type="text"
              value={emergency.emergencyShutdownMessage}
              onChange={e => setEmergency({ ...emergency, emergencyShutdownMessage: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {/* Granular Kill Switches */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <ShieldOff className="w-4 h-4 text-amber-600" />
            <span>Operational Feature Kill Switches</span>
          </h3>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="font-semibold text-slate-800">Hide All Public Job Listings Immediately</span>
            <input
              type="checkbox"
              checked={emergency.hideAllPublicJobs}
              onChange={e => setEmergency({ ...emergency, hideAllPublicJobs: e.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="font-semibold text-slate-800">Disable New Job Publishing (Pause Employers)</span>
            <input
              type="checkbox"
              checked={emergency.disableNewJobPublishing}
              onChange={e => setEmergency({ ...emergency, disableNewJobPublishing: e.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="font-semibold text-slate-800">Allow Job Seeker Registration</span>
            <input
              type="checkbox"
              checked={registration.allowJobSeekerRegistration}
              onChange={e => setRegistration({ ...registration, allowJobSeekerRegistration: e.target.checked })}
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="font-semibold text-slate-800">Allow Employer Registration</span>
            <input
              type="checkbox"
              checked={registration.allowEmployerRegistration}
              onChange={e => setRegistration({ ...registration, allowEmployerRegistration: e.target.checked })}
            />
          </label>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="font-bold text-slate-700">Restricted Public Features:</p>
            {[
              { id: 'disable_applications', label: 'Disable In-App Job Applications' },
              { id: 'disable_direct_whatsapp', label: 'Hide Direct WhatsApp Links' },
              { id: 'disable_cv_upload', label: 'Disable Resume / CV Attachments' }
            ].map(item => (
              <label key={item.id} className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={(emergency.restrictedFeatures || []).includes(item.id)}
                  onChange={() => toggleRestrictedFeature(item.id)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Trash Recovery */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          Deleted Items Trash & Recovery ({trash.length})
        </h3>
        {trash.length === 0 ? (
          <p className="text-slate-400 py-6 text-center">Trash is empty. Soft-deleted users and jobs appear here for 1-click restoration.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {trash.map(item => (
              <div key={item.trashId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="px-2 py-0.5 bg-slate-100 rounded font-bold uppercase text-[10px] text-slate-700 mr-2">
                    {item.itemType}
                  </span>
                  <span className="font-bold text-slate-900">{item.label}</span>
                  <span className="text-[11px] text-slate-400 ml-2">
                    Deleted by {item.deletedBy} on {new Date(item.deletedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestoreTrash(item)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                  </button>
                  <button
                    onClick={() => handlePurgeTrash(item)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Purge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
