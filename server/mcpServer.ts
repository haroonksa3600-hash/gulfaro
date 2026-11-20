import { Request, Response } from 'express';
import { isJobActiveAndUnexpired } from '../src/data/gccDirectory';
import { JobAd } from '../src/types/job';
import {
  GULFARO_AGENT_TOOLS,
  findPublicActiveJobBySlugOrId,
  getCountryMetadataForAgent,
  sanitizePublicJobForAgent,
  sortAndFilterPublicJobs,
  validateBrowseJobsByCountryInput,
  validateGetJobDetailsInput,
  validateSearchJobsInput
} from '../shared/mcpTools';

export const MCP_SERVER_INFO = {
  name: 'net.gulfaro/gcc-jobs-mcp',
  title: 'Gulfaro GCC Jobs MCP Server',
  version: '1.0.0',
  description:
    'Read-only Model Context Protocol (MCP) server for searching and inspecting active public GCC job vacancies across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman on Gulfaro.',
  websiteUrl: 'https://www.gulfaro.net'
} as const;

export const SUPPORTED_MCP_PROTOCOL_VERSIONS = [
  '2025-06-18',
  '2025-03-26',
  '2024-11-05'
] as const;

export const MCP_CAPABILITIES = {
  tools: {
    listChanged: false
  }
} as const;

export interface McpServerDependencies {
  getJobs: () => Promise<JobAd[]>;
  getSiteSettings: () => Promise<any>;
  enrichJobsVerifiedStatus: (jobs: any[]) => Promise<any[]>;
  getCanonicalBaseOrigin: (req: Request) => string;
}

function setMcpCorsHeaders(res: Response): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id'
  );
  res.setHeader('Access-Control-Expose-Headers', 'MCP-Protocol-Version');
}

export function resolveMcpEndpointUrl(req: Request): string {
  const configured = (process.env.MCP_ENDPOINT_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;

  const forwardedHost = req.headers['x-forwarded-host'];
  const rawHost =
    (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host || '';
  const host = rawHost.split(',')[0].trim();

  if (
    !host ||
    /(^|\.)gulfaro\.(net|com)(:\d+)?$/i.test(host) ||
    /\.onrender\.com(:\d+)?$/i.test(host)
  ) {
    return 'https://gulfaro.onrender.com/mcp';
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  const protoRaw =
    (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) ||
    (req.secure ? 'https' : 'http');
  const proto = protoRaw.split(',')[0].trim() || 'http';
  return `${proto}://${host}/mcp`;
}

export function buildMcpServerCardPayload(endpointUrl: string) {
  return {
    $schema: 'https://static.modelcontextprotocol.io/schemas/server-card/v1.json',
    version: '1.0',
    protocolVersion: '2025-06-18',
    serverInfo: MCP_SERVER_INFO,
    transport: {
      type: 'streamable-http',
      url: endpointUrl,
      supportedProtocolVersions: [...SUPPORTED_MCP_PROTOCOL_VERSIONS]
    },
    capabilities: MCP_CAPABILITIES,
    authentication: {
      type: 'none',
      required: false
    },
    tools: GULFARO_AGENT_TOOLS,
    documentationUrl: 'https://www.gulfaro.net/llms.txt'
  };
}

function sendJsonRpcError(
  res: Response,
  httpStatus: number,
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
) {
  return res.status(httpStatus).json({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data !== undefined ? { data } : {})
    }
  });
}

function sendJsonRpcResult(res: Response, id: string | number, result: unknown) {
  return res.status(200).json({
    jsonrpc: '2.0',
    id,
    result
  });
}

function toMcpToolResult(payload: Record<string, unknown>, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
    ...(isError ? { isError: true } : {})
  };
}

export function createGulfaroMcpHandlers(deps: McpServerDependencies) {
  const handleServerCard = (req: Request, res: Response) => {
    setMcpCorsHeaders(res);
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    const endpointUrl = resolveMcpEndpointUrl(req);
    const payload = buildMcpServerCardPayload(endpointUrl);
    return res
      .status(200)
      .set({
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      })
      .json(payload);
  };

  const handleMcpRequest = async (req: Request, res: Response) => {
    setMcpCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      return res.status(405).json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32000,
          message:
            'Method Not Allowed. Use HTTP POST with application/json JSON-RPC 2.0 payloads on this stateless read-only Streamable HTTP MCP server.'
        }
      });
    }

    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (contentType && !contentType.includes('application/json')) {
      return sendJsonRpcError(
        res,
        415,
        null,
        -32600,
        'Unsupported Media Type. Content-Type must be application/json.'
      );
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return sendJsonRpcError(
        res,
        400,
        null,
        -32600,
        'Invalid Request. Expected a single JSON-RPC 2.0 request object.'
      );
    }

    const { jsonrpc, id, method, params } = body as {
      jsonrpc?: unknown;
      id?: unknown;
      method?: unknown;
      params?: unknown;
    };

    const hasId = id !== undefined;
    const validId =
      id === null || typeof id === 'string' || (typeof id === 'number' && Number.isFinite(id));

    if (jsonrpc !== '2.0' || typeof method !== 'string' || (hasId && !validId)) {
      return sendJsonRpcError(
        res,
        400,
        validId ? (id as string | number | null) : null,
        -32600,
        'Invalid JSON-RPC 2.0 request structure.'
      );
    }

    // Notifications (no id) require HTTP 202 Accepted with empty body in Streamable HTTP
    if (!hasId) {
      if (method === 'notifications/initialized' || method.startsWith('notifications/')) {
        return res.status(202).end();
      }
      return res.status(202).end();
    }

    if (id === null) {
      return sendJsonRpcError(res, 400, null, -32600, 'Request id must not be null.');
    }

    const rpcId = id as string | number;

    if (method === 'initialize') {
      const requestedVersion =
        params && typeof params === 'object' && !Array.isArray(params)
          ? String((params as Record<string, unknown>).protocolVersion || '').trim()
          : '';
      const negotiatedVersion = (SUPPORTED_MCP_PROTOCOL_VERSIONS as readonly string[]).includes(
        requestedVersion
      )
        ? requestedVersion
        : SUPPORTED_MCP_PROTOCOL_VERSIONS[0];

      res.setHeader('MCP-Protocol-Version', negotiatedVersion);
      return sendJsonRpcResult(res, rpcId, {
        protocolVersion: negotiatedVersion,
        capabilities: MCP_CAPABILITIES,
        serverInfo: {
          name: MCP_SERVER_INFO.name,
          title: MCP_SERVER_INFO.title,
          version: MCP_SERVER_INFO.version
        },
        instructions:
          'Read-only Gulfaro GCC Jobs MCP server. Use search_jobs, get_job_details, or browse_jobs_by_country to inspect active public job listings across Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, and Oman.'
      });
    }

    if (method === 'ping') {
      return sendJsonRpcResult(res, rpcId, {});
    }

    if (method === 'tools/list') {
      return sendJsonRpcResult(res, rpcId, {
        tools: GULFARO_AGENT_TOOLS
      });
    }

    if (method === 'tools/call') {
      if (!params || typeof params !== 'object' || Array.isArray(params)) {
        return sendJsonRpcError(
          res,
          400,
          rpcId,
          -32602,
          'Invalid params. Expected an object with "name" and optional "arguments".'
        );
      }

      const { name, arguments: rawArguments } = params as {
        name?: unknown;
        arguments?: unknown;
      };

      if (typeof name !== 'string' || !name.trim()) {
        return sendJsonRpcError(res, 400, rpcId, -32602, 'Invalid params: tool "name" is required.');
      }

      const toolName = name.trim();
      const knownTool = GULFARO_AGENT_TOOLS.find(t => t.name === toolName);
      if (!knownTool) {
        return sendJsonRpcError(
          res,
          404,
          rpcId,
          -32602,
          `Unknown tool "${toolName}". Available read-only tools: ${GULFARO_AGENT_TOOLS.map(t => t.name).join(', ')}.`
        );
      }

      try {
        const settings = await deps.getSiteSettings();
        if (settings?.emergency?.hideAllPublicJobs || settings?.emergency?.emergencyShutdown) {
          return sendJsonRpcResult(
            res,
            rpcId,
            toMcpToolResult(
              { error: 'Public job listings are temporarily unavailable.' },
              true
            )
          );
        }

        const publicOrigin = deps.getCanonicalBaseOrigin(req);
        const allJobs = await deps.getJobs();
        const visibleJobs = allJobs.filter(
          j => j && j.status !== 'hidden' && j.status !== 'rejected'
        );

        if (toolName === 'search_jobs') {
          const validation = validateSearchJobsInput(rawArguments);
          if (!validation.valid) {
            return sendJsonRpcResult(res, rpcId, toMcpToolResult({ error: validation.error }, true));
          }
          const filters = validation.data;
          const matched = sortAndFilterPublicJobs(visibleJobs, filters);
          const sliced = await deps.enrichJobsVerifiedStatus(matched.slice(0, filters.limit));

          return sendJsonRpcResult(
            res,
            rpcId,
            toMcpToolResult({
              totalMatches: matched.length,
              returnedCount: sliced.length,
              appliedFilters: {
                query: filters.query || null,
                country: filters.country || 'all',
                city: filters.city || null,
                category: filters.category || null,
                employmentType: filters.employmentType || null,
                limit: filters.limit
              },
              jobs: sliced.map(job => sanitizePublicJobForAgent(job, publicOrigin, false))
            })
          );
        }

        if (toolName === 'get_job_details') {
          const validation = validateGetJobDetailsInput(rawArguments);
          if (!validation.valid) {
            return sendJsonRpcResult(res, rpcId, toMcpToolResult({ error: validation.error }, true));
          }
          const { jobIdOrSlug } = validation.data;
          const matched = findPublicActiveJobBySlugOrId(visibleJobs, jobIdOrSlug);
          if (!matched || !isJobActiveAndUnexpired(matched)) {
            return sendJsonRpcResult(
              res,
              rpcId,
              toMcpToolResult(
                {
                  found: false,
                  requested: jobIdOrSlug,
                  error: 'No active, unexpired public job vacancy matched the requested ID or slug.'
                },
                true
              )
            );
          }

          const [enriched] = await deps.enrichJobsVerifiedStatus([matched]);
          return sendJsonRpcResult(
            res,
            rpcId,
            toMcpToolResult({
              found: true,
              job: sanitizePublicJobForAgent(enriched, publicOrigin, true)
            })
          );
        }

        if (toolName === 'browse_jobs_by_country') {
          const validation = validateBrowseJobsByCountryInput(rawArguments);
          if (!validation.valid) {
            return sendJsonRpcResult(res, rpcId, toMcpToolResult({ error: validation.error }, true));
          }
          const filters = validation.data;
          const matched = sortAndFilterPublicJobs(visibleJobs, {
            country: filters.country,
            city: filters.city,
            category: filters.category
          });
          const sliced = await deps.enrichJobsVerifiedStatus(matched.slice(0, filters.limit));

          return sendJsonRpcResult(
            res,
            rpcId,
            toMcpToolResult({
              country: getCountryMetadataForAgent(filters.country, publicOrigin),
              totalActiveJobs: matched.length,
              returnedCount: sliced.length,
              appliedFilters: {
                city: filters.city || null,
                category: filters.category || null,
                limit: filters.limit
              },
              jobs: sliced.map(job => sanitizePublicJobForAgent(job, publicOrigin, false))
            })
          );
        }
      } catch (err: any) {
        console.error('[MCP /mcp tools/call] Error:', err?.message || err);
        return sendJsonRpcResult(
          res,
          rpcId,
          toMcpToolResult({ error: 'Unable to query public job listings at this time.' }, true)
        );
      }
    }

    return sendJsonRpcError(
      res,
      404,
      rpcId,
      -32601,
      `Method "${method}" is not supported by this read-only MCP server.`
    );
  };

  return {
    handleServerCard,
    handleMcpRequest
  };
}
