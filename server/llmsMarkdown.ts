import { GCC_COUNTRY_DIRECTORY, PUBLIC_JOB_CATEGORIES, isJobActiveAndUnexpired } from '../src/data/gccDirectory';
import { CAREER_ARTICLES } from '../src/data/careerArticles';
import { GCC_COUNTRIES } from '../src/types/job';

export const DISCOVERY_LINK_HEADER =
  '</llms.txt>; rel="alternate"; type="text/plain"; title="llms.txt", </index.md>; rel="alternate"; type="text/markdown"; title="Markdown"';

/**
 * RFC 9110 Accept header negotiation: returns true only when client explicitly requests
 * text/markdown (or text/x-markdown) with q > 0 and >= any explicit text/html preference.
 */
export function prefersMarkdown(acceptHeader?: string | string[]): boolean {
  const raw = Array.isArray(acceptHeader) ? acceptHeader.join(',') : String(acceptHeader || '');
  if (!raw.trim()) return false;

  const ranges = raw
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

  let markdownQ = -1;
  let htmlQ = -1;

  for (const range of ranges) {
    const [mediaPart, ...params] = range.split(';').map(s => s.trim().toLowerCase());
    if (!mediaPart) continue;

    let q = 1;
    for (const param of params) {
      const match = param.match(/^q\s*=\s*([0-9]*\.?[0-9]+)$/);
      if (match) {
        const parsed = Number(match[1]);
        if (!Number.isNaN(parsed)) {
          q = Math.max(0, Math.min(1, parsed));
        }
      }
    }

    if (mediaPart === 'text/markdown' || mediaPart === 'text/x-markdown') {
      markdownQ = Math.max(markdownQ, q);
    } else if (mediaPart === 'text/html' || mediaPart === 'application/xhtml+xml') {
      htmlQ = Math.max(htmlQ, q);
    }
  }

  if (markdownQ <= 0) return false;
  if (htmlQ < 0) return true;
  return markdownQ >= htmlQ;
}

function formatPublicJobSalary(job: any): string {
  if (job.salaryNegotiable && !job.salaryMin) {
    return job.salaryDisplay && !/negotiable/i.test(job.salaryDisplay)
      ? `${job.currency || 'SAR'} ${job.salaryDisplay}`
      : 'Salary Negotiable';
  }
  if (job.salaryMin && Number(job.salaryMin) > 0) {
    const min = Number(job.salaryMin).toLocaleString('en-US');
    const max = job.salaryMax ? ` - ${Number(job.salaryMax).toLocaleString('en-US')}` : '';
    const period = job.salaryPeriod === 'yearly' ? '/year' : job.salaryPeriod === 'daily' ? '/day' : '/month';
    return `${job.currency || 'SAR'} ${min}${max}${period}`;
  }
  return 'Salary Negotiable';
}

function getActivePublicJobs(jobs: any[], settings?: any): any[] {
  if (settings?.emergency?.hideAllPublicJobs || settings?.emergency?.emergencyShutdown) {
    return [];
  }
  const nowMs = Date.now();
  return (Array.isArray(jobs) ? jobs : [])
    .filter(job => isJobActiveAndUnexpired(job, nowMs))
    .sort((a, b) => {
      const aMs = Date.parse(a.updatedAt || a.postedAt || '') || 0;
      const bMs = Date.parse(b.updatedAt || b.postedAt || '') || 0;
      return bMs - aMs;
    });
}

function sanitizeLine(str: unknown): string {
  return String(str || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildLlmsTxt(options: {
  origin: string;
  jobs: any[];
  settings?: any;
}): string {
  const origin = options.origin.replace(/\/+$/, '') || 'https://www.gulfaro.net';
  const activeJobs = getActivePublicJobs(options.jobs, options.settings);

  const lines: string[] = [
    '# Gulfaro',
    '',
    '> Gulfaro is a modern GCC job marketplace connecting skilled expatriate and national talent with verified employers across Saudi Arabia, the United Arab Emirates, Qatar, Kuwait, Bahrain, and Oman, alongside original GCC career advice and direct employer email and telephone contact.',
    '',
    `Gulfaro provides free public access to direct-employer vacancies across all 6 GCC nations and 30 employment categories, with no application fees or third-party redirects. Official support page: ${origin}/contact.`,
    '',
    '## Main Pages',
    `- [Gulfaro Homepage](${origin}/): Browse active GCC job vacancies and search by keyword, country, city, or category`,
    `- [Homepage Markdown Edition](${origin}/index.md): Machine-readable Markdown representation of the Gulfaro homepage`,
    `- [GCC Country Job Portals](${origin}/countries): Regional hiring hubs, major cities, and labor authorities across all 6 GCC countries`,
    `- [All 30 Job Categories](${origin}/categories): Complete directory of Gulf industries and employment sectors`,
    `- [GCC Career Advice & Guides](${origin}/career-advice): Practical articles on CVs, interviews, and GCC employment contracts`,
    '',
    '## Jobs by GCC Country'
  ];

  for (const country of GCC_COUNTRY_DIRECTORY) {
    lines.push(
      `- [${country.name} Jobs](${origin}/country/${country.slug}): ${sanitizeLine(country.headline)} (${country.majorHubs.slice(0, 4).join(', ')})`
    );
  }

  lines.push('', '## Active Job Listings');
  if (activeJobs.length === 0) {
    lines.push(`- [Browse All GCC Jobs](${origin}/): View currently open vacancies across the Gulf`);
  } else {
    for (const job of activeJobs.slice(0, 50)) {
      const slugOrId = encodeURIComponent(job.slug || job.id);
      const countryName =
        GCC_COUNTRIES[job.country as keyof typeof GCC_COUNTRIES]?.name || sanitizeLine(job.country);
      const location = job.city?.trim() ? `${sanitizeLine(job.city)}, ${countryName}` : countryName;
      const companyPart = job.company?.trim() ? ` at ${sanitizeLine(job.company)}` : '';
      const salaryPart = formatPublicJobSalary(job);
      lines.push(
        `- [${sanitizeLine(job.title)}](${origin}/job/${slugOrId}): ${location}${companyPart} | ${salaryPart}`
      );
    }
  }

  lines.push('', '## Job Categories');
  for (const cat of PUBLIC_JOB_CATEGORIES) {
    lines.push(
      `- [${cat.name}](${origin}/category/${cat.slug}): ${sanitizeLine(cat.summary)}`
    );
  }

  lines.push('', '## Career Advice & Guides');
  for (const article of CAREER_ARTICLES) {
    lines.push(
      `- [${article.title}](${origin}/career-advice/${article.slug}): ${sanitizeLine(article.summary)}`
    );
  }

  lines.push(
    '',
    '## Company, Legal & Contact',
    `- [About Us](${origin}/about): Gulfaro mission, direct hiring standards, and Frequently Asked Questions`,
    `- [Contact Us](${origin}/contact): Official support desk and inquiry form`,
    `- [Terms & Conditions](${origin}/terms): Platform rules and strict ban on candidate recruitment fees`,
    `- [Privacy Policy](${origin}/privacy-policy): Data protection, regional GCC compliance, and cookie disclosures`,
    `- [Disclaimer](${origin}/disclaimer): Independent employment portal and verification notices`,
    `- [Cookie Policy](${origin}/cookie-policy): Essential storage and third-party advertising cookie preferences`,
    '',
    '## Optional',
    `- [XML Sitemap](${origin}/sitemap.xml): Live XML index of public pages and active job listings`,
    `- [Robots Policy](${origin}/robots.txt): Crawler access rules and content signals`
  );

  return `${lines.join('\n')}\n`;
}

export function buildHomepageMarkdown(options: {
  origin: string;
  jobs: any[];
  settings?: any;
}): string {
  const origin = options.origin.replace(/\/+$/, '') || 'https://www.gulfaro.net';
  const heroTitle =
    sanitizeLine(options.settings?.cms?.heroTitle) ||
    'Direct Job Opportunities Across Saudi Arabia, UAE & The Gulf';
  const heroSubtitle =
    sanitizeLine(options.settings?.cms?.heroSubtitle) ||
    'Browse genuine vacancies across KSA, UAE, Qatar, Kuwait, Bahrain & Oman. Contact employers and recruiters directly through official email or direct phone call.';
  const activeJobs = getActivePublicJobs(options.jobs, options.settings);

  const lines: string[] = [
    '# Gulfaro',
    '',
    `> ${heroTitle} — ${heroSubtitle}`,
    '',
    `- **Canonical URL**: [${origin}/](${origin}/)`,
    `- **LLM Discovery**: [${origin}/llms.txt](${origin}/llms.txt)`,
    `- **Active Vacancies**: ${activeJobs.length}`,
    `- **Official Support**: [Contact Us](${origin}/contact)`,
    '- **Candidate Standards**: Zero application fees · Direct employer email & phone/WhatsApp access · No external redirect links',
    '',
    '## Latest Job Opportunities Across the GCC'
  ];

  if (activeJobs.length === 0) {
    lines.push('', 'No active vacancies are currently listed. Check back soon or explore regional GCC guides.');
  } else {
    for (const job of activeJobs.slice(0, 25)) {
      const slugOrId = encodeURIComponent(job.slug || job.id);
      const jobUrl = `${origin}/job/${slugOrId}`;
      const countryName =
        GCC_COUNTRIES[job.country as keyof typeof GCC_COUNTRIES]?.name || sanitizeLine(job.country);
      const location = job.city?.trim() ? `${sanitizeLine(job.city)}, ${countryName}` : countryName;
      const categoryMeta = PUBLIC_JOB_CATEGORIES.find(
        c => c.slug === job.category || c.id === job.category
      );
      const categoryName = categoryMeta?.name || sanitizeLine(job.category);
      const salary = formatPublicJobSalary(job);
      const summary = sanitizeLine(job.description).slice(0, 220);

      lines.push(
        '',
        `### [${sanitizeLine(job.title)}](${jobUrl})`,
        `- **Location**: ${location}`,
        ...(job.company?.trim() ? [`- **Employer**: ${sanitizeLine(job.company)}`] : []),
        `- **Category**: ${categoryName}`,
        `- **Compensation**: ${salary}`,
        ...(summary ? [`- **Summary**: ${summary}${sanitizeLine(job.description).length > 220 ? '...' : ''}`] : [])
      );
    }
  }

  lines.push('', '## GCC Country Portals');
  for (const country of GCC_COUNTRY_DIRECTORY) {
    lines.push(
      `- [${country.name} Jobs](${origin}/country/${country.slug}) — ${sanitizeLine(country.overview)}`
    );
  }

  lines.push('', '## Candidate Preparation Hub & Career Advice');
  lines.push(`- [Explore All Career Guides](${origin}/career-advice)`);
  for (const article of CAREER_ARTICLES) {
    lines.push(
      `- [${article.title}](${origin}/career-advice/${article.slug}) — ${sanitizeLine(article.summary)}`
    );
  }

  lines.push(
    '',
    '## Company, Legal & Support',
    `- [About Us](${origin}/about)`,
    `- [Contact Us](${origin}/contact) — Official support desk and inquiry form`,
    `- [Terms & Conditions](${origin}/terms)`,
    `- [Privacy Policy](${origin}/privacy-policy)`,
    `- [Disclaimer](${origin}/disclaimer)`,
    `- [Cookie Policy](${origin}/cookie-policy)`,
    `- [XML Sitemap](${origin}/sitemap.xml)`
  );

  return `${lines.join('\n')}\n`;
}
