import React, { useState } from 'react';
import { JobAd, GCC_COUNTRIES } from '../types/job';
import { AdSenseConfig } from '../types/adsense';
import { storageService } from '../services/storage';
import { 
  ShieldCheck, 
  Check, 
  X, 
  Trash2, 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  Search, 
  Filter, 
  Database,
  Building,
  CheckCircle2,
  Calendar,
  DollarSign,
  Copy,
  ExternalLink,
  Code,
  Layout,
  Layers
} from 'lucide-react';

interface AdminDashboardProps {
  onSelectJob: (job: JobAd) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSelectJob }) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'listings' | 'adsense'>('listings');
  const [jobs, setJobs] = useState<JobAd[]>(storageService.getJobs());
  const [adConfig, setAdConfig] = useState<AdSenseConfig>(storageService.getAdSenseConfig());
  const [copiedAdsTxt, setCopiedAdsTxt] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rejectionModalJobId, setRejectionModalJobId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Missing verifiable corporate credentials or uncompliant salary disclosure.');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const reloadData = (msg?: string) => {
    setJobs(storageService.getJobs());
    setAdConfig(storageService.getAdSenseConfig());
    if (msg) {
      setFeedbackMessage(msg);
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleSaveAdConfig = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.updateAdSenseConfig(adConfig);
    reloadData('Google AdSense configuration saved successfully.');
  };

  const handleCopyAdsTxt = () => {
    const pubOnly = adConfig.publisherId.replace('ca-', '');
    const txt = `google.com, ${pubOnly || 'pub-0000000000000000'}, DIRECT, f08c47fec0942fa0`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt);
      setCopiedAdsTxt(true);
      setTimeout(() => setCopiedAdsTxt(false), 2500);
    }
  };

  // Metrics
  const totalAds = jobs.length;
  const activeAds = jobs.filter(j => j.status === 'active').length;
  const pendingAds = jobs.filter(j => j.status === 'pending').length;
  const expiredAds = jobs.filter(j => j.status === 'expired').length;
  const featuredAds = jobs.filter(j => j.isFeatured).length;
  const totalInquiries = jobs.reduce((acc, curr) => acc + (curr.inquiriesCount || 0), 0);

  // Moderation Handlers
  const handleApprove = (id: string) => {
    storageService.adminApproveJob(id);
    reloadData('Advertisement approved and published live.');
  };

  const handleOpenReject = (id: string) => {
    setRejectionModalJobId(id);
  };

  const handleConfirmReject = () => {
    if (rejectionModalJobId) {
      storageService.adminRejectJob(rejectionModalJobId, rejectionReason);
      setRejectionModalJobId(null);
      reloadData('Advertisement rejected and removed from live index.');
    }
  };

  const handleToggleFeatured = (id: string) => {
    storageService.adminToggleFeatured(id);
    reloadData('Featured status updated.');
  };

  const handleRenew = (id: string) => {
    storageService.renewJob(id);
    reloadData('Ad extended for +30 days.');
  };

  const handleDelete = (id: string) => {
    if (confirm('Permanently delete this advertisement from database?')) {
      storageService.deleteJob(id);
      reloadData('Ad deleted permanently.');
    }
  };

  const handlePurgeExpired = () => {
    const count = storageService.adminPurgeExpired();
    reloadData(`Purged ${count} expired advertisements.`);
  };

  const handleResetData = () => {
    if (confirm('Reset database to clean GCC seed dataset?')) {
      storageService.resetToDefaultSeed();
      reloadData('Database reset to authentic GCC seed listings.');
    }
  };

  // Filtered jobs
  const filteredJobs = jobs.filter(j => {
    const matchesSearch = searchFilter === '' || 
      j.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      j.company.toLowerCase().includes(searchFilter.toLowerCase()) ||
      j.city.toLowerCase().includes(searchFilter.toLowerCase()) ||
      j.id.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesStatus = statusFilter === 'all' || j.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight">Gulfaro Central Moderation Console</h1>
                <span className="text-[10px] font-mono bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30">
                  SUPERADMIN
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage 6 GCC nation feeds, review pending classifieds, audit contacts & purge expired ads
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePurgeExpired}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              title="Remove all expired ads from public listing"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Purge Expired</span>
            </button>

            <button
              onClick={handleResetData}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              title="Reload initial seed jobs"
            >
              <Database className="w-3.5 h-3.5 text-teal-400" />
              <span>Reset Seed</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* 5 High-Impact Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Ads</span>
            <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{totalAds}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-600">Active Live</span>
            <p className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">{activeAds}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-600">Pending Review</span>
            <p className="text-2xl font-black text-amber-600 mt-1 tabular-nums">{pendingAds}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-rose-600">Expired</span>
            <p className="text-2xl font-black text-rose-600 mt-1 tabular-nums">{expiredAds}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-700">Featured / VIP</span>
            <p className="text-2xl font-black text-amber-700 mt-1 tabular-nums">{featuredAds}</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-teal-600">Total Inquiries</span>
            <p className="text-2xl font-black text-teal-600 mt-1 tabular-nums">{totalInquiries}</p>
          </div>
        </div>

        {/* Tab Switcher: Classifieds vs AdSense Setup */}
        <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveAdminTab('listings')}
            className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeAdminTab === 'listings'
                ? 'border-slate-900 text-slate-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 text-teal-600" />
            <span>Classified Listings Moderation ({jobs.length})</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('adsense')}
            className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeAdminTab === 'adsense'
                ? 'border-slate-900 text-slate-900 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4 text-amber-500" />
            <span>Google AdSense & Monetization Setup</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
              {adConfig.enabled ? 'ACTIVE' : 'OFF'}
            </span>
          </button>
        </div>

        {/* TAB A: AdSense Configuration View */}
        {activeAdminTab === 'adsense' ? (
          <div className="space-y-6">
            
            {/* Guide & Readiness Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-500" />
                    <span>Google AdSense Readiness & Publisher Configuration</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure your Google Publisher ID, slot IDs, and manage ads.txt crawler compliance.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                    adConfig.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {adConfig.enabled ? 'AdSense Enabled' : 'AdSense Disabled'}
                  </span>
                </div>
              </div>

              {/* Readiness Checklist */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs text-slate-700">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  ✓ Google AdSense Approval Verification Checklist
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Privacy Policy with Google DoubleClick disclosure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Cookie Consent Banner integrated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Standard IAB responsive ad units positioned</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Root /ads.txt file available for Google crawler</span>
                  </div>
                </div>
              </div>

              {/* Form Settings */}
              <form onSubmit={handleSaveAdConfig} className="space-y-4 text-xs">
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  
                  {/* Master Toggle */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-900 block">AdSense Master Switch</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adConfig.enabled}
                        onChange={(e) => setAdConfig({ ...adConfig, enabled: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-medium text-slate-700">Enable Ad Units on Website</span>
                    </label>
                    <p className="text-[11px] text-slate-400">Controls all banner slots on homepage, search feed & job pages.</p>
                  </div>

                  {/* Mode Toggle */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-900 block">Ad Display Mode</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adConfig.testMode}
                        onChange={(e) => setAdConfig({ ...adConfig, testMode: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-500"
                      />
                      <span className="font-medium text-amber-800">Preview / Demo Placeholder Mode</span>
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Shows clean layout containers before your AdSense account is approved. Uncheck for live tags.
                    </p>
                  </div>

                  {/* Auto Ads Toggle */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-900 block">Google Auto Ads</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adConfig.autoAdsEnabled}
                        onChange={(e) => setAdConfig({ ...adConfig, autoAdsEnabled: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-medium text-slate-700">Enable Page-Level Auto Ads</span>
                    </label>
                    <p className="text-[11px] text-slate-400">Allows Google's AI to place high-performing anchor ads.</p>
                  </div>

                </div>

                {/* Publisher ID Input */}
                <div className="pt-2">
                  <label className="block font-bold text-slate-800 mb-1">
                    Google AdSense Publisher ID (Client ID)
                  </label>
                  <div className="relative max-w-md">
                    <input
                      type="text"
                      required
                      value={adConfig.publisherId}
                      onChange={(e) => setAdConfig({ ...adConfig, publisherId: e.target.value })}
                      placeholder="ca-pub-0000000000000000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Found in your Google AdSense Dashboard under <strong>Account → Settings → Account information</strong>.
                  </p>
                </div>

                {/* Ad Slot IDs Grid */}
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
                    Configured Ad Unit Slot IDs
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Leaderboard Banner Slot (728×90 / Responsive)
                      </label>
                      <input
                        type="text"
                        value={adConfig.slots.headerLeaderboard}
                        onChange={(e) => setAdConfig({
                          ...adConfig,
                          slots: { ...adConfig.slots, headerLeaderboard: e.target.value }
                        })}
                        placeholder="1234567890"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Appears below the country gateway cards.</p>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        In-Feed Classified Slot (Fluid / Native)
                      </label>
                      <input
                        type="text"
                        value={adConfig.slots.inFeedClassified}
                        onChange={(e) => setAdConfig({
                          ...adConfig,
                          slots: { ...adConfig.slots, inFeedClassified: e.target.value }
                        })}
                        placeholder="2345678901"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Blends naturally between jobs in the search feed.</p>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Sidebar Rectangle Slot (300×250)
                      </label>
                      <input
                        type="text"
                        value={adConfig.slots.sidebarRectangle}
                        onChange={(e) => setAdConfig({
                          ...adConfig,
                          slots: { ...adConfig.slots, sidebarRectangle: e.target.value }
                        })}
                        placeholder="3456789012"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Rendered inside the filter sidebar on desktop.</p>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Job Detail Bottom Slot (Responsive)
                      </label>
                      <input
                        type="text"
                        value={adConfig.slots.jobDetailBottom}
                        onChange={(e) => setAdConfig({
                          ...adConfig,
                          slots: { ...adConfig.slots, jobDetailBottom: e.target.value }
                        })}
                        placeholder="4567890123"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs"
                      />
                      <p className="text-[10px] text-slate-400 mt-0.5">Rendered at the bottom of individual job ad pages.</p>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-slate-900 hover:bg-teal-600 text-white rounded-lg font-bold text-xs shadow-xs transition-colors"
                  >
                    Save AdSense Settings
                  </button>
                </div>

              </form>
            </div>

            {/* ads.txt File Generator Box */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Code className="w-4 h-4 text-teal-600" />
                    <span>Google ads.txt Verification Record</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Google crawlers require an ads.txt file at <strong>gulfaro.com/ads.txt</strong> to verify ownership.
                  </p>
                </div>

                <button
                  onClick={handleCopyAdsTxt}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-300 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>{copiedAdsTxt ? 'Copied to Clipboard!' : 'Copy Record'}</span>
                </button>
              </div>

              <div className="p-3 bg-slate-900 text-teal-300 rounded-lg font-mono text-xs border border-slate-800 flex items-center justify-between">
                <code>google.com, {adConfig.publisherId.replace('ca-', '') || 'pub-0000000000000000'}, DIRECT, f08c47fec0942fa0</code>
                <span className="text-[10px] text-slate-400 font-sans">Stored in /public/ads.txt</span>
              </div>
            </div>

          </div>
        ) : (
          /* TAB B: Moderation Table */
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            
            {/* Controls Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter by title, company, Ref ID..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none font-medium"
              >
                <option value="all">All Statuses ({jobs.length})</option>
                <option value="active">Active Only ({activeAds})</option>
                <option value="pending">Pending Review ({pendingAds})</option>
                <option value="expired">Expired ({expiredAds})</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ref & Job Title</th>
                  <th className="py-3 px-3">Location & Country</th>
                  <th className="py-3 px-3">Company / Contact</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Lifecycle</th>
                  <th className="py-3 px-3">Metrics</th>
                  <th className="py-3 px-4 text-right">Moderator Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredJobs.map((job) => {
                  const countryInfo = GCC_COUNTRIES[job.country];
                  const expDate = new Date(job.expiresAt);
                  const now = new Date();
                  const daysLeft = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Title & Ref */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-[10px] text-slate-400 font-bold mb-0.5">#{job.id}</div>
                        <div 
                          onClick={() => onSelectJob(job)}
                          className="font-bold text-slate-900 hover:text-teal-700 cursor-pointer line-clamp-1 max-w-xs"
                        >
                          {job.title}
                        </div>
                        {job.isFeatured && (
                          <span className="inline-block mt-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                            ★ Featured
                          </span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <span>{countryInfo?.flag}</span>
                          <span>{job.city}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{countryInfo?.name}</div>
                      </td>

                      {/* Company & Contact */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 line-clamp-1 max-w-[150px]">{job.company}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{job.contactWhatsapp}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          job.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : job.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : job.status === 'expired'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {job.status}
                        </span>
                      </td>

                      {/* Lifecycle */}
                      <td className="py-3 px-3 tabular-nums">
                        <div className="text-slate-700">
                          {daysLeft > 0 ? `${daysLeft} days left` : 'Expired'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(job.postedAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Metrics */}
                      <td className="py-3 px-3 tabular-nums text-slate-600">
                        <div>{job.viewsCount} views</div>
                        <div className="text-[10px] text-teal-600 font-semibold">{job.inquiriesCount} inquiries</div>
                      </td>

                      {/* Moderator Action Buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {job.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(job.id)}
                                className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200"
                                title="Approve Ad"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </button>
                              <button
                                onClick={() => handleOpenReject(job.id)}
                                className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-200"
                                title="Reject Ad"
                              >
                                <X className="w-3.5 h-3.5 stroke-[3]" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleToggleFeatured(job.id)}
                            className={`p-1.5 rounded border transition-colors ${
                              job.isFeatured
                                ? 'bg-amber-100 border-amber-300 text-amber-800'
                                : 'bg-white border-slate-200 text-slate-400 hover:text-amber-600'
                            }`}
                            title="Toggle Featured / Pinned"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleRenew(job.id)}
                            className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-teal-700 rounded"
                            title="Extend for 30 days"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(job.id)}
                            className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete ad permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

        {/* Rejection Modal */}
        {rejectionModalJobId && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-5 max-w-md w-full space-y-3">
              <h3 className="font-bold text-sm text-slate-900">
                Provide Reason for Rejecting Advertisement
              </h3>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setRejectionModalJobId(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
