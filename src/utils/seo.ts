import { JobAd, GCC_COUNTRIES } from '../types/job';
import { CareerArticle } from '../data/careerArticles';
import { isJobActiveAndUnexpired } from '../data/gccDirectory';

export interface RouteSeoMetadata {
  title: string;
  description: string;
  canonicalPath: string;
  robots?: string;
  ogType?: 'website' | 'article';
  jsonLd?: Record<string, any> | null;
}

const PROD_ORIGIN = 'https://www.gulfaro.net';

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
  const canonicalUrl = `${origin}${meta.canonicalPath.startsWith('/') ? meta.canonicalPath : `/${meta.canonicalPath}`}`;
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

export function buildJobPostingSchema(job: JobAd): Record<string, any> | null {
  if (!isJobActiveAndUnexpired(job)) return null;
  if (!job.title || !job.company || !job.city || !job.description) return null;

  const countryInfo = GCC_COUNTRIES[job.country];
  const employmentMap: Record<string, string> = {
    'full-time': 'FULL_TIME',
    'part-time': 'PART_TIME',
    contract: 'CONTRACTOR',
    temporary: 'TEMPORARY',
    remote: 'FULL_TIME',
    'walk-in': 'FULL_TIME'
  };

  const schema: Record<string, any> = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
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
      name: job.company
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: job.district || job.city,
        addressLocality: job.city,
        addressCountry: countryInfo?.code || 'SA'
      }
    }
  };

  if (job.workMode === 'remote') {
    schema.jobLocationType = 'TELECOMMUTE';
  }

  if (job.salaryMin && job.salaryMin > 0) {
    schema.baseSalary = {
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

  return schema;
}

export function buildArticleSchema(article: CareerArticle): Record<string, any> {
  const origin = getPublicOrigin();
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.summary,
    author: {
      '@type': 'Organization',
      name: 'Gulfaro Career Editorial Guide'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Gulfaro',
      logo: {
        '@type': 'ImageObject',
        url: `${origin}/pwa-512x512.png`
      }
    },
    mainEntityOfPage: `${origin}/career-advice/${article.slug}`
  };
}

export function buildOrganizationSchema(): Record<string, any> {
  const origin = getPublicOrigin();
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Gulfaro',
    url: origin,
    logo: `${origin}/pwa-512x512.png`,
    email: 'admingulfaro@gmail.com',
    areaServed: ['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Oman']
  };
}
