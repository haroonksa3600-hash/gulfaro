import { JobAd } from '../types/job';
import { isJobActiveAndUnexpired } from '../data/gccDirectory';
import { apiUrl } from '../services/apiConfig';
import { PublicPlatformConfig } from '../services/siteConfig';
import { storageService } from '../services/storage';
import {
  GULFARO_AGENT_TOOLS,
  findPublicActiveJobBySlugOrId,
  getCountryMetadataForAgent,
  sanitizePublicJobForAgent,
  sortAndFilterPublicJobs,
  validateBrowseJobsByCountryInput,
  validateGetJobDetailsInput,
  validateSearchJobsInput
} from '../../shared/mcpTools';

export interface WebMcpToolExecutionResult {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface WebMcpToolRegistration {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
  execute: (
    args: unknown,
    client?: unknown
  ) => Promise<WebMcpToolExecutionResult> | WebMcpToolExecutionResult;
}

export interface DocumentModelContext {
  registerTool: (
    tool: WebMcpToolRegistration,
    options?: { signal?: AbortSignal }
  ) => Promise<void> | void;
  unregisterTool?: (name: string) => Promise<void> | void;
}

declare global {
  interface Document {
    modelContext?: DocumentModelContext;
  }
}

export interface WebMcpSupportStatus {
  supported: boolean;
  reason?: string;
}

export function getWebMcpSupportStatus(): WebMcpSupportStatus {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { supported: false, reason: 'non-browser-environment' };
  }
  if (!window.isSecureContext) {
    return { supported: false, reason: 'requires-secure-context' };
  }
  const modelContext = document.modelContext;
  if (!modelContext || typeof modelContext.registerTool !== 'function') {
    return { supported: false, reason: 'document.modelContext.registerTool-unavailable' };
  }
  return { supported: true };
}

export function isWebMcpSupported(): boolean {
  return getWebMcpSupportStatus().supported;
}

function toTextToolResult(
  payload: Record<string, unknown>,
  isError = false
): WebMcpToolExecutionResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
    ...(isError ? { isError: true } : {})
  };
}

function getCanonicalPublicOrigin(): string {
  if (typeof window === 'undefined') return 'https://www.gulfaro.net';
  const host = (window.location.hostname || '').toLowerCase();
  if (host === 'gulfaro.net' || host === 'www.gulfaro.net') {
    return 'https://www.gulfaro.net';
  }
  return window.location.origin.replace(/\/+$/, '');
}

async function fetchPublicJobsSafe(queryParams?: Record<string, string | undefined>): Promise<JobAd[]> {
  const qs = new URLSearchParams();
  if (queryParams) {
    for (const [key, val] of Object.entries(queryParams)) {
      if (val) qs.set(key, val);
    }
  }
  const queryString = qs.toString();
  const url = apiUrl(queryString ? `/api/jobs?${queryString}` : '/api/jobs');

  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.filter(
          (j: any): j is JobAd =>
            Boolean(j) && j.status !== 'hidden' && j.status !== 'rejected'
        );
      }
    }
  } catch {
    // Fallback strictly to already-cached public job listings only when network is offline
  }

  return storageService
    .getJobs()
    .filter(j => j.status !== 'hidden' && j.status !== 'rejected');
}

async function fetchSinglePublicJobSafe(jobIdOrSlug: string): Promise<JobAd | null> {
  const url = apiUrl(`/api/jobs/${encodeURIComponent(jobIdOrSlug)}`);
  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    if (res.ok) {
      const job = await res.json();
      if (job && job.status !== 'hidden' && job.status !== 'rejected') {
        return job as JobAd;
      }
      return null;
    }
    if (res.status === 404) {
      return null;
    }
  } catch {
    // Fallback strictly to already-cached public job listings only when network is offline
  }

  const cached = storageService
    .getJobs()
    .filter(j => j.status !== 'hidden' && j.status !== 'rejected');
  return findPublicActiveJobBySlugOrId(cached, jobIdOrSlug) || null;
}

export function registerGulfaroWebMcpTools(options: {
  getPublicConfig: () => PublicPlatformConfig | null;
}): () => void {
  const support = getWebMcpSupportStatus();
  if (!support.supported || !document.modelContext) {
    return () => {};
  }

  const modelContext = document.modelContext;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const registeredNames: string[] = [];

  const isPublicCatalogUnavailable = (): boolean => {
    const cfg = options.getPublicConfig();
    return Boolean(cfg?.emergency?.emergencyShutdown || cfg?.emergency?.hideAllPublicJobs);
  };

  const [searchToolMeta, detailToolMeta, countryToolMeta] = GULFARO_AGENT_TOOLS;

  const toolsToRegister: WebMcpToolRegistration[] = [
    {
      name: searchToolMeta.name,
      title: searchToolMeta.title,
      description: searchToolMeta.description,
      inputSchema: searchToolMeta.inputSchema,
      annotations: searchToolMeta.annotations,
      execute: async (rawArgs: unknown) => {
        if (isPublicCatalogUnavailable()) {
          return toTextToolResult(
            { error: 'Public job listings are temporarily unavailable.' },
            true
          );
        }

        const validation = validateSearchJobsInput(rawArgs);
        if (!validation.valid) {
          return toTextToolResult({ error: validation.error }, true);
        }

        const params = validation.data;
        const publicJobs = await fetchPublicJobsSafe({
          q: params.query,
          country: params.country && params.country !== 'all' ? params.country : undefined,
          city: params.city,
          category: params.category
        });

        const matched = sortAndFilterPublicJobs(publicJobs, params);
        const sliced = matched.slice(0, params.limit);
        const origin = getCanonicalPublicOrigin();

        return toTextToolResult({
          totalMatches: matched.length,
          returnedCount: sliced.length,
          appliedFilters: {
            query: params.query || null,
            country: params.country || 'all',
            city: params.city || null,
            category: params.category || null,
            employmentType: params.employmentType || null,
            limit: params.limit
          },
          jobs: sliced.map(job => sanitizePublicJobForAgent(job, origin, false))
        });
      }
    },
    {
      name: detailToolMeta.name,
      title: detailToolMeta.title,
      description: detailToolMeta.description,
      inputSchema: detailToolMeta.inputSchema,
      annotations: detailToolMeta.annotations,
      execute: async (rawArgs: unknown) => {
        if (isPublicCatalogUnavailable()) {
          return toTextToolResult(
            { error: 'Public job listings are temporarily unavailable.' },
            true
          );
        }

        const validation = validateGetJobDetailsInput(rawArgs);
        if (!validation.valid) {
          return toTextToolResult({ error: validation.error }, true);
        }

        const { jobIdOrSlug } = validation.data;
        const job = await fetchSinglePublicJobSafe(jobIdOrSlug);
        if (!job || !isJobActiveAndUnexpired(job)) {
          return toTextToolResult(
            {
              found: false,
              requested: jobIdOrSlug,
              error: 'No active, unexpired public job vacancy matched the requested ID or slug.'
            },
            true
          );
        }

        const origin = getCanonicalPublicOrigin();
        return toTextToolResult({
          found: true,
          job: sanitizePublicJobForAgent(job, origin, true)
        });
      }
    },
    {
      name: countryToolMeta.name,
      title: countryToolMeta.title,
      description: countryToolMeta.description,
      inputSchema: countryToolMeta.inputSchema,
      annotations: countryToolMeta.annotations,
      execute: async (rawArgs: unknown) => {
        if (isPublicCatalogUnavailable()) {
          return toTextToolResult(
            { error: 'Public job listings are temporarily unavailable.' },
            true
          );
        }

        const validation = validateBrowseJobsByCountryInput(rawArgs);
        if (!validation.valid) {
          return toTextToolResult({ error: validation.error }, true);
        }

        const params = validation.data;
        const publicJobs = await fetchPublicJobsSafe({
          country: params.country,
          city: params.city,
          category: params.category
        });

        const matched = sortAndFilterPublicJobs(publicJobs, {
          country: params.country,
          city: params.city,
          category: params.category
        });
        const sliced = matched.slice(0, params.limit);
        const origin = getCanonicalPublicOrigin();

        return toTextToolResult({
          country: getCountryMetadataForAgent(params.country, origin),
          totalActiveJobs: matched.length,
          returnedCount: sliced.length,
          appliedFilters: {
            city: params.city || null,
            category: params.category || null,
            limit: params.limit
          },
          jobs: sliced.map(job => sanitizePublicJobForAgent(job, origin, false))
        });
      }
    }
  ];

  for (const tool of toolsToRegister) {
    try {
      const maybePromise = controller
        ? modelContext.registerTool(tool, { signal: controller.signal })
        : modelContext.registerTool(tool);
      registeredNames.push(tool.name);
      if (maybePromise && typeof (maybePromise as Promise<void>).catch === 'function') {
        (maybePromise as Promise<void>).catch(() => {
          // Ignore experimental browser WebMCP registration rejections
        });
      }
    } catch {
      // Never block app rendering if an experimental browser implementation throws
    }
  }

  return () => {
    if (controller && !controller.signal.aborted) {
      try {
        controller.abort();
      } catch {
        // Ignore abort cleanup error
      }
    }
    if (typeof modelContext.unregisterTool === 'function') {
      for (const name of registeredNames) {
        try {
          const maybePromise = modelContext.unregisterTool(name);
          if (maybePromise && typeof (maybePromise as Promise<void>).catch === 'function') {
            (maybePromise as Promise<void>).catch(() => {});
          }
        } catch {
          // Ignore unregister errors
        }
      }
    }
  };
}
