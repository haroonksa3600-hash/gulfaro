import React, { useEffect, useState } from 'react';
import { saFetch } from './api';
import { Save, MapPin, Briefcase, Plus, Trash2 } from 'lucide-react';

interface MarketplaceSettingsViewProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const MarketplaceSettingsView: React.FC<MarketplaceSettingsViewProps> = ({ onToast }) => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newCatName, setNewCatName] = useState('');
  const [newCatAr, setNewCatAr] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await saFetch('/marketplace');
      setConfig(res);
    } catch (err: any) {
      onToast(err.message || 'Failed to load marketplace config.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saFetch<{ marketplace: any }>('/marketplace', {
        method: 'PUT',
        body: JSON.stringify(config)
      });
      setConfig(res.marketplace);
      onToast('GCC Countries, cities, categories, and salary rules saved.', 'success');
    } catch (err: any) {
      onToast(err.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = () => {
    const clean = newCatName.trim();
    if (!clean) return;
    const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setConfig({
      ...config,
      categories: [
        ...config.categories,
        {
          id,
          name: clean,
          nameAr: newCatAr.trim() || clean,
          iconName: 'Briefcase',
          description: 'Custom Gulf sector category',
          popularRoles: [],
          enabled: true
        }
      ]
    });
    setNewCatName('');
    setNewCatAr('');
  };

  if (loading || !config) {
    return <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-400">Loading GCC marketplace settings...</div>;
  }

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">GCC Country, City & Category Configuration</h2>
          <p className="text-xs text-slate-500">
            Enable/disable GCC country portals, manage city hubs, configure active job categories, and enforce salary display rules.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg font-bold self-start sm:self-auto"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Marketplace Rules'}
        </button>
      </div>

      {/* GCC Countries */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <MapPin className="w-4 h-4 text-teal-600" />
          <span>GCC Countries & City Lists</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config.countries.map((c: any, idx: number) => (
            <div key={c.id} className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">
                  {c.flag} {c.name} <span className="text-slate-400 font-normal">({c.currencyCode})</span>
                </span>
                <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={c.enabled}
                    onChange={e => {
                      const next = [...config.countries];
                      next[idx] = { ...c, enabled: e.target.checked };
                      setConfig({ ...config, countries: next });
                    }}
                  />
                  <span>Active</span>
                </label>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">Top Cities (comma-separated)</label>
                <input
                  type="text"
                  value={(c.topCities || []).join(', ')}
                  onChange={e => {
                    const next = [...config.countries];
                    next[idx] = {
                      ...c,
                      topCities: e.target.value
                        .split(',')
                        .map(s => s.trim())
                        .filter(Boolean)
                    };
                    setConfig({ ...config, countries: next });
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories & Salary Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Briefcase className="w-4 h-4 text-teal-600" />
            <span>Job Categories ({config.categories.length})</span>
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New category name (English)..."
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg"
            />
            <input
              type="text"
              placeholder="Arabic label (optional)..."
              value={newCatAr}
              onChange={e => setNewCatAr(e.target.value)}
              className="w-40 px-3 py-1.5 border border-slate-300 rounded-lg"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {config.categories.map((cat: any, idx: number) => (
              <div key={cat.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-800">{cat.name}</span>
                  <span className="text-slate-400 ml-2">{cat.nameAr}</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cat.enabled}
                      onChange={e => {
                        const next = [...config.categories];
                        next[idx] = { ...cat, enabled: e.target.checked };
                        setConfig({ ...config, categories: next });
                      }}
                    />
                    <span>Visible</span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        categories: config.categories.filter((_: any, i: number) => i !== idx)
                      })
                    }
                    className="text-rose-500 hover:text-rose-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Employment Types, Experience Levels & Salary Rules */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Job & Salary Display Rules</h3>

          <div className="space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-semibold text-slate-700">Show Salary Ranges Publicly</span>
              <input
                type="checkbox"
                checked={config.salaryRules.showSalaryRange}
                onChange={e => setConfig({ ...config, salaryRules: { ...config.salaryRules, showSalaryRange: e.target.checked } })}
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-semibold text-slate-700">Allow "Negotiable" Salaries</span>
              <input
                type="checkbox"
                checked={config.salaryRules.allowNegotiable}
                onChange={e => setConfig({ ...config, salaryRules: { ...config.salaryRules, allowNegotiable: e.target.checked } })}
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-semibold text-slate-700">Require Salary on Featured Ads</span>
              <input
                type="checkbox"
                checked={config.salaryRules.requireSalaryForFeatured}
                onChange={e =>
                  setConfig({ ...config, salaryRules: { ...config.salaryRules, requireSalaryForFeatured: e.target.checked } })
                }
              />
            </label>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="font-bold text-slate-800 mb-2">Enabled Employment Types</p>
            <div className="space-y-1.5">
              {config.employmentTypes.map((et: any, idx: number) => (
                <label key={et.id} className="flex items-center justify-between cursor-pointer">
                  <span>{et.label}</span>
                  <input
                    type="checkbox"
                    checked={et.enabled}
                    onChange={e => {
                      const next = [...config.employmentTypes];
                      next[idx] = { ...et, enabled: e.target.checked };
                      setConfig({ ...config, employmentTypes: next });
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
