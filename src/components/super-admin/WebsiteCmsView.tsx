import React, { useEffect, useState } from 'react';
import { saFetch } from './api';
import { Save, Globe, Megaphone, Plus, Trash2, FileText } from 'lucide-react';

interface WebsiteCmsViewProps {
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const WebsiteCmsView: React.FC<WebsiteCmsViewProps> = ({ onToast }) => {
  const [cms, setCms] = useState<any>(null);
  const [adsense, setAdsense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await saFetch<{ cms: any; adsense: any }>('/cms');
      setCms(res.cms);
      setAdsense(res.adsense);
    } catch (err: any) {
      onToast(err.message || 'Failed to load CMS settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await saFetch<{ cms: any; adsense: any }>('/cms', {
        method: 'PUT',
        body: JSON.stringify({ cms, adsense })
      });
      setCms(res.cms);
      setAdsense(res.adsense);
      onToast('Website content, banners, and AdSense settings published live.', 'success');
    } catch (err: any) {
      onToast(err.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !cms || !adsense) {
    return <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-400">Loading Website CMS...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Website Content, Branding & AdSense CMS</h2>
          <p className="text-xs text-slate-500">
            Update public homepage headlines, brand identity, announcement banners, legal pages, FAQs, and AdSense slots in real time.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg font-bold self-start sm:self-auto"
        >
          <Save className="w-4 h-4" /> {saving ? 'Publishing...' : 'Save & Publish Live'}
        </button>
      </div>

      {/* Brand Identity & Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-teal-600" />
            <span>Brand & Homepage Hero</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Site Name</label>
              <input
                type="text"
                value={cms.siteName}
                onChange={e => setCms({ ...cms, siteName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
                value={cms.tagline}
                onChange={e => setCms({ ...cms, tagline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Logo URL</label>
              <input
                type="text"
                value={cms.logoUrl}
                onChange={e => setCms({ ...cms, logoUrl: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Favicon URL</label>
              <input
                type="text"
                value={cms.faviconUrl}
                onChange={e => setCms({ ...cms, faviconUrl: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px]"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hero Headline</label>
            <input
              type="text"
              value={cms.heroTitle}
              onChange={e => setCms({ ...cms, heroTitle: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hero Subtitle</label>
            <textarea
              rows={3}
              value={cms.heroSubtitle}
              onChange={e => setCms({ ...cms, heroSubtitle: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {/* Announcement Banner & Footer */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-teal-600" />
            <span>Top Announcement Banner & Footer</span>
          </h3>
          <label className="flex items-center justify-between cursor-pointer bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-800">Show Top Sitewide Announcement Banner</span>
            <input
              type="checkbox"
              checked={cms.announcementBanner?.enabled}
              onChange={e =>
                setCms({
                  ...cms,
                  announcementBanner: { ...cms.announcementBanner, enabled: e.target.checked }
                })
              }
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Banner Message</label>
              <input
                type="text"
                value={cms.announcementBanner?.text || ''}
                onChange={e =>
                  setCms({
                    ...cms,
                    announcementBanner: { ...cms.announcementBanner, text: e.target.value }
                  })
                }
                placeholder="e.g. Scheduled hiring expo in Riyadh this Friday..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Style</label>
              <select
                value={cms.announcementBanner?.variant || 'info'}
                onChange={e =>
                  setCms({
                    ...cms,
                    announcementBanner: { ...cms.announcementBanner, variant: e.target.value }
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="info">Teal Info</option>
                <option value="warning">Amber Notice</option>
                <option value="urgent">Rose Urgent</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Footer Brand Description</label>
              <textarea
                rows={2}
                value={cms.footerDescription}
                onChange={e => setCms({ ...cms, footerDescription: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Footer Contact Email</label>
                <input
                  type="email"
                  value={cms.footerContactEmail}
                  onChange={e => setCms({ ...cms, footerContactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Copyright Line</label>
                <input
                  type="text"
                  value={cms.footerCopyright}
                  onChange={e => setCms({ ...cms, footerCopyright: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pages & FAQs */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-teal-600" />
          <span>Public Pages, Contact Information & FAQs</span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">About Us Content</label>
            <textarea
              rows={3}
              value={cms.aboutUsContent}
              onChange={e => setCms({ ...cms, aboutUsContent: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Support Email</label>
                <input
                  type="email"
                  value={cms.contactUsEmail}
                  onChange={e => setCms({ ...cms, contactUsEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Support Phone</label>
                <input
                  type="text"
                  value={cms.contactUsPhone}
                  onChange={e => setCms({ ...cms, contactUsPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Office Address</label>
              <input
                type="text"
                value={cms.contactUsAddress}
                onChange={e => setCms({ ...cms, contactUsAddress: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Terms of Service Summary</label>
            <textarea
              rows={3}
              value={cms.termsContent}
              onChange={e => setCms({ ...cms, termsContent: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Privacy Policy Summary</label>
            <textarea
              rows={3}
              value={cms.privacyContent}
              onChange={e => setCms({ ...cms, privacyContent: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {/* FAQ Builder */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">Frequently Asked Questions ({cms.faqs?.length || 0})</span>
            <button
              type="button"
              onClick={() =>
                setCms({
                  ...cms,
                  faqs: [...(cms.faqs || []), { id: `faq-${Date.now()}`, question: '', answer: '' }]
                })
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-slate-800"
            >
              <Plus className="w-3.5 h-3.5" /> Add FAQ
            </button>
          </div>

          <div className="space-y-2">
            {(cms.faqs || []).map((faq: any, idx: number) => (
              <div key={faq.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="text"
                  placeholder="Question"
                  value={faq.question}
                  onChange={e => {
                    const next = [...cms.faqs];
                    next[idx] = { ...faq, question: e.target.value };
                    setCms({ ...cms, faqs: next });
                  }}
                  className="sm:col-span-5 px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
                <input
                  type="text"
                  placeholder="Answer"
                  value={faq.answer}
                  onChange={e => {
                    const next = [...cms.faqs];
                    next[idx] = { ...faq, answer: e.target.value };
                    setCms({ ...cms, faqs: next });
                  }}
                  className="sm:col-span-6 px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                />
                <button
                  type="button"
                  onClick={() => setCms({ ...cms, faqs: cms.faqs.filter((_: any, i: number) => i !== idx) })}
                  className="sm:col-span-1 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AdSense Config */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-900">Google AdSense Placement Controls</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={adsense.enabled}
                onChange={e => setAdsense({ ...adsense, enabled: e.target.checked })}
              />
              Enable Ad Units
            </label>
            <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={adsense.testMode}
                onChange={e => setAdsense({ ...adsense, testMode: e.target.checked })}
              />
              Test / Preview Mode
            </label>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Publisher ID</label>
            <input
              type="text"
              value={adsense.publisherId}
              onChange={e => setAdsense({ ...adsense, publisherId: e.target.value })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-[11px]"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Header Leaderboard Slot</label>
            <input
              type="text"
              value={adsense.slots?.headerLeaderboard || ''}
              onChange={e => setAdsense({ ...adsense, slots: { ...adsense.slots, headerLeaderboard: e.target.value } })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-[11px]"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">In-Feed Slot</label>
            <input
              type="text"
              value={adsense.slots?.inFeedClassified || ''}
              onChange={e => setAdsense({ ...adsense, slots: { ...adsense.slots, inFeedClassified: e.target.value } })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-[11px]"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Sidebar Rectangle Slot</label>
            <input
              type="text"
              value={adsense.slots?.sidebarRectangle || ''}
              onChange={e => setAdsense({ ...adsense, slots: { ...adsense.slots, sidebarRectangle: e.target.value } })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-[11px]"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Job Detail Slot</label>
            <input
              type="text"
              value={adsense.slots?.jobDetailBottom || ''}
              onChange={e => setAdsense({ ...adsense, slots: { ...adsense.slots, jobDetailBottom: e.target.value } })}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-[11px]"
            />
          </div>
        </div>
      </div>
    </form>
  );
};
