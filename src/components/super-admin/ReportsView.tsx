import React, { useEffect, useMemo, useState } from 'react';
import { ReportItem } from './types';
import { saFetch } from './api';
import { Flag, EyeOff, Trash2, Ban, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ReportsViewProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onToast }) => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await saFetch<{ reports: ReportItem[] }>('/reports');
      setReports(res.reports);
    } catch (err: any) {
      onToast(err.message || 'Failed to load reports.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return reports;
    return reports.filter(r => r.status === statusFilter);
  }, [reports, statusFilter]);

  const handleModerate = async (
    report: ReportItem,
    status: 'investigating' | 'resolved' | 'dismissed',
    quickAction?: 'hide_job' | 'delete_job' | 'suspend_target'
  ) => {
    try {
      await saFetch(`/reports/${report.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          actionTaken: noteById[report.id] || quickAction || `Marked as ${status}`,
          quickAction
        })
      });
      onToast(`Report ${report.id} updated (${status}).`, 'success');
      await loadReports();
    } catch (err: any) {
      onToast(err.message || 'Could not update report.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Trust, Safety & Scam Reports</h2>
          <p className="text-xs text-slate-500">
            Inspect user-submitted scam reports, visa-fee complaints, and auto-flagged spam listings.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl text-xs">
          {['all', 'open', 'investigating', 'resolved', 'dismissed'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold capitalize ${
                statusFilter === st ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-400">Loading reports...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="font-bold text-slate-800 text-sm">No reports in "{statusFilter}" queue</p>
          <p className="text-xs text-slate-500">All user complaints and flagged advertisements have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(rep => (
            <div key={rep.id} className="bg-white border border-slate-200 rounded-xl p-5 text-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <Flag className="w-4 h-4 text-rose-600" />
                  <span className="font-bold text-slate-900 text-sm">{rep.targetTitle}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[11px] text-slate-600">
                    {rep.targetType}:{rep.targetId}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold uppercase text-[10px]">
                    {rep.category.replace('_', ' ')}
                  </span>
                </div>
                <span className={`px-2.5 py-0.5 rounded font-bold uppercase text-[10px] self-start ${
                  rep.status === 'open'
                    ? 'bg-rose-100 text-rose-800'
                    : rep.status === 'investigating'
                    ? 'bg-amber-100 text-amber-800'
                    : rep.status === 'resolved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {rep.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <p className="font-semibold text-slate-800">Reason: {rep.reason}</p>
                  {rep.details && <p className="text-slate-600 leading-relaxed">{rep.details}</p>}
                  <p className="text-[11px] text-slate-400 pt-1">
                    Reported by {rep.reporterName} ({rep.reporterEmail || 'Guest'}) · IP {rep.reporterIp} · {new Date(rep.createdAt).toLocaleString()}
                  </p>
                  {rep.actionTaken && (
                    <p className="text-[11px] text-teal-800 bg-teal-50 border border-teal-200 rounded px-2.5 py-1 mt-2 inline-block">
                      Action Log: {rep.actionTaken} {rep.resolvedBy ? `(${rep.resolvedBy})` : ''}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Moderation note (optional)..."
                    value={noteById[rep.id] || ''}
                    onChange={e => setNoteById({ ...noteById, [rep.id]: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {rep.targetType === 'job' && (
                      <>
                        <button
                          onClick={() => handleModerate(rep, 'resolved', 'hide_job')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-semibold"
                        >
                          <EyeOff className="w-3 h-3" /> Hide Job
                        </button>
                        <button
                          onClick={() => handleModerate(rep, 'resolved', 'delete_job')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-semibold"
                        >
                          <Trash2 className="w-3 h-3" /> Remove Job
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleModerate(rep, 'resolved', 'suspend_target')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded font-semibold"
                    >
                      <Ban className="w-3 h-3" /> Suspend Account
                    </button>
                    <button
                      onClick={() => handleModerate(rep, 'investigating')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold"
                    >
                      <Clock className="w-3 h-3" /> Investigating
                    </button>
                    <button
                      onClick={() => handleModerate(rep, 'dismissed')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-semibold"
                    >
                      <XCircle className="w-3 h-3" /> Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
