import React, { useEffect, useState } from 'react';
import { GCC_COUNTRIES, GccCountry } from '../../types/job';
import { getJobCategoryName } from '../../data/categories';
import { OverviewPayload } from './types';
import { saFetch, saDownloadFile } from './api';
import {
  Users,
  Building2,
  Briefcase,
  FileCheck2,
  ShieldAlert,
  TrendingUp,
  Download,
  RefreshCw,
  Eye,
  MessageCircle,
  AlertTriangle,
  DollarSign,
  UserPlus,
  Clock,
  CheckCircle2,
  Ban
} from 'lucide-react';

interface OverviewAnalyticsViewProps {
  mode: 'overview' | 'analytics';
  onNavigateSection: (section: any) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const OverviewAnalyticsView: React.FC<OverviewAnalyticsViewProps> = ({
  mode,
  onNavigateSection,
  onToast
}) => {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartMetric, setChartMetric] = useState<'all' | 'registrations' | 'jobs' | 'applications'>('all');
  const [exporting, setExporting] = useState<string | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const payload = await saFetch<OverviewPayload>('/overview');
      setData(payload);
    } catch (err: any) {
      onToast(err.message || 'Failed to load platform metrics.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExport = async (dataset: string) => {
    setExporting(dataset);
    try {
      await saDownloadFile(`/export/${dataset}`, `gulfaro-${dataset}-${new Date().toISOString().slice(0, 10)}.csv`);
      onToast(`Exported ${dataset} dataset to CSV.`, 'success');
    } catch (err: any) {
      onToast(err.message || `Failed to export ${dataset}.`, 'error');
    } finally {
      setExporting(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <div className="w-7 h-7 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-medium text-slate-500">Loading real-time Gulfaro platform telemetry...</p>
      </div>
    );
  }

  const { kpis, timeline14Days, jobsByCountry, jobsByCategory, usersByCountry, recentAuditLogs, recentReports, suspiciousLogins, emergencyStatus } = data;

  const maxDayVal = Math.max(
    1,
    ...timeline14Days.map(d => {
      if (chartMetric === 'registrations') return d.registrations;
      if (chartMetric === 'jobs') return d.jobs;
      if (chartMetric === 'applications') return d.applications;
      return Math.max(d.registrations, d.jobs, d.applications);
    })
  );

  const countryEntries = Object.entries(jobsByCountry).sort((a, b) => b[1] - a[1]);
  const maxCountryJobs = Math.max(1, ...countryEntries.map(([, c]) => c));

  const categoryEntries = Object.entries(jobsByCategory).sort((a, b) => b[1] - a[1]);
  const maxCategoryJobs = Math.max(1, ...categoryEntries.map(([, c]) => c));

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {mode === 'analytics' ? 'Platform Growth Analytics & Data Exports' : 'Platform Operations Overview'}
          </h2>
          <p className="text-xs text-slate-500">
            Live counters computed directly from Gulfaro database records ({kpis.totalUsers} accounts, {kpis.totalJobs} job listings).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {(['users', 'employers', 'jobs', 'applications', 'reports', 'audit_logs'] as const).map(ds => (
            <button
              key={ds}
              onClick={() => handleExport(ds)}
              disabled={exporting === ds}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-60"
            >
              <Download className="w-3 h-3" />
              <span className="capitalize">{ds.replace('_', ' ')} CSV</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Emergency Banner Warning if any restriction active */}
      {(emergencyStatus.maintenanceMode || emergencyStatus.emergencyShutdown || emergencyStatus.hideAllPublicJobs || emergencyStatus.disableNewJobPublishing) && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900">
              <p className="font-bold">Emergency Restrictions Active on Public Site</p>
              <p className="text-rose-700 mt-0.5">
                {emergencyStatus.emergencyShutdown && 'Emergency Shutdown ON · '}
                {emergencyStatus.maintenanceMode && 'Maintenance Mode ON · '}
                {emergencyStatus.hideAllPublicJobs && 'Public Jobs Hidden · '}
                {emergencyStatus.disableNewJobPublishing && 'New Job Publishing Paused'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateSection('emergency')}
            className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold whitespace-nowrap"
          >
            Manage Emergency Controls
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{kpis.totalUsers}</p>
          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
            {kpis.totalJobSeekers} job seekers · {kpis.newRegistrationsToday} today
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Employers</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{kpis.totalEmployers}</p>
          <p className="text-[11px] text-emerald-700 mt-1 tabular-nums">
            {kpis.verifiedEmployers} verified · {kpis.suspendedUsers} restricted
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Jobs</span>
            <Briefcase className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{kpis.activeJobs}</p>
          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
            {kpis.featuredJobs} featured · {kpis.urgentJobs} urgent · {kpis.totalJobs} total
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Applications</span>
            <FileCheck2 className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{kpis.totalApplications}</p>
          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
            {kpis.totalJobViews.toLocaleString()} views · {kpis.totalInquiries} inquiries
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Safety & Reports</span>
            <ShieldAlert className={`w-4 h-4 ${kpis.openReportsCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{kpis.openReportsCount}</p>
          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">
            {kpis.suspiciousAlertsCount} auth alerts · ${kpis.totalRevenue} revenue
          </p>
        </div>
      </div>

      {/* 14-Day Activity Chart + Country Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <span>14-Day Platform Activity</span>
              </h3>
              <p className="text-[11px] text-slate-500">Daily database activity across registrations, job postings, and applications.</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-[11px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'registrations', label: 'Users' },
                { id: 'jobs', label: 'Jobs' },
                { id: 'applications', label: 'Apps' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setChartMetric(tab.id as any)}
                  className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                    chartMetric === tab.id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-52 flex items-end gap-1.5 pt-4 border-b border-slate-200 pb-2">
            {timeline14Days.map((day) => {
              const regPct = Math.round((day.registrations / maxDayVal) * 100);
              const jobPct = Math.round((day.jobs / maxDayVal) * 100);
              const appPct = Math.round((day.applications / maxDayVal) * 100);
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-0.5 h-44">
                    {(chartMetric === 'all' || chartMetric === 'registrations') && (
                      <div
                        style={{ height: `${Math.max(day.registrations > 0 ? 8 : 2, regPct)}%` }}
                        className="flex-1 max-w-[10px] bg-teal-600 rounded-t transition-all"
                        title={`${day.label}: ${day.registrations} registrations`}
                      />
                    )}
                    {(chartMetric === 'all' || chartMetric === 'jobs') && (
                      <div
                        style={{ height: `${Math.max(day.jobs > 0 ? 8 : 2, jobPct)}%` }}
                        className="flex-1 max-w-[10px] bg-indigo-500 rounded-t transition-all"
                        title={`${day.label}: ${day.jobs} jobs posted`}
                      />
                    )}
                    {(chartMetric === 'all' || chartMetric === 'applications') && (
                      <div
                        style={{ height: `${Math.max(day.applications > 0 ? 8 : 2, appPct)}%` }}
                        className="flex-1 max-w-[10px] bg-amber-500 rounded-t transition-all"
                        title={`${day.label}: ${day.applications} applications`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1">
            <span>{timeline14Days[0]?.label}</span>
            <div className="flex items-center gap-4 text-slate-600 font-medium">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-xs bg-teal-600 inline-block" /> Registrations</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-xs bg-indigo-500 inline-block" /> Jobs</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" /> Applications</span>
            </div>
            <span>{timeline14Days[timeline14Days.length - 1]?.label}</span>
          </div>
        </div>

        {/* Country Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">GCC Country Breakdown</h3>
            <p className="text-[11px] text-slate-500 mb-4">Jobs and registered accounts by Gulf region.</p>
            <div className="space-y-3">
              {countryEntries.map(([countryId, count]) => {
                const info = GCC_COUNTRIES[countryId as GccCountry];
                const userCount = usersByCountry[countryId] || 0;
                const widthPct = Math.max(6, Math.round((count / maxCountryJobs) * 100));
                return (
                  <div key={countryId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {info ? `${info.flag} ${info.name}` : countryId}
                      </span>
                      <span className="text-slate-500 tabular-nums text-[11px]">
                        <strong className="text-slate-800">{count}</strong> jobs · {userCount} users
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-600 rounded-full" style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="bg-slate-50 p-2 rounded-lg">
              <span className="block font-bold text-slate-900 tabular-nums">{kpis.hiddenJobs}</span>
              <span className="text-slate-500">Hidden</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg">
              <span className="block font-bold text-slate-900 tabular-nums">{kpis.closedJobs}</span>
              <span className="text-slate-500">Closed</span>
            </div>
            <div className="bg-slate-50 p-2 rounded-lg">
              <span className="block font-bold text-slate-900 tabular-nums">{kpis.expiredJobs}</span>
              <span className="text-slate-500">Expired</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown & Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Job Categories */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Sector & Category Volume</h3>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {categoryEntries.map(([catId, count]) => {
              const catName = getJobCategoryName(catId);
              const pct = Math.max(5, Math.round((count / maxCategoryJobs) * 100));
              return (
                <div key={catId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium truncate pr-2">{catName}</span>
                    <span className="font-bold text-slate-900 tabular-nums">{count}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-800 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Open Reports & Suspicious Events */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Trust, Reports & Alerts</h3>
              <button
                onClick={() => onNavigateSection('reports')}
                className="text-[11px] font-semibold text-teal-700 hover:underline"
              >
                View All →
              </button>
            </div>

            {recentReports.length === 0 && suspiciousLogins.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                No pending reports or security alerts.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentReports.slice(0, 4).map(r => (
                  <div key={r.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-800 truncate">{r.targetTitle}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        r.status === 'open' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{r.reason}</p>
                  </div>
                ))}

                {suspiciousLogins.slice(0, 3).map(ev => (
                  <div key={ev.id} className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/60 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-amber-950 truncate">{ev.emailOrUsername}</span>
                      <span className="text-[10px] font-mono text-amber-800">{ev.ip}</span>
                    </div>
                    <p className="text-[11px] text-amber-800 mt-0.5">{ev.reason || ev.event}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Admin Audit Feed */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Recent Admin Activity</h3>
            <button
              onClick={() => onNavigateSection('security')}
              className="text-[11px] font-semibold text-teal-700 hover:underline"
            >
              Audit Logs →
            </button>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {recentAuditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent administrative actions recorded.</p>
            ) : (
              recentAuditLogs.map(log => (
                <div key={log.id} className="pb-2.5 border-b border-slate-100 last:border-b-0 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">{log.action.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{log.details}</p>
                  <span className="text-[10px] font-mono text-slate-400">by {log.adminUsername} · {log.ip}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
