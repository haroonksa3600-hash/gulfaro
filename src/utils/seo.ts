import { JobAd, GCC_COUNTRIES } from '../types/job';
import { CareerArticle } from '../data/careerArticles';
import { isJobActiveAndUnexpired, PUBLIC_JOB_CATEGORIES } from '../data/gccDirectory';

export interface RouteSeoMetadata {
  title: string;
  description: string;
  canonicalPath: string;
  robots?: string;
  ogType?: 'website' | 'article';
  jsonLd?: Record<string, any> | null;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

const PROD_ORIGIN = 'https://www.gulfaro.net';

export const VERIFIED_DEFAULT_FAQS: FaqEntry[] = [
  {
    question: 'Is Gulfaro free for Job Seekers?',
    answer:
      'Yes. Job seekers can read all vacancies, explore career guides, and contact employers directly via email or phone completely free of charge. Never pay any money for visas or interviews.'
  },
  {
    question: 'How quickly do Employer job ads go live?',
    answer:
      'Registered employers publish job vacancies automatically after submitting the single-page posting form and passing automated security and anti-spam checks.'
  },
  {
    question: 'How does Verified Employer status work?',
    answer:
      'All registered employer accounts on Gulfaro automatically receive the Verified Employer trust badge on their published job listings.'
  }
];

export function getPublicOrigin(): string {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname.toLowerCase();
    if (h === 'gulfaro.net' || h === 'www.gulfaro.net') {
      return PROD_ORIGIN;
    }
    if (
      h !== 'localhost' &&
      h !== '127.0.0.1' &&
      !h.includes('ais-dev-') &&
      !h.includes('webcontainer')
    ) {
      return window.location.origin;
    }
  }
  return PROD_ORIGIN;
}

function setOrUpdateMeta(attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonicalLink(url: string) {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function setRouteJsonLd(payload: Record<string, any> | null) {
  if (typeof document === 'undefined') return;
  const scriptId = 'gulfaro-route-jsonld';
  const existing = document.getElementById(scriptId);
  if (!payload) {
    if (existing) existing.remove();
    return;
  }
  let script = existing as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(payload);
}

export function applyRouteSeo(meta: RouteSeoMetadata) {
  if (typeof document === 'undefined') return;
  const origin = getPublicOrigin();
  const normalizedPath = meta.canonicalPath.startsWith('/')
    ? meta.canonicalPath
    : `/${meta.canonicalPath}`;
  const canonicalUrl = `${origin}${normalizedPath}`;
  const ogImage = `${origin}/pwa-512x512.png`;

  document.title = meta.title;
  setOrUpdateMeta('name', 'description', meta.description);
  setOrUpdateMeta('name', 'robots', meta.robots || 'index, follow');
  setOrUpdateMeta('property', 'og:type', meta.ogType || 'website');
  setOrUpdateMeta('property', 'og:site_name', 'Gulfaro');
  setOrUpdateMeta('property', 'og:title', meta.title);
  setOrUpdateMeta('property', 'og:description', meta.description);
  setOrUpdateMeta('property', 'og:url', canonicalUrl);
  setOrUpdateMeta('property', 'og:image', ogImage);
  setOrUpdateMeta('name', 'twitter:card', 'summary_large_image');
  setOrUpdateMeta('name', 'twitter:title', meta.title);
  setOrUpdateMeta('name', 'twitter:description', meta.description);
  setOrUpdateMeta('name', 'twitter:image', ogImage);
  setCanonicalLink(canonicalUrl);
  setRouteJsonLd(meta.jsonLd || null);
}

export function buildOrganizationNode(options?: {
  description?: string;
}): Record<string, any> {
  const origin = getPublicOrigin();
  const orgDescription =
    options?.description?.trim() ||
    'Gulfaro is a modern GCC job marketplace connecting skilled expatriate and national talent with verified employers across the Arabian Gulf, making recruitment simpler, faster, and more reliable.';

  // Note: sameAs is intentionally omitted until verified official social profile URLs exist.
  return {
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: 'Gulfaro',
    alternateName: 'Gulfaro GCC Jobs',
    url: origin,
    description: orgDescription,
    logo: {
      '@type': 'ImageObject',
      url: `${origin}/pwa-512x512.png`,
      width: 512,
      height: 512
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${origin}/contact`,
      areaServed: ['SA', 'AE', 'QA', 'KW', 'BH', 'OM'],
      availableLanguage: ['English']
    },
    areaServed: [
      { '@type': 'Country', name: 'Saudi Arabia' },
      { '@type': 'Country', name: 'United Arab Emirates' },
      { '@type': 'Country', name: 'Qatar' },
      { '@type': 'Country', name: 'Kuwait' },
      { '@type': 'Country', name: 'Bahrain' },
      { '@type': 'Country', name: 'Oman' }
    ]
  };
}

export function buildWebSiteNode(): Record<string, any> {
  const origin = getPublicOrigin();
  return {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    url: origin,
    name: 'Gulfaro',
    alternateName: 'Gulfaro GCC Jobs',
    publisher: {
      '@id': `${origin}/#organization`
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${origin}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
}

export function buildBreadcrumbListNode(items: BreadcrumbItem[]): Record<string, any> {
  const origin = getPublicOrigin();
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: `${origin}${item.path.startsWith('/') ? item.path : `/${item.path}`}`
    }))
  };
}

export function buildFaqPageNode(faqs: FaqEntry[]): Record<string, any> | null {
  const cleanFaqs = faqs
    .map(f => ({
      question: String(f.question || '').trim(),
      answer: String(f.answer || '').trim()
    }))
    .filter(f => f.question && f.answer);

  if (cleanFaqs.length === 0) return null;

  return {
    '@type': 'FAQPage',
    mainEntity: cleanFaqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

export function buildJobPostingNode(job: JobAd): Record<string, any> | null {
  if (!isJobActiveAndUnexpired(job)) return null;
  if (!job.title || !job.description) return null;

  const origin = getPublicOrigin();
  const countryInfo = GCC_COUNTRIES[job.country];
  const categoryMeta = PUBLIC_JOB_CATEGORIES.find(c => c.slug === job.category || c.id === job.category);
  const jobUrl = `${origin}/job/${job.slug || job.id}`;

  const employmentMap: Record<string, string> = {
    'full-time': 'FULL_TIME',
    'part-time': 'PART_TIME',
    contract: 'CONTRACTOR',
    temporary: 'TEMPORARY',
    remote: 'FULL_TIME',
    'walk-in': 'FULL_TIME'
  };

  const fullDescriptionParts = [job.description.trim()];
  if (Array.isArray(job.responsibilities) && job.responsibilities.length > 0) {
    fullDescriptionParts.push(`Responsibilities: ${job.responsibilities.join('; ')}`);
  }
  if (Array.isArray(job.requirements) && job.requirements.length > 0) {
    fullDescriptionParts.push(`Requirements: ${job.requirements.join('; ')}`);
  }
  if (Array.isArray(job.benefits) && job.benefits.length > 0) {
    fullDescriptionParts.push(`Benefits: ${job.benefits.join('; ')}`);
  }

  const node: Record<string, any> = {
    '@type': 'JobPosting',
    '@id': `${jobUrl}#jobposting`,
    title: job.title,
    description: fullDescriptionParts.join('\n\n'),
    url: jobUrl,
    directApply: true,
    identifier: {
      '@type': 'PropertyValue',
      name: 'Gulfaro',
      value: job.id
    },
    datePosted: job.postedAt,
    validThrough: job.expiresAt,
    employmentType: employmentMap[job.employmentType] || 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company?.trim() || 'Direct GCC Employer'
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        ...(job.district || job.city ? { streetAddress: job.district || job.city } : {}),
        ...(job.city ? { addressLocality: job.city } : {}),
        addressCountry: countryInfo?.code || 'SA'
      }
    }
  };

  if (categoryMeta?.name || job.category) {
    node.occupationalCategory = categoryMeta?.name || job.category;
  }

  if (job.experienceLevel) {
    node.experienceRequirements = job.experienceLevel.replace(/-/g, ' ');
  }

  if (job.educationLevel) {
    node.educationRequirements = job.educationLevel;
  }

  if (job.workMode === 'remote') {
    node.jobLocationType = 'TELECOMMUTE';
    if (countryInfo?.name) {
      node.applicantLocationRequirements = {
        '@type': 'Country',
        name: countryInfo.name
      };
    }
  }

  if (job.salaryMin && job.salaryMin > 0) {
    node.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: job.currency || countryInfo?.currencyCode || 'SAR',
      value: {
        '@type': 'QuantitativeValue',
        minValue: job.salaryMin,
        maxValue: job.salaryMax || job.salaryMin,
        unitText: job.salaryPeriod === 'yearly' ? 'YEAR' : job.salaryPeriod === 'daily' ? 'DAY' : 'MONTH'
      }
    };
  }

  return node;
}

export function buildArticleNode(article: CareerArticle): Record<string, any> {
  const origin = getPublicOrigin();
  const url = `${origin}/career-advice/${article.slug}`;
  return {
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: article.title,
    description: article.summary,
    author: {
      '@type': 'Organization',
      name: 'Gulfaro Career Editorial Guide'
    },
    publisher: {
      '@id': `${origin}/#organization`
    },
    mainEntityOfPage: url
  };
}

export function buildSeoGraph(
  extraNodes: Array<Record<string, any> | null | undefined> = [],
  orgOptions?: { description?: string }
): Record<string, any> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      buildOrganizationNode(orgOptions),
      buildWebSiteNode(),
      ...extraNodes.filter((node): node is Record<string, any> => Boolean(node))
    ]
  };
}

export function buildOrganizationSchema(): Record<string, any> {
  return buildSeoGraph();
}

export function buildJobPostingSchema(job: JobAd): Record<string, any> | null {
  const node = buildJobPostingNode(job);
  if (!node) return null;
  const countryInfo = GCC_COUNTRIES[job.country];
  const breadcrumb = buildBreadcrumbListNode([
    { name: 'Home', path: '/' },
    { name: `${countryInfo?.name || 'GCC'} Jobs`, path: `/country/${job.country}` },
    { name: job.title, path: `/job/${job.slug || job.id}` }
  ]);
  return buildSeoGraph([breadcrumb, node]);
}

export function buildArticleSchema(article: CareerArticle): Record<string, any> {
  const breadcrumb = buildBreadcrumbListNode([
    { name: 'Home', path: '/' },
    { name: 'Career Advice', path: '/career-advice' },
    { name: article.title, path: `/career-advice/${article.slug}` }
  ]);
  return buildSeoGraph([breadcrumb, buildArticleNode(article)]);
}
