import React, { useState } from 'react';
import { GccCountry, GCC_COUNTRIES, User } from '../types/job';
import { storageService } from '../services/storage';
import { UserCheck, Building, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserRegistered: (user: User) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onUserRegistered
}) => {
  const [role, setRole] = useState<'job_seeker' | 'employer'>('employer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState<GccCountry>('saudi-arabia');
  const [city, setCity] = useState(GCC_COUNTRIES['saudi-arabia'].topCities[0]);
  const [phone, setPhone] = useState('+966 ');
  const [whatsapp, setWhatsapp] = useState('+966 ');
  const [headline, setHeadline] = useState('');

  if (!isOpen) return null;

  const handleCountryChange = (c: GccCountry) => {
    setCountry(c);
    setCity(GCC_COUNTRIES[c].topCities[0]);
    setPhone(GCC_COUNTRIES[c].phoneCode + ' ');
    setWhatsapp(GCC_COUNTRIES[c].phoneCode + ' ');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const newUser = storageService.registerCustomUser({
      name,
      email,
      role,
      companyName: role === 'employer' ? companyName : undefined,
      country,
      city,
      phone,
      whatsapp,
      headline: headline.trim() || (role === 'employer' ? `Recruiter at ${companyName || 'Company'}` : 'Qualified GCC Professional')
    });

    onUserRegistered(newUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Create a Gulfaro Account
            </h2>
            <p className="text-xs text-slate-500">
              Join thousands of GCC employers and job seekers
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-base leading-none">
            ✕
          </button>
        </div>

        {/* Role Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setRole('employer')}
            className={`py-2 rounded-md transition-colors ${
              role === 'employer' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏢 I am an Employer
          </button>
          <button
            type="button"
            onClick={() => setRole('job_seeker')}
            className={`py-2 rounded-md transition-colors ${
              role === 'job_seeker' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            👨‍💼 I am a Job Seeker
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              {role === 'employer' ? 'Contact Person Name *' : 'Your Full Name *'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tariq Al-Otaibi"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
            />
          </div>

          {role === 'employer' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company / Establishment Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Gulf Contracting Group W.L.L."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">GCC Country</label>
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value as GccCountry)}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
              >
                <option value="saudi-arabia">🇸🇦 Saudi Arabia</option>
                <option value="uae">🇦🇪 UAE</option>
                <option value="qatar">🇶🇦 Qatar</option>
                <option value="kuwait">🇰🇼 Kuwait</option>
                <option value="bahrain">🇧🇭 Bahrain</option>
                <option value="oman">🇴🇲 Oman</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
              >
                {GCC_COUNTRIES[country].topCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">WhatsApp (Direct)</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+966 5..."
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Direct Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+966 5..."
                className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Professional Headline / Bio</label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder={role === 'employer' ? "e.g. HR Manager at Al-Bawani" : "e.g. Civil Engineer · 5 Yrs KSA · Transferable Iqama"}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500 text-xs"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition-colors"
            >
              Complete Registration & Sign In
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
