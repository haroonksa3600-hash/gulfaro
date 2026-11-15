import React, { useState } from 'react';
import { PublicPlatformConfig } from '../services/siteConfig';
import { apiUrl } from '../services/apiConfig';
import {
  ArrowLeft,
  CheckCircle2,
  Cookie,
  FileText,
  Info,
  Lock,
  Mail,
  Send,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

export type PublicInfoRouteType =
  | 'about'
  | 'contact'
  | 'privacy-policy'
  | 'terms'
  | 'disclaimer'
  | 'cookie-policy';

interface PublicInfoPagesProps {
  page: PublicInfoRouteType;
  publicConfig: PublicPlatformConfig | null;
  onNavigate: (path: string) => void;
}

export const PublicInfoPages: React.FC<PublicInfoPagesProps> = ({
  page,
  publicConfig,
  onNavigate
}) => {
  const officialEmail = publicConfig?.cms?.contactUsEmail || publicConfig?.cms?.footerContactEmail || 'admingulfaro@gmail.com';

  // Contact Inquiry Form State (submits to existing /api/reports endpoint cleanly)
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!senderName.trim() || !senderEmail.trim() || !message.trim()) {
      setFormError('Please provide your name, valid email address, and message.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl('/api/reports'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'job',
          targetId: 'contact-inquiry',
          targetTitle: subject.trim() || 'General Platform Inquiry',
          category: 'other',
          reason: subject.trim() || 'Public Contact Inquiry',
          details: message.trim(),
          reporterName: senderName.trim(),
          reporterEmail: senderEmail.trim().toLowerCase()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Could not send message. Please try again or email us directly.');
      } else {
        setSubmitted(true);
        setSenderName('');
        setSenderEmail('');
        setSubject('');
        setMessage('');
      }
    } catch {
      setFormError('Network error sending inquiry. You can also write directly to our official email.');
    } finally {
      setSubmitting(false);
    }
  };

  const pageMeta: Record<PublicInfoRouteType, { title: string; subtitle: string; icon: React.ReactNode }> = {
    about: {
      title: 'About Gulfaro',
      subtitle: 'Direct employment opportunities and GCC career resources across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman.',
      icon: <Info className="w-5 h-5 text-teal-400" />
    },
    contact: {
      title: 'Contact Gulfaro',
      subtitle: 'Reach our administration and trust & safety desk regarding listings, employer accounts, or platform policies.',
      icon: <Mail className="w-5 h-5 text-teal-400" />
    },
    'privacy-policy': {
      title: 'Privacy Policy',
      subtitle: 'How Gulfaro collects, uses, stores, and protects personal data, cookies, and third-party advertising preferences.',
      icon: <Lock className="w-5 h-5 text-teal-400" />
    },
    terms: {
      title: 'Terms and Conditions',
      subtitle: 'Platform rules governing job seekers, direct employers, prohibited fees, and acceptable use.',
      icon: <FileText className="w-5 h-5 text-teal-400" />
    },
    disclaimer: {
      title: 'Disclaimer',
      subtitle: 'Important legal and editorial notices regarding job advertisements, career articles, and direct employer communication.',
      icon: <ShieldAlert className="w-5 h-5 text-teal-400" />
    },
    'cookie-policy': {
      title: 'Cookie Policy',
      subtitle: 'Details on essential session storage, user preferences, and third-party advertising cookies including Google AdSense.',
      icon: <Cookie className="w-5 h-5 text-teal-400" />
    }
  };

  const currentMeta = pageMeta[page];

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <section className="bg-slate-950 text-white border-b border-slate-800 py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-2 text-xs text-slate-400">
              <button onClick={() => onNavigate('/')} className="hover:text-teal-400">
                Home
              </button>
              <span>/</span>
              <span className="text-slate-200 font-semibold">{currentMeta.title}</span>
            </nav>

            <button
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </button>
          </div>

          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-teal-400">
            {currentMeta.icon}
            <span>Gulfaro Information & Trust Center</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            {currentMeta.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {currentMeta.subtitle}
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 space-y-6 text-sm text-slate-700 leading-relaxed">
          {page === 'about' && (
            <>
              <section className="space-y-2.5">
                <h2 className="text-xl font-bold text-slate-900">Our Mission</h2>
                <p>
                  {publicConfig?.cms?.aboutUsContent ||
                    'Gulfaro connects job seekers with employers across the six Gulf Cooperation Council (GCC) nations: Saudi Arabia, the United Arab Emirates, Qatar, Kuwait, Bahrain, and Oman.'}
                </p>
                <p>
                  We maintain a straightforward employment portal where visitors can read full vacancy details, review compensation ranges, and contact hiring teams directly via official email or telephone without creating mandatory job-seeker accounts or paying application fees.
                </p>
              </section>

              <section className="space-y-2.5 pt-4 border-t border-slate-100">
                <h2 className="text-xl font-bold text-slate-900">Transparent Direct Hiring Standards</h2>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-1" />
                    <span><strong>Direct Employer Contact:</strong> Job postings display employer-provided email addresses and telephone numbers rather than redirecting job seekers across unverified third-party websites.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-1" />
                    <span><strong>Strict No-External-Links Policy:</strong> Employers may not embed external website URLs, social media links, or off-platform application forms inside job descriptions.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-1" />
                    <span><strong>Zero Recruitment Fees:</strong> Charging candidates for visas, medical tests, or job placement is strictly prohibited under GCC labor laws and Gulfaro’s terms of service.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-1" />
                    <span><strong>Original Career Education:</strong> Alongside live vacancies, Gulfaro publishes practical regional guidance on CV formatting, interview preparation, and GCC employment contracts.</span>
                  </li>
                </ul>
              </section>

              <section className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
                <button
                  onClick={() => onNavigate('/career-advice')}
                  className="px-4 py-2 bg-slate-900 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Explore Career Advice
                </button>
                <button
                  onClick={() => onNavigate('/contact')}
                  className="px-4 py-2 bg-white border border-slate-300 hover:border-slate-500 text-slate-800 text-xs font-bold rounded-lg transition-colors"
                >
                  Contact Us
                </button>
              </section>
            </>
          )}

          {page === 'contact' && (
            <>
              {/* Official Contact: Email ONLY per user requirement */}
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
                <h2 className="text-base font-bold text-slate-900">Official Contact</h2>
                <p className="text-sm text-slate-700">
                  <strong>Email:</strong>{' '}
                  <a
                    href={`mailto:${officialEmail}`}
                    className="text-teal-700 font-semibold hover:underline"
                  >
                    {officialEmail}
                  </a>
                </p>
                <p className="text-xs text-slate-500">
                  For employer support, suspicious listing reports, privacy inquiries, or editorial corrections, email our team directly or use the inquiry form below.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900">Send an Inquiry</h2>
                {submitted ? (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <h3 className="font-bold text-slate-900 text-base">Message Received</h3>
                    <p className="text-xs text-slate-600">
                      Thank you for contacting Gulfaro. Your message has been logged for review by our team.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-2 px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    {formError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium">
                        {formError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={senderName}
                          onChange={e => setSenderName(e.target.value)}
                          placeholder="Your name"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={senderEmail}
                          onChange={e => setSenderEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-600"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="e.g., Employer Account Question, Listing Report, Privacy Request"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Message *</label>
                      <textarea
                        rows={4}
                        required
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Provide complete details so our team can respond accurately..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-teal-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submitting ? 'Sending...' : 'Send Message'}</span>
                    </button>
                  </form>
                )}
              </section>
            </>
          )}

          {page === 'privacy-policy' && (
            <>
              <p className="text-xs text-slate-500">Last Updated: November 2026</p>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">1. Overview</h2>
                <p>
                  Gulfaro (“we”, “our”, “us”) respects your privacy and is committed to transparent data handling across our job portal serving Saudi Arabia, the United Arab Emirates, Qatar, Kuwait, Bahrain, and Oman. This Privacy Policy explains what information we collect, how it is used, and how cookies and advertising technologies operate on our website.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">2. Information We Collect</h2>
                <ul className="space-y-1.5 list-disc pl-5">
                  <li><strong>Account & Registration Details:</strong> When job seekers or employers create an account, we collect your name, email address, phone number, GCC country/city, company or professional title, and encrypted authentication credentials.</li>
                  <li><strong>Job Posting Content:</strong> Employers publish vacancy titles, role descriptions, salaries, location details, and business contact email/telephone information intended for public viewing.</li>
                  <li><strong>Reports & Inquiries:</strong> When visitors report a suspicious listing or contact us, we store the submitted details, email address (if supplied), and request IP metadata for security and abuse prevention.</li>
                  <li><strong>Browser Storage & Logs:</strong> We use local browser storage to preserve session login state, saved bookmarks, and cookie consent preferences, alongside standard server access and error diagnostics.</li>
                </ul>
              </section>

              <section className="space-y-2 bg-teal-50/70 border border-teal-200 rounded-xl p-5">
                <h2 className="text-lg font-bold text-teal-950">3. Third-Party Advertising & Google AdSense</h2>
                <p className="text-teal-950">
                  Gulfaro may display third-party advertisements served through <strong>Google AdSense</strong> and other accredited advertising networks to support free public access to job listings and career guides.
                </p>
                <ul className="space-y-1.5 list-disc pl-5 text-teal-900">
                  <li><strong>Use of Advertising Cookies:</strong> Third-party vendors, including Google, use cookies to serve ads based on a visitor’s prior visits to Gulfaro or other websites on the internet.</li>
                  <li><strong>Personalized Advertising:</strong> Google’s use of advertising cookies enables it and its partners to serve relevant ads to users based on their browsing visits to this site and/or other sites across the web.</li>
                  <li><strong>Managing Preferences & Opt-Out:</strong> Visitors may opt out of personalized advertising at any time by visiting{' '}
                    <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="font-bold underline">
                      Google Ads Settings (adssettings.google.com)
                    </a>{' '}
                    or by managing third-party vendor cookies via{' '}
                    <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="font-bold underline">
                      aboutads.info
                    </a>.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">4. How We Use Information & Data Sharing</h2>
                <p>
                  We use collected information solely to operate account authentication, display employer job listings, deliver transactional security notifications (such as email verification or password resets), investigate fraud reports, and maintain site security. We do not sell user contact lists to third-party data brokers.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">5. Data Protection & Your Rights</h2>
                <p>
                  Passwords and recovery keys are stored using cryptographic hashing. We strive to align data protection practices with applicable regional frameworks including the Saudi Personal Data Protection Law (PDPL) and UAE Federal Decree-Law No. 45/2021. To request correction or removal of your account data, email{' '}
                  <a href={`mailto:${officialEmail}`} className="text-teal-700 font-semibold hover:underline">
                    {officialEmail}
                  </a>.
                </p>
              </section>
            </>
          )}

          {page === 'terms' && (
            <>
              <p className="text-xs text-slate-500">Last Updated: November 2026</p>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">1. Acceptance of Terms</h2>
                <p>
                  By accessing Gulfaro, browsing job listings, reading career resources, or registering an employer or job seeker account, you agree to comply with these Terms and Conditions and applicable GCC employment laws.
                </p>
              </section>

              <section className="space-y-2 bg-rose-50 border border-rose-200 rounded-xl p-5 text-rose-950">
                <h2 className="text-base font-bold">2. Strict Prohibition on Charging Job Seekers</h2>
                <p>
                  Employers and recruiters are strictly prohibited from requesting or collecting visa fees, recruitment charges, training deposits, or interview payments from candidates. Listings violating GCC labor regulations will be removed and associated accounts permanently suspended.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">3. Employer Job Posting Rules & No External Links</h2>
                <ul className="space-y-1.5 list-disc pl-5">
                  <li>Only genuine, active vacancies in Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, or Oman may be published.</li>
                  <li>All job postings must use direct employer email addresses and telephone numbers only. External website URLs, social media links, messaging links, and off-platform application URLs are prohibited.</li>
                  <li>Standard listings expire automatically after thirty (30) days unless renewed or closed earlier by the employer.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">4. Account Responsibility & Moderation</h2>
                <p>
                  Account holders are responsible for keeping login credentials confidential and ensuring posted data is truthful. Gulfaro reserves the right to remove spam, duplicate, expired, or policy-violating listings without prior notice.
                </p>
              </section>
            </>
          )}

          {page === 'disclaimer' && (
            <>
              <section className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">1. Independent Employment & Career Portal</h2>
                <p>
                  Gulfaro operates as an independent online job information board and educational career resource. Gulfaro is not a government entity, licensed manpower agency, immigration consultancy, or legal firm, and does not sponsor employment visas or guarantee job placement.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">2. Verification of Employers & Vacancies</h2>
                <p>
                  While Gulfaro enforces anti-spam validation, strict no-external-links rules, and corporate email checks for verified accounts, individual job postings are submitted by third-party employers. Candidates are responsible for independently verifying company Commercial Registration (CR) or Trade Licenses and reviewing official contracts through national labor portals (such as Qiwa, MOHRE, MOL, PAM, or LMRA) before accepting offers or relocating.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">3. Informational Career Content</h2>
                <p>
                  Career advice guides, CV recommendations, interview articles, and labor contract overviews published on Gulfaro are provided for general educational information only and do not constitute formal legal or regulatory advice.
                </p>
              </section>
            </>
          )}

          {page === 'cookie-policy' && (
            <>
              <p className="text-xs text-slate-500">Last Updated: November 2026</p>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">1. What Are Cookies & Local Storage?</h2>
                <p>
                  Cookies and browser local storage are small data files saved on your device when you visit websites. They enable core site functions such as staying signed in, remembering saved jobs, and supporting compliant advertising delivery.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">2. Categories of Cookies Used on Gulfaro</h2>
                <ul className="space-y-2 list-disc pl-5">
                  <li><strong>Essential Functionality & Session Storage:</strong> Required to maintain signed-in account sessions, store bookmarked jobs, and record your cookie consent notice dismissal.</li>
                  <li><strong>Security & Integrity:</strong> Supports safe password recovery, verification tokens, and protection against automated abuse.</li>
                  <li><strong>Third-Party Advertising Cookies (Google AdSense):</strong> Advertising partners including Google may set cookies to deliver relevant ads, measure ad performance, and limit repetitive ad impressions.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900">3. Managing & Disabling Cookies</h2>
                <p>
                  You can clear or block cookies through your browser settings at any time. To adjust or opt out of personalized Google advertising cookies, visit{' '}
                  <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-teal-700 font-semibold hover:underline">
                    Google Ads Settings
                  </a>{' '}
                  or{' '}
                  <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="text-teal-700 font-semibold hover:underline">
                    www.aboutads.info
                  </a>. Disabling essential browser storage may affect saved jobs or signed-in sessions.
                </p>
              </section>
            </>
          )}
        </div>

        {/* Cross-Navigation Strip for Trust Pages */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-bold text-slate-700">Trust & Legal Directory:</span>
          <div className="flex flex-wrap items-center gap-3">
            {(
              [
                { id: 'about', label: 'About Gulfaro', path: '/about' },
                { id: 'contact', label: 'Contact Us', path: '/contact' },
                { id: 'privacy-policy', label: 'Privacy Policy', path: '/privacy-policy' },
                { id: 'terms', label: 'Terms & Conditions', path: '/terms' },
                { id: 'disclaimer', label: 'Disclaimer', path: '/disclaimer' },
                { id: 'cookie-policy', label: 'Cookie Policy', path: '/cookie-policy' }
              ] as const
            ).map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.path)}
                className={`font-semibold transition-colors ${
                  page === item.id ? 'text-teal-700 underline' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
