import React from 'react';
import { ShieldCheck, AlertTriangle, FileText, CheckCircle2, Building, Scale } from 'lucide-react';

interface SafetyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SafetyGuideModal: React.FC<SafetyGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold text-white">
              Gulf Expatriate Safety & Legal Hiring Guide
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">✕</button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto text-xs text-slate-700 space-y-5 leading-relaxed">
          
          {/* Zero-Tolerance Anti-Scam Warning */}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Cardinal Rule: Never Pay Money for a Job or Visa</span>
            </div>
            <p className="text-rose-800">
              In all 6 GCC countries (Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman), labor laws strictly prohibit employers or recruitment agencies from charging job seekers visa fees, application charges, or medical clearance deposits. If any advertiser requests wire transfers, report them immediately.
            </p>
          </div>

          {/* GCC Country-Specific Transfer Portals */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-teal-600" />
              <span>Official GCC Government Labor Portals</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-slate-900 block mb-1">🇸🇦 Saudi Arabia (Qiwa & Muqeem)</span>
                <p className="text-slate-600">
                  Transfers must be conducted through the official Ministry of Human Resources <strong>Qiwa</strong> portal. Never hand over your original passport or Iqama card.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-slate-900 block mb-1">🇦🇪 UAE (MOHRE & GDRFA)</span>
                <p className="text-slate-600">
                  Ensure you receive an official Ministry of Human Resources and Emiratisation (MOHRE) offer letter before initiating visa cancellation or status change.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-slate-900 block mb-1">🇶🇦 Qatar (Ministry of Labour)</span>
                <p className="text-slate-600">
                  Job changes require electronic notice submission through the Ministry of Labour portal with valid QID and approved contract notice period.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-slate-900 block mb-1">🇰🇼 Kuwait (PAM / Ashal)</span>
                <p className="text-slate-600">
                  Article 18 work visas require authorization from the Public Authority for Manpower (PAM) and fingerprint medical clearance.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-slate-900 block mb-1">🇧🇭 Bahrain (LMRA)</span>
                <p className="text-slate-600">
                  Check your mobility and legal visa validity on the official Labour Market Regulatory Authority (LMRA) online portal.
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-slate-900 block mb-1">🇴🇲 Oman (Ministry of Labour)</span>
                <p className="text-slate-600">
                  Expatriate hiring requires valid labor clearance and an electronic contract registered with the Ministry of Labour.
                </p>
              </div>
            </div>
          </div>

          {/* Interview Safety Checklist */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">
              Safe In-Person & Walk-In Interview Checklist
            </h3>
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                <span>Verify that walk-in interview venues are at registered commercial offices or hotels, never residential flats.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                <span>Keep copies of your certificates, but never surrender your original education degrees or passport.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                <span>Verify company trade licenses (CR in Saudi/Qatar/Bahrain/Kuwait/Oman, Trade License in UAE) before signing agreements.</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs"
          >
            I Understand & Agree
          </button>
        </div>

      </div>
    </div>
  );
};
