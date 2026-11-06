import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileText, Check, Cookie, Lock } from 'lucide-react';

interface LegalModalProps {
  type: 'privacy' | 'terms' | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            {type === 'privacy' ? <ShieldCheck className="w-5 h-5 text-teal-400" /> : <FileText className="w-5 h-5 text-teal-400" />}
            <h2 className="text-base font-bold text-white">
              {type === 'privacy' ? 'Gulfaro Privacy Policy & Cookie Disclosure' : 'Gulfaro Terms of Service & Advertising Rules'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">✕</button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto text-xs text-slate-700 space-y-4 leading-relaxed">
          
          {type === 'privacy' ? (
            <>
              <div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">1. Information We Collect</h3>
                <p>
                  Gulfaro ("we", "our") collects information provided by advertisers and job seekers, including names, contact emails, direct WhatsApp numbers, job titles, and resume credentials. We operate transparently across the six GCC countries: Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman.
                </p>
              </div>

              {/* Mandatory Google AdSense Privacy Section */}
              <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                <h3 className="font-bold text-sm text-teal-950 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-teal-700" />
                  <span>2. Google AdSense & Third-Party Advertising Policy</span>
                </h3>
                <p className="text-teal-900 leading-relaxed">
                  • <strong>Third-party cookies:</strong> Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to Gulfaro or other websites on the internet.
                </p>
                <p className="text-teal-900 leading-relaxed">
                  • <strong>Personalized advertising:</strong> Google's use of advertising cookies enables it and its partners to serve ads to users based on their visit to our site and/or other sites on the Internet.
                </p>
                <p className="text-teal-900 leading-relaxed">
                  • <strong>Opting out:</strong> Users may opt out of personalized advertising by visiting <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="font-bold underline">Google Ads Settings</a> or through <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="font-bold underline">www.aboutads.info</a>.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">3. Direct Contact Disclosure</h3>
                <p>
                  When you submit your phone or WhatsApp number on an advertisement or job application, you understand and agree that employers and candidates may contact you directly through third-party services like WhatsApp and telephony carriers.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">4. GCC Data Protection Law Compliance</h3>
                <p>
                  We adhere to regional personal data protection standards, including the Saudi Personal Data Protection Law (PDPL), UAE Federal Decree-Law No. 45/2021, and Qatar Personal Data Privacy Law. We never sell your personal contact lists to unauthorized brokers.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">1. Acceptance of Terms</h3>
                <p>
                  By accessing Gulfaro, browsing vacancies, or posting job classifieds, you agree to comply with these terms, regional GCC labor regulations, and anti-fraud guidelines.
                </p>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-rose-900">
                <h3 className="font-bold text-xs uppercase tracking-wider">2. Prohibition on Charging Job Seekers</h3>
                <p>
                  In compliance with Saudi Ministry of Human Resources, UAE MOHRE, and GCC labor regulations, employers and agencies are strictly prohibited from demanding recruitment fees, visa charges, or interview processing payments from candidates. Violators will be banned and reported to relevant authorities.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">3. 30-Day Advertisement Lifecycle</h3>
                <p>
                  All job advertisements remain active for thirty (30) days from the publication date. Advertisers may renew or extend listings via their Employer Dashboard. Gulfaro reserves the right to unpublish, edit, or remove ads violating community guidelines.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">4. Content Integrity</h3>
                <p>
                  Advertisers must provide accurate descriptions, realistic salary indications, and verified company details. Misleading vacancies or spam postings are subject to immediate termination.
                </p>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('golfaro_cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('golfaro_cookie_consent', 'accepted');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-slate-900/95 backdrop-blur-md text-white border-t border-slate-800 p-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
            <Cookie className="w-4 h-4" />
          </div>
          <p className="text-slate-300 leading-relaxed">
            We use cookies and third-party advertising partners (including Google AdSense) to deliver relevant job classifieds, personalize content, and analyze site traffic per GCC regulations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs transition-colors"
          >
            Accept Cookies
          </button>
        </div>
      </div>
    </div>
  );
};
