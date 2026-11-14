import React, { useEffect, useState } from 'react';
import { saFetch } from './api';
import { CreditCard, Save, Plus, RotateCcw, Info } from 'lucide-react';

interface RevenueSubscriptionsViewProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const RevenueSubscriptionsView: React.FC<RevenueSubscriptionsViewProps> = ({ onToast }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await saFetch('/monetization');
      setData(res);
    } catch (err: any) {
      onToast(err.message || 'Failed to load monetization config.', 'error');
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
      const res = await saFetch<{ monetization: any }>('/monetization', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      setData(res.monetization);
      onToast('Subscription plans & payment configuration updated.', 'success');
    } catch (err: any) {
      onToast(err.message || 'Failed to save.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async (txId: string) => {
    if (!window.confirm(`Mark transaction ${txId} as refunded?`)) return;
    try {
      await saFetch(`/monetization/refund/${txId}`, { method: 'POST' });
      onToast(`Transaction ${txId} marked as refunded.`, 'success');
      await loadData();
    } catch (err: any) {
      onToast(err.message || 'Refund action failed.', 'error');
    }
  };

  if (loading || !data) {
    return <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-400">Loading plans & billing...</div>;
  }

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Revenue, Subscriptions & Paid Packages</h2>
          <p className="text-xs text-slate-500">
            Configure Featured/Sponsored job pricing packages, toggle online payment collection, and manage recorded transactions.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg font-bold self-start sm:self-auto"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Pricing & Gateway Settings'}
        </button>
      </div>

      {/* Gateway Readiness & Collection Toggle */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-900 text-sm">
              Online Payment Collection is currently {data.paymentCollectionEnabled ? 'ENABLED' : 'PAUSED (Free Classifieds Mode)'}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Default Gulfaro mode publishes standard jobs free. Connect Stripe, Moyasar (KSA), or HyperPay credentials on the backend before activating live checkout.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <select
            value={data.paymentGatewayProvider}
            onChange={e => setData({ ...data, paymentGatewayProvider: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
          >
            <option value="none">No Gateway (Manual / Free)</option>
            <option value="stripe">Stripe</option>
            <option value="moyasar">Moyasar (Saudi Arabia)</option>
            <option value="hyperpay">HyperPay (GCC)</option>
          </select>
          <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={data.paymentCollectionEnabled}
              onChange={e => setData({ ...data, paymentCollectionEnabled: e.target.checked })}
            />
            <span>Enable Paid Checkout</span>
          </label>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-teal-600" />
            <span>Job Package Pricing Plans ({data.plans?.length || 0})</span>
          </h3>
          <button
            type="button"
            onClick={() =>
              setData({
                ...data,
                plans: [
                  ...(data.plans || []),
                  {
                    id: `plan-${Date.now()}`,
                    name: 'New Employer Plan',
                    priceUsd: 25,
                    durationDays: 30,
                    featuredSlots: 1,
                    urgentBadge: false,
                    active: true,
                    description: 'Custom job promotion package'
                  }
                ]
              })
            }
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold"
          >
            <Plus className="w-3.5 h-3.5" /> Add Plan
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(data.plans || []).map((plan: any, idx: number) => (
            <div key={plan.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={plan.name}
                  onChange={e => {
                    const next = [...data.plans];
                    next[idx] = { ...plan, name: e.target.value };
                    setData({ ...data, plans: next });
                  }}
                  className="font-bold text-sm text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 w-40"
                />
                <label className="flex items-center gap-1 text-[11px] font-semibold">
                  <input
                    type="checkbox"
                    checked={plan.active}
                    onChange={e => {
                      const next = [...data.plans];
                      next[idx] = { ...plan, active: e.target.checked };
                      setData({ ...data, plans: next });
                    }}
                  />
                  Active
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500">Price (USD)</label>
                  <input
                    type="number"
                    value={plan.priceUsd}
                    onChange={e => {
                      const next = [...data.plans];
                      next[idx] = { ...plan, priceUsd: Number(e.target.value) };
                      setData({ ...data, plans: next });
                    }}
                    className="w-full px-2 py-1 border border-slate-300 rounded bg-white tabular-nums font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500">Duration (Days)</label>
                  <input
                    type="number"
                    value={plan.durationDays}
                    onChange={e => {
                      const next = [...data.plans];
                      next[idx] = { ...plan, durationDays: Number(e.target.value) };
                      setData({ ...data, plans: next });
                    }}
                    className="w-full px-2 py-1 border border-slate-300 rounded bg-white tabular-nums"
                  />
                </div>
              </div>
              <textarea
                rows={2}
                value={plan.description}
                onChange={e => {
                  const next = [...data.plans];
                  next[idx] = { ...plan, description: e.target.value };
                  setData({ ...data, plans: next });
                }}
                className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-[11px]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Recorded Transactions ({data.transactions?.length || 0})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="py-2 px-3">Transaction ID</th>
                <th className="py-2 px-3">Employer</th>
                <th className="py-2 px-3">Plan</th>
                <th className="py-2 px-3">Amount</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!data.transactions || data.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No billing transactions recorded yet (Free Classifieds mode active).
                  </td>
                </tr>
              ) : (
                data.transactions.map((tx: any) => (
                  <tr key={tx.id}>
                    <td className="py-2 px-3 font-mono">{tx.id}</td>
                    <td className="py-2 px-3 font-semibold">{tx.employerName || tx.employerId}</td>
                    <td className="py-2 px-3">{tx.planName}</td>
                    <td className="py-2 px-3 font-bold tabular-nums">${tx.amount} {tx.currency}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        tx.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 px-3 text-right">
                      {tx.status === 'paid' && (
                        <button
                          onClick={() => handleRefund(tx.id)}
                          className="inline-flex items-center gap-1 text-rose-600 hover:underline font-semibold"
                        >
                          <RotateCcw className="w-3 h-3" /> Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
